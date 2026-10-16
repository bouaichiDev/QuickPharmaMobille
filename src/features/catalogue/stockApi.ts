import { apiGet, httpClient } from '@/services/api/client';
import { listPayload } from '@/features/crm/crmApi';
export interface StockProduct {
  id: number;
  productName: string;
  sku: string;
  barcode?: string | null;
  categoryName?: string;
  categoryId?: number | null;
  providerId?: number | null;
  status?: number | string;
  discount?: number | null;
  side_effects?: string | null;
  date_expiration?: string | null;
  originalQuantity?: number | null;
  quantity: number;
  minQuantity: number;
  buyingPrice: number;
  sellingPrice: number;
  description?: string;
  images?: string;
  locationName?: string;
  location_hint?: string;
  locationCount?: number;
  active: number;
  hasExpiration: number;
  expiry?: string;
  precautions?: string;
  interactions?: string;
  requires_prescription?: number;
  tax?: number;
  includeTaxInPrice?: boolean | number;
  profitMargin?: number;
  maxQuantity?: number;
  manufacturer?: string;
  active_substance?: string;
  FORME?: string;
  medicine_catalog_metadata?: string | Record<string, unknown>;
}
export interface StockLocation {
  id: number;
  name: string;
  description?: string;
  products: number;
  quantity: number;
  metadata?: string | LocationMetadata;
  stock_value?: number;
  last_inventory?: string;
  missing_barcodes?: number;
}
export interface LocationMetadata {
  zone?: string;
  code?: string;
  shelves?: string;
  capacity?: number;
  temperature?: number;
  temperature_at?: string;
}
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  counts?: Record<string, number>;
  stats?: { conformity?: number };
}
export interface CountSummary {
  total: number;
  counted: number;
  differences: number;
  delta: number;
  impact?: number;
  losses?: number;
  surplus?: number;
}
export interface CountSession {
  id: number;
  name: string;
  status: string;
  created_at: string;
  location_id?: number;
  summary: CountSummary;
  location_name?: string;
  creator_name?: string;
  validated_at?: string;
}
export interface CountLine {
  id: number;
  product_id: number;
  productName: string;
  sku: string;
  barcode?: string;
  expected: number;
  counted: number | null;
  reason?: string;
  expiry?: string;
  hasExpiration: number;
  buyingPrice: number;
  description?: string;
}
export interface SessionDetail {
  session: CountSession;
  summary: CountSummary;
  lines: Page<CountLine>;
}
export interface ProductDetail {
  product: StockProduct;
  lots: {
    quantity: number;
    expiry?: string;
    location?: string;
    location_id?: number;
    reference?: string;
  }[];
  movements: { id: number; type: string; quantity: number; notes?: string; created_at: string }[];
}
export const canAssociateBarcode = (p: Pick<StockProduct, 'sku' | 'barcode'>) =>
  String(p.barcode || p.sku || '')
    .trim()
    .startsWith('AMMPS-');

export const productCode = (p: Pick<StockProduct, 'sku' | 'barcode'>) =>
  canAssociateBarcode(p) ? '' : p.barcode || (/^\d+$/.test(String(p.sku)) ? String(p.sku) : '');
export const stockApi = {
  withdraw: async (id: number, quantity: number, reason: string) =>
    (await httpClient.post(`/mobile-stock/products/${id}/withdraw`, { quantity, reason })).data,
  sales: async (id: number, page: number) =>
    listPayload(
      await apiGet<unknown>(`/sales/by-product/${id}`, { params: { page, perPage: 15 } }),
    ),
  products: (params: Record<string, unknown>, signal?: AbortSignal) =>
    apiGet<Page<StockProduct>>('/mobile-stock/products', { params, signal }),
  detail: (id: number, signal?: AbortSignal) =>
    apiGet<ProductDetail>(`/mobile-stock/products/${id}`, { signal }),
  lookup: (code: string) =>
    apiGet<{ product: StockProduct | null }>('/mobile-stock/lookup', { params: { code } }),
  barcode: async (id: number, code: string, replace: boolean) =>
    (await httpClient.patch(`/mobile-stock/products/${id}/barcode`, { code, replace })).data,
  locations: () => apiGet<StockLocation[]>('/mobile-stock/locations'),
  assignLocation: async (id: number, location_id: number | null, hint?: string) =>
    (await httpClient.patch(`/mobile-stock/products/${id}/location`, { location_id, hint })).data,
  createLocation: async (
    name: string,
    description: string,
    metadata?: LocationMetadata,
    id?: number,
  ) =>
    (id
      ? await httpClient.patch(`/mobile-stock/locations/${id}`, { name, description, metadata })
      : await httpClient.post('/mobile-stock/locations', { name, description, metadata })
    ).data,
  sessions: (page: number, status?: string) =>
    apiGet<Page<CountSession>>('/mobile-stock/sessions', { params: { page, status } }),
  createSession: async (name: string, location_id: number | null) =>
    (await httpClient.post<{ id: number }>('/mobile-stock/sessions', { name, location_id })).data,
  renameSession: async (id: number, name: string) =>
    (await httpClient.patch<{ id: number }>(`/mobile-stock/sessions/${id}`, { name })).data,
  session: (id: number, params: Record<string, unknown>) =>
    apiGet<SessionDetail>(`/mobile-stock/sessions/${id}`, { params }),
  count: async (id: number, product: number, counted: number, reason: string, expiry?: string) =>
    (
      await httpClient.patch(`/mobile-stock/sessions/${id}/lines/${product}`, {
        counted,
        reason,
        expiry: expiry || null,
      })
    ).data,
  validate: async (id: number) =>
    (await httpClient.post(`/mobile-stock/sessions/${id}/validate`, { confirmed: true })).data,
};
