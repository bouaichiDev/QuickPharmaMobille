import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';
import { queryClient } from '@/providers/queryClient';
import { registerApiContext } from '@/services/api/client';

import { accessApi } from './accessApi';
import { accessRefreshIntervalMs } from './decisions';

export const accessQueryKey = (storeId: string | null) => ['access', 'me', storeId] as const;

/** GET /access/me for the active store: the single source of UI access rules. */
export function useAccess() {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);
  const authenticated = useSessionStore((state) => state.status === 'authenticated');

  return useQuery({
    queryKey: accessQueryKey(storeId),
    queryFn: accessApi.getMe,
    enabled: authenticated,
    staleTime: (query) => accessRefreshIntervalMs(query.state.data),
    refetchInterval: (query) => accessRefreshIntervalMs(query.state.data),
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
