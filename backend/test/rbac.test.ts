// Rôles et permissions : ce que chaque compte peut réellement faire côté
// serveur. Le frontend masque des boutons, mais c'est ici que la règle tient.
import {describe, it, expect, beforeAll, afterAll, beforeEach} from 'vitest';
import {startApp, call, reset, seedFixtures, login, db, productBody} from './helpers';
import type {INestApplication} from '@nestjs/common';

describe('rôles et permissions', () => {
 let app: INestApplication;
 let owner: string, owner2: string, editor: string, manager: string, client: string, admin: string;

 beforeAll(async () => { app = await startApp(); });
 afterAll(async () => { await app?.close(); await db.$disconnect(); });
 beforeEach(async () => {
  await reset();
  const fixtures = await seedFixtures();
  owner = fixtures.ownerId; owner2 = fixtures.owner2Id; editor = fixtures.editorId;
  manager = fixtures.managerId; client = fixtures.clientId; admin = fixtures.adminId;
 });

 it('refuse la création de produit à un client', async () => {
  const {token} = await login(app, 'client@test.mg');
  const res = await call(app, 'post', '/api/products', {token, body: productBody()});
  expect(res.status).toBe(403);
  expect(await db.product.count({where: {name: 'Nickel brut'}})).toBe(0);
 });

 it('refuse la création de produit au propriétaire d une autre entreprise', async () => {
  const {token} = await login(app, 'owner2@test.mg');
  const res = await call(app, 'post', '/api/products', {token, body: productBody()});
  expect(res.status).toBe(403);
 });

 it('laisse un éditeur publier un produit mais pas modifier la fiche entreprise', async () => {
  const {token} = await login(app, 'editor@test.mg');
  const created = await call(app, 'post', '/api/products', {token, body: productBody()});
  expect(created.status).toBe(201);
  const patch = await call(app, 'patch', '/api/companies/co-approved', {token, body: {description: 'Description détournée'}});
  expect(patch.status).toBe(403);
  expect((await db.company.findUnique({where: {id: 'co-approved'}}))?.description).toBe('Négoce de métaux bruts');
 });

 it('laisse un manager modifier la fiche entreprise mais pas ajouter un membre', async () => {
  const {token} = await login(app, 'manager@test.mg');
  const patch = await call(app, 'patch', '/api/companies/co-approved', {token, body: {phone: '+261 34 11 22 33'}});
  expect(patch.status).toBe(200);
  expect(patch.body.phone).toBe('+261 34 11 22 33');
  const add = await call(app, 'post', '/api/members', {token, body: {userId: editor, companyId: 'co-approved', membershipRole: 'EDITOR'}});
  expect(add.status).toBe(403);
 });

 it('refuse la validation d entreprise à qui n est pas administrateur', async () => {
  const {token} = await login(app, 'owner@test.mg');
  const res = await call(app, 'post', '/api/companies/co-pending/review', {token, body: {status: 'APPROVED'}});
  expect(res.status).toBe(403);
  expect((await db.company.findUnique({where: {id: 'co-pending'}}))?.status).toBe('PENDING');
 });

 it('approuve une demande en attente et marque l entreprise vérifiée', async () => {
  const {token} = await login(app, 'admin@test.mg', 'admin-password-123');
  const res = await call(app, 'post', '/api/companies/co-pending/review', {token, body: {status: 'APPROVED'}});
  expect(res.status).toBe(201);
  expect(res.body.status).toBe('APPROVED');
  expect(res.body.isVerified).toBe(true);
 });

 it('refuse une transition de statut impossible', async () => {
  const {token} = await login(app, 'admin@test.mg', 'admin-password-123');
  const res = await call(app, 'post', '/api/companies/co-approved/review', {token, body: {status: 'REJECTED', note: 'Hors périmètre'}});
  expect(res.status).toBe(409);
 });

 it('exige un motif pour un refus', async () => {
  const {token} = await login(app, 'admin@test.mg', 'admin-password-123');
  const res = await call(app, 'post', '/api/companies/co-pending/review', {token, body: {status: 'REJECTED'}});
  expect(res.status).toBe(400);
 });

 it('empêche un administrateur de se suspendre lui-même ou de suspendre un pair', async () => {
  const {token} = await login(app, 'admin@test.mg', 'admin-password-123');
  expect((await call(app, 'patch', '/api/users/u-admin/active', {token, body: {isActive: false}})).status).toBe(400);
  await db.user.create({data: {id: 'u-admin2', email: 'admin2@test.mg', firstName: 'Admin', lastName: 'Deux', role: 'ADMIN', passwordHash: (await db.user.findUniqueOrThrow({where: {id: 'u-admin'}})).passwordHash}});
  expect((await call(app, 'patch', '/api/users/u-admin2/active', {token, body: {isActive: false}})).status).toBe(403);
 });

 it('suspend un compte client et coupe sa session en cours', async () => {
  const clientSession = await login(app, 'client@test.mg');
  const {token} = await login(app, 'admin@test.mg', 'admin-password-123');
  const res = await call(app, 'patch', '/api/users/u-client/active', {token, body: {isActive: false}});
  expect(res.status).toBe(200);
  expect(res.body.isActive).toBe(false);
  expect((await call(app, 'get', '/api/auth/me', {token: clientSession.token})).status).toBe(401);
 });

 it('ajoute puis retire un favori côté client, et refuse une entreprise non publiée', async () => {
  const {token} = await login(app, 'client@test.mg');
  const added = await call(app, 'post', '/api/favorites/co-approved/toggle', {token});
  expect(added.status).toBe(201);
  expect(await db.favorite.count({where: {userId: client, companyId: 'co-approved'}})).toBe(1);
  const removed = await call(app, 'post', '/api/favorites/co-approved/toggle', {token});
  // Un POST répond 201 dans les deux sens : c'est le contenu de la base qui
  // prouve que le favori a bien été retiré.
  expect(removed.status).toBe(201);
  expect(removed.body.id).toBe(added.body.id);
  expect(await db.favorite.count({where: {userId: client, companyId: 'co-approved'}})).toBe(0);
  expect((await call(app, 'post', '/api/favorites/co-pending/toggle', {token})).status).toBe(400);
  const asCompany = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/favorites/co-approved/toggle', {token: asCompany.token})).status).toBe(403);
 });

 it('recherche un compte entreprise pour l ajouter comme membre, et seulement pour le propriétaire', async () => {
  const {token} = await login(app, 'owner@test.mg');
  const found = await call(app, 'get', '/api/companies/co-approved/member-lookup?email=owner2@test.mg', {token});
  expect(found.status).toBe(200);
  expect(found.body.id).toBe(owner2);
  expect(found.body.passwordHash).toBeUndefined();
  expect((await call(app, 'get', '/api/companies/co-approved/member-lookup?email=client@test.mg', {token})).status).toBe(404);
  const asEditor = await login(app, 'editor@test.mg');
  expect((await call(app, 'get', '/api/companies/co-approved/member-lookup?email=owner2@test.mg', {token: asEditor.token})).status).toBe(403);
 });

 it('réserve la gestion des catégories à l administrateur', async () => {
  const {token} = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/categories', {token, body: {name: 'Fibres végétales'}})).status).toBe(403);
  const asAdmin = await login(app, 'admin@test.mg', 'admin-password-123');
  expect((await call(app, 'post', '/api/categories', {token: asAdmin.token, body: {name: 'Fibres végétales'}})).status).toBe(201);
 });

 it('ne montre à un client que les comptes dont il a besoin, tout à l administrateur', async () => {
  const asClient = await login(app, 'client@test.mg');
  const clientUsers = await call(app, 'get', '/api/users', {token: asClient.token});
  expect(clientUsers.status).toBe(200);
  expect(clientUsers.body.map((u: {id: string}) => u.id)).not.toContain(owner);
  const asAdmin = await login(app, 'admin@test.mg', 'admin-password-123');
  const adminUsers = await call(app, 'get', '/api/users', {token: asAdmin.token});
  expect(adminUsers.body.map((u: {id: string}) => u.id)).toContain(owner);
 });
});
