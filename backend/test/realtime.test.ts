// La porte d'entrée du temps réel doit accepter le frontend et refuser le reste.
//
// Un navigateur envoie rarement l'en-tête Origin sur une requête GET de même
// origine : si on l'exigeait, chaque administrateur serait éjecté de son espace
// dès la première connexion. On ne refuse donc que les origines réellement
// étrangères, et jamais une session valide.
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {PrismaService} from '../src/prisma.service';
import {RealtimeGateway} from '../src/realtime.gateway';
import {WorkspaceService} from '../src/workspace.service';
import {hashToken} from '../src/security';
import {db, ORIGIN, reset, seedFixtures} from './helpers';

const TOKEN = 'realtime-session-token-0123456789';

interface FakeSocket {
 id: string;
 handshake: {headers: Record<string, string | undefined>};
 data: Record<string, unknown>;
 join: () => Promise<void>;
 emit: (event: string) => void;
 disconnect: () => void;
}

/** Un faux socket dont on observe les événements et la déconnexion. */
function fakeSocket(headers: Record<string, string | undefined>) {
 const events: string[] = [];
 let disconnected = false;
 const socket: FakeSocket = {
  id: 'fake-socket',
  handshake: {headers},
  data: {},
  join: async () => {},
  emit: (event) => {
   events.push(event);
  },
  disconnect: () => {
   disconnected = true;
  },
 };
 return {socket, events, wasDisconnected: () => disconnected};
}

function gateway() {
 return new RealtimeGateway(db as unknown as PrismaService, {} as WorkspaceService);
}

describe('Porte d’entrée du temps réel', () => {
 beforeEach(async () => {
  await reset();
  const fixtures = await seedFixtures();
  await db.session.create({
   data: {id: hashToken(TOKEN), userId: fixtures.adminId, expiresAt: new Date(Date.now() + 3_600_000)},
  });
 });

 afterEach(async () => {
  await reset();
 });

 it('accepte une session valide venue sans en-tête Origin (même origine)', async () => {
  const {socket, events} = fakeSocket({cookie: `mc_session=${TOKEN}`});
  await gateway().handleConnection(socket as never);
  expect(events).toContain('realtime:ready');
  expect(events).not.toContain('realtime:unauthorized');
 });

 it('accepte une session valide depuis l’origine du frontend', async () => {
  const {socket, events} = fakeSocket({origin: ORIGIN, cookie: `mc_session=${TOKEN}`});
  await gateway().handleConnection(socket as never);
  expect(events).toContain('realtime:ready');
 });

 it('refuse une origine étrangère même avec une session valide', async () => {
  const {socket, events, wasDisconnected} = fakeSocket({
   origin: 'https://evil.example',
   cookie: `mc_session=${TOKEN}`,
  });
  await gateway().handleConnection(socket as never);
  expect(events).toContain('realtime:unauthorized');
  expect(events).not.toContain('realtime:ready');
  expect(wasDisconnected()).toBe(true);
 });

 it('refuse une connexion sans cookie de session', async () => {
  const {socket, events, wasDisconnected} = fakeSocket({origin: ORIGIN});
  await gateway().handleConnection(socket as never);
  expect(events).toContain('realtime:unauthorized');
  expect(wasDisconnected()).toBe(true);
 });

 it('refuse une session expirée', async () => {
  await db.session.update({
   where: {id: hashToken(TOKEN)},
   data: {expiresAt: new Date(Date.now() - 1000)},
  });
  const {socket, events} = fakeSocket({cookie: `mc_session=${TOKEN}`});
  await gateway().handleConnection(socket as never);
  expect(events).toContain('realtime:unauthorized');
  expect(events).not.toContain('realtime:ready');
 });
});
