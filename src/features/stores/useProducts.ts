import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';

import { productsApi, type ProductCreateInput, type ProductFilters } from './productsApi';

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductCreateInput) => productsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useProducts(filters: ProductFilters) {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);

  return useInfiniteQuery({
    queryKey: ['products', storeId, filters],
    queryFn: ({ pageParam }) => productsApi.list(pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    enabled: !!storeId,
  });
}
