// Fabrique de l'application : module Nest et configuration HTTP réunis au même
// endroit, pour que les tests démarrent exactement le même serveur que la
// commande de démarrage.
import 'reflect-metadata';
import {Module,INestApplication} from '@nestjs/common';
import {NestFactory,APP_GUARD} from '@nestjs/core';
import {ThrottlerGuard,ThrottlerModule} from '@nestjs/throttler';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {json} from 'express';
import {PrismaService} from './prisma.service';
import {SessionGuard} from './security';
import {Errors} from './errors';
import {AuthController} from './auth.controller';
import {WorkspaceController} from './workspace.controller';
import {WorkspaceService} from './workspace.service';

@Module({imports:[ThrottlerModule.forRoot([{name:'default',ttl:60000,limit:120}])],controllers:[AuthController,WorkspaceController],providers:[PrismaService,WorkspaceService,{provide:APP_GUARD,useClass:ThrottlerGuard},{provide:APP_GUARD,useClass:SessionGuard}]})
export class AppModule {}

/** Crée et configure l'application, sans l'écouter : les tests s'en servent. */
export async function createApp(): Promise<INestApplication> {
 const app=await NestFactory.create(AppModule,{bodyParser:false});
 app.use(helmet());
 app.use(json({limit:'128kb'}));
 app.use(cookieParser());
 app.enableCors({origin:process.env['FRONTEND_ORIGIN'],credentials:true,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-Requested-With']});
 app.setGlobalPrefix('api');
 app.useGlobalFilters(new Errors());
 app.enableShutdownHooks();
 await app.init();
 return app;
}
