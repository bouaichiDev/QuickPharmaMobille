import { decidePermission } from '@/features/access/decisions';
import type { EffectiveAccess } from '@/types/access';

import type { DashboardKind } from './types';

/** Permission required by each dashboard endpoint (backend route matrix). */
export const DASHBOARD_PERMISSIONS = {
  pharmacy: 'dashboard.view',
  crm: 'services.sessions.view',
} as const;

function allowed(access: EffectiveAccess, permission: string): boolean {
  return decidePermission(access, permission).state === 'allowed';
}

/**
 * Each role lands on its own dashboard (`roles.default_route`, set in the
 * backend). The mobile app follows that route and only falls back on the
 * permissions when the route has no mobile equivalent.
 */
export function resolveDashboardKind(
  defaultRoute: string | null | undefined,
  roleCode: string | null | undefined,
  access: EffectiveAccess,
): DashboardKind {
  const route = (defaultRoute ?? '').toLowerCase();
  const isPlatform = route.startsWith('/superadmin') || access.subscription?.terms === 'platform';

  if (isPlatform || roleCode === 'SuperAdmin') return 'platform';
  if (route.startsWith('/services-crm') && allowed(access, DASHBOARD_PERMISSIONS.crm)) return 'crm';
  if (allowed(access, DASHBOARD_PERMISSIONS.pharmacy)) return 'pharmacy';
  if (allowed(access, DASHBOARD_PERMISSIONS.crm)) return 'crm';
  return 'none';
}
