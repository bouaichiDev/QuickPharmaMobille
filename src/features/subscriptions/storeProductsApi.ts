import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { billingBackend } from '@/services/billing/billingBackend';
import type { StoreProductMapping } from '@/services/billing/types';

/**
 * Which plans are actually sold on Google Play, and under which product.
 *
 * The mapping lives on the server (`store_products`): `plans.provider_product_id`
 * holds ids of another payment provider and must not be used here.
 *
 * Requires `subscription.view`; a refusal is not retried and simply leaves the
 * plans non-purchasable.
 */
export function useStoreProducts() {
  const query = useQuery({
    queryKey: ['billing', 'store-products'],
    queryFn: () => billingBackend.storeProducts(),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const byPlanId = useMemo(() => {
    const map = new Map<number, StoreProductMapping>();
    for (const product of query.data ?? []) {
      // A plan sold monthly and yearly: the first mapping is the default offer.
      if (!map.has(product.planId)) map.set(product.planId, product);
    }
    return map;
  }, [query.data]);

  return { ...query, byPlanId };
}
