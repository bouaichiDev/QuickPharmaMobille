import { QueryClient } from '@tanstack/react-query';

import { isApiError } from '@/services/api/apiError';

const NON_RETRYABLE = new Set(['unauthorized', 'access_denied', 'forbidden', 'validation', 'not_found']);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      // 60 requests/minute per user on the API: stay frugal.
      retry: (failureCount, error) =>
        failureCount < 2 && !(isApiError(error) && NON_RETRYABLE.has(error.kind)),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
