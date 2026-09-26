import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';
import { billingService } from '@/services/billing/billingService';

import type { PlanView } from './types';

export function useBillingAvailability() {
  return useQuery({
    queryKey: ['billing', 'availability'],
    queryFn: () => billingService.availability(),
    staleTime: Infinity,
  });
}

/**
 * Purchase flow; on success the access snapshot (plan, features, quotas) is
 * refetched, since the server changed the subscription while we were waiting.
 */
export function useSubscribe() {
  const client = useQueryClient();
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? '');
  return useMutation({
    mutationFn: (plan: PlanView) => billingService.subscribe(plan, storeId),
    onSuccess: () => refreshAfterPurchase(client),
  });
}

export function useRestorePurchases() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => billingService.restore(),
    onSuccess: () => refreshAfterPurchase(client),
  });
}

function refreshAfterPurchase(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: ['access'] });
  void client.invalidateQueries({ queryKey: ['plans'] });
}
