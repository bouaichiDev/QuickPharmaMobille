/**
 * Payload shapes of the /api/superadmin/* endpoints.
 * Mirrors the backend contract in docs/FRONTEND-SUPERADMIN.md.
 */

export interface PlatformOverview {
  tenants: {
    stores_total: number;
    stores_subscribed: number;
    stores_without_subscription: number;
    users_total: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    collected_total: number;
    pending_total: number;
    pending_count: number;
  };
  subscriptions: {
    active: number;
    pending: number;
    cancelled: number;
    expired: number;
    expiring_in_7_days: number;
  };
  churn: {
    lost_last_30_days: number;
    rate_last_30_days: number;
  };
  generated_at: string;
}

export interface DashboardSnapshot {
  sales_today: { count: number; total: number };
  sales_yesterday_same_period: { count: number; total: number };
  active_stores_today: number;
  top_stores_today: {
    store_id: number;
    name: string;
    sales_count: number;
    sales_total: number;
  }[];
  new_today: { stores: number; users: number; subscriptions: number };
  recent_activity: {
    id: number;
    action: string;
    created_at: string;
    store_id: number | null;
    store_name: string | null;
    user_email: string | null;
  }[];
  generated_at: string;
  /** Server-side cache lifetime; drives the polling interval instead of a hardcoded value. */
  ttl_seconds: number;
}

export interface TenantState {
  active: boolean;
  suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
}

export interface TenantSubscription {
  id: string;
  plan_id: number;
  plan_name: string;
  plan_price: number;
  start_date: string;
  end_date: string;
  days_left: number;
}

export interface TenantUsage {
  users: number;
  /** null when the store has no subscription, hence no plan limit: render "—", not 0. */
  users_limit: number | null;
  users_exceeded: boolean;
  stores: number;
  stores_limit: number | null;
  stores_exceeded: boolean;
}

export interface TenantRow {
  store_id: number;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  state: TenantState;
  owner: { id: number; name: string; email: string } | null;
  /** null when the store has no active subscription. */
  subscription: TenantSubscription | null;
  usage: TenantUsage;
  activity: { sales_count: number; sales_total: number; crm?: TenantCrmStats };
}

export interface TenantUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  active: number;
  role_code: string | null;
}

export interface TenantBilling {
  id: string;
  total: string;
  billing_date: string;
  due_date: string;
  status_code: 'paid' | 'unpaid' | 'echec';
  plan_name: string | null;
}

export interface TenantDetail extends TenantRow {
  activity_users?: { id: number; email: string }[];
  users: TenantUser[];
  billings: TenantBilling[];
}

/** Shared shape of the sales / purchases / orders blocks. */
export interface TenantFlowStats {
  count: number;
  total: number;
  paid: number;
  due: number;
  last_30_days: { count: number; total: number };
  this_month: { count: number; total: number };
  first_at: string | null;
  last_at: string | null;
}

export interface TenantStats {
  store_id: number;
  crm?: TenantCrmStats;
  sales: TenantFlowStats;
  purchases: TenantFlowStats;
  orders: TenantFlowStats;
  catalogue: {
    products: number;
    out_of_stock: number;
    low_stock: number;
    requires_prescription: number;
    stock_value_selling: number;
    stock_value_buying: number;
    categories: number;
    providers: number;
  };
  inventory: {
    items_total: number;
    /** Keys are the status codes present in this stock — iterate, never hardcode them. */
    by_status: Record<string, number>;
    expired: number;
    expiring_in_30_days: number;
    locations: number;
  };
  invoicing: { count: number; total_ttc: number; tax_total: number; closed: number };
  customers: { total: number; active: number; loyalty_points: number };
  payments: { count: number; received_total: number };
  team: { users: number };
  generated_at: string;
}

export interface PlatformHealth {
  billings_to_validate: {
    id: string;
    total: string;
    billing_date: string;
    due_date: string;
    status_code: string;
    owner_email: string | null;
  }[];
  subscriptions_expiring: {
    id: string;
    end_date: string;
    plan_name: string | null;
    owner_email: string | null;
  }[];
  stores_without_subscription: {
    id: number;
    name: string;
    created_at: string;
    owner_email: string | null;
  }[];
}

export interface ImpersonationTicket {
  /** Already encrypted by the API: forward it verbatim, never re-encode it. */
  store_id: string;
  store_name: string;
  owner: { id: number; email: string } | null;
  impersonating: boolean;
  /** Audited, time-boxed support access opened by the call (backend docs/access-control §10). */
  support_access?: { grant_id: number; expires_at: string };
}

export interface SuperAdminPlan {
  id: number;
  name: string;
  price: number | string;
  duration_in_days?: number | null;
  [key: string]: unknown;
}

export interface TenantFilters {
  search?: string;
  status?: 'active' | 'expiring' | 'none';
  state?: 'active' | 'suspended';
  plan_id?: number | string;
  per_page?: number;
  page?: number;
}

/** Raw Laravel paginator — superadmin/tenants is not wrapped in the {success,data} envelope. */
export interface Paginated<T> {
  current_page: number;
  data: T[];
  total: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

export interface TenantCrmStats {
  services: number;
  sessions: number;
  appointments: number;
  packages: number;
  total: number;
  paid: number;
  due: number;
  last_session_at: string | null;
}
export interface TenantActivity {
  id: number;
  action: string;
  created_at: string;
  user_id: number | null;
  user_email: string | null;
  category: string | null;
}

export interface TenantMonthlyStats {
  group_by?: 'day' | 'month';
  date_from: string;
  date_to: string;
  months: { month: string; sales: number; purchases: number; orders: number; crm: number }[];
}
