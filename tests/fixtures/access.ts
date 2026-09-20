import type { EffectiveAccess, QuotaState } from '@/types/access';

export function quota(partial: Partial<QuotaState> & { key: string }): QuotaState {
  return {
    unit: 'unit',
    scope: 'account',
    store_id: null,
    configured: true,
    unlimited: false,
    limit: 10,
    used: 3,
    remaining: 7,
    exceeded: false,
    period: { type: 'none', start: null, end: null },
    source: 'plan',
    expires_at: null,
    ...partial,
  };
}

/** Shape of GET /access/me as documented in sassApi/docs/access-control/api-contract.md. */
export function makeAccess(partial: Partial<EffectiveAccess> = {}): EffectiveAccess {
  return {
    account: { id: 'enc-account', is_owner: false },
    store: { id: 'enc-store', name: 'Pharmacie Casa', access: 'member', suspended: false },
    role: { id: 57, code: 'acc26.caisse.x8k2qp', scope: 'account' },
    access_version: 'g4.a12.u3',
    valid_until: null,
    generated_at: '2026-09-13T10:12:00+01:00',
    subscription: {
      id: 'sub_1',
      plan_id: 1,
      plan_name: 'Free',
      plan_version_id: 5,
      plan_version: 2,
      terms: 'versioned',
      start_date: '2026-09-01',
      end_date: '2026-10-01',
    },
    permissions: ['dashboard.view', 'products.view', 'sales.create'],
    features: {
      'sales.pos': { enabled: true, source: 'plan', expires_at: null, lapsed: false, reason: null },
      'invoicing.manual': {
        enabled: false,
        source: 'none',
        expires_at: null,
        lapsed: false,
        reason: 'FEATURE_NOT_IN_PLAN',
      },
    },
    quotas: {},
    trials: {},
    lapsed_access: {},
    restrictions: [],
    menus: [],
    ...partial,
  };
}
