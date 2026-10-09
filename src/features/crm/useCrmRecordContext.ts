import { useQuery } from '@tanstack/react-query';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { record, unwrap, type CrmRecord } from './crmApi';
import { can } from './modules';

/** Resolve labels only through endpoints the current account can read. Store-scoped cache. */
export function useCrmRecordContext(row: CrmRecord) {
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const snapshot = { ...record(row.before), ...record(row.after), ...row };
  const serviceId = String(snapshot.service_id ?? '');
  const customerId = String(snapshot.customer_id ?? '');
  const service = useQuery({
    queryKey: ['crm', store, 'label-service', serviceId],
    enabled: !!serviceId && !record(row.service).name && can(access.data, 'services.catalog.view'),
    staleTime: 60000,
    retry: false,
    queryFn: async () => record(unwrap(await apiGet(`/services/${encodeURIComponent(serviceId)}`))),
  });
  const customer = useQuery({
    queryKey: ['crm', store, 'label-client', customerId],
    enabled:
      !!customerId && !record(row.customer).name && can(access.data, 'services.clients.view'),
    staleTime: 60000,
    retry: false,
    queryFn: async () =>
      record(
        record(unwrap(await apiGet(`/customer-crm/${encodeURIComponent(customerId)}/profile`)))
          .customer,
      ),
  });
  return {
    service:
      (can(access.data, 'services.catalog.view') ? service.data : undefined) ?? record(row.service),
    customer:
      (can(access.data, 'services.clients.view') ? customer.data : undefined) ??
      record(row.customer),
    snapshot,
  };
}
