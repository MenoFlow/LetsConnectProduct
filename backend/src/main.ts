import {createApp} from './app';

async function bootstrap(){
 if(!process.env['DATABASE_URL']||!process.env['FRONTEND_ORIGIN'])throw new Error('DATABASE_URL et FRONTEND_ORIGIN sont requis');
 const app=await createApp();
 await app.listen(Number(process.env['PORT']||4000),'0.0.0.0');
}
bootstrap().catch(error=>{console.error(error);process.exitCode=1;});
