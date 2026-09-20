import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useSubscription } from '@/features/access/hooks';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { StatusEnvelope } from '@/types/api';

import { mapPlans } from './planMapper';
import type { ApiPlan } from './types';

export const plansApi = {
  async list(): Promise<ApiPlan[]> {
    const body = await apiGet<StatusEnvelope<ApiPlan[]>>(endpoints.plans.list, {
      skipStoreContext: true,
    });
    return body.data ?? [];
  },
};

/** Plans with the current one flagged from GET /access/me (the source of truth). */
export function usePlans() {
  const { subscription } = useSubscription();
  const currentPlanId = subscription?.plan_id ?? null;
  const query = useQuery({ queryKey: ['plans'], queryFn: plansApi.list, staleTime: 10 * 60_000 });

  const plans = useMemo(
    () => (query.data ? mapPlans(query.data, currentPlanId) : []),
    [query.data, currentPlanId],
  );

  return { ...query, plans };
}
