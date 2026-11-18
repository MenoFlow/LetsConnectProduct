import {
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {SkipThrottle} from '@nestjs/throttler';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {Prisma} from '@prisma/client';
import {PrismaService} from './prisma.service';
import {Actor,hashToken,safeUser} from './security';
import {WorkspaceService} from './workspace.service';
import * as v from './validation';
import type {Server,Socket} from 'socket.io';

type SocketResult<T> =
  | {ok:true;data:T}
  | {ok:false;error:{status:number;message:string}};
type SocketAck<T> = (result:SocketResult<T>)=>void;

const userRoom = (id:string) => `user:${id}`;
const companyRoom = (id:string) => `company:${id}`;
const sessionRoom = (id:string) => `session:${id}`;

@Injectable()
@SkipThrottle()
@WebSocketGateway({path:'/api/socket.io',cors:{origin:process.env['FRONTEND_ORIGIN'],credentials:true}})
export class RealtimeGateway implements OnGatewayConnection,OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly socketRequests = new Map<string,{count:number;resetAt:number}>();
  @WebSocketServer() private server!:Server;

  constructor(
    private readonly db:PrismaService,
    private readonly workspace:WorkspaceService,
  ) {}

  async handleConnection(socket:Socket):Promise<void> {
    try {
      // Une requête même origine n'envoie pas d'en-tête Origin : on ne refuse que
      // les origines réellement différentes (protection CSRF), comme le garde REST.
      const origin = socket.handshake.headers.origin;
      if (origin && origin !== process.env['FRONTEND_ORIGIN']) {
        this.reject(socket);
        return;
      }

      const cookieHeader = socket.handshake.headers.cookie;
      const cookie = cookieHeader?.split(';').map(value=>value.trim())
        .find(value=>value.startsWith('mc_session='));
      const token = cookie?.slice('mc_session='.length);
      if (!token) {
        this.reject(socket);
        return;
      }

      const sessionId = hashToken(token);
      const session = await this.db.session.findUnique({
        where:{id:sessionId},
        include:{user:true},
      });
      if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
        this.reject(socket);
        return;
      }

      const actor = safeUser(session.user);
      socket.data.actor = actor;
      socket.data.sessionId = sessionId;
      await socket.join([userRoom(actor.id),sessionRoom(sessionId)]);
      if (actor.role === 'ADMIN') {
        await socket.join('role:ADMIN');
      } else if (actor.role === 'COMPANY') {
        const memberships = await this.db.companyMember.findMany({
          where:{userId:actor.id},
          select:{companyId:true},
        });
        await socket.join(memberships.map(member=>companyRoom(member.companyId)));
      }

      const remaining = session.expiresAt.getTime() - Date.now();
      const timer = setTimeout(()=>{
        socket.emit('realtime:unauthorized');
        socket.disconnect(true);
      },remaining);
      timer.unref();
      socket.data.authTimer = timer;
      socket.emit('realtime:ready');
    } catch (error) {
      this.logger.error('WebSocket authentication failed',error instanceof Error?error.stack:String(error));
      this.reject(socket);
    }
  }

  handleDisconnect(socket:Socket):void {
    const timer = socket.data.authTimer as NodeJS.Timeout|undefined;
    if (timer) clearTimeout(timer);
    this.socketRequests.delete(socket.id);
  }

  disconnectSession(sessionId:string):void {
    const room = sessionRoom(sessionId);
    this.server.to(room).emit('realtime:unauthorized');
    this.server.in(room).disconnectSockets(true);
  }

  disconnectUser(userId:string,notifyUnauthorized=true):void {
    const room = userRoom(userId);
    if (notifyUnauthorized) this.server.to(room).emit('realtime:unauthorized');
    this.server.in(room).disconnectSockets(true);
  }

  @SubscribeMessage('conversation:create')
  createConversation(
    @ConnectedSocket() socket:Socket,
    @MessageBody() body:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,actor=>this.workspace.conversationCreate(actor,body),(actor,conversation)=>{
      this.publish(socket,actor,conversation.companyId,conversation.clientId,'conversation:created',{
        conversation,
        messages:conversation.messages,
      });
    });
  }

  @SubscribeMessage('conversation:rename')
  renameConversation(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,actor=>{
      const body = v.parse(v.conversationRename,input);
      return this.workspace.conversationUpdate(actor,body.id,{subject:body.subject});
    },(actor,conversation)=>{
      this.publish(socket,actor,conversation.companyId,conversation.clientId,'conversation:updated',{conversation});
    });
  }

  @SubscribeMessage('conversation:delete')
  deleteConversation(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,actor=>this.workspace.conversationDelete(actor,v.parse(v.conversationId,input).id),(actor,conversation)=>{
      this.publish(socket,actor,conversation.companyId,conversation.clientId,'conversation:deleted',{
        conversationId:conversation.id,
      });
    });
  }

  @SubscribeMessage('message:create')
  createMessage(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,async actor=>{
      const body = v.parse(v.conversationMessage,input);
      const message = await this.workspace.messageCreate(actor,body.conversationId,{body:body.body});
      const conversation = await this.workspace.conversationAccess(actor,body.conversationId);
      return {conversation,message};
    },(actor,result)=>{
      this.publish(socket,actor,result.conversation.companyId,result.conversation.clientId,'message:created',{
        conversationId:result.conversation.id,
        message:result.message,
      });
    });
  }

  @SubscribeMessage('message:edit')
  editMessage(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,async actor=>{
      const body = v.parse(v.messageEdit,input);
      const message = await this.workspace.messageUpdate(actor,body.id,{body:body.body});
      const conversation = await this.workspace.conversationAccess(actor,message.conversationId);
      return {conversation,message};
    },(actor,result)=>{
      this.publish(socket,actor,result.conversation.companyId,result.conversation.clientId,'message:updated',{
        conversationId:result.conversation.id,
        message:result.message,
      });
    });
  }

  @SubscribeMessage('message:delete')
  deleteMessage(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,async actor=>{
      const body = v.parse(v.messageId,input);
      const message = await this.workspace.messageDelete(actor,body.id);
      const conversation = await this.workspace.conversationAccess(actor,message.conversationId);
      return {conversation,message};
    },(actor,result)=>{
      this.publish(socket,actor,result.conversation.companyId,result.conversation.clientId,'message:deleted',{
        conversationId:result.conversation.id,
        messageId:result.message.id,
      });
    });
  }

  @SubscribeMessage('conversation:mark-read')
  markConversationRead(
    @ConnectedSocket() socket:Socket,
    @MessageBody() input:unknown,
    @Ack() ack:SocketAck<unknown>,
  ):Promise<void> {
    return this.execute(socket,ack,async actor=>{
      const body = v.parse(v.conversationRead,input);
      const conversation = await this.workspace.conversationAccess(actor,body.conversationId);
      await this.workspace.markRead(actor,body.conversationId);
      return conversation;
    },(actor,conversation)=>{
      this.publish(socket,actor,conversation.companyId,conversation.clientId,'conversation:read',{
        conversationId:conversation.id,
      });
    });
  }

  private async execute<T>(
    socket:Socket,
    ack:SocketAck<T>|undefined,
    action:(actor:Actor)=>Promise<T>,
    broadcast?:(actor:Actor,result:T)=>void,
  ):Promise<void> {
    try {
      const actor = socket.data.actor as Actor|undefined;
      if (!actor || typeof actor.id !== 'string') throw new UnauthorizedException('Connexion requise');
      if (!this.allowRequest(socket.id)) throw new HttpException('Trop de requêtes. Patientez quelques secondes.',429);
      const result = await action(actor);
      broadcast?.(actor,result);
      ack?.({ok:true,data:result});
    } catch (error) {
      ack?.({ok:false,error:this.socketError(error)});
    }
  }

  private allowRequest(socketId:string):boolean {
    const now = Date.now();
    const current = this.socketRequests.get(socketId);
    if (!current || current.resetAt <= now) {
      this.socketRequests.set(socketId,{count:1,resetAt:now+60_000});
      return true;
    }
    if (current.count >= 120) return false;
    current.count += 1;
    return true;
  }

  private publish(
    socket:Socket,
    actor:Actor,
    companyId:string,
    clientId:string,
    event:string,
    data:Record<string,unknown>,
  ):void {
    this.server
      .to(userRoom(clientId))
      .to(companyRoom(companyId))
      .to('role:ADMIN')
      .emit(event,{...data,actorId:actor.id,sourceSocketId:socket.id});
  }

  private reject(socket:Socket):void {
    socket.emit('realtime:unauthorized');
    socket.disconnect(true);
  }

  private socketError(error:unknown):{status:number;message:string} {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      const message = typeof response === 'string'
        ? response
        : response && typeof response === 'object' && 'message' in response
          ? response.message
          : error.message;
      return {status:error.getStatus(),message:Array.isArray(message)?message.join(' · '):String(message)};
    }
    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as Prisma.PrismaClientKnownRequestError).code;
      if (['P2002','P2003','P2034'].includes(code)) {
        return {status:409,message:'Conflit : référence utilisée, doublon ou modification concurrente.'};
      }
      if (code === 'P2025') return {status:404,message:'Élément introuvable'};
    }
    this.logger.error('WebSocket operation failed',error instanceof Error?error.stack:String(error));
    return {status:500,message:'Erreur interne. Réessayez ultérieurement.'};
  }
}
