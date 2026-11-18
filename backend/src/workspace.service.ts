import {Injectable,NotFoundException,ForbiddenException,BadRequestException,ConflictException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from './prisma.service';
import {Actor,assertAdmin,assertClient,assertMembership,safeUser} from './security';
import * as v from './validation';

@Injectable()
export class WorkspaceService {
 constructor(private readonly db:PrismaService){}
 async companyAccess(actor:Actor,companyId:string,allowed=['OWNER','MANAGER','EDITOR']){
  const company=await this.db.company.findUnique({where:{id:companyId}});
  if(!company)throw new NotFoundException('Entreprise introuvable');
  const membership=await this.db.companyMember.findUnique({where:{companyId_userId:{companyId,userId:actor.id}}});
  assertMembership(actor,membership?.membershipRole,allowed);
  // Une entreprise suspendue ne peut plus rien modifier tant qu'un administrateur ne l'a pas réactivée.
  if(actor.role!=='ADMIN'&&company.status==='SUSPENDED')throw new ForbiddenException('Entreprise suspendue : modification impossible');
  return company;
 }
 async conversationAccess(actor:Actor,id:string){
  const conversation=await this.db.conversation.findUnique({where:{id}});
  if(!conversation)throw new NotFoundException('Conversation introuvable');
  if(actor.role!=='ADMIN'&&conversation.clientId!==actor.id)await this.companyAccess(actor,conversation.companyId);
  return conversation;
 }
 async snapshot(actor?:Actor){
  const memberIds=actor ? (await this.db.companyMember.findMany({where:{userId:actor.id}})).map(m=>m.companyId):[];
  const admin=actor?.role==='ADMIN';
  const companies=await this.db.company.findMany({where:admin?{}:{OR:[{status:'APPROVED'},{id:{in:memberIds}}]},orderBy:{createdAt:'desc'},take:2000});
  const products=await this.db.product.findMany({where:admin?{}:{OR:[{status:'PUBLISHED',company:{status:'APPROVED'}},{companyId:{in:memberIds}}]},take:5000});
  const conversationWhere=admin?{}:{OR:[{clientId:actor?.id||'__none__'},{companyId:{in:memberIds}}]};
  const conversations=actor?await this.db.conversation.findMany({where:conversationWhere,orderBy:{updatedAt:'desc'},take:2000}):[];
  const messages=actor?await this.db.message.findMany({where:{conversationId:{in:conversations.map(c=>c.id)}},orderBy:{createdAt:'asc'},take:10000}):[];
  const companyMembers=actor?await this.db.companyMember.findMany({where:admin?{}:{companyId:{in:memberIds}}}):[];
  const userIds=[actor?.id,...companyMembers.map(m=>m.userId),...conversations.map(c=>c.clientId),...messages.map(m=>m.senderUserId)].filter((id):id is string=>!!id);
  const users=actor?await this.db.user.findMany({where:admin?{}:{id:{in:userIds}},take:2000}):[];
  const favorites=actor?await this.db.favorite.findMany({where:admin?{}:{userId:actor.id}}):[];
  const statCompanyIds=admin?undefined:companyMembers.filter(m=>m.userId===actor?.id&&m.membershipRole!=='EDITOR').map(m=>m.companyId);
  const activity=actor?await this.db.activity.findMany({where:admin?{}:{companyId:{in:statCompanyIds}},take:2000}):[];
  const carts=actor?.role==='CLIENT'?await this.db.cart.findMany({where:{userId:actor.id},include:{items:{include:{product:{select:{companyId:true}}}}}}):[];
  // Public company payload deliberately excludes moderation notes and owner IDs.
  const publicCompanies=companies.map(c=>{
   if(admin||memberIds.includes(c.id))return c;
   const {reviewNote,reviewedAt,submittedAt,ownerId,...publicCompany}=c;return {...publicCompany,ownerId:''};
  });
  return {users:users.map(safeUser),companies:publicCompanies,products:products.map(p=>({...p,unitPrice:Number(p.unitPrice)})),categories:await this.db.category.findMany(),companyMembers,conversations,messages,favorites,activity,carts:carts.map(c=>({...c,items:c.items.map(({product,...i})=>({...i,companyId:product.companyId,unitPriceSnapshot:Number(i.unitPriceSnapshot)}))}))};
 }
 async companyUpdate(actor:Actor,id:string,body:unknown){await this.companyAccess(actor,id,['OWNER','MANAGER']);const data=v.parse(v.companyPatch,body);return this.db.company.update({where:{id},data});}
 async review(actor:Actor,id:string,body:unknown){
  assertAdmin(actor);const data=v.parse(v.review,body);
  return this.db.$transaction(async tx=>{
   const c=await tx.company.findUniqueOrThrow({where:{id}});
   const allowed=data.status==='APPROVED'?['PENDING','SUSPENDED']:data.status==='REJECTED'?['PENDING']:['APPROVED'];
   if(!allowed.includes(c.status))throw new ConflictException('Transition de statut non autorisée');
   const next=await tx.company.update({where:{id},data:{status:data.status,isVerified:data.status==='APPROVED',reviewNote:data.note||null,reviewedAt:new Date()}});
   await tx.auditLog.create({data:{actorId:actor.id,action:`company.${data.status}`,targetId:id}});return next;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async resubmit(actor:Actor,id:string){await this.companyAccess(actor,id,['OWNER','MANAGER']);const result=await this.db.company.updateMany({where:{id,status:'REJECTED'},data:{status:'PENDING',submittedAt:new Date(),reviewedAt:null}});if(!result.count)throw new ConflictException('Seule une demande refusée peut être renvoyée');return {ok:true};}
 async companyDelete(actor:Actor,id:string){assertAdmin(actor);await this.db.$transaction([this.db.company.delete({where:{id}}),this.db.auditLog.create({data:{actorId:actor.id,action:'company.delete',targetId:id}})]);return {ok:true};}
 async productSave(actor:Actor,body:unknown,id?:string){
  const data=v.parse(v.product,body);await this.companyAccess(actor,data.companyId);
  if(id){const old=await this.db.product.findUniqueOrThrow({where:{id}});if(old.companyId!==data.companyId)throw new ForbiddenException('Changement d’entreprise interdit');}
  const {id:ignored,...values}=data;
  return id?this.db.product.update({where:{id},data:values}):this.db.product.create({data:values});
 }
 async productDelete(actor:Actor,id:string){const p=await this.db.product.findUniqueOrThrow({where:{id}});await this.companyAccess(actor,p.companyId);return this.db.product.delete({where:{id}});}
 async categorySave(actor:Actor,body:unknown,id?:string){assertAdmin(actor);const {id:ignored,...data}=v.parse(v.category,body);return id?this.db.category.update({where:{id},data}):this.db.category.create({data});}
 async categoryDelete(actor:Actor,id:string){assertAdmin(actor);const used=await this.db.product.count({where:{categoryId:id}});if(used)throw new BadRequestException(`Catégorie utilisée par ${used} produit(s) : déplacez-les avant suppression`);return this.db.category.delete({where:{id}});}
 async userUpdate(actor:Actor,id:string,body:unknown){if(actor.id!==id)assertAdmin(actor);return safeUser(await this.db.user.update({where:{id},data:v.parse(v.userPatch,body)}));}
 async userActive(actor:Actor,id:string,body:unknown){assertAdmin(actor);const data=v.parse(v.active,body);if(id===actor.id)throw new BadRequestException('Vous ne pouvez pas suspendre votre propre compte');return this.db.$transaction(async tx=>{const u=await tx.user.findUniqueOrThrow({where:{id}});if(u.role==='ADMIN')throw new ForbiddenException('Suspension d’un administrateur interdite');const user=await tx.user.update({where:{id},data});if(!data.isActive)await tx.session.deleteMany({where:{userId:id}});await tx.auditLog.create({data:{actorId:actor.id,action:`user.active.${data.isActive}`,targetId:id}});return safeUser(user);});}
 async userDelete(actor:Actor,id:string){assertAdmin(actor);const user=await this.db.user.findUniqueOrThrow({where:{id}});if(user.role==='ADMIN')throw new ForbiddenException('Suppression d’un administrateur interdite');const history=await this.db.message.count({where:{senderUserId:id}})+await this.db.conversation.count({where:{clientId:id}})+await this.db.company.count({where:{ownerId:id}});if(history)throw new ConflictException('Ce compte a un historique : suspendez-le au lieu de le supprimer');return safeUser(await this.db.user.delete({where:{id}}));}
 async memberSave(actor:Actor,body:unknown,id?:string){const data=v.parse(v.member,body);await this.companyAccess(actor,data.companyId,['OWNER']);const user=await this.db.user.findUniqueOrThrow({where:{id:data.userId}});if(user.role!=='COMPANY'||!user.isActive)throw new BadRequestException('Compte entreprise actif requis');if(id){const old=await this.db.companyMember.findUniqueOrThrow({where:{id}});if(old.companyId!==data.companyId||old.userId!==data.userId||old.membershipRole==='OWNER')throw new ForbiddenException('Modification du propriétaire interdite');return this.db.companyMember.update({where:{id},data:{membershipRole:data.membershipRole}});}return this.db.companyMember.create({data});}
 async memberDelete(actor:Actor,id:string){const m=await this.db.companyMember.findUniqueOrThrow({where:{id}});await this.companyAccess(actor,m.companyId,['OWNER']);if(m.membershipRole==='OWNER')throw new ForbiddenException('Le propriétaire ne peut pas être retiré');return this.db.companyMember.delete({where:{id}});}
 async memberLookup(actor:Actor,companyId:string,email:string){await this.companyAccess(actor,companyId,['OWNER']);if(email.length>254)throw new BadRequestException();const user=await this.db.user.findUnique({where:{email:email.trim().toLowerCase()}});if(!user||user.role!=='COMPANY'||!user.isActive)throw new NotFoundException('Compte entreprise actif introuvable');return safeUser(user);}
 async favorite(actor:Actor,companyId:string){assertClient(actor);const company=await this.db.company.findUniqueOrThrow({where:{id:companyId}});const where={userId_companyId:{userId:actor.id,companyId}};const old=await this.db.favorite.findUnique({where});if(old)return this.db.favorite.delete({where});if(company.status!=='APPROVED')throw new BadRequestException('Entreprise non publiée');return this.db.favorite.create({data:{userId:actor.id,companyId}});}
 async conversationCreate(actor:Actor,body:unknown){assertClient(actor);const data=v.parse(v.conversation,body);const company=await this.db.company.findUniqueOrThrow({where:{id:data.companyId}});if(company.status!=='APPROVED')throw new BadRequestException('Entreprise non publiée');return this.db.conversation.create({data:{companyId:data.companyId,subject:data.subject,clientId:actor.id,messages:{create:{senderUserId:actor.id,body:data.body}}},include:{messages:true}});}
 async conversationUpdate(actor:Actor,id:string,body:unknown){await this.conversationAccess(actor,id);const data=v.parse(v.conversation.pick({subject:true}),body);return this.db.conversation.update({where:{id},data});}
 async conversationDelete(actor:Actor,id:string){await this.conversationAccess(actor,id);return this.db.conversation.delete({where:{id}});}
 async messageCreate(actor:Actor,id:string,body:unknown){const c=await this.conversationAccess(actor,id);const data=v.parse(v.message,body);return this.db.$transaction(async tx=>{const message=await tx.message.create({data:{conversationId:id,senderUserId:actor.id,...data}});await tx.conversation.update({where:{id},data:{updatedAt:new Date()}});const date=new Date();date.setUTCHours(0,0,0,0);await tx.activity.upsert({where:{companyId_date:{companyId:c.companyId,date}},create:{companyId:c.companyId,date,messages:1},update:{messages:{increment:1}}});return message;});}
 async messageUpdate(actor:Actor,id:string,body:unknown){const message=await this.db.message.findUniqueOrThrow({where:{id}});await this.conversationAccess(actor,message.conversationId);if(message.senderUserId!==actor.id)throw new ForbiddenException('Seul l’auteur peut modifier ce message');return this.db.message.update({where:{id},data:v.parse(v.message,body)});}
 async messageDelete(actor:Actor,id:string){const message=await this.db.message.findUniqueOrThrow({where:{id}});await this.conversationAccess(actor,message.conversationId);if(message.senderUserId!==actor.id)assertAdmin(actor);return this.db.message.delete({where:{id}});}
 async markRead(actor:Actor,id:string){await this.conversationAccess(actor,id);await this.db.message.updateMany({where:{conversationId:id,senderUserId:{not:actor.id},readAt:null},data:{readAt:new Date()}});return {ok:true};}
 async cartAdd(actor:Actor,body:unknown){assertClient(actor);const data=v.parse(v.cartItem,body);return this.db.$transaction(async tx=>{const p=await tx.product.findUniqueOrThrow({where:{id:data.productId},include:{company:true}});if(p.status!=='PUBLISHED'||p.company.status!=='APPROVED'||p.availability==='UNAVAILABLE')throw new BadRequestException('Produit non disponible');const cart=await tx.cart.upsert({where:{userId:actor.id},create:{userId:actor.id},update:{}});const where={cartId_productId:{cartId:cart.id,productId:p.id}};const old=await tx.cartItem.findUnique({where});if((old?.quantity||0)+data.quantity>100000)throw new BadRequestException('Quantité maximale dépassée');return tx.cartItem.upsert({where,create:{cartId:cart.id,productId:p.id,quantity:data.quantity,unitPriceSnapshot:p.unitPrice},update:{quantity:{increment:data.quantity}}});},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});}
 async cartQuantity(actor:Actor,id:string,body:unknown){assertClient(actor);const data=v.parse(v.quantity,body);const item=await this.db.cartItem.findFirst({where:{id,cart:{userId:actor.id}}});if(!item)throw new NotFoundException('Ligne introuvable');return this.db.cartItem.update({where:{id},data});}
 async cartDelete(actor:Actor,id?:string){assertClient(actor);await this.db.cartItem.deleteMany({where:{...(id?{id}:{}),cart:{userId:actor.id}}});return {ok:true};}
 async cartRead(actor:Actor){assertClient(actor);const cart=await this.db.cart.findUnique({where:{userId:actor.id},include:{items:{include:{product:{include:{company:true}}}}}});
  const items=(cart?.items||[]).map(i=>{const unitPrice=Number(i.product.unitPrice);const unitPriceSnapshot=Number(i.unitPriceSnapshot);const available=i.product.status==='PUBLISHED'&&i.product.company.status==='APPROVED'&&i.product.availability!=='UNAVAILABLE';return {id:i.id,quantity:i.quantity,unitPriceSnapshot,unitPrice,priceChanged:unitPrice!==unitPriceSnapshot,subtotal:unitPrice*i.quantity,companyId:i.product.companyId,productId:i.productId,available};});
  // Le total indicatif ne compte que les articles encore disponibles.
  return {id:cart?.id,items,total:items.filter(i=>i.available).reduce((sum,i)=>sum+i.subtotal,0),indicative:true};}
}
