import { secureKeys } from '@/constants/storageKeys';
import {
  createSessionService,
  refreshSessionFromCheck,
  sessionFromLogin,
  type SessionStorage,
} from '@/features/auth/sessionService';
import type { CheckTokenData, Session } from '@/features/auth/types';
import { ApiError } from '@/services/api/apiError';

function memoryStorage(initial?: unknown): SessionStorage & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  if (initial !== undefined) data.set(secureKeys.session, initial);
  return {
    data,
    getJson: async <T>(key: string) => (data.get(key) as T) ?? null,
    setJson: async (key, value) => {
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  };
}

const storedSession: Session = {
  token: '12|plain-token',
  userId: 'enc-user',
  role: 'Admin',
  defaultRoute: '/dashboard',
  email: 'owner@pharma.test',
  defaultStore: { id: 'enc-store-1', name: 'Pharmacie Centrale' },
  activeStore: { id: 'enc-store-2', name: 'Pharmacie du Parc' },
};

const checkData: CheckTokenData = {
  user_id: 'enc-user-new',
  role: 'Admin',
  default_route: '/dashboard',
  store_id: 'enc-store-1-new',
  store_name: 'Pharmacie Centrale',
  permissions: [],
};

describe('session restore', () => {
  it('is anonymous when nothing is stored', async () => {
    const service = createSessionService(memoryStorage(), jest.fn());
    await expect(service.restore()).resolves.toEqual({ status: 'anonymous' });
  });

  it('drops a corrupted stored session', async () => {
    const storage = memoryStorage({ token: '' });
    const checkToken = jest.fn();
    const service = createSessionService(storage, checkToken);

    await expect(service.restore()).resolves.toEqual({ status: 'anonymous' });
    expect(checkToken).not.toHaveBeenCalled();
    expect(storage.data.has(secureKeys.session)).toBe(false);
  });

  it('verifies the token with check-token and keeps the selected store', async () => {
    const storage = memoryStorage(storedSession);
    const checkToken = jest.fn().mockResolvedValue(checkData);
    const service = createSessionService(storage, checkToken);

    const result = await service.restore();

    expect(checkToken).toHaveBeenCalledWith('12|plain-token');
    expect(result.status).toBe('authenticated');
    if (result.status !== 'authenticated') return;
    expect(result.session.defaultStore).toEqual({ id: 'enc-store-1-new', name: 'Pharmacie Centrale' });
    expect(result.session.activeStore).toEqual(storedSession.activeStore);
    expect(storage.data.get(secureKeys.session)).toEqual(result.session);
  });

  it('clears the session when the token is rejected (401)', async () => {
    const storage = memoryStorage(storedSession);
    const service = createSessionService(
      storage,
      jest.fn().mockRejectedValue(new ApiError({ kind: 'unauthorized', status: 401, message: 'Unauthenticated.' })),
    );

    await expect(service.restore()).resolves.toEqual({ status: 'anonymous' });
    expect(storage.data.has(secureKeys.session)).toBe(false);
  });

  it('keeps the session unverified when the server is unreachable', async () => {
    const storage = memoryStorage(storedSession);
    const service = createSessionService(
      storage,
      jest.fn().mockRejectedValue(new ApiError({ kind: 'network', message: 'Network unavailable.' })),
    );

    await expect(service.restore()).resolves.toEqual({ status: 'offline', session: storedSession });
    expect(storage.data.has(secureKeys.session)).toBe(true);
  });

  it('persists and clears through secure storage', async () => {
    const storage = memoryStorage();
    const service = createSessionService(storage, jest.fn());
    await service.persist(storedSession);
    expect(storage.data.get(secureKeys.session)).toEqual(storedSession);
    await service.clear();
    expect(storage.data.size).toBe(0);
  });
});

describe('session mapping', () => {
  it('builds the session from the login payload', () => {
    const session = sessionFromLogin(
      { ...checkData, token: 'tok', store_id: 'enc-s', store_name: 'Casa' },
      'user@test.ma',
    );
    expect(session).toMatchObject({
      token: 'tok',
      email: 'user@test.ma',
      defaultStore: { id: 'enc-s', name: 'Casa' },
      activeStore: { id: 'enc-s', name: 'Casa' },
    });
  });

  it('has no store for a SuperAdmin login', () => {
    const session = sessionFromLogin(
      { ...checkData, token: 'tok', role: 'SuperAdmin', store_id: null, store_name: null },
      'root@test.ma',
    );
    expect(session.activeStore).toBeNull();
  });

  it('falls back to the default store when none was selected', () => {
    const refreshed = refreshSessionFromCheck({ ...storedSession, activeStore: null }, checkData);
    expect(refreshed.activeStore).toEqual({ id: 'enc-store-1-new', name: 'Pharmacie Centrale' });
  });
});
