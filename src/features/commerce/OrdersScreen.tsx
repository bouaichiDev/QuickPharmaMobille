import { lazy, Suspense, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { itemId, record } from '@/features/crm/crmApi';
import { currency, date, DateInput } from '@/features/superadmin/AdminUI';
import { SaleDetail } from '@/features/sales/SaleDetail';
import { translatedReference } from './entryDefaults';
import { useTranslation } from '@/i18n/useTranslation';
import { commerceApi, number, type Row } from './api';
import {
  AccessGate,
  AppText,
  Badge,
  Button,
  Card,
  CommerceList,
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
  useCommerceList,
  useDebounce,
} from './CommerceUI';
import type { OrderData } from './OrderForm';
const OrderForm = lazy(() => import('./OrderForm'));
export default function OrdersScreen() {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [selected, setSelected] = useState<string>(),
    [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
      customer_id: '',
      statuse_id: '',
      from_date: '',
      to_date: '',
    }),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false),
    [filterError, setFilterError] = useState('');
  const query = useCommerceList(
    '/listeCommandes',
    { searchValue: term, ...filters },
    'orders.view',
  );
  if (creating)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <OrderForm
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            void query.refetch();
            if (id) setSelected(id);
          }}
        />
      </Suspense>
    );
  if (selected)
    return (
      <OrderDetail
        id={selected}
        onBack={() => {
          setSelected(undefined);
          void query.refetch();
        }}
      />
    );
  const count = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title="Commandes" scroll={false}>
        <AccessGate permission="orders.view">
          <CommerceList
            query={query}
            header={
              <>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <AppText variant="headlineSm">Commandes clients</AppText>
                    <AppText variant="bodySm" color="outline">
                      {query.data?.pages[0]?.total ?? '—'} commandes
                    </AppText>
                  </View>
                  {can('orders.create') ? (
                    <Button
                      compact
                      label="Nouvelle commande"
                      icon="add"
                      fullWidth={false}
                      onPress={() => setCreating(true)}
                    />
                  ) : null}
                </View>
                <SearchFilterRow
                  label="Rechercher une commande"
                  placeholder="Référence, client…"
                  value={search}
                  onChangeText={setSearch}
                  filterLabel={`Filtres${count ? ` (${count})` : ''}`}
                  onFilterPress={() => {
                    setDraft(filters);
                    setFilterError('');
                    setFilterOpen(true);
                  }}
                />
                {count ? (
                  <Button
                    label="Réinitialiser les filtres"
                    variant="ghost"
                    onPress={() =>
                      setFilters({ customer_id: '', statuse_id: '', from_date: '', to_date: '' })
                    }
                  />
                ) : null}
              </>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Commande ${item.ref}`}
                onPress={() => setSelected(itemId(item))}
              >
                <OrderCard row={item} />
              </Pressable>
            )}
          />
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Filtres commandes"
        onClose={() => setFilterOpen(false)}
      >
        {can('customers.view') || can('orders.create') ? (
          <ReferenceSelect
            label="Client"
            path="/customerDropdown"
            value={draft.customer_id}
            onChange={(v) => setDraft({ ...draft, customer_id: v })}
          />
        ) : null}
        <ReferenceSelect
          label="Statut"
          path="/statuses"
          params={{ src: 'commandes' }}
          value={draft.statuse_id}
          onChange={(v) => setDraft({ ...draft, statuse_id: v })}
        />
        <DateInput
          label="Du"
          value={draft.from_date}
          onChange={(v) => setDraft({ ...draft, from_date: v })}
        />
        <DateInput
          label="Au"
          value={draft.to_date}
          onChange={(v) => setDraft({ ...draft, to_date: v })}
        />
        {filterError ? <Notice>{filterError}</Notice> : null}
        <Button
          label="Appliquer"
          onPress={() => {
            if (draft.from_date && draft.to_date && draft.from_date > draft.to_date) {
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
          onPress={() => setDraft({ customer_id: '', statuse_id: '', from_date: '', to_date: '' })}
        />
      </SelectionDialog>
    </>
  );
}
function OrderCard({ row }: { row: Row }) {
  const { tDynamic } = useTranslation();
  return (
    <Card>
      <View style={ui.row}>
        <AppText variant="labelLg" color="primary" style={ui.grow} numberOfLines={2}>
          #{String(row.ref ?? '')}
        </AppText>
        <Badge>
          {translatedReference(
            { label: row.commandestatusLabel ?? row.commandestatusCode ?? 'Commande' },
            tDynamic,
          )}
        </Badge>
      </View>
      <AppText variant="headlineSm">
        {String(row.customer ?? row.customersName ?? 'Client')}
      </AppText>
      <AppText variant="bodySm" color="outline">
        {date(row.date)}
      </AppText>
      <View style={ui.inset}>
        <Pair label="Montant total" value={currency(row.totalWithTax ?? row.total)} />
        <Pair label="Acompte enregistré" value={currency(row.paid)} />
        <Pair label="Reste dû" value={currency(row.due)} />
      </View>
    </Card>
  );
}
export async function loadOrder(id: string, signal?: AbortSignal): Promise<OrderData> {
  const [body, items] = await Promise.all([
    commerceApi.get(`/commandes/show/${encodeURIComponent(id)}`, signal),
    commerceApi.references(`/commande/itemsshow/${encodeURIComponent(id)}`, {}, signal),
  ]);
  return { order: record(body.commande), items };
}
export function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { can, store, readOnly } = useCommerceAccess(),
    qc = useQueryClient();
  const [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState<'validate' | 'cancel' | 'return'>(),
    [returnOpen, setReturnOpen] = useState(false),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [returnError, setReturnError] = useState(''),
    [sale, setSale] = useState<string>(),
    [docBusy, setDocBusy] = useState(false),
    [docError, setDocError] = useState('');
  const query = useQuery({
    queryKey: ['commerce', store, 'order', id],
    queryFn: ({ signal }) => loadOrder(id, signal),
    enabled: can('orders.view'),
    retry: false,
    staleTime: 30000,
  });
  const data = query.data,
    row = data?.order ?? {},
    linked =
      !!row.sale_id || ['valide', 'cloture'].includes(String(row.commandestatusCode).toLowerCase());
  const action = useMutation({
    mutationFn: async (kind: 'validate' | 'cancel' | 'return') => {
      if (
        !can(
          kind === 'validate'
            ? 'orders.validate'
            : kind === 'cancel'
              ? 'orders.cancel'
              : 'orders.return',
        )
      )
        throw new Error('Action non autorisée.');
      if (kind === 'validate') return commerceApi.validateOrder(id);
      if (kind === 'cancel') return commerceApi.write('delete', `/commande/delete/${id}`);
      return commerceApi.write('post', `/commande/return/${id}`, {
        items: (data?.items ?? [])
          .filter((item) => number(quantities[itemId(item)]) > 0)
          .map((item) => ({ id: itemId(item), qte: number(quantities[itemId(item)]) })),
      });
    },
    onSuccess: (result, kind) => {
      setConfirm(undefined);
      void Promise.all(
        ['commerce', 'catalogue', 'products', 'stock-product', 'sales'].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      );
      if (kind === 'cancel') onBack();
      else {
        void query.refetch();
        const nextId = record(result).id;
        if (kind === 'validate' && nextId && can('sales.view')) setSale(String(nextId));
      }
    },
    retry: false,
  });
  async function document(email = false) {
    if (docBusy || !data) return;
    setDocBusy(true);
    setDocError('');
    try {
      const { openOrderDocument } = await import('./orderDocuments');
      await openOrderDocument(id, row, email);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : 'Document indisponible.');
    } finally {
      setDocBusy(false);
    }
  }
  if (sale) return <SaleDetail id={sale} onClose={() => setSale(undefined)} />;
  if (editing && data)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <OrderForm
          data={data}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void query.refetch();
          }}
        />
      </Suspense>
    );
  const returnItems = (data?.items ?? []).filter((item) => number(quantities[itemId(item)]) > 0);
  return (
    <CommerceScreen title="Fiche commande" onBack={onBack}>
      <AccessGate permission="orders.view">
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <OrderCard row={row} />
            <Card title="Informations">
              <Pair label="Client" value={row.customersName ?? row.customer} />
              <Pair label="E-mail" value={row.customersEmail} />
              <Pair label="Téléphone" value={row.customersTell} />
              <Pair label="Note" value={row.note} />
            </Card>
            <AppText variant="headlineSm">Produits réservés</AppText>
            {data?.items.map((item) => (
              <Card key={itemId(item)} title={String(item.title ?? 'Produit')}>
                <AppText variant="bodySm" color="outline">
                  {String(item.ref ?? item.sku ?? '')}
                </AppText>
                <Pair label="Quantité" value={item.qte} />
                <Pair label="Prix unitaire" value={currency(item.price ?? item.Price)} />
                <Pair label="Remise" value={`${item.discount ?? 0} %`} />
                <Pair
                  label="Total ligne"
                  value={currency(
                    number(item.qte) * number(item.price ?? item.Price) - number(item.callDiscount),
                  )}
                />
              </Card>
            ))}
            <Card title="Totaux">
              <Pair label="Sous-total" value={currency(row.subTotal)} />
              <Pair label="Remise" value={currency(row.calDiscount)} />
              <Pair label="Taxe" value={`${row.tax ?? 0} %`} />
              <Pair label="Total TTC" value={currency(row.totalWithTax ?? row.total)} />
            </Card>
            <ResponsiveGrid maxColumns={2}>
              <Button
                label="Bon de commande PDF"
                icon="picture-as-pdf"
                variant="tonal"
                disabled={docBusy}
                onPress={() => void document()}
              />
              <Button
                label="Envoyer par e-mail"
                icon="mail-outline"
                variant="tonal"
                disabled={docBusy}
                onPress={() => void document(true)}
              />
            </ResponsiveGrid>
            {docBusy ? <AppText>Préparation du document…</AppText> : null}
            {docError ? <Notice>{docError}</Notice> : null}
            {can('orders.update') && !linked ? (
              <Button
                label="Modifier la commande"
                variant="outline"
                icon="edit"
                disabled={action.isPending}
                onPress={() => setEditing(true)}
              />
            ) : null}
            {can('orders.validate') && !linked ? (
              <Button
                label="Valider et convertir en vente"
                icon="check-circle-outline"
                disabled={action.isPending}
                onPress={() => setConfirm('validate')}
              />
            ) : null}
            {row.sale_id && can('sales.view') ? (
              <Button
                label="Consulter la vente liée"
                variant="tonal"
                onPress={() => setSale(String(row.sale_id))}
              />
            ) : null}
            {can('orders.return') && !!data?.items.length ? (
              <Button
                label="Retour de produits"
                variant="tonal"
                disabled={action.isPending}
                onPress={() => {
                  setQuantities({});
                  setReturnError('');
                  setReturnOpen(true);
                }}
              />
            ) : null}
            {can('orders.cancel') && !linked ? (
              <Button
                label="Annuler la commande"
                variant="dangerSoft"
                disabled={action.isPending}
                onPress={() => setConfirm('cancel')}
              />
            ) : null}
            {readOnly ? <Notice>Assistance en lecture seule.</Notice> : null}
          </>
        )}
        {action.isError ? <Notice>{action.error.message}</Notice> : null}
        <ConfirmDialog
          visible={!!confirm}
          title={
            confirm === 'validate'
              ? 'Convertir en vente ?'
              : confirm === 'return'
                ? 'Confirmer le retour ?'
                : 'Annuler la commande ?'
          }
          message={
            confirm === 'validate'
              ? 'Comme sur le web, cette action crée une vente réglée et transforme la réservation en sortie de stock. Vérifiez le règlement avant de confirmer.'
              : confirm === 'return'
                ? 'Les quantités sélectionnées seront remises en stock. Si une vente est liée, son retour sera également traité.'
                : 'Le stock réservé sera libéré et la commande sera annulée.'
          }
          confirmLabel="Confirmer"
          cancelLabel="Retour"
          loading={action.isPending}
          destructive={confirm === 'cancel'}
          onConfirm={() => {
            if (confirm) action.mutate(confirm);
          }}
          onCancel={() => {
            if (!action.isPending) setConfirm(undefined);
          }}
        />
        <SelectionDialog
          visible={returnOpen}
          title="Retour de produits"
          onClose={() => setReturnOpen(false)}
        >
          {data?.items.map((item) => (
            <TextField
              key={itemId(item)}
              label={`${item.title} — maximum ${item.qte}`}
              value={quantities[itemId(item)] ?? '0'}
              keyboardType="number-pad"
              onChangeText={(value) => setQuantities({ ...quantities, [itemId(item)]: value })}
            />
          ))}
          {returnError ? <Notice>{returnError}</Notice> : null}
          <Button
            label="Continuer"
            onPress={() => {
              if (
                !returnItems.length ||
                (data?.items ?? []).some((item) => {
                  const q = Number(quantities[itemId(item)] ?? 0);
                  return !Number.isInteger(q) || q < 0 || q > number(item.qte);
                })
              ) {
                setReturnError('Saisissez des quantités entières dans la limite des lignes.');
                return;
              }
              setReturnOpen(false);
              setConfirm('return');
            }}
          />
        </SelectionDialog>
      </AccessGate>
    </CommerceScreen>
  );
}
