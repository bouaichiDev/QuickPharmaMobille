import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { DateInput, currency, date } from '@/features/superadmin/AdminUI';
import { record } from '@/features/crm/crmApi';
import { exportReport } from './reportExport';
import { Icon } from '@/components/ui/Icon';
import {
  ReportEvolution,
  ReportCollection,
  ReportBestSellers,
  ReportMetric,
  ReportPanel,
  ReportPeriods,
  ReportTag,
  reportStyle as rs,
} from './ReportDesign';
import { SaleDetail } from '@/features/sales/SaleDetail';
import { EntryDetail } from './EntriesScreen';
import { OrderDetail } from './OrdersScreen';
import {
  reportDefinitions,
  reportsApi,
  validateReportDates,
  type ReportFilters,
  type ReportKind,
} from './reportsApi';
import {
  AccessGate,
  AppText,
  Badge,
  Button,
  CommerceScreen,
  ErrorState,
  Notice,
  Pair,
  ReferenceSelect,
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
  const overview = useQueries({
    queries: (['sales', 'products'] as const).map((family) => ({
      queryKey: ['commerce-report-overview', store, family, filters],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        reportsApi.get(family, filters, 1, 1, signal),
      enabled: !kind && !exportOpen && can('reports.view'),
      staleTime: 60000,
      retry: false,
    })),
  });
  const openFilters = () => {
    setDraft(filters);
    setFilterError('');
    setFilterOpen(true);
  };
  const [exportKind, setExportKind] = useState<ReportKind>('sales');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const openExport = () => {
    setExportKind(kind ?? 'sales');
    setExportOpen(true);
  };
  const apply = (next: ReportFilters) => {
    validateReportDates(next);
    setFilters(next);
    setPage(1);
    setExportNote('');
  };
  async function exportFile(format: 'pdf' | 'csv') {
    if (exporting || !can('reports.export')) return;
    setExporting(true);
    setExportError('');
    setExportNote('');
    const controller = new AbortController();
    exportController.current = controller;
    try {
      const note = await exportReport(exportKind, filters, format, controller.signal);
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
          ['productsCount', 'Produits', false],
          ['itemsSold', 'Articles vendus', false],
          ['itemsBought', 'Articles achetés', false],
          ['availableStock', 'Stock disponible', false],
          ['reservedStock', 'Stock réservé', false],
          ['outOfStockCount', 'Produits en rupture', false],
        ]
      : [
          ['totalAmount', 'Montant total', true],
          ['totalPaid', 'Payé', true],
          ['totalDue', 'Dû', true],
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
        title={exportOpen ? 'Centre d’export' : kind ? reportDefinitions[kind].title : 'Rapports'}
        onBack={
          exportOpen
            ? () => {
                if (!exporting) setExportOpen(false);
              }
            : kind
              ? () => {
                  setKind(undefined);
                  setFilters((current) => ({ ...current, status: 'all' }));
                  setPage(1);
                }
              : undefined
        }
        footer={
          (kind || exportOpen) && can('reports.export') ? (
            <Button
              label={
                exporting
                  ? 'Préparation du rapport…'
                  : exportOpen
                    ? 'Générer et partager'
                    : 'Exporter le rapport'
              }
              icon="file-download"
              loading={exporting}
              onPress={() => (exportOpen ? void exportFile(format) : openExport())}
            />
          ) : undefined
        }
      >
        <AccessGate permission="reports.view">
          <View style={rs.stack}>
            {exportOpen ? (
              <View style={rs.stack}>
                <ReportPanel>
                  <View style={rs.accent} />
                  <ReportTag>PÉRIMÈTRE D’EXPORT</ReportTag>
                  <AppText style={rs.title}>{reportDefinitions[exportKind].title}</AppText>
                  <Pair
                    label="Période"
                    value={`${date(filters.startDate)} — ${date(filters.endDate)}`}
                  />
                  <Pair
                    label="Filtres actifs"
                    value={filters.status === 'all' ? 'Tous les statuts' : 'Statut sélectionné'}
                  />
                </ReportPanel>
                <AppText style={rs.heading}>Rapport à exporter</AppText>
                <View style={rs.grid}>
                  {(Object.keys(reportDefinitions) as ReportKind[]).map((key) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: exportKind === key }}
                      disabled={exporting}
                      onPress={() => setExportKind(key)}
                      style={[
                        rs.chip,
                        { flexBasis: '46%', flexGrow: 1 },
                        exportKind === key && rs.selected,
                      ]}
                    >
                      <AppText
                        style={[rs.small, { color: exportKind === key ? '#fff' : '#00417c' }]}
                      >
                        {reportDefinitions[key].title}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
                <AppText style={rs.heading}>Format du livrable</AppText>
                {(['pdf', 'csv'] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: format === value }}
                    accessibilityLabel={value === 'pdf' ? 'Document PDF' : 'CSV compatible Excel'}
                    disabled={exporting}
                    onPress={() => setFormat(value)}
                    style={[
                      rs.card,
                      rs.row,
                      { borderColor: format === value ? '#00417c' : '#edf0f8' },
                    ]}
                  >
                    <View style={rs.icon}>
                      <Icon
                        name={value === 'pdf' ? 'picture-as-pdf' : 'table-chart'}
                        color={value === 'pdf' ? 'error' : 'secondary'}
                      />
                    </View>
                    <View style={rs.grow}>
                      <AppText variant="labelLg">
                        {value === 'pdf' ? 'Document PDF' : 'Tableur CSV compatible Excel'}
                      </AppText>
                      <AppText style={rs.small} color="onSurfaceVariant">
                        {value === 'pdf'
                          ? 'Document A4 • détails du rapport'
                          : 'Données structurées • une ligne par enregistrement'}
                      </AppText>
                    </View>
                    <Icon
                      name={format === value ? 'check-circle' : 'radio-button-unchecked'}
                      color="primary"
                    />
                  </Pressable>
                ))}
                <ReportPanel title="Sections incluses">
                  {[
                    'Période et filtres sélectionnés',
                    'Détail ligne par ligne des transactions',
                    'Montants et quantités disponibles',
                  ].map((label) => (
                    <View key={label} style={rs.row}>
                      <Icon name="check-box" size={19} color="primary" />
                      <AppText style={[rs.small, rs.grow]}>{label}</AppText>
                    </View>
                  ))}
                  <View style={rs.inset}>
                    <AppText style={rs.small}>
                      Maximum 1 000 lignes par export. Les fichiers reprennent les données du
                      rapport choisi. Réduisez la période si le résultat dépasse cette limite.
                    </AppText>
                  </View>
                </ReportPanel>
                {exporting ? <Notice>Préparation du document en cours…</Notice> : null}
              </View>
            ) : (
              <>
                <View style={rs.row}>
                  <View style={rs.grow}>
                    <AppText style={rs.title}>
                      {kind ? reportDefinitions[kind].title : 'Rapports'}
                    </AppText>
                    <AppText style={rs.small} color="onSurfaceVariant">
                      Périmètre du magasin connecté
                    </AppText>
                  </View>
                  <Button
                    label="Actualiser"
                    icon="sync"
                    compact
                    variant="tonal"
                    fullWidth={false}
                    loading={kind ? query.isFetching : overview.some((item) => item.isFetching)}
                    onPress={() => {
                      if (kind) void query.refetch();
                      else overview.forEach((item) => void item.refetch());
                    }}
                  />
                </View>
                <ReportPeriods filters={filters} apply={apply} onFilters={openFilters} />
                {!kind ? (
                  <>
                    <View style={rs.row}>
                      <AppText style={[rs.heading, rs.grow]}>Indicateurs clés</AppText>
                      <AppText style={rs.small}>Période sélectionnée</AppText>
                    </View>
                    <View style={rs.grid}>
                      <ReportMetric
                        wide
                        label="MONTANT DES VENTES"
                        icon="payments"
                        value={
                          overview[0]?.isError
                            ? 'Indisponible'
                            : overview[0]?.data?.summary.totalAmount == null
                              ? '—'
                              : currency(overview[0]?.data.summary.totalAmount)
                        }
                        note="Total enregistré sur la période"
                      />
                      <ReportMetric
                        label="Encaissements"
                        icon="account-balance-wallet"
                        tone="#006a63"
                        value={
                          overview[0]?.data?.summary.totalPaid == null
                            ? '—'
                            : currency(overview[0]?.data.summary.totalPaid)
                        }
                      />
                      <ReportMetric
                        label="Stock disponible"
                        icon="inventory-2"
                        value={
                          overview[1]?.data?.summary.availableStock == null
                            ? '—'
                            : `${overview[1]?.data.summary.availableStock} unités`
                        }
                        note={
                          overview[1]?.data?.summary.productsCount == null
                            ? undefined
                            : `${overview[1]?.data.summary.productsCount} références`
                        }
                      />
                    </View>
                    {overview.some((item) => item.isError) ? (
                      <Notice>
                        Certains indicateurs sont indisponibles. Appuyez sur Actualiser pour
                        réessayer.
                      </Notice>
                    ) : null}
                    <View style={rs.row}>
                      <AppText style={[rs.heading, rs.grow]}>
                        Familles de Rapports ({Object.keys(reportDefinitions).length})
                      </AppText>
                      <ReportTag>API</ReportTag>
                    </View>
                    <AppText style={rs.small} color="onSurfaceVariant">
                      Disponibilité conditionnée par vos habilitations
                    </AppText>
                    <View style={{ gap: 10 }}>
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
                          style={[rs.card, rs.row]}
                        >
                          <View style={rs.icon}>
                            <Icon name={reportDefinitions[key].icon} color="primary" />
                          </View>
                          <View style={rs.grow}>
                            <AppText variant="labelLg">{reportDefinitions[key].title}</AppText>
                            <AppText style={rs.small} color="onSurfaceVariant">
                              {key === 'products'
                                ? 'Mouvements, disponibilités et réservations'
                                : key === 'sales'
                                  ? 'Ventes, règlements et soldes dus'
                                  : key === 'entries'
                                    ? 'Réceptions et règlements fournisseurs'
                                    : 'Commandes clients et montants enregistrés'}
                            </AppText>
                          </View>
                          <Icon name="chevron-right" size={21} color="primary" />
                        </Pressable>
                      ))}
                    </View>
                    {can('reports.export') ? (
                      <View style={rs.cta}>
                        <View style={rs.row}>
                          <Icon name="download-for-offline" color="onPrimary" />
                          <AppText style={[rs.heading, rs.grow, { color: '#fff' }]}>
                            Besoin d’un export ?
                          </AppText>
                        </View>
                        <AppText style={[rs.small, { color: '#e5eeff' }]}>
                          Préparez votre document PDF ou votre tableur avec la période et les
                          filtres sélectionnés.
                        </AppText>
                        <Button
                          label="Ouvrir le Centre d’Export"
                          variant="tonal"
                          trailingIcon="arrow-forward"
                          onPress={openExport}
                        />
                      </View>
                    ) : null}
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
                    <View style={rs.grid}>
                      {summaryRows.map(([key, label, monetary], index) => (
                        <ReportMetric
                          key={key}
                          wide={index === 0}
                          label={label}
                          tone={index === 1 ? '#006a63' : index === 2 ? '#ba1a1a' : '#00417c'}
                          icon={
                            index === 0
                              ? 'payments'
                              : index === 1
                                ? 'account-balance-wallet'
                                : index === 2
                                  ? 'account-balance'
                                  : 'receipt-long'
                          }
                          value={
                            summary[key] == null
                              ? 'Non disponible'
                              : monetary
                                ? currency(summary[key])
                                : String(summary[key])
                          }
                        />
                      ))}
                    </View>
                    {kind === 'products' ? (
                      <ReportBestSellers
                        topProducts={query.data?.topProducts ?? []}
                        rows={query.data?.rows ?? []}
                      />
                    ) : (
                      <ReportCollection summary={summary} />
                    )}
                    {series.length ? (
                      <ReportEvolution
                        series={series.map((point) => ({ date: point.date, amount: point.amount }))}
                      />
                    ) : null}
                    {kind === 'products' && query.data?.byCategory.length ? (
                      <ReportPanel title="Aperçu catégories">
                        {query.data.byCategory.map((row, index) => (
                          <Pair key={index} label={String(row.label)} value={row.value} />
                        ))}
                      </ReportPanel>
                    ) : null}
                    <View style={rs.row}>
                      <AppText style={[rs.heading, rs.grow]}>
                        {kind === 'products'
                          ? 'Stock & mouvements des produits'
                          : 'Dernières opérations'}
                      </AppText>
                      <ReportTag>{query.data?.total ?? 0}</ReportTag>
                    </View>
                    {!query.data?.rows.length ? (
                      <Notice>Aucun résultat sur cette période.</Notice>
                    ) : (
                      query.data.rows.map((row, index) => {
                        const product = kind === 'products';
                        const reference = product
                          ? row.productName
                          : kind === 'sales'
                            ? row.saleNumber
                            : kind === 'orders'
                              ? row.orderNumber
                              : row.entryNumber;
                        const permission =
                          kind === 'sales'
                            ? 'sales.view'
                            : kind === 'entries'
                              ? 'entries.view'
                              : 'orders.view';
                        const open =
                          row.id && !product && can(permission)
                            ? () => setDocument({ kind, id: String(row.id) })
                            : undefined;
                        return (
                          <Pressable
                            key={String(row.id ?? index)}
                            accessibilityRole={open ? 'button' : undefined}
                            accessibilityLabel={
                              open ? `Consulter le document ${reference ?? row.id}` : undefined
                            }
                            onPress={open}
                            style={rs.card}
                          >
                            <View style={[rs.row, { alignItems: 'flex-start' }]}>
                              <View style={rs.grow}>
                                {product && Number(row.available_stock) <= 0 ? (
                                  <ReportTag>Rupture de stock</ReportTag>
                                ) : null}
                                <AppText variant="labelLg" color="primary">
                                  {String(reference ?? row.id ?? 'Document')}
                                </AppText>
                                <AppText style={rs.small} color="onSurfaceVariant">
                                  {product
                                    ? `Réf. ${row.sku ?? '—'}`
                                    : `${date(row.date)} • ${String((kind === 'entries' ? row.provider : row.customer) ?? '—')}`}
                                </AppText>
                              </View>
                              <AppText
                                variant="labelLg"
                                color={
                                  product && Number(row.available_stock) <= 0
                                    ? 'error'
                                    : 'onSurface'
                                }
                              >
                                {product
                                  ? `${row.available_stock ?? '—'} unités`
                                  : row.totalAmount == null
                                    ? '—'
                                    : currency(row.totalAmount)}
                              </AppText>
                            </View>
                            <View style={[rs.inset, rs.row]}>
                              <AppText style={[rs.small, rs.grow]}>
                                {product
                                  ? `Vendues : ${row.items_sold ?? '—'} • Reçues : ${row.items_buy ?? '—'}`
                                  : `Payé : ${row.paidAmount == null ? '—' : currency(row.paidAmount)}`}
                              </AppText>
                              <AppText style={rs.small}>
                                {product
                                  ? `Réservées : ${row.reserved_stock ?? '—'}`
                                  : `Dû : ${row.dueAmount == null ? '—' : currency(row.dueAmount)}`}
                              </AppText>
                            </View>
                            {!product ? (
                              <View style={rs.row}>
                                <ReportTag>
                                  {String(row.status ?? 'Statut non disponible')}
                                </ReportTag>
                                {open ? (
                                  <View style={[rs.grow, { alignItems: 'flex-end' }]}>
                                    <Icon name="chevron-right" size={20} color="primary" />
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                          </Pressable>
                        );
                      })
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
              </>
            )}
            {exportError ? <Notice>{exportError}</Notice> : null}
            {exportNote ? <Notice>{exportNote}</Notice> : null}
          </View>
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
    </>
  );
}
