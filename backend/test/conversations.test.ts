import {AddressInfo} from 'node:net';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {io,Socket} from 'socket.io-client';
import type {INestApplication} from '@nestjs/common';
import {
  call,
  db,
  login,
  ORIGIN,
  reset,
  seedFixtures,
  startApp,
} from './helpers';

type SocketResult<T> =
  | {ok:true;data:T}
  | {ok:false;error:{status:number;message:string}};

async function openSocket(app:INestApplication,token:string):Promise<Socket> {
  const address = app.getHttpServer().address() as AddressInfo;
  const socket = io(`http://127.0.0.1:${address.port}`,{
    path:'/api/socket.io',
    transports:['websocket'],
    autoConnect:false,
    extraHeaders:{Origin:ORIGIN,Cookie:`mc_session=${token}`},
  });
  await new Promise<void>((resolve,reject)=>{
    const timer = setTimeout(()=>reject(new Error('WebSocket authentication timed out')),5000);
    socket.once('realtime:ready',()=>{
      clearTimeout(timer);
      resolve();
    });
    socket.once('realtime:unauthorized',()=>{
      clearTimeout(timer);
      reject(new Error('WebSocket authentication rejected'));
    });
    socket.once('connect_error',error=>{
      clearTimeout(timer);
      reject(error);
    });
    socket.connect();
  });
  return socket;
}

function emitAck<T>(socket:Socket,event:string,payload:unknown):Promise<T> {
  return new Promise((resolve,reject)=>{
    socket.emit(event,payload,(result:SocketResult<T>)=>{
      if (!result.ok) {
        reject(Object.assign(new Error(result.error.message),{status:result.error.status}));
        return;
      }
      resolve(result.data);
    });
  });
}

function nextEvent<T>(socket:Socket,event:string):Promise<T> {
  return new Promise(resolve=>socket.once(event,resolve));
}

describe('messagerie temps réel',()=>{
  let app:INestApplication;
  let clientSocket:Socket;
  let ownerSocket:Socket;

  beforeAll(async()=>{
    app = await startApp();
    await app.listen(0,'127.0.0.1');
  });
  afterAll(async()=>{
    clientSocket?.disconnect();
    ownerSocket?.disconnect();
    await app?.close();
    await db.$disconnect();
  });
  beforeEach(async()=>{
    clientSocket?.disconnect();
    ownerSocket?.disconnect();
    await reset();
    await seedFixtures();
  });

  it('crée, modifie et supprime des conversations/messages avec diffusion aux participants',async()=>{
    const clientLogin = await login(app,'client@test.mg');
    const ownerLogin = await login(app,'owner@test.mg');
    clientSocket = await openSocket(app,clientLogin.token!);
    ownerSocket = await openSocket(app,ownerLogin.token!);

    const createdEvent = nextEvent<{conversation:{id:string};messages:{body:string}[]}>(ownerSocket,'conversation:created');
    const created = await emitAck<{id:string;messages:{id:string;body:string}[]}>(
      clientSocket,
      'conversation:create',
      {companyId:'co-approved',subject:'Prix du cuivre',body:'Bonjour, quel est votre prix ?'},
    );
    const createdPayload = await createdEvent;
    expect(created.id).toBe(createdPayload.conversation.id);
    expect(created.messages[0]?.body).toBe('Bonjour, quel est votre prix ?');
    expect(createdPayload.messages[0]?.body).toBe('Bonjour, quel est votre prix ?');

    const messageEvent = nextEvent<{message:{body:string}}>(clientSocket,'message:created');
    const sent = await emitAck<{message:{id:string;body:string}}>(
      ownerSocket,
      'message:create',
      {conversationId:created.id,body:'Nous vous répondrons rapidement.'},
    );
    expect((await messageEvent).message.body).toBe(sent.message.body);

    const renamedEvent = nextEvent<{conversation:{subject:string}}>(ownerSocket,'conversation:updated');
    await expect(emitAck(clientSocket,'conversation:rename',{id:created.id,subject:'  '}))
      .rejects.toMatchObject({status:400});
    await emitAck(clientSocket,'conversation:rename',{id:created.id,subject:'Demande de devis'});
    expect((await renamedEvent).conversation.subject).toBe('Demande de devis');

    const editedEvent = nextEvent<{message:{body:string}}>(ownerSocket,'message:updated');
    await emitAck(clientSocket,'message:edit',{id:created.messages[0]?.id,body:'Bonjour, merci de nous transmettre un devis.'});
    expect((await editedEvent).message.body).toBe('Bonjour, merci de nous transmettre un devis.');

    const readEvent = nextEvent<{conversationId:string}>(clientSocket,'conversation:read');
    await emitAck(ownerSocket,'conversation:mark-read',{conversationId:created.id});
    expect((await readEvent).conversationId).toBe(created.id);
    expect((await db.message.findUniqueOrThrow({where:{id:created.messages[0]?.id}})).readAt).not.toBeNull();

    const deletedMessageEvent = nextEvent<{messageId:string}>(clientSocket,'message:deleted');
    await emitAck(ownerSocket,'message:delete',{id:sent.message.id});
    expect((await deletedMessageEvent).messageId).toBe(sent.message.id);

    const deletedConversationEvent = nextEvent<{conversationId:string}>(ownerSocket,'conversation:deleted');
    await emitAck(clientSocket,'conversation:delete',{id:created.id});
    expect((await deletedConversationEvent).conversationId).toBe(created.id);
    expect(await db.conversation.findUnique({where:{id:created.id}})).toBeNull();
  });

  it('applique l’autorisation des rôles au transport WebSocket et retire les mutations REST',async()=>{
    const clientLogin = await login(app,'client@test.mg');
    const ownerLogin = await login(app,'owner@test.mg');
    const outsiderLogin = await login(app,'owner2@test.mg');
    clientSocket = await openSocket(app,clientLogin.token!);
    ownerSocket = await openSocket(app,ownerLogin.token!);
    const outsiderSocket = await openSocket(app,outsiderLogin.token!);

    const created = await emitAck<{id:string}>(
      clientSocket,
      'conversation:create',
      {companyId:'co-approved',subject:'Devis',body:'Bonjour'},
    );
    await expect(emitAck(outsiderSocket,'message:create',{
      conversationId:created.id,
      body:'Message non autorisé',
    })).rejects.toMatchObject({status:403});

    expect((await call(app,'post','/api/conversations',{token:clientLogin.token,body:{
      companyId:'co-approved',subject:'REST',body:'Cette mutation doit échouer',
    }})).status).toBe(404);
    outsiderSocket.disconnect();
  });

  it('refuse une socket sans session valide',async()=>{
    const address = app.getHttpServer().address() as AddressInfo;
    const socket = io(`http://127.0.0.1:${address.port}`,{
      path:'/api/socket.io',
      transports:['websocket'],
      autoConnect:false,
      extraHeaders:{Origin:ORIGIN},
    });
    await expect(new Promise<void>((resolve,reject)=>{
      const timer = setTimeout(()=>reject(new Error('WebSocket authentication timed out')),5000);
      socket.once('realtime:unauthorized',()=>{
        clearTimeout(timer);
        resolve();
      });
      socket.once('connect_error',error=>{
        clearTimeout(timer);
        reject(error);
      });
      socket.connect();
    })).resolves.toBeUndefined();
    socket.disconnect();
  });
});
