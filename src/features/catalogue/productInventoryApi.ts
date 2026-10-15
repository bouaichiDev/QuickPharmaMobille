import { apiGet, apiPost } from '@/services/api/client';
import type { Page } from './stockApi';
export type StockUnitAction = 'add' | 'edit' | 'trash' | 'delete' | 'transfer';
export interface StockUnit {
  id: number;
  product_id: number;
  expiry: string | null;
  received_at: string | null;
  location_id: number | null;
  provider_id: number | null;
  location: string | null;
  provider: string | null;
}
export interface InventoryOption {
  id: number;
  name: string;
}
export interface InventoryOptions {
  providers: InventoryOption[];
  locations: InventoryOption[];
  stores: InventoryOption[];
  destination_products: { id: number; productName: string; sku: string; hasExpiration: number }[];
}
export interface StockUnitChange {
  action: StockUnitAction;
  request_id: string;
  confirmed: true;
  ids?: number[];
  quantity?: number;
  expiry?: string | null;
  received_at?: string;
  provider_id?: number | null;
  location_id?: number | null;
  reason?: string;
  destination_store_id?: number;
  destination_product_id?: number;
}
export interface InventoryMovement {
  id: number;
  type: string;
  source: string;
  quantity: number;
  notes?: string;
  created_at: string;
  creator: string | null;
  from_location: string | null;
  to_location: string | null;
}
export const productInventoryApi = {
  movements: (id: number, page: number, signal?: AbortSignal) =>
    apiGet<Page<InventoryMovement>>(`/mobile-stock/products/${id}/inventory/movements`, {
      params: { page },
      signal,
    }),
  units: (id: number, params: Record<string, unknown>, signal?: AbortSignal) =>
    apiGet<Page<StockUnit>>(`/mobile-stock/products/${id}/inventory`, { params, signal }),
  options: (id: number, params: Record<string, unknown> = {}, signal?: AbortSignal) =>
    apiGet<InventoryOptions>(`/mobile-stock/products/${id}/inventory/options`, { params, signal }),
  change: (id: number, input: StockUnitChange) =>
    apiPost<{ action: StockUnitAction; changed: number }>(
      `/mobile-stock/products/${id}/inventory/actions`,
      input,
    ),
};
export function stockRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
export const stockActionLabels: Record<StockUnitAction, string> = {
  add: 'Ajouter des unités',
  edit: 'Modifier la sélection',
  trash: 'Mettre au rebut',
  delete: 'Supprimer la sélection',
  transfer: 'Transférer la sélection',
};
