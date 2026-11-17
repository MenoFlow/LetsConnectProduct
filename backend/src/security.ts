import {CanActivate,ExecutionContext,Injectable,UnauthorizedException,ForbiddenException,SetMetadata} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {createHash} from 'node:crypto';
import type {Request} from 'express';
import type {User} from '@prisma/client';
import {PrismaService} from './prisma.service';
export type Actor=Omit<User,'passwordHash'>;
export type AuthRequest=Request & {actor:Actor};
export const Public=()=>SetMetadata('public',true);
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export function safeUser(user:User):Actor { const {passwordHash,...safe}=user; return safe; }
export function assertAdmin(actor:Actor){if(actor.role!=='ADMIN') throw new ForbiddenException('Accès administrateur requis');}
export function assertClient(actor:Actor){if(actor.role!=='CLIENT') throw new ForbiddenException('Accès client requis');}
export function assertMembership(actor:Actor,role:string|undefined,allowed:string[]){if(actor.role==='ADMIN')return;if(actor.role!=='COMPANY'||!role||!allowed.includes(role))throw new ForbiddenException('Droits insuffisants pour cette entreprise');}
@Injectable()
export class SessionGuard implements CanActivate {
 constructor(private readonly prisma:PrismaService,private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext){
  if(context.getType()!=='http')return true;
  const request=context.switchToHttp().getRequest<AuthRequest>();
  if(!['GET','HEAD','OPTIONS'].includes(request.method)) {
   const origin=request.headers.origin;
   const expected=process.env['FRONTEND_ORIGIN'];
   if(origin!==expected || request.headers['x-requested-with']!=='MaterialConnect') throw new ForbiddenException('Origine de la requête refusée');
  }
  if(this.reflector.getAllAndOverride<boolean>('public',[context.getHandler(),context.getClass()])) return true;
  const token=request.cookies?.['mc_session'];
  if(typeof token!=='string') throw new UnauthorizedException('Connexion requise');
  const session=await this.prisma.session.findUnique({where:{id:hashToken(token)},include:{user:true}});
  if(!session||session.expiresAt<new Date()||!session.user.isActive) throw new UnauthorizedException('Session expirée ou compte suspendu');
  request.actor=safeUser(session.user); return true;
 }
}
