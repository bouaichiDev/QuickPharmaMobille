/**
 * QuickPharma access-control API — TypeScript types.
 * Mirrors docs/access-control/api-contract.md and openapi.yaml.
 */

export type AccessErrorCode =
  | 'PERMISSION_DENIED'
  | 'FEATURE_NOT_INCLUDED'
  | 'QUOTA_EXCEEDED'
  | 'TRIAL_EXPIRED'
  | 'STORE_ACCESS_DENIED'
  | 'ACCESS_CONFIGURATION_CONFLICT';

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

/** Body of every access refusal (HTTP 403 or 409). */
export interface AccessError<D = Record<string, unknown>> {
  success: false;
  status: false;
  code: AccessErrorCode;
  reason: AccessReason | null;
  message: string;
  message_key: `access.errors.${AccessErrorCode}`;
  details: D;
}

export interface QuotaPeriod {
  type: 'none' | 'month';
  start: string | null;
  end: string | null;
  timezone?: string;
}

export interface QuotaExceededDetails {
  quota: string;
  unit: string;
  scope: QuotaScope;
  store_id: number | null;
  limit: number;
  used: number;
  requested: number;
  remaining: number;
  period: QuotaPeriod;
}

export interface ApiEnvelope<T> {
  success: true;
  data: T;
  message: string;
}

export interface Paginated<T> {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  path: string;
  first_page_url: string;
  last_page_url: string;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'archive'
  | 'validate'
  | 'cancel'
  | 'refund'
  | 'collect'
  | 'export'
  | 'configure'
  | 'manage';

export type QuotaScope = 'account' | 'store';
export type EntitlementSource = 'plan' | 'trial' | 'override' | 'none';
export type StoreAccess = 'owner' | 'member' | 'support' | 'none' | 'no_store';

export interface FeatureState {
  enabled: boolean;
  source: EntitlementSource;
  expires_at: string | null;
  /** Held before (subscription, trial or override) and not any more. */
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
  /** null for a store quota requested without a store. */
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

/** What remains possible on a lapsed feature. */
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
  id: string;
  plan_id: number;
  plan_name: string | null;
  plan_version_id: number | null;
  plan_version: number | null;
  terms: 'legacy' | 'versioned' | 'missing';
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
  /** Changes whenever access may have changed: refetch when it differs. */
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

export interface CatalogFeature {
  id: number;
  key: string;
  label_key: string;
  operational: boolean;
  active: boolean;
  lock_version: number;
}

export interface CatalogPermission {
  id: number;
  key: string;
  feature: string | null;
  action: PermissionAction;
  scope: 'tenant' | 'platform';
  delegable: boolean;
  available_when_lapsed: boolean;
  sensitive: boolean;
  active: boolean;
  label_key: string;
  lock_version: number;
  module?: string;
}

export interface CatalogModule {
  id: number;
  key: string;
  label_key: string;
  active: boolean;
  sort_order: number;
  lock_version: number;
  features: CatalogFeature[];
  permissions: CatalogPermission[];
}

export interface QuotaDefinition {
  id: number;
  key: string;
  unit: string;
  scope: QuotaScope;
  period: 'none' | 'month';
  counting_rule:
    | 'account_stores'
    | 'account_users'
    | 'store_product_references'
    | 'account_active_services'
    | 'ledger';
  label_key: string;
  active: boolean;
  lock_version: number;
}

export interface CatalogResponse {
  modules: CatalogModule[];
  quotas: QuotaDefinition[];
}

export interface TeamRole {
  id: number;
  code: string;
  label: string;
  scope: 'account' | 'global';
  editable: boolean;
  base_role_id: number | null;
  lock_version: number;
  permissions: string[];
}

export interface AdminRole {
  id: number;
  code: string;
  label: string;
  active: number;
  is_system: boolean;
  is_template: boolean;
  account_id: number | null;
  base_role_id: number | null;
  lock_version: number;
  permissions: string[];
}

export type QuotaValue = number | 'unlimited';

export interface PlanTerms {
  features: string[];
  /** A key absent from the map is left unconfigured (refused). */
  quotas: Record<string, QuotaValue>;
  trials: Record<
    string,
    { days: number; active?: boolean; features: string[]; quotas: Record<string, QuotaValue> }
  >;
}

export interface PlanVersion {
  id: number;
  plan_id: number;
  version: number;
  status: 'draft' | 'published' | 'archived';
  is_legacy: boolean;
  effective_from: string | null;
  published_at: string | null;
  published_by: number | null;
  notes: string | null;
  lock_version: number;
  subscriptions_count: number;
  terms?: PlanTerms;
}

export interface PlanImpact {
  plan_version_id: number;
  subscriptions: number;
  with_lost_features: number;
  with_exceeded_quotas: number;
  rows: {
    subscription_id: string;
    account_id: number;
    current_plan_version_id: number | null;
    features_gained: string[];
    features_lost: string[];
    quotas_exceeded: { quota: string; store_id: number | null; used: number; limit: number }[];
  }[];
}

export interface AccountOverride {
  id: number;
  account_id: number;
  type: 'feature' | 'quota';
  feature_id: number | null;
  quota_id: number | null;
  enabled: boolean | null;
  limit_value: number | null;
  is_unlimited: boolean;
  starts_at: string;
  ends_at: string;
  reason: string;
  created_by: number | null;
  revoked_at: string | null;
  revoked_by: number | null;
  revoke_reason: string | null;
  lock_version: number;
  feature?: { id: number; key: string } | null;
  quota?: { id: number; key: string } | null;
}

export type CreateOverrideRequest =
  | {
      type: 'feature';
      feature_key: string;
      enabled: boolean;
      starts_at?: string;
      ends_at: string;
      reason: string;
    }
  | {
      type: 'quota';
      quota_key: string;
      limit_value: number;
      is_unlimited?: false;
      starts_at?: string;
      ends_at: string;
      reason: string;
    }
  | {
      type: 'quota';
      quota_key: string;
      is_unlimited: true;
      starts_at?: string;
      ends_at: string;
      reason: string;
    };

export interface AccessDecision {
  allowed: boolean;
  code: AccessErrorCode | null;
  reason: AccessReason | null;
  details: Record<string, unknown>;
}

export interface SimulationResult {
  simulated_user_id: number;
  store_id: number | null;
  effective_access: EffectiveAccess;
  decisions: Record<string, AccessDecision>;
  quota_checks: Record<string, AccessDecision>;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  account_id: number | null;
  store_id: number | null;
  category: string | null;
  action: string;
  auditable_type: string | null;
  auditable_id: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { id: number; firstName: string; lastName: string; email: string } | null;
}

export interface SupportAccess {
  grant_id: number;
  expires_at: string;
}
