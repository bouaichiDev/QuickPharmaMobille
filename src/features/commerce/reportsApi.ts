import { apiGet } from '@/services/api/client';
import { record, type CrmRecord } from '@/features/crm/crmApi';
export type ReportKind = 'sales' | 'entries' | 'orders' | 'products';
export const reportDefinitions = {
  sales: {
    title: 'Ventes et encaissements',
    path: '/reportSales',
    rows: 'sales',
    status: 'sales',
    icon: 'point-of-sale',
  },
  entries: {
    title: 'Achats et entrées de stock',
    path: '/reportEntree',
    rows: 'entries',
    status: 'entrees',
    icon: 'move-to-inbox',
  },
  orders: {
    title: 'Commandes clients',
    path: '/reportCommandes',
    rows: 'commandes',
    status: 'commandes',
    icon: 'shopping-cart',
  },
  products: {
    title: 'Produits et mouvements de stock',
    path: '/BilanDay',
    rows: 'data',
    status: '',
    icon: 'inventory-2',
  },
} as const;
export interface ReportFilters {
  startDate: string;
  endDate: string;
  status: string;
  search: string;
}
export interface ReportPage {
  rows: CrmRecord[];
  summary: CrmRecord;
  total: number;
  lastPage: number;
  page: number;
  byCategory: CrmRecord[];
  topProducts: CrmRecord[];
}
export function parseReport(body: unknown, kind: ReportKind, page: number): ReportPage {
  const raw = record(body);
  if (raw.error || raw.status === false)
    throw new Error(String(raw.message ?? raw.error ?? 'Rapport indisponible.'));
  const rows = raw[reportDefinitions[kind].rows];
  if (!Array.isArray(rows)) throw new Error('Réponse de rapport invalide.');
  const pagination = record(raw.pagination ?? raw.meta ?? raw);
  return {
    rows: rows.map(record),
    summary: record(raw.summary),
    total: Number(pagination.total ?? rows.length),
    lastPage: Number(pagination.totalPages ?? pagination.last_page ?? 1),
    page,
    byCategory: Array.isArray(raw.byCategory) ? raw.byCategory.map(record) : [],
    topProducts: Array.isArray(raw.topProducts) ? raw.topProducts.map(record) : [],
  };
}
export function validateReportDates(filters: ReportFilters) {
  if (
    ![filters.startDate, filters.endDate].every(
      (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)),
    ) ||
    filters.startDate > filters.endDate
  )
    throw new Error(
      'Choisissez une période valide : la date de début doit précéder la date de fin.',
    );
}
export function reportParams(kind: ReportKind, filters: ReportFilters, page = 1, size = 20) {
  validateReportDates(filters);
  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status || 'all',
    page,
    perPage: size,
    per_page: size,
    ...(kind === 'products'
      ? {
          date: filters.startDate,
          dateTo: filters.endDate,
          typeBilan: 'sales',
          searchValue: filters.search,
        }
      : {}),
  };
}
export const reportsApi = {
  async get(kind: ReportKind, filters: ReportFilters, page = 1, size = 20, signal?: AbortSignal) {
    return parseReport(
      await apiGet(reportDefinitions[kind].path, {
        params: reportParams(kind, filters, page, size),
        signal,
      }),
      kind,
      page,
    );
  },
  async exportRows(kind: ReportKind, filters: ReportFilters, signal?: AbortSignal) {
    const cap = 1000;
    const first = await reportsApi.get(kind, filters, 1, 100, signal);
    const rows = [...first.rows];
    for (let page = 2; page <= first.lastPage && rows.length < cap; page++) {
      if (signal?.aborted) throw new Error('Export annulé.');
      const next = await reportsApi.get(kind, filters, page, 100, signal);
      rows.push(...next.rows);
      if (!next.rows.length) break;
    }
    return {
      ...first,
      rows: rows.slice(0, cap),
      truncated: first.total > Math.min(rows.length, cap),
    };
  },
};
export function reportColumns(kind: ReportKind): [string, string][] {
  return kind === 'products'
    ? [
        ['sku', 'Référence'],
        ['productName', 'Produit'],
        ['items_sold', 'Unités vendues'],
        ['items_buy', 'Unités reçues'],
        ['available_stock', 'Disponibles'],
        ['reserved_stock', 'Réservées'],
      ]
    : [
        [
          kind === 'sales' ? 'saleNumber' : kind === 'orders' ? 'orderNumber' : 'entryNumber',
          'Référence',
        ],
        ['date', 'Date'],
        [
          kind === 'entries' ? 'provider' : 'customer',
          kind === 'entries' ? 'Fournisseur' : 'Client',
        ],
        ['status', 'Statut'],
        ['totalAmount', 'Montant total'],
        ['paidAmount', 'Payé'],
        ['dueAmount', 'Reste dû'],
      ];
}
export function reportCsv(kind: ReportKind, rows: CrmRecord[]) {
  const cell = (value: unknown) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const columns = reportColumns(kind);
  return (
    '\ufeff' +
    [
      columns.map(([, label]) => cell(label)).join(';'),
      ...rows.map((row) => columns.map(([key]) => cell(row[key])).join(';')),
    ].join('\r\n')
  );
}
