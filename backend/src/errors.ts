import {ArgumentsHost,Catch,ExceptionFilter,HttpException,Logger} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import type {Response} from 'express';
@Catch()
export class Errors implements ExceptionFilter {
 private logger=new Logger('HTTP');
 catch(error:unknown,host:ArgumentsHost){
  const id=randomUUID(); let status=500; let message:unknown='Erreur interne. Réessayez ultérieurement.';
  if(error instanceof HttpException){status=error.getStatus();message=error.getResponse();}
  else if(error instanceof Prisma.PrismaClientKnownRequestError){
   if(['P2002','P2003','P2034'].includes(error.code)){status=409;message='Conflit : référence utilisée, doublon ou modification concurrente.';}
   if(error.code==='P2025'){status=404;message='Élément introuvable';}
  }
  if(status===500)this.logger.error(`request ${id}`,error instanceof Error?error.stack:String(error));
  host.switchToHttp().getResponse<Response>().status(status).json({statusCode:status,message,requestId:id});
 }
}
