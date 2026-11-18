import {Body,Controller,Get,Post,Req,Res,UnauthorizedException,ConflictException} from '@nestjs/common';
import {Prisma, type User} from '@prisma/client';
import type {Response} from 'express';
import {randomBytes} from 'node:crypto';
import {hash,compare} from 'bcryptjs';
import {PrismaService} from './prisma.service';
import {Public,AuthRequest,safeUser,hashToken} from './security';
import {parse,credentials,registration,changePassword} from './validation';
import {RealtimeGateway} from './realtime.gateway';
@Controller('auth')
export class AuthController {
 constructor(private readonly db:PrismaService,private readonly realtime:RealtimeGateway){}
 private async session(userId:string,res:Response){
  const token=randomBytes(32).toString('base64url');
  await this.db.session.deleteMany({where:{expiresAt:{lt:new Date()}}});
  await this.db.session.create({data:{id:hashToken(token),userId,expiresAt:new Date(Date.now()+8*3600000)}});
  res.cookie('mc_session',token,{httpOnly:true,secure:process.env['NODE_ENV']==='production',sameSite:'strict',path:'/api',maxAge:8*3600000});
 }
 @Public() @Post('register')
 async register(@Body() body:unknown,@Res({passthrough:true}) res:Response){
  const v=parse(registration,body);
  const passwordHash=await hash(v.password,12);
  let user:User;
  try{
   user=await this.db.$transaction(async tx=>{
    const u=await tx.user.create({data:{email:v.email,firstName:v.firstName,lastName:v.lastName,role:v.role,passwordHash}});
    if(v.role==='COMPANY'&&v.companyName&&v.city&&v.businessSector){
     const slug=v.companyName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+randomBytes(5).toString('hex');
     await tx.company.create({data:{ownerId:u.id,name:v.companyName,slug,email:u.email,city:v.city,businessSector:v.businessSector,members:{create:{userId:u.id,membershipRole:'OWNER'}}}});
    }return u;
   });
  }catch(error){
   // Deux inscriptions simultanées sur la même adresse : la contrainte
   // d'unicité répond 409 plutôt qu'une erreur interne.
   if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')throw new ConflictException('Adresse email déjà utilisée');
   throw error;
  }
  await this.session(user.id,res);return safeUser(user);
 }
 @Public() @Post('login')
 async login(@Body() body:unknown,@Res({passthrough:true}) res:Response){
  const v=parse(credentials,body);const user=await this.db.user.findUnique({where:{email:v.email}});
  const ok=await compare(v.password,user?.passwordHash||'$2b$12$vV/yBsB.cQe9UUYIjJo2S.z9YUPdz42eCU8EIyzEifHeexkoGR7vq');
  if(!user||!ok||!user.isActive)throw new UnauthorizedException('Adresse email ou mot de passe incorrect');
  await this.session(user.id,res);return safeUser(user);
 }
 @Get('me') me(@Req() req:AuthRequest){return req.actor;}
 @Public() @Post('logout') async logout(@Req() req:AuthRequest,@Res({passthrough:true}) res:Response){
  const token=req.cookies?.['mc_session'];if(typeof token==='string'){const sessionId=hashToken(token);await this.db.session.deleteMany({where:{id:sessionId}});this.realtime.disconnectSession(sessionId);}
  res.clearCookie('mc_session',{path:'/api',httpOnly:true,sameSite:'strict',secure:process.env['NODE_ENV']==='production'});return {ok:true};
 }
 @Post('password') async password(@Req() req:AuthRequest,@Body() body:unknown,@Res({passthrough:true}) res:Response){
  const v=parse(changePassword,body);const user=await this.db.user.findUniqueOrThrow({where:{id:req.actor.id}});
  if(!await compare(v.currentPassword,user.passwordHash))throw new UnauthorizedException('Mot de passe actuel incorrect');
  const passwordHash=await hash(v.password,12);
  await this.db.$transaction([this.db.user.update({where:{id:user.id},data:{passwordHash}}),this.db.session.deleteMany({where:{userId:user.id}})]);
  await this.session(user.id,res);res.once('finish',()=>this.realtime.disconnectUser(user.id,false));return {ok:true};
 }
}
