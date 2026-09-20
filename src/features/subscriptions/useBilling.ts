import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/** Purchase flow; on success the access snapshot (plan, features, quotas) is refetched. */
export function useSubscribe() {
  const client = useQueryClient();
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? '');
  return useMutation({
    mutationFn: (plan: PlanView) => billingService.subscribe(plan, storeId),
    onSuccess: () => client.invalidateQueries({ queryKey: ['access'] }),
  });
}

export function useRestorePurchases() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => billingService.restore(),
    onSuccess: () => client.invalidateQueries({ queryKey: ['access'] }),
  });
}
