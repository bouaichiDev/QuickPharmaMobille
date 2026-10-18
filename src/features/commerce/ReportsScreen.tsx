import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { DateInput, currency, date } from '@/features/superadmin/AdminUI';
import { record } from '@/features/crm/crmApi';
import { salePeriodDates } from '@/features/sales/salesModel';
import { SaleDetail } from '@/features/sales/SaleDetail';
import { EntryDetail } from './EntriesScreen';
import { OrderDetail } from './OrdersScreen';
import {
  reportDefinitions,
  reportsApi,
  reportColumns,
  validateReportDates,
  type ReportFilters,
  type ReportKind,
} from './reportsApi';
import {
  AccessGate,
  AppText,
  Badge,
  Button,
  Card,
  CommerceScreen,
  ErrorState,
  Notice,
  Pair,
  ReferenceSelect,
  ResponsiveGrid,
  SkeletonCards,
  TextField,
  ui,
  useCommerceAccess,
} from './CommerceUI';

function initialFilters(): ReportFilters {
  const end = new Date(),
    start = new Date();
  start.setDate(start.getDate() - 7);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { startDate: fmt(start), endDate: fmt(end), status: 'all', search: '' };
}
export default function ReportsScreen() {
  const { can, store } = useCommerceAccess();
  const [kind, setKind] = useState<ReportKind>(),
    [filters, setFilters] = useState(initialFilters),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false),
    [filterError, setFilterError] = useState(''),
    [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState(''),
    [exportNote, setExportNote] = useState('');
  const [document, setDocument] = useState<{ kind: ReportKind; id: string }>();
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  const query = useQuery({
    queryKey: ['commerce-report', store, kind, filters, page],
    queryFn: ({ signal }) => reportsApi.get(kind!, filters, page, 20, signal),
    enabled: !!kind && can('reports.view'),
    staleTime: 60000,
    retry: false,
  });
  const apply = (next: ReportFilters) => {
    validateReportDates(next);
    setFilters(next);
    setPage(1);
    setExportNote('');
  };
  async function exportFile(format: 'pdf' | 'csv') {
    if (!kind || exporting || !can('reports.export')) return;
    setExporting(true);
    setExportError('');
    setExportNote('');
    const controller = new AbortController();
    exportController.current = controller;
    try {
      const { exportReport } = await import('./reportExport');
      const note = await exportReport(kind, filters, format, controller.signal);
      if (!controller.signal.aborted) setExportNote(note);
    } catch (error) {
      if (!controller.signal.aborted)
        setExportError(error instanceof Error ? error.message : 'Export impossible.');
    } finally {
      if (exportController.current === controller) {
        exportController.current = null;
        setExporting(false);
      }
    }
  }
  if (document?.kind === 'sales')
    return <SaleDetail id={document.id} onClose={() => setDocument(undefined)} />;
  if (document?.kind === 'entries')
    return <EntryDetail id={document.id} onBack={() => setDocument(undefined)} />;
  if (document?.kind === 'orders')
    return <OrderDetail id={document.id} onBack={() => setDocument(undefined)} />;
  const summary = query.data?.summary ?? {},
    series = Array.isArray(summary.series) ? summary.series.map(record).slice(-14) : [];
  const summaryRows: [string, string, boolean][] =
    kind === 'products'
      ? [
          ['productsCount', 'Références', false],
          ['itemsSold', 'Unités vendues', false],
          ['itemsBought', 'Unités reçues', false],
          ['availableStock', 'Unités disponibles', false],
          ['reservedStock', 'Unités réservées', false],
          ['outOfStockCount', 'Produits en rupture', false],
        ]
      : [
          ['totalAmount', 'Montant total', true],
          ['totalPaid', 'Montant réglé', true],
          ['totalDue', 'Reste dû', true],
          [
            kind === 'sales'
              ? 'salesCount'
              : kind === 'entries'
                ? 'entriesCount'
                : 'commandesCount',
            'Nombre de documents',
            false,
          ],
        ];
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen
        title={kind ? reportDefinitions[kind].title : 'Rapports & analyses'}
        onBack={
          kind
            ? () => {
                setKind(undefined);
                setPage(1);
              }
            : undefined
        }
        footer={
          kind && can('reports.export') ? (
            <Button
              label={exporting ? 'Préparation du rapport…' : 'Exporter le rapport'}
              icon="file-download"
              loading={exporting}
              onPress={() => setExportOpen(true)}
            />
          ) : undefined
        }
      >
        <AccessGate permission="reports.view">
          <Card>
            <AppText variant="headlineSm">Période du rapport</AppText>
            <AppText>
              {date(filters.startDate)} — {date(filters.endDate)}
            </AppText>
            <ResponsiveGrid maxColumns={3}>
              {(['today', 'week', 'month'] as const).map((period) => (
                <Button
                  key={period}
                  compact
                  variant="tonal"
                  label={{ today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois' }[period]}
                  onPress={() => {
                    const dates = salePeriodDates(period);
                    apply({ ...filters, startDate: dates.from_date!, endDate: dates.to_date! });
                  }}
                />
              ))}
            </ResponsiveGrid>
            <View style={ui.row}>
              <Button
                label="Période et filtres"
                variant="outline"
                compact
                fullWidth={false}
                style={ui.grow}
                icon="tune"
                onPress={() => {
                  setDraft(filters);
                  setFilterError('');
                  setFilterOpen(true);
                }}
              />
              {kind ? (
                <Button
                  label="Actualiser"
                  variant="tonal"
                  compact
                  fullWidth={false}
                  loading={query.isFetching}
                  onPress={() => void query.refetch()}
                />
              ) : null}
            </View>
          </Card>
          {!kind ? (
            <>
              <AppText variant="headlineSm">Familles de rapports</AppText>
              <ResponsiveGrid>
                {(Object.keys(reportDefinitions) as ReportKind[]).map((key) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={reportDefinitions[key].title}
                    onPress={() => {
                      setFilters((current) => ({ ...current, status: 'all' }));
                      setKind(key);
                      setPage(1);
                    }}
                  >
                    <Card title={reportDefinitions[key].title} icon={reportDefinitions[key].icon}>
                      <AppText variant="bodySm" color="outline">
                        Consulter les indicateurs et les documents de la période.
                      </AppText>
                    </Card>
                  </Pressable>
                ))}
              </ResponsiveGrid>
              {can('services.reports.view') ? (
                <Button
                  label="Rapports des services CRM"
                  variant="tonal"
                  onPress={() => router.push('/crm/reports')}
                />
              ) : null}
            </>
          ) : query.isPending ? (
            <SkeletonCards count={3} />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <>
              <View style={ui.row}>
                <Badge>{query.data?.total ?? 0} résultats</Badge>
                <AppText variant="bodySm" color="outline">
                  Mis à jour :{' '}
                  {new Date(query.dataUpdatedAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </AppText>
              </View>
              <ResponsiveGrid maxColumns={2}>
                {summaryRows.map(([key, label, monetary]) => (
                  <Card key={key}>
                    <AppText variant="bodySm" color="outline">
                      {label}
                    </AppText>
                    <AppText variant="headlineSm" color="primary">
                      {summary[key] == null
                        ? 'Non disponible'
                        : monetary
                          ? currency(summary[key])
                          : String(summary[key])}
                    </AppText>
                  </Card>
                ))}
              </ResponsiveGrid>
              {series.length ? (
                <Card title="Évolution quotidienne">
                  <AppText variant="bodySm" color="outline">
                    Montants par jour sur la période — jusqu’aux 14 derniers jours.
                  </AppText>
                  {series.map((point, i) => (
                    <View key={`${point.date}-${i}`} style={{ gap: 4 }}>
                      <Pair label={date(point.date)} value={currency(point.amount)} />
                      <View style={{ height: 5, borderRadius: 4, backgroundColor: '#e5eeff' }}>
                        <View
                          style={{
                            height: 5,
                            borderRadius: 4,
                            backgroundColor: '#006a63',
                            width: `${Math.max(0, Math.min(100, (Number(point.amount) / Math.max(1, ...series.map((p) => Number(p.amount) || 0))) * 100))}%`,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </Card>
              ) : null}
              {kind === 'products' && query.data?.byCategory.length ? (
                <Card title="Unités vendues par catégorie">
                  {query.data.byCategory.map((row, index) => (
                    <Pair key={index} label={String(row.label)} value={row.value} />
                  ))}
                </Card>
              ) : null}
              <AppText variant="headlineSm">Documents et détails</AppText>
              {!query.data?.rows.length ? (
                <Notice>Aucun résultat sur cette période.</Notice>
              ) : (
                query.data.rows.map((row, index) => (
                  <Card key={String(row.id ?? index)}>
                    <AppText variant="labelLg" color="primary">
                      {String(
                        kind === 'products'
                          ? row.productName
                          : kind === 'sales'
                            ? row.saleNumber
                            : kind === 'orders'
                              ? row.orderNumber
                              : (row.entryNumber ?? row.id ?? 'Document'),
                      )}
                    </AppText>
                    {reportColumns(kind)
                      .slice(1)
                      .map(([key, label]) => (
                        <Pair
                          key={key}
                          label={label}
                          value={
                            key.includes('Amount')
                              ? row[key] == null
                                ? null
                                : currency(row[key])
                              : key === 'date'
                                ? date(row[key])
                                : row[key]
                          }
                        />
                      ))}
                    {row.id &&
                    kind !== 'products' &&
                    can(
                      kind === 'sales'
                        ? 'sales.view'
                        : kind === 'entries'
                          ? 'entries.view'
                          : 'orders.view',
                    ) ? (
                      <Button
                        label="Consulter le document"
                        variant="tonal"
                        compact
                        onPress={() => setDocument({ kind, id: String(row.id) })}
                      />
                    ) : null}
                  </Card>
                ))
              )}
              <View style={ui.row}>
                <Button
                  label="Précédent"
                  variant="tonal"
                  disabled={page === 1 || query.isFetching}
                  fullWidth={false}
                  style={ui.grow}
                  onPress={() => setPage(page - 1)}
                />
                <AppText>
                  {page} / {Math.max(1, query.data?.lastPage ?? 1)}
                </AppText>
                <Button
                  label="Suivant"
                  variant="tonal"
                  disabled={page >= (query.data?.lastPage ?? 1) || query.isFetching}
                  fullWidth={false}
                  style={ui.grow}
                  onPress={() => setPage(page + 1)}
                />
              </View>
            </>
          )}
          {exportError ? <Notice>{exportError}</Notice> : null}
          {exportNote ? <Notice>{exportNote}</Notice> : null}
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Période et filtres"
        onClose={() => setFilterOpen(false)}
      >
        <DateInput
          label="Du"
          value={draft.startDate}
          onChange={(value) => setDraft({ ...draft, startDate: value })}
        />
        <DateInput
          label="Au"
          value={draft.endDate}
          onChange={(value) => setDraft({ ...draft, endDate: value })}
        />
        {kind && kind !== 'products' ? (
          <ReferenceSelect
            label="Statut"
            path="/statuses"
            params={{ src: reportDefinitions[kind].status }}
            value={draft.status === 'all' ? '' : draft.status}
            onChange={(value) => setDraft({ ...draft, status: value })}
          />
        ) : null}
        {kind === 'products' ? (
          <TextField
            label="Produit ou référence"
            value={draft.search}
            onChangeText={(value) => setDraft({ ...draft, search: value })}
          />
        ) : null}
        <Button
          label="Tous les statuts"
          variant="tonal"
          onPress={() => setDraft({ ...draft, status: 'all' })}
        />
        {filterError ? <Notice>{filterError}</Notice> : null}
        <Button
          label="Appliquer"
          onPress={() => {
            try {
              apply(draft);
              setFilterOpen(false);
            } catch (error) {
              setFilterError(error instanceof Error ? error.message : 'Période invalide.');
            }
          }}
        />
        <Button label="Réinitialiser" variant="ghost" onPress={() => setDraft(initialFilters())} />
      </SelectionDialog>
      <SelectionDialog
        visible={exportOpen}
        title="Exporter le rapport"
        onClose={() => {
          if (!exporting) setExportOpen(false);
        }}
      >
        <AppText>
          Les fichiers reprennent la période et les filtres sélectionnés. Maximum 1 000 lignes par
          export.
        </AppText>
        <Button
          label="PDF"
          icon="picture-as-pdf"
          disabled={exporting}
          onPress={() => {
            setExportOpen(false);
            void exportFile('pdf');
          }}
        />
        <Button
          label="CSV compatible Excel"
          variant="tonal"
          disabled={exporting}
          onPress={() => {
            setExportOpen(false);
            void exportFile('csv');
          }}
        />
      </SelectionDialog>
    </>
  );
}
