// Flux d'authentification : inscription, connexion, session, déconnexion,
// changement de mot de passe, et refus des requêtes venant d'ailleurs.
import {describe, it, expect, beforeAll, afterAll, beforeEach} from 'vitest';
import {startApp, call, tokenOf, reset, seedFixtures, login, db, PASSWORD, ADMIN_PASSWORD} from './helpers';
import type {INestApplication} from '@nestjs/common';

describe('authentification', () => {
 let app: INestApplication;

 beforeAll(async () => { app = await startApp(); });
 afterAll(async () => { await app?.close(); await db.$disconnect(); });
 beforeEach(async () => { await reset(); await seedFixtures(); });

 it('inscrit un client, pose une session et ne renvoie jamais le mot de passe', async () => {
  const res = await call(app, 'post', '/api/auth/register', {
   body: {email: 'nouveau@test.mg', password: 'motdepasse12', firstName: 'Nouveau', lastName: 'Client', role: 'CLIENT'},
  });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe('nouveau@test.mg');
  expect(res.body.role).toBe('CLIENT');
  expect(res.body.passwordHash).toBeUndefined();
  const token = tokenOf(res);
  expect(token).toBeTruthy();
  const me = await call(app, 'get', '/api/auth/me', {token});
  expect(me.status).toBe(200);
  expect(me.body.id).toBe(res.body.id);
 });

 it('inscrit une entreprise et la crée en attente de validation, avec son propriétaire comme membre', async () => {
  const res = await call(app, 'post', '/api/auth/register', {
   body: {email: 'nouvelle@test.mg', password: 'motdepasse12', firstName: 'Nouvelle', lastName: 'Societe', role: 'COMPANY', companyName: 'Nouvelle Societe', city: 'Toamasina', businessSector: 'Plomberie'},
  });
  expect(res.status).toBe(201);
  const company = await db.company.findFirst({where: {name: 'Nouvelle Societe'}, include: {members: true}});
  expect(company?.status).toBe('PENDING');
  expect(company?.isVerified).toBe(false);
  expect(company?.members).toHaveLength(1);
  expect(company?.members[0]?.membershipRole).toBe('OWNER');
  expect(company?.members[0]?.userId).toBe(res.body.id);
 });

 it('refuse une inscription entreprise sans informations d entreprise', async () => {
  const res = await call(app, 'post', '/api/auth/register', {
   body: {email: 'sans@test.mg', password: 'motdepasse12', firstName: 'Sans', lastName: 'Info', role: 'COMPANY'},
  });
  expect(res.status).toBe(400);
  expect(await db.user.findUnique({where: {email: 'sans@test.mg'}})).toBeNull();
 });

 it('refuse une adresse déjà utilisée', async () => {
  const res = await call(app, 'post', '/api/auth/register', {
   body: {email: 'client@test.mg', password: 'motdepasse12', firstName: 'Doublon', lastName: 'Test', role: 'CLIENT'},
  });
  expect(res.status).toBe(409);
 });

 it('refuse un mot de passe trop court à l inscription', async () => {
  const res = await call(app, 'post', '/api/auth/register', {
   body: {email: 'court@test.mg', password: '1234567', firstName: 'Court', lastName: 'Test', role: 'CLIENT'},
  });
  expect(res.status).toBe(400);
 });

 it('connecte un compte existant et renvoie son profil', async () => {
  const {res, token} = await login(app, 'owner@test.mg');
  expect(res.status).toBe(201);
  expect(res.body.email).toBe('owner@test.mg');
  expect(res.body.passwordHash).toBeUndefined();
  expect(token).toBeTruthy();
 });

 it('refuse un mot de passe incorrect sans ouvrir de session', async () => {
  const res = await call(app, 'post', '/api/auth/login', {body: {email: 'owner@test.mg', password: 'mauvaispass'}});
  expect(res.status).toBe(401);
  expect(tokenOf(res)).toBeUndefined();
 });

 it('refuse un compte suspendu', async () => {
  await db.user.update({where: {id: 'u-client'}, data: {isActive: false}});
  const res = await call(app, 'post', '/api/auth/login', {body: {email: 'client@test.mg', password: PASSWORD}});
  expect(res.status).toBe(401);
 });

 it('exige une session pour lire son profil', async () => {
  const res = await call(app, 'get', '/api/auth/me');
  expect(res.status).toBe(401);
 });

 it('déconnecte : le jeton ne vaut plus rien', async () => {
  const {token} = await login(app, 'client@test.mg');
  const out = await call(app, 'post', '/api/auth/logout', {token});
  expect(out.status).toBe(201);
  expect((await call(app, 'get', '/api/auth/me', {token})).status).toBe(401);
 });

 it('change le mot de passe et coupe toutes les sessions précédentes', async () => {
  const {token} = await login(app, 'client@test.mg');
  const wrong = await call(app, 'post', '/api/auth/password', {token, body: {currentPassword: 'paslevrai', password: 'nouveau-mot-de-passe'}});
  expect(wrong.status).toBe(401);
  const ok = await call(app, 'post', '/api/auth/password', {token, body: {currentPassword: PASSWORD, password: 'nouveau-mot-de-passe'}});
  expect(ok.status).toBe(201);
  const newToken = tokenOf(ok);
  expect((await call(app, 'get', '/api/auth/me', {token})).status).toBe(401);
  expect((await call(app, 'get', '/api/auth/me', {token: newToken})).status).toBe(200);
  const withNew = await call(app, 'post', '/api/auth/login', {body: {email: 'client@test.mg', password: 'nouveau-mot-de-passe'}});
  expect(withNew.status).toBe(201);
 });

 it('refuse un nouveau mot de passe trop court', async () => {
  const {token} = await login(app, 'client@test.mg');
  const res = await call(app, 'post', '/api/auth/password', {token, body: {currentPassword: PASSWORD, password: 'court'}});
  expect(res.status).toBe(400);
 });

 it('refuse une écriture sans en-tête d origine ni jeton anti-falsification', async () => {
  const {token} = await login(app, 'client@test.mg');
  const noCsrf = await call(app, 'post', '/api/auth/logout', {token, csrf: false});
  expect(noCsrf.status).toBe(403);
  const wrongOrigin = await call(app, 'post', '/api/auth/logout', {token, origin: 'http://evil.example'});
  expect(wrongOrigin.status).toBe(403);
  // La session est toujours vivante : ces refus n'ont rien modifié.
  expect((await call(app, 'get', '/api/auth/me', {token})).status).toBe(200);
 });

 it('laisse une lecture sans origine (URL tapée directement)', async () => {
  const {token} = await login(app, 'admin@test.mg', ADMIN_PASSWORD);
  const res = await call(app, 'get', '/api/auth/me', {token, origin: null});
  expect(res.status).toBe(200);
 });
});
