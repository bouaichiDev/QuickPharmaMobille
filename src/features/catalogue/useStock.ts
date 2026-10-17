import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useContext } from 'react';
import { StockContext, useStockApi } from './StockContext';
export function useStockScope() {
  const preview = useContext(StockContext);
  const store = useSessionStore((s) => s.session?.activeStore?.id);
  return preview?.scope || store;
}
export function useStockLocations() {
  const stockApi = useStockApi();
  const scope = useStockScope();
  return useQuery({
    queryKey: ['stock-locations', scope],
    queryFn: stockApi.locations,
    enabled: !!scope,
    staleTime: 60000,
  });
}
export function useStockMutation<T, Result>(fn: (input: T) => Promise<Result>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all(
        [
          'catalogue',
          'products',
          'stock-product',
          'stock-locations',
          'stock-sessions',
          'stock-session',
        ].map((key) => client.invalidateQueries({ queryKey: [key] })),
      );
    },
  });
}
