import type {
  AccessErrorCode,
  AccessReason,
  EffectiveAccess,
  FeatureState,
  QuotaState,
} from '@/types/access';

/**
 * Read-only projections of GET /access/me — same logic as the web app
 * (pharma-stock-nexus/src/access/utils/decision.ts). Nothing is decided here:
 * every answer is looked up in what the backend computed.
 */

/** Who can lift a refusal: drives the wording and the call to action. */
export type DenialKind = 'role' | 'plan' | 'store' | 'configuration';

export interface PermissionDecision {
  state: 'loading' | 'allowed' | 'denied';
  permission: string | null;
  code: AccessErrorCode | null;
  reason: AccessReason | null;
  feature: string | null;
  kind: DenialKind | null;
  /** Allowed only through a lapsed feature: existing data can be read or settled. */
  lapsed: boolean;
}

export const LOADING_DECISION: PermissionDecision = {
  state: 'loading',
  permission: null,
  code: null,
  reason: null,
  feature: null,
  kind: null,
  lapsed: false,
};

export function denialKindOf(code: AccessErrorCode): DenialKind {
  switch (code) {
    case 'PERMISSION_DENIED':
      return 'role';
    case 'STORE_ACCESS_DENIED':
      return 'store';
    case 'ACCESS_CONFIGURATION_CONFLICT':
      return 'configuration';
    default:
      return 'plan';
  }
}

export function decidePermission(
  access: EffectiveAccess | null | undefined,
  permission: string,
): PermissionDecision {
  if (!access) return LOADING_DECISION;

  if (access.permissions.includes(permission)) {
    const lapsed = Object.values(access.lapsed_access ?? {}).some((entry) =>
      entry.permissions.includes(permission),
    );
    return { ...LOADING_DECISION, state: 'allowed', permission, lapsed };
  }

  // Listed only when the role holds the permission and something else blocks it.
  const restriction = access.restrictions.find((entry) => entry.permission === permission);
  if (restriction) {
    return {
      state: 'denied',
      permission,
      code: restriction.code,
      reason: restriction.reason,
      feature: restriction.feature,
      kind: denialKindOf(restriction.code),
      lapsed: false,
    };
  }

  return {
    ...LOADING_DECISION,
    state: 'denied',
    permission,
    code: 'PERMISSION_DENIED',
    kind: 'role',
  };
}

const DENIAL_PRIORITY: Record<DenialKind, number> = { plan: 0, store: 1, configuration: 2, role: 3 };

export function decideAny(
  access: EffectiveAccess | null | undefined,
  permissions: readonly string[],
): PermissionDecision {
  if (!access) return LOADING_DECISION;
  if (permissions.length === 0) return { ...LOADING_DECISION, state: 'allowed' };

  const decisions = permissions.map((permission) => decidePermission(access, permission));
  const allowed = decisions.find((decision) => decision.state === 'allowed');
  if (allowed) return allowed;

  const sorted = [...decisions].sort(
    (a, b) => DENIAL_PRIORITY[a.kind ?? 'role'] - DENIAL_PRIORITY[b.kind ?? 'role'],
  );
  return sorted[0] ?? LOADING_DECISION;
}

/** The role holds the permission, whether or not the subscription currently allows it. */
export function holdsPermission(
  access: EffectiveAccess | null | undefined,
  permission: string,
): boolean {
  return (
    !!access &&
    (access.permissions.includes(permission) ||
      access.restrictions.some(
        (entry) => entry.permission === permission && entry.code !== 'PERMISSION_DENIED',
      ))
  );
}

export function featureState(
  access: EffectiveAccess | null | undefined,
  feature: string,
): FeatureState | null {
  return access?.features?.[feature] ?? null;
}

/**
 * Zero, unlimited and "not configured" are three distinct server states and
 * are never collapsed: a missing configuration refuses creations.
 */
export type QuotaView =
  | { state: 'loading' }
  | { state: 'absent'; key: string }
  | { state: 'not_configured'; quota: QuotaState }
  | { state: 'unlimited'; quota: QuotaState }
  | {
      state: 'limited';
      quota: QuotaState;
      limit: number;
      used: number | null;
      remaining: number | null;
      exceeded: boolean;
    };

export function quotaStateView(quota: QuotaState | null | undefined, key: string): QuotaView {
  if (!quota) return { state: 'absent', key };
  if (!quota.configured) return { state: 'not_configured', quota };
  if (quota.unlimited || quota.limit === null) return { state: 'unlimited', quota };
  return {
    state: 'limited',
    quota,
    limit: quota.limit,
    used: quota.used,
    remaining: quota.remaining,
    exceeded: quota.exceeded,
  };
}

export function quotaView(access: EffectiveAccess | null | undefined, key: string): QuotaView {
  if (!access) return { state: 'loading' };
  return quotaStateView(access.quotas?.[key], key);
}

/**
 * How long the access snapshot may be trusted: until `valid_until`, clamped
 * between 30 seconds and 10 minutes (same bounds as the web app).
 */
export function accessRefreshIntervalMs(
  access: EffectiveAccess | null | undefined,
  now: number = Date.now(),
): number {
  const MIN = 30_000;
  const MAX = 10 * 60_000;
  const until = access?.valid_until ? Date.parse(access.valid_until) : NaN;
  if (!Number.isFinite(until)) return MAX;
  return Math.min(MAX, Math.max(MIN, until - now));
}
