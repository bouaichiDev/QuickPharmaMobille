import { httpClient } from '@/services/api/client';
import { record } from '@/features/crm/crmApi';

export type Row = Record<string, unknown>;
export type Params = Record<string, unknown>;
export interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
export const compact = (params: Params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );
export function payload<T>(body: unknown): T {
  const raw = record(body);
  if (raw.success === false || raw.status === false)
    throw new Error(String(raw.message || 'La demande a échoué.'));
  if (raw.error && !raw.success && !raw.status) throw new Error(String(raw.error));
  return ((raw.success === true || raw.status === true) && 'data' in raw ? raw.data : body) as T;
}
export function page<T>(body: unknown): Page<T> {
  const value = payload<unknown>(body),
    raw = record(value),
    nested = record(raw.data);
  const content = Array.isArray(value) ? value : Array.isArray(raw.data) ? raw.data : nested.data;
  if (!Array.isArray(content)) throw new Error('Réponse de liste invalide.');
  const meta = record(raw.meta ?? (nested.last_page ? nested : raw));
  const size = Number(meta.per_page) || content.length || 25;
  return {
    data: content as T[],
    current_page: Number(meta.current_page) || 1,
    last_page:
      Number(meta.last_page) || Math.max(1, Math.ceil(Number(meta.total ?? content.length) / size)),
    total: Number(meta.total ?? content.length),
    per_page: size,
  };
}
/** Global requests never inherit a selected pharmacy. Abort abandoned reads. */
export const platformApi = {
  async get<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
    const res = await httpClient.get(path, {
      params: compact(params),
      signal,
      skipStoreContext: true,
    });
    return payload<T>(res.data);
  },
  async list<T>(path: string, params?: Params, signal?: AbortSignal): Promise<Page<T>> {
    const res = await httpClient.get(path, {
      params: { per_page: 25, ...compact(params) },
      signal,
      skipStoreContext: true,
    });
    return page<T>(res.data);
  },
  async write<T = unknown>(
    method: 'post' | 'put' | 'delete',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await httpClient.request({ method, url: path, data: body, skipStoreContext: true });
    return payload<T>(res.data);
  },
};
