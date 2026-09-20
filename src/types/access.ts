/**
 * Access-control contract. Mirrors sassApi/docs/access-control/types.ts
 * (GET /access/me and the 403/409 refusal body). Keep in sync with the backend.
 */

export type AccessErrorCode =
  | 'PERMISSION_DENIED'
  | 'FEATURE_NOT_INCLUDED'
  | 'QUOTA_EXCEEDED'
  | 'TRIAL_EXPIRED'
  | 'STORE_ACCESS_DENIED'
  | 'ACCESS_CONFIGURATION_CONFLICT';

export const ACCESS_ERROR_CODES: readonly AccessErrorCode[] = [
  'PERMISSION_DENIED',
  'FEATURE_NOT_INCLUDED',
  'QUOTA_EXCEEDED',
  'TRIAL_EXPIRED',
  'STORE_ACCESS_DENIED',
  'ACCESS_CONFIGURATION_CONFLICT',
];

export type AccessReason =
  | 'USER_INACTIVE'
  | 'PERMISSION_UNKNOWN'
  | 'PERMISSION_INACTIVE'
  | 'PERMISSION_NOT_GRANTED'
  | 'ROLE_OUTSIDE_ACCOUNT'
  | 'NOT_DELEGABLE'
  | 'PRIVILEGE_ESCALATION'
  | 'SYSTEM_ROLE_PROTECTED'
  | 'LAST_SUPER_ADMIN'
  | 'ACCOUNT_OWNER_PROTECTED'
  | 'SELF_MODIFICATION'
  | 'PAYMENT_REQUIRED'
  | 'FEATURE_NOT_IN_PLAN'
  | 'FEATURE_NOT_OPERATIONAL'
  | 'FEATURE_WITHDRAWN'
  | 'NO_ACTIVE_SUBSCRIPTION'
  | 'TRIAL_ENDED'
  | 'TRIAL_NOT_OFFERED'
  | 'TRIAL_ALREADY_USED'
  | 'TRIAL_NOT_NEEDED'
  | 'LIMIT_REACHED'
  | 'STORE_NOT_IN_SCOPE'
  | 'STORE_SUSPENDED'
  | 'SUPPORT_ACCESS_REQUIRED'
  | 'NO_ACCOUNT'
  | 'CROSS_ACCOUNT'
  | 'ROUTE_NOT_CLASSIFIED'
  | 'QUOTA_NOT_CONFIGURED'
  | 'PLAN_VERSION_MISSING'
  | 'VERSION_MISMATCH'
  | 'INVALID_STATE';

export type QuotaScope = 'account' | 'store';
export type EntitlementSource = 'plan' | 'trial' | 'override' | 'platform' | 'none';
export type StoreAccess = 'owner' | 'member' | 'support' | 'none' | 'no_store';

export interface QuotaPeriod {
  type: 'none' | 'month';
  start: string | null;
  end: string | null;
  timezone?: string;
}

export interface FeatureState {
  enabled: boolean;
  source: EntitlementSource;
  expires_at: string | null;
  lapsed: boolean;
  reason: AccessReason | null;
}

export interface QuotaState {
  key: string;
  unit: string;
  scope: QuotaScope;
  store_id: number | null;
  /** false = not configured: creations are refused, never unlimited. */
  configured: boolean;
  unlimited: boolean;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  exceeded: boolean;
  period: QuotaPeriod;
  source: EntitlementSource;
  expires_at: string | null;
}

export interface TrialState {
  status: 'available' | 'active' | 'expired' | 'scheduled';
  started_at: string | null;
  ends_at: string | null;
  days_left: number;
  duration_days?: number;
  features: string[];
}

export interface LapsedAccess {
  can_view: boolean;
  can_collect_payments: boolean;
  can_create: false;
  permissions: string[];
}

export interface Restriction {
  permission: string;
  code: AccessErrorCode;
  reason: AccessReason | null;
  feature: string | null;
  message_key: string;
  reason_key: string | null;
}

export interface SubscriptionSummary {
  id: string | null;
  plan_id: number | null;
  plan_name: string | null;
  plan_version_id: number | null;
  plan_version: number | null;
  /** 'platform' = SuperAdmin's own account: never expires. */
  terms: 'legacy' | 'versioned' | 'missing' | 'platform';
  start_date: string | null;
  end_date: string | null;
}

export interface MenuNode {
  id: number;
  header: string | null;
  label: string;
  route: string | null;
  icon: string | null;
  parent_id: number | null;
  order: number;
  hidden: number;
  public: number;
  role: string;
  children: MenuNode[];
}

export interface EffectiveAccess {
  account: { id: string; is_owner: boolean } | null;
  store: { id: string; name: string | null; access: StoreAccess; suspended: boolean } | null;
  role: { id: number | null; code: string | null; scope: 'account' | 'global' };
  access_version: string;
  valid_until: string | null;
  generated_at: string;
  subscription: SubscriptionSummary | null;
  permissions: string[];
  features: Record<string, FeatureState>;
  quotas: Record<string, QuotaState>;
  trials: Record<string, TrialState>;
  lapsed_access: Record<string, LapsedAccess>;
  restrictions: Restriction[];
  menus: MenuNode[];
}

/** Body of every access refusal (HTTP 403 or 409). */
export interface AccessErrorBody {
  success: false;
  status: false;
  code: AccessErrorCode;
  reason: AccessReason | null;
  message: string;
  message_key: string;
  details: Record<string, unknown>;
}
