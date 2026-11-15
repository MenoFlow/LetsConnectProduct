// Produits, ce qui est visible publiquement, panier et demandes de devis :
// les règles qui décident ce qu'un visiteur ou un client peut obtenir.
import {describe, it, expect, beforeAll, afterAll, beforeEach} from 'vitest';
import {startApp, call, reset, seedFixtures, login, db, productBody} from './helpers';
import type {INestApplication} from '@nestjs/common';

describe('produits, vitrine, panier et devis', () => {
 let app: INestApplication;

 beforeAll(async () => { app = await startApp(); });
 afterAll(async () => { await app?.close(); await db.$disconnect(); });
 beforeEach(async () => { await reset(); await seedFixtures(); });

 it('enregistre un produit pour l entreprise de son propriétaire', async () => {
  const {token} = await login(app, 'owner@test.mg');
  const res = await call(app, 'post', '/api/products', {token, body: productBody()});
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Nickel brut');
  expect(Number(res.body.unitPrice)).toBe(95000);
  expect(await db.product.count({where: {companyId: 'co-approved'}})).toBe(3);
 });

 it('refuse un champ inconnu, un prix négatif et un prix qui n est pas un nombre', async () => {
  const {token} = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/products', {token, body: productBody({createdAt: '2026-01-01'})})).status).toBe(400);
  expect((await call(app, 'post', '/api/products', {token, body: productBody({unitPrice: -1})})).status).toBe(400);
  expect((await call(app, 'post', '/api/products', {token, body: productBody({unitPrice: '95000'})})).status).toBe(400);
  expect(await db.product.count({where: {name: 'Nickel brut'}})).toBe(0);
 });

 it('refuse un produit dans une entreprise inconnue', async () => {
  const {token} = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/products', {token, body: productBody({companyId: 'co-inconnue'})})).status).toBe(404);
 });

 it('interdit de déplacer un produit dans une autre entreprise', async () => {
  const {token} = await login(app, 'owner@test.mg');
  const res = await call(app, 'patch', '/api/products/p-published', {token, body: productBody({companyId: 'co-pending'})});
  expect(res.status).toBe(403);
  expect((await db.product.findUnique({where: {id: 'p-published'}}))?.companyId).toBe('co-approved');
 });

 it('supprime un produit', async () => {
  const {token} = await login(app, 'owner@test.mg');
  expect((await call(app, 'delete', '/api/products/p-draft', {token})).status).toBe(200);
  expect(await db.product.findUnique({where: {id: 'p-draft'}})).toBeNull();
 });

 it('n expose publiquement que les produits publiés des entreprises approuvées', async () => {
  const res = await call(app, 'get', '/api/public/snapshot');
  expect(res.status).toBe(200);
  expect(res.body.products.map((p: {id: string}) => p.id)).toContain('p-published');
  expect(res.body.products.map((p: {id: string}) => p.id)).not.toContain('p-draft');
  expect(res.body.companies.map((c: {id: string}) => c.id)).toContain('co-approved');
  expect(res.body.companies.map((c: {id: string}) => c.id)).not.toContain('co-pending');
  // La vitrine publique ne divulgue ni note de modération ni date de dépôt.
  const approved = res.body.companies.find((c: {id: string}) => c.id === 'co-approved');
  expect(approved.reviewNote).toBeUndefined();
  expect(approved.submittedAt).toBeUndefined();
 });

 it('ajoute un produit publié au panier et calcule un total', async () => {
  const {token} = await login(app, 'client@test.mg');
  const added = await call(app, 'post', '/api/cart/items', {token, body: {productId: 'p-published', quantity: 2}});
  expect(added.status).toBe(201);
  const cart = await call(app, 'get', '/api/cart', {token});
  expect(cart.status).toBe(200);
  expect(cart.body.items).toHaveLength(1);
  expect(cart.body.items[0].quantity).toBe(2);
  expect(cart.body.total).toBe(12400);
 });

 it('refuse un produit non publié et une entreprise qui n est pas cliente', async () => {
  const {token} = await login(app, 'client@test.mg');
  expect((await call(app, 'post', '/api/cart/items', {token, body: {productId: 'p-draft', quantity: 1}})).status).toBe(400);
  const asCompany = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/cart/items', {token: asCompany.token, body: {productId: 'p-published', quantity: 1}})).status).toBe(403);
 });

 it('ouvre une conversation avec sa première message pour une entreprise publiée', async () => {
  const {token} = await login(app, 'client@test.mg');
  const res = await call(app, 'post', '/api/conversations', {token, body: {companyId: 'co-approved', subject: 'Prix de 40 sacs', body: 'Bonjour, quel prix pour 40 sacs ?'}});
  expect(res.status).toBe(201);
  const message = await db.message.findFirst({where: {conversationId: res.body.id}});
  expect(message?.body).toBe('Bonjour, quel prix pour 40 sacs ?');
  expect(message?.senderUserId).toBe('u-client');
 });

 it('refuse une conversation avec une entreprise non publiée et une ouverture par une entreprise', async () => {
  const {token} = await login(app, 'client@test.mg');
  expect((await call(app, 'post', '/api/conversations', {token, body: {companyId: 'co-pending', subject: 'Devis', body: 'Bonjour'}})).status).toBe(400);
  const asCompany = await login(app, 'owner@test.mg');
  expect((await call(app, 'post', '/api/conversations', {token: asCompany.token, body: {companyId: 'co-approved', subject: 'Devis', body: 'Bonjour'}})).status).toBe(403);
 });

 it('garde les conversations hors de la vitrine publique', async () => {
  const {token} = await login(app, 'client@test.mg');
  await call(app, 'post', '/api/conversations', {token, body: {companyId: 'co-approved', subject: 'Prix de 40 sacs', body: 'Bonjour'}});
  const res = await call(app, 'get', '/api/public/snapshot');
  // La vitrine publique renvoie des listes vides : aucune conversation ni
  // aucun message d'un compte connecté n'y paraît.
  expect(res.body.conversations).toEqual([]);
  expect(res.body.messages).toEqual([]);
 });
});
