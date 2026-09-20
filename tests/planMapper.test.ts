import { mapPlan, mapPlans, normalizeFeatures } from '@/features/subscriptions/planMapper';
import type { ApiPlan } from '@/features/subscriptions/types';

function plan(partial: Partial<ApiPlan> & { id: number }): ApiPlan {
  return {
    name: `Plan ${partial.id}`,
    description: null,
    price: 0,
    duration_in_days: 30,
    max_users: null,
    max_stores: null,
    features: [],
    limits: null,
    active: true,
    provider_product_id: null,
    ...partial,
  };
}

describe('normalizeFeatures', () => {
  it('accepts a list of strings', () => {
    expect(normalizeFeatures(['Stock', ' Ventes ', ''])).toEqual(['Stock', 'Ventes']);
  });

  it('accepts a list of objects', () => {
    expect(normalizeFeatures([{ label: 'Multi-magasins' }, { name: 'Rapports' }, { foo: 1 }])).toEqual([
      'Multi-magasins',
      'Rapports',
    ]);
  });

  it('accepts a map of enabled flags or labels', () => {
    expect(normalizeFeatures({ 'Export CSV': true, 'API': false, crm: 'CRM Services' })).toEqual([
      'Export CSV',
      'CRM Services',
    ]);
  });

  it('accepts a JSON string and plain text', () => {
    expect(normalizeFeatures('["A","B"]')).toEqual(['A', 'B']);
    expect(normalizeFeatures('Texte libre')).toEqual(['Texte libre']);
    expect(normalizeFeatures(null)).toEqual([]);
  });
});

describe('mapPlan', () => {
  it('normalises price, limits and product id without inventing values', () => {
    const view = mapPlan(
      plan({ id: 3, price: '199.00', max_users: 5, max_stores: 0, provider_product_id: 'qp_pro_monthly' }),
      3,
    );
    expect(view).toMatchObject({
      price: 199,
      isFree: false,
      maxUsers: 5,
      maxStores: null,
      providerProductId: 'qp_pro_monthly',
      isCurrent: true,
      durationDays: 30,
    });
  });
});

describe('mapPlans', () => {
  it('keeps active plans (plus the current one), cheapest first', () => {
    const views = mapPlans(
      [
        plan({ id: 1, price: 299 }),
        plan({ id: 2, price: 0 }),
        plan({ id: 3, price: 99, active: false }),
        plan({ id: 4, price: 149, active: 0 }),
      ],
      4,
    );
    expect(views.map((view) => view.id)).toEqual([2, 4, 1]);
    expect(views.find((view) => view.id === 4)?.isCurrent).toBe(true);
  });
});
