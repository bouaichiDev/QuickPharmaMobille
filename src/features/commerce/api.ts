import { apiGet, httpClient } from '@/services/api/client';
import { ApiError } from '@/services/api/apiError';
import { record, type CrmRecord } from '@/features/crm/crmApi';

export type Row = CrmRecord;
export interface Page {
  rows: Row[];
  lastPage: number;
  total: number;
}
export function payload(value: unknown): unknown {
  const raw = record(value);
  if (raw.status === false || raw.success === false || raw.error) {
    throw new ApiError({
      kind: 'validation',
      message: String(raw.message ?? raw.error ?? 'Opération refusée.'),
    });
  }
  return (raw.status === true || raw.success === true) && 'data' in raw ? raw.data : value;
}
export function pageFrom(value: unknown): Page {
  const raw = payload(value),
    body = record(raw),
    nested = record(body.data);
  const data = Array.isArray(raw) ? raw : Array.isArray(body.data) ? body.data : nested.data;
  if (!Array.isArray(data)) throw new Error('Réponse de liste invalide.');
  const meta = record(body.meta ?? (nested.last_page ? nested : body));
  return {
    rows: data.map(record),
    lastPage: Number(meta.last_page ?? 1),
    total: Number(meta.total ?? data.length),
  };
}
export const compact = (params: Row) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
export const commerceApi = {
  async validateOrder(id: string) {
    return payload(await apiGet(`/commande/valide/${encodeURIComponent(id)}`));
  },
  async archiveSupplier(id: string) {
    return payload(await apiGet(`/provider/delete/${encodeURIComponent(id)}`));
  },
  /** Legacy web route mutates via GET. Never use it as a query/prefetch. */
  async archiveCustomer(id: string) {
    return payload(await apiGet(`/customer/delete/${encodeURIComponent(id)}`));
  },
  async list(path: string, params: Row, signal?: AbortSignal) {
    return pageFrom(await apiGet(path, { params: compact({ per_page: 20, ...params }), signal }));
  },
  async get(path: string, signal?: AbortSignal) {
    return record(payload(await apiGet(path, { signal })));
  },
  async write(method: 'post' | 'put' | 'delete', path: string, data?: Row) {
    return payload((await httpClient.request({ method, url: path, data })).data);
  },
  async references(path: string, params: Row = {}, signal?: AbortSignal) {
    return pageFrom(await apiGet(path, { params, signal })).rows;
  },
};
export function customerName(row: Row) {
  return [row.FirstName, row.LastName].filter(Boolean).join(' ') || 'Client';
}
export const text = (value: unknown) =>
  value == null || value === '' ? 'Non renseigné' : String(value);
export const number = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
export function fieldError(error: unknown, key: string): string | undefined {
  const errors = record(record(error).fieldErrors),
    values = errors[key];
  return Array.isArray(values) ? values.map(String).join(' ') : undefined;
}
