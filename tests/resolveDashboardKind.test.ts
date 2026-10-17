import { resolveLandingRoute } from '@/features/navigation/resolveLandingRoute';
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

  it('keeps unsupported explicit routes away from sales and falls back only without a route', () => {
    expect(resolveDashboardKind('/pos', 'vendeur', makeAccess())).toBe('none');
    expect(
      resolveDashboardKind(null, 'x', makeAccess({ permissions: ['services.sessions.view'] })),
    ).toBe('crm');
  });

  it('identifies the platform owner', () => {
    expect(resolveDashboardKind('/superadmin/dashboard', 'SuperAdmin', makeAccess())).toBe(
      'platform',
    );
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
    expect(
      resolveDashboardKind('/dashboard', 'custom', makeAccess({ permissions: ['products.view'] })),
    ).toBe('none');
  });
});

it('never sends a CRM landing role to sales when CRM rights are absent', () => {
  expect(resolveDashboardKind('/services-crm', 'serviceCRM', makeAccess())).toBe('none');
});
it('prioritizes a CRM default route even when the role can also view sales', () => {
  expect(
    resolveDashboardKind(
      '/services-crm',
      'custom',
      makeAccess({ permissions: ['services.sessions.view', 'dashboard.view'] }),
    ),
  ).toBe('crm');
});

it('opens the exact implemented CRM default page after authentication', () => {
  expect(resolveLandingRoute('/services-crm/sessions')).toBe('/crm/sessions');
  expect(resolveLandingRoute('/services-crm/settings')).toBe('/crm/form-builder');
});
it('keeps CRM and platform dashboards at the role-aware home screen', () => {
  expect(resolveLandingRoute('/services-crm')).toBe('/home');
  expect(resolveLandingRoute('/superadmin/dashboard')).toBe('/home');
});
it('maps an implemented non-dashboard landing route to its native screen', () => {
  expect(resolveLandingRoute('/products')).toBe('/stock');
});
