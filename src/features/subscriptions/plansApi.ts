import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSubscription } from '@/features/access/hooks';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { StatusEnvelope } from '@/types/api';

import { mapPlans } from './planMapper';
import { useStoreProducts } from './storeProductsApi';
import type { ApiPlan } from './types';

export const plansApi = {
  async list(): Promise<ApiPlan[]> {
    const body = await apiGet<StatusEnvelope<ApiPlan[]>>(endpoints.plans.list, {
      skipStoreContext: true,
    });
    return body.data ?? [];
  },
};

/**
 * Plans with the current one flagged from GET /access/me (the source of truth)
 * and the Google Play product each is sold under, so only the plans the store
 * really sells can be bought.
 */
export function usePlans() {
  const { subscription } = useSubscription();
  const currentPlanId = subscription?.plan_id ?? null;
  const query = useQuery({ queryKey: ['plans'], queryFn: plansApi.list, staleTime: 10 * 60_000 });
  const storeProducts = useStoreProducts();
  const { byPlanId } = storeProducts;
  const productsLoaded = storeProducts.isSuccess || storeProducts.isError;

  const plans = useMemo(
    // Before the mapping answers, plans are shown without a product rather than
    // with a stale one: the purchase button stays disabled for a moment.
    () => (query.data ? mapPlans(query.data, currentPlanId, productsLoaded ? byPlanId : new Map()) : []),
    [query.data, currentPlanId, byPlanId, productsLoaded],
  );

  return { ...query, plans };
}
