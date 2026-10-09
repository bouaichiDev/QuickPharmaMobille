import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';
import { queryClient } from '@/providers/queryClient';
import { registerApiContext } from '@/services/api/client';

import { accessApi } from './accessApi';

export const accessQueryKey = (storeId: string | null) => ['access', 'me', storeId] as const;

/** Load action rules once per store; refresh only on explicit invalidation/refusal. */
export function useAccess() {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);
  const authenticated = useSessionStore((state) => state.status === 'authenticated');

  return useQuery({
    queryKey: accessQueryKey(storeId),
    queryFn: accessApi.getMe,
    enabled: authenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

let lastInvalidation = 0;

/** A 403/409 access refusal means the cached rules are stale: refetch (max every 3 s). */
registerApiContext({
  onAccessDenied: () => {
    const now = Date.now();
    if (now - lastInvalidation < 3000) return;
    lastInvalidation = now;
    void queryClient.invalidateQueries({ queryKey: ['access', 'me'] });
  },
});
