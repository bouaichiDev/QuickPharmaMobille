import { resolveDashboardKind } from '@/features/dashboard/resolveDashboardKind';

import { makeAccess } from './fixtures/access';

describe('resolveDashboardKind (one dashboard per role)', () => {
  it('uses the pharmacy dashboard for /dashboard', () => {
    expect(resolveDashboardKind('/dashboard', 'Admin', makeAccess())).toBe('pharmacy');
  });

  it('uses the CRM dashboard for a /services-crm role that may view sessions', () => {
    const access = makeAccess({ permissions: ['services.sessions.view'] });
    expect(resolveDashboardKind('/services-crm', 'serviceCRM', access)).toBe('crm');
  });

  it('falls back on permissions when the route has no mobile screen', () => {
    expect(resolveDashboardKind('/pos', 'vendeur', makeAccess())).toBe('pharmacy');
    expect(resolveDashboardKind(null, 'x', makeAccess({ permissions: ['services.sessions.view'] }))).toBe('crm');
  });

  it('identifies the platform owner', () => {
    expect(resolveDashboardKind('/superadmin/dashboard', 'SuperAdmin', makeAccess())).toBe('platform');
    const platform = makeAccess({
      subscription: {
        id: null,
        plan_id: null,
        plan_name: null,
        plan_version_id: null,
        plan_version: null,
        terms: 'platform',
        start_date: null,
        end_date: null,
      },
    });
    expect(resolveDashboardKind(null, null, platform)).toBe('platform');
  });

  it('returns none without any dashboard permission', () => {
    expect(resolveDashboardKind('/dashboard', 'custom', makeAccess({ permissions: ['products.view'] }))).toBe('none');
  });
});
