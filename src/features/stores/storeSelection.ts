import type { ApiError } from '@/services/api/apiError';

import type { Session, SessionStore } from '../auth/types';

/** Permissions that let GET /users/getUserStores answer (backend route matrix). */
export const STORE_LIST_PERMISSIONS = ['team.users.view', 'team.stores.assign'] as const;

/**
 * The backend re-encrypts ids with a random IV on every response, so two
 * encrypted ids of the same store differ. Identity falls back to the id and
 * then the store name (documented gap: no stable public store identifier).
 */
export function isSameStore(a: SessionStore | null, b: SessionStore | null): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  return !!a.name && a.name === b.name;
}

export type StoreAccessResolution =
  /** Selected store refused: go back to the login default store. */
  | 'resetToDefault'
  /** The default store itself is refused (suspended / removed). */
  | 'blocked'
  | 'none';

/** What to do when an API call is refused with STORE_ACCESS_DENIED. */
export function resolveStoreAccessError(
  session: Session | null,
  error: Pick<ApiError, 'accessCode'>,
): StoreAccessResolution {
  if (!session || error.accessCode !== 'STORE_ACCESS_DENIED') return 'none';
  const usingDefault =
    !session.activeStore ||
    !session.defaultStore ||
    session.activeStore.id === session.defaultStore.id;
  return usingDefault ? 'blocked' : 'resetToDefault';
}
