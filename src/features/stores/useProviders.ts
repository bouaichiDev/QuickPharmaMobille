import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';

import { providersApi } from './providersApi';

export function useProviders() {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);

  return useQuery({
    queryKey: ['providers', storeId],
    queryFn: providersApi.dropdown,
    enabled: !!storeId,
  });
}
