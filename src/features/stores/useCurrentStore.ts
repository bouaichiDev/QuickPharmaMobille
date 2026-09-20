import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAnyPermission } from '@/features/access/hooks';
import { useSessionStore } from '@/features/auth/sessionStore';
import type { SessionStore } from '@/features/auth/types';

import { STORE_LIST_PERMISSIONS } from './storeSelection';
import { storesApi } from './storesApi';

export function useStoreList() {
  const userId = useSessionStore((state) => state.session?.userId ?? null);
  const decision = useAnyPermission(STORE_LIST_PERMISSIONS);
  const canList = decision.state === 'allowed';

  const query = useQuery({
    queryKey: ['stores', 'mine', userId],
    queryFn: () => storesApi.listForUser(userId ?? ''),
    enabled: canList && !!userId,
    staleTime: 5 * 60_000,
  });

  return { ...query, canList, decisionLoading: decision.state === 'loading' };
}

export function useCurrentStore() {
  const store = useSessionStore((state) => state.session?.activeStore ?? null);
  const defaultStore = useSessionStore((state) => state.session?.defaultStore ?? null);
  const setActiveStore = useSessionStore((state) => state.setActiveStore);
  const list = useStoreList();

  const switchStore = useCallback((next: SessionStore) => setActiveStore(next), [setActiveStore]);

  return {
    store,
    defaultStore,
    stores: list.data ?? [],
    storesLoading: list.isLoading,
    storesError: list.error,
    refetchStores: list.refetch,
    /** Switching requires the store list, i.e. a manager permission, and 2+ stores. */
    canSwitch: list.canList && (list.data?.length ?? 0) > 1,
    switchStore,
  };
}
