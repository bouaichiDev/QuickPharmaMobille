import { toNumber } from '@/utils/format';

import type { ApiPlan, PlanView } from './types';

function textOf(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null;
  if (typeof entry === 'number') return String(entry);
  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>;
    for (const key of ['label', 'name', 'title', 'text', 'description']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

/**
 * `plans.features` is free-form JSON edited in the web admin: a list of
 * strings, a list of objects, a map of label -> enabled, or a JSON string.
 * Everything is reduced to displayable lines; nothing is invented.
 */
export function normalizeFeatures(raw: unknown): string[] {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return raw.trim() ? [raw.trim()] : [];
    }
  }
  if (Array.isArray(value)) {
    return value.map(textOf).filter((line): line is string => !!line);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => enabled !== false && enabled !== 0 && enabled !== null)
      .map(([key, enabled]) => (typeof enabled === 'string' && enabled.trim() ? enabled.trim() : key));
  }
  return [];
}

function positiveOrNull(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

/**
 * `storeProductId` is the Google Play product selling this plan, from
 * GET /billing/google-play/products. When the caller passes the mapping (even
 * an empty one) it alone decides whether the plan is purchasable; omitting it
 * keeps the legacy `plans.provider_product_id` value, which belongs to another
 * payment provider.
 */
export function mapPlan(
  plan: ApiPlan,
  currentPlanId: number | null,
  storeProductId?: string | null,
): PlanView {
  const price = toNumber(plan.price) ?? 0;
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description ?? null,
    price,
    isFree: price === 0,
    durationDays: positiveOrNull(plan.duration_in_days),
    maxUsers: positiveOrNull(plan.max_users),
    maxStores: positiveOrNull(plan.max_stores),
    features: normalizeFeatures(plan.features),
    providerProductId:
      storeProductId !== undefined ? storeProductId : plan.provider_product_id || null,
    isCurrent: currentPlanId !== null && plan.id === currentPlanId,
  };
}

/** Active plans only (GET /plans also returns inactive ones), cheapest first. */
export function mapPlans(
  plans: ApiPlan[],
  currentPlanId: number | null,
  storeProducts?: Map<number, { productId: string }>,
): PlanView[] {
  return plans
    .filter((plan) => plan.active === true || plan.active === 1 || plan.id === currentPlanId)
    .map((plan) =>
      mapPlan(plan, currentPlanId, storeProducts ? (storeProducts.get(plan.id)?.productId ?? null) : undefined),
    )
    .sort((a, b) => a.price - b.price || a.id - b.id);
}
