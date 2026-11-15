// Règles métier : entreprise suspendue, suppressions protégées, total du panier.
import {describe, it, expect, beforeAll, afterAll, beforeEach} from 'vitest';
import {startApp, call, reset, seedFixtures, login, db, productBody, ADMIN_PASSWORD} from './helpers';
import type {INestApplication} from '@nestjs/common';

describe('règles métier', () => {
 let app: INestApplication;
 beforeAll(async () => { app = await startApp(); });
 afterAll(async () => { await app?.close(); await db.$disconnect(); });
 beforeEach(async () => { await reset(); await seedFixtures(); });

 it('interdit à une entreprise suspendue de créer un produit', async () => {
  await db.company.update({where: {id: 'co-approved'}, data: {status: 'SUSPENDED'}});
  const {token} = await login(app, 'owner@test.mg');
  const res = await call(app, 'post', '/api/products', {token, body: productBody()});
  expect(res.status).toBe(403);
 });

 it('refuse la suppression d une catégorie encore utilisée', async () => {
  const {token} = await login(app, 'admin@test.mg', ADMIN_PASSWORD);
  const res = await call(app, 'delete', '/api/categories/cat-metaux', {token});
  expect(res.status).toBe(400);
  expect(await db.category.count({where: {id: 'cat-metaux'}})).toBe(1);
 });

 it('refuse la suppression d un utilisateur ayant un historique', async () => {
  const {token} = await login(app, 'admin@test.mg', ADMIN_PASSWORD);
  const res = await call(app, 'delete', '/api/users/u-owner', {token});
  expect(res.status).toBe(409);
 });

 it('exclut les articles devenus indisponibles du total du panier', async () => {
  const {token} = await login(app, 'client@test.mg');
  await call(app, 'post', '/api/cart/items', {token, body: {productId: 'p-published', quantity: 2}});
  expect((await call(app, 'get', '/api/cart', {token})).body.total).toBe(12400);
  await db.product.update({where: {id: 'p-published'}, data: {status: 'ARCHIVED'}});
  expect((await call(app, 'get', '/api/cart', {token})).body.total).toBe(0);
 });
});
