import { apiGet, httpClient } from '@/services/api/client';
import { ApiError } from '@/services/api/apiError';
import type { CrmModule } from './modules';

export type CrmRecord = Record<string, unknown>;
export function record(value: unknown): CrmRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as CrmRecord) : {};
}
export function unwrap(value: unknown): unknown {
  const body = record(value);
  if (body.success === false || body.status === false)
    throw new ApiError({
      kind: 'unknown',
      message: String(body.message || 'La demande a échoué.'),
    });
  return body.success === true ? body.data : value;
}
export function listPayload(value: unknown) {
  const body = unwrap(value);
  const raw = record(body);
  const nested = record(raw.data);
  const data = Array.isArray(body) ? body : Array.isArray(raw.data) ? raw.data : nested.data;
  if (!Array.isArray(data)) throw new Error('Réponse de liste CRM invalide.');
  const meta = record(
    raw.pagination ??
      raw.meta ??
      nested.pagination ??
      nested.meta ??
      (nested.last_page ? nested : raw),
  );
  return {
    rows: data.map(record),
    lastPage: Number(meta.last_page ?? 1),
    total: Number(meta.total ?? data.length),
  };
}
export function itemId(row: CrmRecord) {
  return String(row.uid ?? row.id ?? row.value ?? '');
}
export function itemName(row: CrmRecord) {
  return String(
    row.name ??
      row.label ??
      row.title ??
      row.ref ??
      row.details ??
      ([row.FirstName ?? row.firstName, row.LastName ?? row.lastName].filter(Boolean).join(' ') ||
        row.email ||
        '') ??
      '',
  );
}

/** The Services tab contains individual acts, separate from sold packages. */
export function groupStandaloneServices(sessions: CrmRecord[]) {
  const groups = new Map<string, CrmRecord>();
  for (const session of sessions) {
    if (session.customer_service_package_id) continue;
    const id = String(session.service_id ?? '');
    if (!id) continue;
    const existing = groups.get(id);
    groups.set(id, {
      service_id: id,
      service: session.service,
      sessions_count: Number(existing?.sessions_count ?? 0) + 1,
    });
  }
  return [...groups.values()];
}

export function photoMatchesContext(
  photo: CrmRecord,
  context: { serviceId?: string; packageId?: string; sessionId?: string; standalone?: boolean },
) {
  return (
    (!context.serviceId || photo.service_id === context.serviceId) &&
    (!context.packageId || photo.customer_service_package_id === context.packageId) &&
    (!context.sessionId || photo.session_id === context.sessionId) &&
    (!context.standalone || !photo.customer_service_package_id)
  );
}
export const crmApi = {
  async list(module: CrmModule, page: number, search: string, extra: CrmRecord = {}) {
    return listPayload(
      await apiGet(module.endpoint, {
        params: {
          page,
          per_page: 20,
          search: search || undefined,
          sortField: 'id',
          sortOrder: 'desc',
          ...(module.key === 'payments' ? { src: 'service_crm' } : {}),
          ...extra,
        },
      }),
    );
  },
  async detail(module: CrmModule, id: string) {
    const url =
      module.key === 'clients'
        ? `/customer-crm/${encodeURIComponent(id)}/profile`
        : `${module.endpoint}/${encodeURIComponent(id)}`;
    return record(unwrap(await apiGet(url)));
  },
  async save(module: CrmModule, data: CrmRecord, id?: string, idempotencyKey?: string) {
    const url =
      module.key === 'clients'
        ? id
          ? '/customer/update'
          : '/customer'
        : `${module.endpoint}${id ? '/' + encodeURIComponent(id) : ''}`;
    const response = await httpClient.request({
      url,
      method: id && module.key !== 'clients' ? 'put' : 'post',
      data: module.key === 'clients' && id ? { ...data, id } : data,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return unwrap(response.data);
  },
  async remove(module: CrmModule, id: string) {
    unwrap((await httpClient.delete(`${module.endpoint}/${encodeURIComponent(id)}`)).data);
  },
  async action(module: CrmModule, id: string, action: string, data: CrmRecord = {}) {
    return unwrap(
      (await httpClient.post(`${module.endpoint}/${encodeURIComponent(id)}/${action}`, data)).data,
    );
  },
};
