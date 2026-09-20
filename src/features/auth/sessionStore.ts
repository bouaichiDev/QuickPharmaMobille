import { create } from 'zustand';

import { queryClient } from '@/providers/queryClient';
import { registerApiContext } from '@/services/api/client';
import { secureStorage } from '@/services/storage/secureStorage';
import { logger } from '@/utils/logger';

import { authApi } from './authApi';
import { createSessionService } from './sessionService';
import type { Session, SessionStore } from './types';

export type SessionStatus = 'booting' | 'authenticated' | 'anonymous';
export type SessionNotice = 'sessionExpired' | 'storeAccessLost' | null;

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  /** Restored without server confirmation (offline start). */
  unverified: boolean;
  notice: SessionNotice;
  bootstrap: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  setActiveStore: (store: SessionStore) => Promise<void>;
  resetActiveStoreToDefault: () => Promise<void>;
  signOut: (options?: { revokeOnServer?: boolean; notice?: SessionNotice }) => Promise<void>;
  clearNotice: () => void;
}

export const sessionService = createSessionService(secureStorage, authApi.checkToken);

let signingOut = false;

export const useSessionStore = create<SessionState>((set, get) => ({
  status: 'booting',
  session: null,
  unverified: false,
  notice: null,

  async bootstrap() {
    const result = await sessionService.restore();
    logger.debug('Session restore result', { status: result.status });
    if (result.status === 'anonymous') {
      set({ status: 'anonymous', session: null, unverified: false });
    } else {
      set({
        status: 'authenticated',
        session: result.session,
        unverified: result.status === 'offline',
      });
    }
  },

  async signIn(session) {
    await sessionService.persist(session);
    queryClient.clear();
    set({ status: 'authenticated', session, unverified: false, notice: null });
  },

  async setActiveStore(store) {
    const current = get().session;
    if (!current) return;
    const session: Session = { ...current, activeStore: store };
    await sessionService.persist(session);
    // Every cached query belongs to the previous store.
    queryClient.clear();
    set({ session });
  },

  async resetActiveStoreToDefault() {
    const current = get().session;
    if (!current) return;
    const session: Session = { ...current, activeStore: current.defaultStore };
    await sessionService.persist(session);
    queryClient.clear();
    set({ session, notice: 'storeAccessLost' });
  },

  async signOut({ revokeOnServer = true, notice = null } = {}) {
    if (signingOut) return;
    signingOut = true;
    try {
      if (revokeOnServer && get().session) {
        try {
          await authApi.logout();
        } catch (error) {
          // The local session is removed anyway; the server token may survive.
          logger.warn('Server logout failed', error);
        }
      }
      await sessionService.clear();
      queryClient.clear();
      set({ status: 'anonymous', session: null, unverified: false, notice });
    } finally {
      signingOut = false;
    }
  },

  clearNotice() {
    set({ notice: null });
  },
}));

registerApiContext({
  getToken: () => useSessionStore.getState().session?.token ?? null,
  getStoreId: () => useSessionStore.getState().session?.activeStore?.id ?? null,
  onUnauthorized: () => {
    void useSessionStore.getState().signOut({ revokeOnServer: false, notice: 'sessionExpired' });
  },
});
