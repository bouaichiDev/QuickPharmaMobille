import { useInfiniteQuery } from '@tanstack/react-query';
import { adminApi, adminPage } from './api';
import type { Row } from './api';
import { useCommerceAccess } from './AdminDesign';
export function useAdminList(
  path: string,
  params: Row,
  permission: string,
  enabled = true,
  nested?: string,
) {
  const { store, can } = useCommerceAccess();
  return useInfiniteQuery({
    queryKey: ['admin', store, path, params],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const body = await adminApi.get(path, { ...params, page: pageParam, per_page: 20 }, signal);
      return adminPage(nested ? (body as Row)[nested] : body);
    },
    getNextPageParam: (last, _pages, page) => (page < last.lastPage ? page + 1 : undefined),
    enabled: enabled && !!store && can(permission),
    staleTime: 30000,
    retry: false,
  });
}
