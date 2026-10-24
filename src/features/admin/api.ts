import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, httpClient } from '@/services/api/client';
import { record, type CrmRecord } from '@/features/crm/crmApi';
import { compact } from '@/features/commerce/api';
import { useCommerceAccess } from '@/features/commerce/CommerceUI';
export type Row = CrmRecord;
export function checked(body: unknown): unknown {
  const raw = record(body);
  if (raw.success === false || raw.status === false || raw.status === 'error' || raw.error)
    throw new Error(String(raw.message ?? raw.error ?? 'Opération refusée.'));
  return body;
}
export function unwrap(body: unknown): unknown {
  const raw = record(checked(body));
  return 'data' in raw && (raw.success === true || raw.status === 'success' || raw.status === true)
    ? raw.data
    : body;
}
export function adminPage(body: unknown) {
  const raw = record(checked(body));
  const value = unwrap(body);
  const nested = record(value);
  const rows = Array.isArray(value) ? value : Array.isArray(nested.data) ? nested.data : [];
  if (!Array.isArray(value) && !Array.isArray(nested.data))
    throw new Error('Réponse de liste invalide.');
  const meta = record(raw.meta ?? nested.meta ?? nested);
  return {
    rows: rows.map(record),
    total: Number(meta.total ?? rows.length),
    lastPage: Number(meta.last_page ?? 1),
  };
}
export const adminApi = {
  async get(path: string, params: Row = {}, signal?: AbortSignal) {
    return checked(await apiGet(path, { params: compact(params), signal }));
  },
  async write(method: 'post' | 'put' | 'delete', path: string, data?: Row) {
    return unwrap(checked((await httpClient.request({ method, url: path, data })).data));
  },
};
export function useAdminQuery(path: string, params: Row, permission: string, enabled = true) {
  const { store, can } = useCommerceAccess();
  return useQuery({
    queryKey: ['admin', store, path, params],
    queryFn: ({ signal }) => adminApi.get(path, params, signal),
    enabled: enabled && !!store && can(permission),
    staleTime: 30000,
    retry: false,
  });
}
export function useAdminAction(
  permission: string,
  action: (data: Row) => Promise<unknown>,
  onSuccess?: (value: unknown) => void,
) {
  const { can } = useCommerceAccess();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Row) => {
      if (!can(permission)) throw new Error('Action non autorisée.');
      return action(data);
    },
    retry: false,
    onSuccess: (value) => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['access'] });
      onSuccess?.(value);
    },
  });
}
export const asRows = (body: unknown) => adminPage(body).rows;
export const asRecord = (body: unknown) => record(unwrap(body));
