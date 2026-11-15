// Données de départ de la base.
//
// Deux choses sont créées :
//  - le compte administrateur, à partir de ADMIN_EMAIL et ADMIN_PASSWORD (le
//    mot de passe doit faire au moins 12 caractères) ;
//  - le jeu de démonstration (comptes des trois rôles, entreprises, produits,
//    catégories, conversations, favoris, statistiques) lu dans seed-data.json.
//
// Chaque écriture est un upsert sur un identifiant explicite : relancer la
// commande ne crée jamais de doublon. Les comptes de démonstration partagent
// un mot de passe volontairement faible : ils ne doivent pas exister en
// production.
import {PrismaClient} from '@prisma/client';
import {hash} from 'bcryptjs';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const db=new PrismaClient();

interface SeedUser {id:string;firstName:string;lastName:string;email:string;phone?:string;avatar?:string;role:'CLIENT'|'COMPANY'|'ADMIN';isActive:boolean;createdAt:string}
interface SeedCompany {id:string;ownerId:string;name:string;slug:string;description:string;logo?:string;coverImage?:string;email:string;phone:string;website?:string;address:string;city:string;country:string;businessSector:string;status:'PENDING'|'APPROVED'|'REJECTED'|'SUSPENDED';isVerified:boolean;createdAt:string;region?:string;hours?:string;reviewNote?:string;reviewedAt?:string;submittedAt?:string}
interface SeedMember {id:string;userId:string;companyId:string;membershipRole:'OWNER'|'MANAGER'|'EDITOR'}
interface SeedCategory {id:string;name:string}
interface SeedProduct {id:string;companyId:string;categoryId:string;name:string;description:string;images:string[];unit:string;unitPrice:number;availability:'AVAILABLE'|'UNAVAILABLE'|'ON_REQUEST';status:'DRAFT'|'PUBLISHED'|'ARCHIVED';createdAt:string;specs?:string}
interface SeedFavorite {id:string;userId:string;companyId:string;createdAt:string}
interface SeedActivity {id:string;companyId:string;date:string;profileViews:number;productViews:number;messages:number}
interface SeedConversation {id:string;companyId:string;clientId:string;subject:string;createdAt:string;updatedAt:string}
interface SeedMessage {id:string;conversationId:string;senderUserId:string;body:string;createdAt:string;readAt?:string}

interface SeedData {
 DEMO_PASSWORD:string;
 users:SeedUser[];
 companies:SeedCompany[];
 companyMembers:SeedMember[];
 categories:SeedCategory[];
 products:SeedProduct[];
 favorites:SeedFavorite[];
 activity:SeedActivity[];
 conversations:SeedConversation[];
 messages:SeedMessage[];
}

const date=(value:string)=>new Date(value);

async function main(){
 const email=process.env['ADMIN_EMAIL'];const password=process.env['ADMIN_PASSWORD'];
 if(!email||!password||password.length<12)throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD (12 caractères minimum) requis');

 const data=JSON.parse(readFileSync(join(process.cwd(),'prisma','seed-data.json'),'utf8')) as SeedData;
 const demoPasswordHash=await hash(data.DEMO_PASSWORD,12);

 for(const category of data.categories){
  await db.category.upsert({where:{id:category.id},create:{id:category.id,name:category.name},update:{name:category.name}});
 }
 for(const user of data.users){
  await db.user.upsert({where:{id:user.id},create:{id:user.id,firstName:user.firstName,lastName:user.lastName,email:user.email.toLowerCase(),phone:user.phone,avatar:user.avatar,role:user.role,isActive:user.isActive,passwordHash:demoPasswordHash},update:{firstName:user.firstName,lastName:user.lastName,email:user.email.toLowerCase(),phone:user.phone,avatar:user.avatar,role:user.role,isActive:user.isActive,passwordHash:demoPasswordHash}});
 }
 // Compte administrateur : créé s'il est inconnu. Si ADMIN_EMAIL correspond à
 // un compte de démonstration, ce compte est réutilisé et son mot de passe
 // devient ADMIN_PASSWORD, ce qui évite tout doublon d'adresse.
 const adminHash=await hash(password,12);
 await db.user.upsert({where:{email:email.toLowerCase()},create:{email:email.toLowerCase(),passwordHash:adminHash,role:'ADMIN',firstName:'Administrateur',lastName:'Plateforme'},update:{passwordHash:adminHash,role:'ADMIN',isActive:true}});
 for(const company of data.companies){
  const values={ownerId:company.ownerId,name:company.name,slug:company.slug,description:company.description,logo:company.logo,coverImage:company.coverImage,email:company.email,phone:company.phone,website:company.website,address:company.address,city:company.city,country:company.country,businessSector:company.businessSector,status:company.status,isVerified:company.isVerified,region:company.region,hours:company.hours,reviewNote:company.reviewNote,reviewedAt:company.reviewedAt?date(company.reviewedAt):undefined,submittedAt:company.submittedAt?date(company.submittedAt):undefined};
  await db.company.upsert({where:{id:company.id},create:{id:company.id,...values},update:values});
 }
 for(const member of data.companyMembers){
  await db.companyMember.upsert({where:{companyId_userId:{companyId:member.companyId,userId:member.userId}},create:{companyId:member.companyId,userId:member.userId,membershipRole:member.membershipRole},update:{membershipRole:member.membershipRole}});
 }
 for(const product of data.products){
  const values={companyId:product.companyId,categoryId:product.categoryId,name:product.name,description:product.description,images:product.images,unit:product.unit,unitPrice:product.unitPrice,availability:product.availability,status:product.status,specs:product.specs};
  await db.product.upsert({where:{id:product.id},create:{id:product.id,...values},update:values});
 }
 for(const favorite of data.favorites){
  await db.favorite.upsert({where:{userId_companyId:{userId:favorite.userId,companyId:favorite.companyId}},create:{userId:favorite.userId,companyId:favorite.companyId},update:{}});
 }
 for(const record of data.activity){
  const values={companyId:record.companyId,date:date(record.date),profileViews:record.profileViews,productViews:record.productViews,messages:record.messages};
  await db.activity.upsert({where:{companyId_date:{companyId:record.companyId,date:date(record.date)}},create:values,update:{profileViews:record.profileViews,productViews:record.productViews,messages:record.messages}});
 }
 for(const conversation of data.conversations){
  const values={companyId:conversation.companyId,clientId:conversation.clientId,subject:conversation.subject,updatedAt:date(conversation.updatedAt)};
  await db.conversation.upsert({where:{id:conversation.id},create:{id:conversation.id,createdAt:date(conversation.createdAt),...values},update:values});
 }
 for(const message of data.messages){
  const values={conversationId:message.conversationId,senderUserId:message.senderUserId,body:message.body,readAt:message.readAt?date(message.readAt):undefined};
  await db.message.upsert({where:{id:message.id},create:{id:message.id,createdAt:date(message.createdAt),...values},update:values});
 }

 console.log(`Seed terminé : ${data.users.length} comptes (mot de passe commun « ${data.DEMO_PASSWORD} »), ${data.companies.length} entreprises, ${data.products.length} produits.`);
}

main().finally(()=>db.$disconnect()).catch(e=>{console.error(e);process.exitCode=1;});
