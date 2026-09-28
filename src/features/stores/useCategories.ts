import { useInfiniteQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';

import { categoriesApi } from './categoriesApi';

export function useCategories(searchValue: string) {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);

  return useInfiniteQuery({
    queryKey: ['categories', storeId, searchValue],
    queryFn: ({ pageParam }) => categoriesApi.list(pageParam, searchValue),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page ? lastPage.current_page + 1 : undefined,
    enabled: !!storeId,
  });
}