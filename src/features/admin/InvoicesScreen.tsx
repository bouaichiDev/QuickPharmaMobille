import { useState, lazy, Suspense } from 'react';
import { Pressable, View } from 'react-native';
import {
  AccessGate,
  CommerceList,
  ReferenceSelect,
  SearchFilterRow,
  Pair,
  ErrorState,
  SkeletonCards,
} from '@/features/commerce/CommerceUI';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { itemId, record } from '@/features/crm/crmApi';
import { currency, date, DateInput } from '@/features/superadmin/AdminUI';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { adminApi, asRecord, useAdminAction, useAdminQuery, type Row } from './api';
import { useAdminList } from './useAdminList';
import {
  AdminPage,
  Panel,
  Fold,
  AppText,
  Button,
  Notice,
  ReadOnly,
  useCommerceAccess,
  design,
} from './AdminDesign';
const InvoiceForm = lazy(() => import('./InvoiceForm'));
export default function InvoicesScreen() {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [selected, setSelected] = useState(''),
    [create, setCreate] = useState(false),
    [mode, setMode] = useState<'manual' | 'sales'>(),
    [filters, setFilters] = useState({
      customer_id: '',
      status_id: '',
      date_from: '',
      date_to: '',
    }),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false),
    [filterError, setFilterError] = useState('');
  const query = useAdminList('/invoices', { search: term, ...filters }, 'invoices.view');
  if (mode)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <InvoiceForm
          mode={mode}
          onBack={() => setMode(undefined)}
          onSaved={(id) => {
            setMode(undefined);
            if (id) setSelected(id);
          }}
        />
      </Suspense>
    );
  if (selected) return <InvoiceDetail id={selected} onBack={() => setSelected('')} />;
  return (
    <AdminPage title="Factures" scroll={false}>
      <AccessGate permission="invoices.view">
        <ReadOnly />
        <View style={design.row}>
          <AppText style={design.grow}>{query.data?.pages[0]?.total ?? '—'} factures</AppText>
          {can('invoices.create_manual') || can('invoices.create_from_sale') ? (
            <Button
              label="Nouvelle facture"
              compact
              fullWidth={false}
              onPress={() => setCreate(true)}
            />
          ) : null}
        </View>
        <SearchFilterRow
          label="Rechercher une facture"
          value={search}
          placeholder="Référence ou client…"
          onChangeText={setSearch}
          onFilterPress={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        />
        <CommerceList
          header={null}
          query={query}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => setSelected(itemId(item))}>
              <Panel>
                <View style={design.row}>
                  <AppText variant="labelLg" style={design.grow}>
                    {String(item.ref)}
                  </AppText>
                  <AppText color="secondary">
                    {String(record(item.status).label ?? item.status_label ?? '')}
                  </AppText>
                </View>
                <AppText>{invoiceCustomer(item)}</AppText>
                <Pair
                  label={date(item.invoice_date ?? item.date)}
                  value={currency(item.total_ttc ?? item.total)}
                />
              </Panel>
            </Pressable>
          )}
        />
        <SelectionDialog visible={create} title="Nouvelle facture" onClose={() => setCreate(false)}>
          {can('invoices.create_from_sale') ? (
            <Button
              label="À partir des ventes"
              icon="receipt-long"
              onPress={() => {
                setCreate(false);
                setMode('sales');
              }}
            />
          ) : null}
          {can('invoices.create_manual') ? (
            <Button
              label="Facture manuelle"
              icon="edit-note"
              variant="tonal"
              onPress={() => {
                setCreate(false);
                setMode('manual');
              }}
            />
          ) : null}
        </SelectionDialog>
        <SelectionDialog
          visible={filterOpen}
          title="Filtres factures"
          onClose={() => setFilterOpen(false)}
        >
          <ReferenceSelect
            label="Client"
            path="/customerDropdown"
            value={draft.customer_id}
            onChange={(v) => setDraft({ ...draft, customer_id: v })}
          />
          <ReferenceSelect
            label="Statut"
            path="/statuses"
            params={{ src: 'invoice' }}
            value={draft.status_id}
            onChange={(v) => setDraft({ ...draft, status_id: v })}
          />
          <DateInput
            label="Du"
            value={draft.date_from}
            onChange={(v) => setDraft({ ...draft, date_from: v })}
          />
          <DateInput
            label="Au"
            value={draft.date_to}
            onChange={(v) => setDraft({ ...draft, date_to: v })}
          />
          {filterError ? <Notice>{filterError}</Notice> : null}
          <Button
            label="Appliquer"
            onPress={() => {
              if (draft.date_from && draft.date_to && draft.date_from > draft.date_to) {
                setFilterError('La date de début doit précéder la date de fin.');
                return;
              }
              setFilters(draft);
              setFilterOpen(false);
            }}
          />
          <Button
            label="Réinitialiser"
            variant="tonal"
            onPress={() => setDraft({ customer_id: '', status_id: '', date_from: '', date_to: '' })}
          />
        </SelectionDialog>
      </AccessGate>
    </AdminPage>
  );
}
export function invoiceCustomer(row: Row) {
  const c = record(row.customer);
  return String(
    row.customer_name ??
      c.name ??
      [c.FirstName ?? c.firstName, c.LastName ?? c.lastName].filter(Boolean).join(' ') ??
      'Client',
  );
}
function InvoiceDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { can } = useCommerceAccess();
  const query = useAdminQuery(`/invoices/${id}`, {}, 'invoices.view');
  const [confirm, setConfirm] = useState(false),
    [editing, setEditing] = useState(false),
    [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [removeSale, setRemoveSale] = useState<Row>();
  const row = query.data ? asRecord(query.data) : {},
    sales = Array.isArray(row.sales) ? row.sales.map(record) : [],
    items = Array.isArray(row.items) ? row.items.map(record) : [];
  const closed = String(record(row.status).code ?? row.status_label).toLowerCase() === 'closed';
  const close = useAdminAction(
    'invoices.finalize',
    () => adminApi.write('post', `/invoices/${id}/close`),
    () => setConfirm(false),
  );
  const remove = useAdminAction(
    'invoices.group_sales',
    (data) => adminApi.write('delete', `/invoices/${id}/sales/${data.id}`),
    () => setRemoveSale(undefined),
  );
  async function pdf(email = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { openAdminPdf } = await import('./documents');
      await openAdminPdf(
        `/invoices/${id}/pdf`,
        String(row.ref ?? `facture-${id}`),
        email,
        String(record(row.customer).Email ?? record(row.customer).email ?? ''),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF indisponible.');
    } finally {
      setBusy(false);
    }
  }
  if (editing)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <InvoiceForm
          mode={sales.length ? 'sales' : 'manual'}
          row={row}
          onBack={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </Suspense>
    );
  if (adding)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <InvoiceForm
          mode="sales"
          addTo={id}
          row={row}
          onBack={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      </Suspense>
    );
  return (
    <AdminPage
      title={row.ref ? `Facture ${row.ref}` : 'Détail de la facture'}
      onBack={onBack}
      footer={
        !closed && can('invoices.finalize') ? (
          <Button
            label="Clôturer"
            icon="check-circle"
            loading={close.isPending}
            onPress={() => setConfirm(true)}
          />
        ) : undefined
      }
    >
      <AccessGate permission="invoices.view">
        <ReadOnly />
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <Panel>
              <Pair
                label="Statut"
                value={String(record(row.status).label ?? row.status_label ?? '—')}
              />
              <Pair label="Client" value={invoiceCustomer(row)} />
              <Pair label="Date" value={date(row.invoice_date)} />
              <Pair label="Type" value={String(record(row.type).label ?? row.type_label ?? '—')} />
            </Panel>
            <Panel title={`Articles (${items.length})`}>
              {items.map((item, i) => (
                <View key={i} style={design.inset}>
                  <AppText variant="labelLg">{String(item.label ?? 'Article')}</AppText>
                  <Pair
                    label={`${item.quantity ?? 0} × ${currency(item.unit_price)}`}
                    value={currency(item.total_ttc ?? item.line_total_ht)}
                  />
                  {Number(item.discount_amount) > 0 ? (
                    <Pair label="Remise" value={currency(item.discount_amount)} />
                  ) : null}
                </View>
              ))}
              {!items.length && sales.length ? (
                <AppText>Les articles sont détaillés dans les ventes liées.</AppText>
              ) : null}
            </Panel>
            <Panel title="Totaux">
              <Pair label="Sous-total HT" value={currency(row.subtotal_ht)} />
              <Pair label="Remise globale" value={currency(row.discount_amount)} />
              <Pair label="Base taxable" value={currency(row.taxable_base)} />
              <Pair label="TVA" value={currency(row.tax_amount)} />
              <View style={design.inset}>
                <Pair label="Total TTC" value={currency(row.total_ttc)} />
              </View>
            </Panel>
            {row.notes ? (
              <Fold label="Note">
                <AppText>{String(row.notes)}</AppText>
              </Fold>
            ) : null}
            {sales.length ? (
              <Panel title="Ventes liées">
                {sales.map((sale) => (
                  <View key={itemId(sale)} style={design.stack}>
                    <Pair
                      label={String(sale.ref)}
                      value={currency(sale.totalWithTax ?? sale.total)}
                    />
                    <AppText variant="bodySm">{date(sale.date)}</AppText>
                    {!closed && sales.length > 1 && can('invoices.group_sales') ? (
                      <Button
                        label="Retirer cette vente"
                        variant="ghost"
                        compact
                        onPress={() => setRemoveSale(sale)}
                      />
                    ) : null}
                  </View>
                ))}
              </Panel>
            ) : null}
            {can('invoices.download_pdf') ? (
              <View style={design.row}>
                <Button
                  label="PDF"
                  icon="picture-as-pdf"
                  variant="tonal"
                  fullWidth={false}
                  style={design.grow}
                  disabled={busy}
                  onPress={() => void pdf()}
                />
                <Button
                  label="E-mail"
                  icon="mail-outline"
                  variant="tonal"
                  fullWidth={false}
                  style={design.grow}
                  disabled={busy}
                  onPress={() => void pdf(true)}
                />
              </View>
            ) : null}
            {!closed && can('invoices.update') ? (
              <Button
                label="Modifier la facture"
                icon="edit"
                variant="outline"
                onPress={() => setEditing(true)}
              />
            ) : null}
            {!closed && sales.length && can('invoices.group_sales') ? (
              <Button label="Ajouter des ventes" variant="tonal" onPress={() => setAdding(true)} />
            ) : null}
            {closed ? <Notice>Facture clôturée — consultation uniquement.</Notice> : null}
          </>
        )}
        {busy ? <AppText>Préparation du document…</AppText> : null}
        {error ? <Notice>{error}</Notice> : null}
        {close.isError ? <Notice>{close.error.message}</Notice> : null}
        {remove.isError ? <Notice>{remove.error.message}</Notice> : null}
        <ConfirmDialog
          visible={confirm}
          title="Clôturer la facture ?"
          message="La facture sera clôturée et ne pourra plus être modifiée."
          confirmLabel="Clôturer"
          cancelLabel="Annuler"
          loading={close.isPending}
          onConfirm={() => {
            setConfirm(false);
            close.mutate({});
          }}
          onCancel={() => setConfirm(false)}
        />
        <ConfirmDialog
          visible={!!removeSale}
          title="Retirer cette vente ?"
          message="Les totaux de la facture seront recalculés."
          confirmLabel="Retirer"
          cancelLabel="Annuler"
          loading={remove.isPending}
          onConfirm={() => removeSale && remove.mutate({ id: removeSale.id })}
          onCancel={() => setRemoveSale(undefined)}
        />
      </AccessGate>
    </AdminPage>
  );
}
