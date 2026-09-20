import type { Session } from '@/features/auth/types';
import { isSameStore, resolveStoreAccessError } from '@/features/stores/storeSelection';

const base: Session = {
  token: 't',
  userId: 'u',
  role: 'Admin',
  defaultRoute: '/dashboard',
  email: 'a@b.c',
  defaultStore: { id: 'enc-default', name: 'Centrale' },
  activeStore: { id: 'enc-default', name: 'Centrale' },
};

describe('isSameStore', () => {
  it('matches by id or, since ids are re-encrypted, by name', () => {
    expect(isSameStore({ id: 'a', name: 'X' }, { id: 'a', name: 'Y' })).toBe(true);
    expect(isSameStore({ id: 'a', name: 'Centrale' }, { id: 'b', name: 'Centrale' })).toBe(true);
    expect(isSameStore({ id: 'a', name: 'Centrale' }, { id: 'b', name: 'Parc' })).toBe(false);
    expect(isSameStore({ id: 'a', name: null }, { id: 'b', name: null })).toBe(false);
    expect(isSameStore(null, { id: 'b', name: 'Parc' })).toBe(false);
  });
});

describe('resolveStoreAccessError (active store change)', () => {
  const denied = { accessCode: 'STORE_ACCESS_DENIED' as const };

  it('falls back to the default store when a switched store is refused', () => {
    const session = { ...base, activeStore: { id: 'enc-other', name: 'Parc' } };
    expect(resolveStoreAccessError(session, denied)).toBe('resetToDefault');
  });

  it('blocks when the default store itself is refused', () => {
    expect(resolveStoreAccessError(base, denied)).toBe('blocked');
  });

  it('ignores other errors', () => {
    expect(resolveStoreAccessError(base, { accessCode: 'PERMISSION_DENIED' })).toBe('none');
    expect(resolveStoreAccessError(base, { accessCode: null })).toBe('none');
    expect(resolveStoreAccessError(null, denied)).toBe('none');
  });
});
