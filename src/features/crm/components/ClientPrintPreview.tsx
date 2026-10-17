import { CrmFilter as Chip } from './StitchChrome';
import { ClientDocumentView } from './ClientDocumentView';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { apiGet } from '@/services/api/client';
import { useSessionStore } from '@/features/auth/sessionStore';
import { itemId, listPayload, type CrmRecord } from '../crmApi';
import { clientDocument, printCrmDocument } from '../documents';
import { CrmPage, crmStyles } from './CrmDesign';
export function ClientPrintPreview({
  customer,
  serviceId,
  onClose,
}: {
  customer: CrmRecord;
  serviceId?: string;
  onClose: () => void;
}) {
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const [printing, setPrinting] = useState(false);
  const [onlyService, setOnlyService] = useState(!!serviceId);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['crm', store, 'print-client', itemId(customer), serviceId],
    queryFn: async () => {
      let page = 1,
        last = 1;
      const rows: CrmRecord[] = [];
      do {
        const result = listPayload(
          await apiGet(`/customer-crm/${encodeURIComponent(itemId(customer))}/sessions`, {
            params: { page, per_page: 500 },
          }),
        );
        rows.push(...result.rows);
        last = result.lastPage;
        page++;
      } while (page <= last);
      return rows;
    },
  });
  const printedRows = (query.data ?? []).filter(
    (row) => !onlyService || !serviceId || String(row.service_id) === String(serviceId),
  );
  return (
    <CrmPage
      visible
      title="Aperçu du dossier à imprimer"
      onClose={onClose}
      footer={
        <>
          <Button label="Fermer" variant="tonal" onPress={onClose} style={crmStyles.grow} />
          <Button
            label="Imprimer"
            icon="print"
            loading={printing}
            disabled={!query.data}
            onPress={async () => {
              setPrinting(true);
              setError('');
              try {
                await printCrmDocument(clientDocument(customer, printedRows));
              } catch {
                setError('L’impression n’a pas abouti. Réessayez.');
              } finally {
                setPrinting(false);
              }
            }}
            style={crmStyles.grow}
          />
        </>
      }
    >
      <View style={crmStyles.row}>
        <Chip
          label="Dossier complet"
          selected={!onlyService}
          onPress={() => setOnlyService(false)}
        />
        {serviceId ? (
          <Chip
            label="Service sélectionné"
            selected={onlyService}
            onPress={() => setOnlyService(true)}
          />
        ) : null}
      </View>
      {query.isLoading ? (
        <SkeletonCards count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <ClientDocumentView customer={customer} sessions={printedRows} />
      )}
      {error ? <AppText color="error">{error}</AppText> : null}
    </CrmPage>
  );
}
