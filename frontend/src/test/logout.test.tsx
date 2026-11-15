import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLogout } from '@/hooks/useLogout';
import { useAuthStore } from '@/stores/authStore';
import { client, fillDb, json, noContent, resetStores, stubFetch } from './fixtures';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

describe('déconnexion', () => {
 beforeEach(() => { resetStores(); navigate.mockClear(); });

 it('ferme la session et redirige vers /connexion', async () => {
  useAuthStore.setState({ user: client, status: 'ready' });
  fillDb({ users: [client] });
  const calls = stubFetch(url => url === '/api/auth/logout' ? noContent() : json({ users: [] }));
  const { result } = renderHook(() => useLogout());
  await act(async () => { await result.current(); });
  expect(calls[0]).toMatchObject({ url: '/api/auth/logout', method: 'POST', credentials: 'include' });
  expect(useAuthStore.getState().user).toBeNull();
  expect(navigate).toHaveBeenCalledWith({ to: '/connexion' });
 });
});