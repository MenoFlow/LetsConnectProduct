// Outils partagés par les tests d'intégration : un vrai serveur Nest, une vraie
// base de test, de vraies requêtes HTTP.
//
// Ce premier import pose DATABASE_URL et FRONTEND_ORIGIN : il doit précéder la
// création de tout client Prisma et du module Nest.
import './test-database';
import {createApp} from '../src/app';
import {PrismaClient} from '@prisma/client';
import {hash} from 'bcryptjs';
import request from 'supertest';
import type {INestApplication} from '@nestjs/common';

/** Origine que le backend accepte pour les écritures. */
export const ORIGIN = process.env['FRONTEND_ORIGIN'] ?? 'http://localhost:3000';
export const PASSWORD = 'password1234';
export const ADMIN_PASSWORD = 'admin-password-123';

export const db = new PrismaClient();

/** Démarre l'application complète (garde de session, CORS, filtres inclus). */
export async function startApp(): Promise<INestApplication> {
 return createApp();
}

/** Récupère la valeur du cookie de session posé par une réponse. */
export function tokenOf(res: {headers: Record<string, unknown>}): string | undefined {
 const raw = res.headers['set-cookie'];
 const cookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
 const session = cookies.find((cookie) => cookie.startsWith('mc_session='));
 return session ? session.split(';')[0].slice('mc_session='.length) : undefined;
}

type Method = 'get' | 'post' | 'patch' | 'delete';

interface CallOptions {
 token?: string;
 body?: object | string;
 /** Origine envoyée ; null pour n'envoyer aucun en-tête Origin. */
 origin?: string | null;
 /** false pour n'envoyer aucun en-tête X-Requested-With. */
 csrf?: boolean;
}

/** Une requête HTTP exactement comme le navigateur frontend l'enverrait. */
export function call(app: INestApplication, method: Method, path: string, options: CallOptions = {}) {
 const agent = request(app.getHttpServer());
 const req =
  method === 'get' ? agent.get(path)
  : method === 'post' ? agent.post(path)
  : method === 'patch' ? agent.patch(path)
  : agent.delete(path);
 if (options.origin !== null) req.set('Origin', options.origin ?? ORIGIN);
 if (options.csrf !== false) req.set('X-Requested-With', 'MaterialConnect');
 if (options.token) req.set('Cookie', `mc_session=${options.token}`);
 if (options.body !== undefined) req.send(options.body);
 return req;
}

/** Vide toutes les tables : chaque test repart d'une base nette. */
export async function reset() {
 await db.$executeRawUnsafe(
  'TRUNCATE "Session","AuditLog","CartItem","Cart","Message","Conversation","Favorite","Activity","CompanyMember","Product","Company","User","Category" CASCADE',
 );
}

/** Connecte un compte et renvoie son jeton de session. */
export async function login(app: INestApplication, email: string, password = PASSWORD) {
 const res = await call(app, 'post', '/api/auth/login', {body: {email, password}});
 return {res, token: tokenOf(res)};
}

export interface Fixtures {
 ownerId: string;
 owner2Id: string;
 editorId: string;
 managerId: string;
 clientId: string;
 adminId: string;
 approvedId: string;
 pendingId: string;
 productId: string;
 draftId: string;
 categoryId: string;
}

/** Jeu minimal mais complet : deux entreprises, trois rôles, deux produits. */
export async function seedFixtures(): Promise<Fixtures> {
 const passwordHash = await hash(PASSWORD, 12);
 const adminHash = await hash(ADMIN_PASSWORD, 12);
 const category = await db.category.create({data: {id: 'cat-metaux', name: 'Métaux industriels'}});
 const [owner, owner2, editor, manager, client] = await Promise.all([
  db.user.create({data: {id: 'u-owner', email: 'owner@test.mg', firstName: 'Owner', lastName: 'Uno', role: 'COMPANY', passwordHash}}),
  db.user.create({data: {id: 'u-owner2', email: 'owner2@test.mg', firstName: 'Owner', lastName: 'Deux', role: 'COMPANY', passwordHash}}),
  db.user.create({data: {id: 'u-editor', email: 'editor@test.mg', firstName: 'Editeur', lastName: 'Test', role: 'COMPANY', passwordHash}}),
  db.user.create({data: {id: 'u-manager', email: 'manager@test.mg', firstName: 'Manager', lastName: 'Test', role: 'COMPANY', passwordHash}}),
  db.user.create({data: {id: 'u-client', email: 'client@test.mg', firstName: 'Client', lastName: 'Test', role: 'CLIENT', passwordHash}}),
 ]);
 const admin = await db.user.create({data: {id: 'u-admin', email: 'admin@test.mg', firstName: 'Admin', lastName: 'Test', role: 'ADMIN', passwordHash: adminHash}});
 const approved = await db.company.create({data: {id: 'co-approved', ownerId: owner.id, name: 'Tany Métaux', slug: 'tany-approuvee', description: 'Négoce de métaux bruts', email: 'tany@test.mg', phone: '+261 34 00 000 01', address: 'Lot II 45 Analakely', city: 'Antananarivo', country: 'Madagascar', businessSector: 'Métaux industriels', status: 'APPROVED', isVerified: true}});
 const pending = await db.company.create({data: {id: 'co-pending', ownerId: owner2.id, name: 'Karibo Minéraux', slug: 'karibo-en-attente', description: 'Extraction de minéraux bruts', email: 'karibo@test.mg', phone: '+261 34 00 000 02', address: 'Route de Talatamaty', city: 'Antananarivo', country: 'Madagascar', businessSector: 'Minéraux', status: 'PENDING', isVerified: false}});
 await db.companyMember.createMany({data: [
  {companyId: approved.id, userId: owner.id, membershipRole: 'OWNER'},
  {companyId: approved.id, userId: editor.id, membershipRole: 'EDITOR'},
  {companyId: approved.id, userId: manager.id, membershipRole: 'MANAGER'},
  {companyId: pending.id, userId: owner2.id, membershipRole: 'OWNER'},
 ]});
 const product = await db.product.create({data: {id: 'p-published', companyId: approved.id, categoryId: category.id, name: 'Cuivre cathode', description: 'Cuivre industriel grade A', images: [], unit: 'tonne', unitPrice: 6200, availability: 'AVAILABLE', status: 'PUBLISHED'}});
 const draft = await db.product.create({data: {id: 'p-draft', companyId: approved.id, categoryId: category.id, name: 'Minerai de fer', description: 'Minerai brut non transformé', images: [], unit: 'tonne', unitPrice: 45000, availability: 'AVAILABLE', status: 'DRAFT'}});
 return {
  ownerId: owner.id, owner2Id: owner2.id, editorId: editor.id, managerId: manager.id, clientId: client.id, adminId: admin.id,
  approvedId: approved.id, pendingId: pending.id, productId: product.id, draftId: draft.id, categoryId: category.id,
 };
}

/** Corps de produit valide, que l'on peut détourner test par test. */
export function productBody(overrides: Record<string, unknown> = {}) {
 return {
  companyId: 'co-approved',
  categoryId: 'cat-metaux',
  name: 'Nickel brut',
  description: 'Nickel industriel en briquettes',
  images: [],
  unit: 'tonne',
  unitPrice: 95000,
  availability: 'AVAILABLE',
  status: 'PUBLISHED',
  ...overrides,
 };
}
