import { secureKeys } from '@/constants/storageKeys';
import { isApiError } from '@/services/api/apiError';
import { logger } from '@/utils/logger';

import type { CheckTokenData, LoginResponseData, Session, SessionStore } from './types';

export interface SessionStorage {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export type RestoreResult =
  | { status: 'anonymous' }
  | { status: 'authenticated'; session: Session }
  /** Token kept but not verified: the server was unreachable. */
  | { status: 'offline'; session: Session };

function storeFrom(id: string | null, name: string | null): SessionStore | null {
  return id ? { id, name } : null;
}

function isValidSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  return typeof session.token === 'string' && session.token.length > 0 && typeof session.userId === 'string';
}

export function sessionFromLogin(data: LoginResponseData, email: string): Session {
  const defaultStore = storeFrom(data.store_id, data.store_name);
  return {
    token: data.token,
    userId: data.user_id,
    role: data.role,
    defaultRoute: data.default_route,
    email,
    defaultStore,
    activeStore: defaultStore,
  };
}

/** Role and default store may have changed server-side since the last launch. */
export function refreshSessionFromCheck(session: Session, data: CheckTokenData): Session {
  const defaultStore = storeFrom(data.store_id, data.store_name);
  return {
    ...session,
    userId: data.user_id,
    role: data.role,
    defaultRoute: data.default_route,
    defaultStore,
    activeStore: session.activeStore ?? defaultStore,
  };
}

export function createSessionService(
  storage: SessionStorage,
  checkToken: (token: string) => Promise<CheckTokenData>,
) {
  return {
    async persist(session: Session): Promise<void> {
      await storage.setJson(secureKeys.session, session);
    },

    async clear(): Promise<void> {
      await storage.remove(secureKeys.session);
    },

    async restore(): Promise<RestoreResult> {
      const stored = await storage.getJson<unknown>(secureKeys.session);
      if (!isValidSession(stored)) {
        if (stored) await storage.remove(secureKeys.session);
        return { status: 'anonymous' };
      }

      try {
        const data = await checkToken(stored.token);
        const session = refreshSessionFromCheck(stored, data);
        await storage.setJson(secureKeys.session, session);
        return { status: 'authenticated', session };
      } catch (error) {
        logger.warn('Session restore: check-token failed', {
          kind: isApiError(error) ? error.kind : 'not_api_error',
          status: isApiError(error) ? error.status : null,
          message: error instanceof Error ? error.message : String(error),
        });
        if (isApiError(error) && (error.kind === 'network' || error.kind === 'timeout')) {
          return { status: 'offline', session: stored };
        }
        if (isApiError(error) && (error.kind === 'server' || error.kind === 'rate_limited')) {
          // The token was not rejected: keep it, the next call will tell.
          return { status: 'offline', session: stored };
        }
        await storage.remove(secureKeys.session);
        return { status: 'anonymous' };
      }
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
