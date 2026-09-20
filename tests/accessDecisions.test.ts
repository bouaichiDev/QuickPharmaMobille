import {
  accessRefreshIntervalMs,
  decideAny,
  decidePermission,
  featureState,
  holdsPermission,
  quotaView,
} from '@/features/access/decisions';

import { makeAccess, quota } from './fixtures/access';

describe('permission checks', () => {
  it('is loading until /access/me answered', () => {
    expect(decidePermission(undefined, 'dashboard.view').state).toBe('loading');
  });

  it('allows a permission listed by the backend', () => {
    expect(decidePermission(makeAccess(), 'dashboard.view')).toMatchObject({ state: 'allowed', code: null });
  });

  it('reports a plan restriction on a permission held by the role', () => {
    const access = makeAccess({
      restrictions: [
        {
          permission: 'services.sessions.create',
          code: 'TRIAL_EXPIRED',
          reason: 'TRIAL_ENDED',
          feature: 'services.crm',
          message_key: 'access.errors.TRIAL_EXPIRED',
          reason_key: 'access.reasons.TRIAL_ENDED',
        },
      ],
    });
    expect(decidePermission(access, 'services.sessions.create')).toMatchObject({
      state: 'denied',
      code: 'TRIAL_EXPIRED',
      kind: 'plan',
      feature: 'services.crm',
    });
    expect(holdsPermission(access, 'services.sessions.create')).toBe(true);
  });

  it('denies an unknown permission as a role refusal', () => {
    const access = makeAccess();
    expect(decidePermission(access, 'team.users.manage')).toMatchObject({ state: 'denied', kind: 'role' });
    expect(holdsPermission(access, 'team.users.manage')).toBe(false);
  });

  it('flags permissions only kept through a lapsed feature', () => {
    const access = makeAccess({
      permissions: ['services.sessions.view'],
      lapsed_access: {
        'services.crm': {
          can_view: true,
          can_collect_payments: true,
          can_create: false,
          permissions: ['services.sessions.view'],
        },
      },
    });
    expect(decidePermission(access, 'services.sessions.view')).toMatchObject({ state: 'allowed', lapsed: true });
  });

  it('decideAny prefers an allowed permission, then the most actionable refusal', () => {
    const access = makeAccess({
      restrictions: [
        {
          permission: 'invoices.create_manual',
          code: 'FEATURE_NOT_INCLUDED',
          reason: 'FEATURE_NOT_IN_PLAN',
          feature: 'invoicing.manual',
          message_key: 'access.errors.FEATURE_NOT_INCLUDED',
          reason_key: null,
        },
      ],
    });
    expect(decideAny(access, ['team.users.view', 'dashboard.view']).state).toBe('allowed');
    expect(decideAny(access, ['team.users.view', 'invoices.create_manual'])).toMatchObject({
      state: 'denied',
      kind: 'plan',
    });
    expect(decideAny(access, []).state).toBe('allowed');
  });
});

describe('plan features', () => {
  it('reads the feature state computed by the backend', () => {
    const access = makeAccess();
    expect(featureState(access, 'sales.pos')?.enabled).toBe(true);
    expect(featureState(access, 'invoicing.manual')).toMatchObject({ enabled: false, reason: 'FEATURE_NOT_IN_PLAN' });
    expect(featureState(access, 'unknown.feature')).toBeNull();
  });
});

describe('plan quotas', () => {
  it('keeps not configured, unlimited and limited distinct', () => {
    const access = makeAccess({
      quotas: {
        'users.total': quota({ key: 'users.total', configured: false, limit: null }),
        'stores.total': quota({ key: 'stores.total', unlimited: true, limit: null }),
        'sales.monthly': quota({ key: 'sales.monthly', limit: 100, used: 100, remaining: 0, exceeded: true }),
      },
    });
    expect(quotaView(access, 'users.total').state).toBe('not_configured');
    expect(quotaView(access, 'stores.total').state).toBe('unlimited');
    expect(quotaView(access, 'sales.monthly')).toMatchObject({ state: 'limited', limit: 100, exceeded: true });
    expect(quotaView(access, 'products.references').state).toBe('absent');
    expect(quotaView(undefined, 'sales.monthly').state).toBe('loading');
  });
});

describe('access refresh interval', () => {
  const now = Date.parse('2026-09-13T10:00:00Z');

  it('follows valid_until within 30 s – 10 min', () => {
    expect(accessRefreshIntervalMs(makeAccess({ valid_until: '2026-09-13T10:05:00Z' }), now)).toBe(5 * 60_000);
    expect(accessRefreshIntervalMs(makeAccess({ valid_until: '2026-09-13T10:00:05Z' }), now)).toBe(30_000);
    expect(accessRefreshIntervalMs(makeAccess({ valid_until: '2026-09-14T10:00:00Z' }), now)).toBe(10 * 60_000);
    expect(accessRefreshIntervalMs(makeAccess({ valid_until: null }), now)).toBe(10 * 60_000);
  });
});
