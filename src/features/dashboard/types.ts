/** GET /dashboard (DashboardController::index) — raw JSON, no envelope. */
export interface ChartSeries {
  name: 'Entrees' | 'Sales' | string;
  data: number[];
}

export type RecentActivity =
  | { type: 'sale'; label: string; reference: string; amount: number; at: string }
  | { type: 'stock'; label: string; reference: string; delta: number; at: string }
  | { type: 'low_stock'; label: string; remaining: number | null; at: string };

export interface PharmacyDashboardResponse {
  /** number_format strings, e.g. "2840". */
  totalSalesComplete: string;
  totalSalesUnpaid: string;
  totalPurchaseComplete: string;
  totalPurchaseUnpaid: string;
  totalCustomers: number;
  totalProviders: number;
  /** Year-scoped. */
  CountSales: number;
  CountEntrees: number;
  productsCount: number;
  unitsAvailable: number;
  /** Lots expired or expiring within 7 days (mixed). */
  expiredCount: number;
  /** Available quantity <= minQuantity (low stock and out of stock mixed). */
  outOfStockCount: number;
  seriesPaid: ChartSeries[];
  seriesUnpaid: ChartSeries[];
  year: number | string;
  month: number;
  performance?: {
    averageTicket: number;
    peakHour: string | null;
    returnRate: number;
  };
  previousPeriod?: {
    totalCustomers: number;
    totalProviders: number;
    unitsAvailable: number;
    CountSales: number;
    CountEntree: number;
    year: string;
  };
  recentActivity?: RecentActivity[];
}

/** GET /alerts/dashboard `data` (unread counts per type and priority). */
export interface AlertsDashboard {
  total_unread: number;
  total_alerts: number;
  by_type: Partial<Record<AlertType, number>>;
  by_priority: Partial<Record<AlertPriority, number>>;
  latest: AlertItem[];
}

export type AlertType =
  | 'stock_low'
  | 'stock_out'
  | 'product_expiring'
  | 'product_expired'
  | 'credit_limit'
  | 'credit_overdue'
  | 'cheque_due'
  | 'cheque_rejected'
  | 'sales_drop'
  | 'system';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

/** AlertResource */
export interface AlertItem {
  uid: string;
  store_id: number;
  type: AlertType | string;
  priority: AlertPriority | string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: number | null;
  entity_name: string | null;
  is_read: boolean;
  read_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

/** GET /crm-reports/dashboard `data` (CrmReportService::dashboard). */
export interface CrmDashboard {
  period: { from: string; to: string };
  revenue: number;
  sessions_count: number;
  customers_count: number;
  unpaid_total: number;
  pending_payments_count: number;
  appointments_today: number;
  popular_services: unknown[];
  revenue_trend: unknown;
  appointments_trend: unknown;
  active_clients_trend: unknown;
  revenue_series: unknown[];
}

export interface DashboardPeriod {
  year: number;
  /** 0 = whole year. */
  month: number;
}

export type DashboardKind = 'pharmacy' | 'crm' | 'platform' | 'none';
