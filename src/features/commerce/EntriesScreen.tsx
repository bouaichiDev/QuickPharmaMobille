import { SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { lazy, memo, Suspense, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { itemId, record } from '@/features/crm/crmApi';
import { currency, date, DateInput } from '@/features/superadmin/AdminUI';
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
import { openEntryPdf } from './entryPdf';
import { useTranslation } from '@/i18n/useTranslation';
import { translatedReference } from './entryDefaults';
const EntryForm = lazy(() => import('./EntryForm'));
export interface EntryData {
  entry: Row;
  items: Row[];
  company: Row;
}
export async function loadEntry(id: string, signal?: AbortSignal): Promise<EntryData> {
  const [body, items] = await Promise.all([
    commerceApi.get(`/entree/show/${encodeURIComponent(id)}`, signal),
    commerceApi.references(`/entreeitems/show/${encodeURIComponent(id)}`, {}, signal),
  ]);
  return {
    entry: record(Array.isArray(body.entree) ? body.entree[0] : body.entree),
    items,
    company: record(body.company),
  };
}
const EntryCard = memo(function EntryCard({
  row,
  onOpen,
}: {
  row: Row;
  onOpen: (id: string) => void;
}) {
  const { tDynamic } = useTranslation();
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(itemId(row))}>
      <Card>
        <View style={ui.row}>
          <AppText variant="labelLg" color="primary" style={ui.grow} numberOfLines={2}>
            #{String(row.ref ?? '')}
          </AppText>
          <Badge>
            {translatedReference(
              { label: row.entreeStatusLabel ?? 'Entrée', code: row.entreeStatusCode },
              tDynamic,
            )}
          </Badge>
        </View>
        <AppText variant="bodyMd">
          {String(row.provider ?? 'Fournisseur')} · {date(row.date)}
        </AppText>
        <View style={ui.inset}>
          <Pair label="Montant total" value={currency(row.totalWithTax ?? row.total)} />
          <Pair label="Payé" value={currency(row.paid)} />
          <Pair label="Reste à payer" value={currency(row.due)} />
          {row.paymentStatusLabel ? (
            <Badge danger={number(row.due) > 0}>
              {translatedReference(
                { label: row.paymentStatusLabel, code: row.paymentStatusCode },
                tDynamic,
              )}
            </Badge>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
});
export default function EntriesScreen() {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [filters, setFilters] = useState({
      provider_id: '',
      statuse_id: '',
      from_date: '',
      to_date: '',
    }),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false),
    [filterError, setFilterError] = useState('');
  const [id, setId] = useState<string>(),
    [form, setForm] = useState<EntryData | null>();
  const query = useCommerceList('/entrees', { ref: term, ...filters }, 'entries.view');
  const back = () => {
    setForm(undefined);
    void query.refetch();
  };
  if (form !== undefined)
    return (
      <Suspense fallback={<SkeletonCards count={3} />}>
        <EntryForm
          data={form}
          onClose={back}
          onSaved={(savedId) => {
            back();
            if (savedId) setId(savedId);
          }}
        />
      </Suspense>
    );
  if (id) return <EntryDetail id={id} onBack={() => setId(undefined)} onEdit={setForm} />;
  const count = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title="Entrée" scroll={false}>
        <AccessGate permission="entries.view">
          <CommerceList
            query={query}
            renderItem={({ item }) => <EntryCard row={item} onOpen={setId} />}
            header={
              <>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <AppText variant="headlineSm" style={{ fontSize: 18 }}>
                      Entrées de stock
                    </AppText>
                    <AppText variant="bodySm" color="outline">
                      {query.data?.pages[0]?.total ?? '—'} bons
                    </AppText>
                  </View>
                  {can('entries.create') ? (
                    <Button
                      label="Nouvelle entrée"
                      icon="add-circle-outline"
                      compact
                      fullWidth={false}
                      onPress={() => setForm(null)}
                    />
                  ) : null}
                </View>
                <SearchFilterRow
                  label="Rechercher par référence"
                  placeholder="Référence du bon…"
                  value={search}
                  onChangeText={setSearch}
                  filterLabel={`Filtres${count ? ` (${count})` : ''}`}
                  onFilterPress={() => {
                    setDraft(filters);
                    setFilterOpen(true);
                  }}
                />
                {count ? (
                  <Button
                    label="Réinitialiser les filtres"
                    variant="ghost"
                    onPress={() =>
                      setFilters({ provider_id: '', statuse_id: '', from_date: '', to_date: '' })
                    }
                  />
                ) : null}
              </>
            }
          />
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Filtres des entrées"
        onClose={() => setFilterOpen(false)}
      >
        <ReferenceSelect
          label="Fournisseur"
          path="/providerDropdown"
          value={draft.provider_id}
          onChange={(v) => setDraft({ ...draft, provider_id: v })}
        />
        <ReferenceSelect
          label="Statut"
          path="/statuses"
          params={{ src: 'entrees' }}
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
              setFilterError('La date de fin doit suivre la date de début.');
              return;
            }
            setFilterError('');
            setFilters(draft);
            setFilterOpen(false);
          }}
        />
        <Button
          label="Réinitialiser"
          variant="ghost"
          onPress={() => {
            setDraft({ provider_id: '', statuse_id: '', from_date: '', to_date: '' });
            setFilterError('');
          }}
        />
      </SelectionDialog>
    </>
  );
}
export function EntryDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit?: (data: EntryData) => void;
}) {
  const { store, can } = useCommerceAccess(),
    qc = useQueryClient();
  const { tDynamic } = useTranslation();
  const [limit, setLimit] = useState(20),
    [document, setDocument] = useState(false),
    [docBusy, setDocBusy] = useState<'print' | 'mail' | null>(null),
    [docError, setDocError] = useState(''),
    [returnMode, setReturnMode] = useState<'return' | 'restore'>(),
    [editConfirm, setEditConfirm] = useState(false);
  const query = useQuery({
    queryKey: ['commerce', store, 'entry', id],
    queryFn: ({ signal }) => loadEntry(id, signal),
    enabled: can('entries.view'),
    retry: false,
  });
  const data = query.data,
    row = data?.entry ?? {},
    items = data?.items ?? [];
  async function exportDoc(print = false) {
    if (docBusy || !data) return;
    setDocBusy(print ? 'print' : 'mail');
    setDocError('');
    const watchdog = setTimeout(() => {
      setDocBusy(null);
      setDocError(
        'Le document met trop de temps à s’ouvrir. Fermez la fenêtre d’impression ou d’e-mail, puis réessayez.',
      );
    }, 60000);
    try {
      await openEntryPdf(id, data.entry, print);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'Document indisponible.');
    } finally {
      clearTimeout(watchdog);
      setDocBusy(null);
    }
  }
  if (returnMode && data)
    return (
      <ReturnDialog
        mode={returnMode}
        id={id}
        items={items}
        entry={row}
        onClose={() => setReturnMode(undefined)}
        onSaved={(message) => {
          setDocError(message);
          setReturnMode(undefined);
          void query.refetch();
          void qc.invalidateQueries({ queryKey: ['commerce'] });
          void qc.invalidateQueries({ queryKey: ['stock'] });
        }}
      />
    );
  return (
    <CommerceScreen
      title={document ? 'Bon d’entrée' : 'Détail de l’entrée'}
      onBack={document ? () => setDocument(false) : onBack}
    >
      <AccessGate permission="entries.view">
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : data ? (
          <>
            <View style={ui.row}>
              <AppText variant="headlineMd" color="primary" style={ui.grow}>
                #{String(row.ref ?? '')}
              </AppText>
              <Badge>
                {translatedReference(
                  { label: row.entreeStatusLabel ?? 'Entrée', code: row.entreeStatusCode },
                  tDynamic,
                )}
              </Badge>
            </View>
            {document ? (
              <Card title={String(data.company.companyName ?? 'QuickPharma')}>
                <AppText variant="bodySm">{String(data.company.companyAddress ?? '')}</AppText>
                <AppText variant="labelLg">BON D’ENTRÉE DE STOCK</AppText>
                <Pair label="Référence" value={row.ref} />
                <Pair label="Date" value={date(row.date)} />
              </Card>
            ) : null}
            <ResponsiveGrid maxColumns={2}>
              <Card title={String(row.providersName ?? 'Fournisseur')} icon="business">
                <Pair label="Date de réception" value={date(row.date)} />
                <Pair label="Réceptionnaire" value={row.user} />
                <Pair label="Téléphone" value={row.providersTell} />
              </Card>
              <Card title="Récapitulatif financier" icon="payments">
                <Pair label="Sous-total" value={currency(row.subTotal)} />
                <Pair
                  label="Remise fournisseur"
                  value={currency(row.calDiscount ?? row.discount)}
                />
                <Pair label="Taxe" value={`${row.tax ?? 0} %`} />
                <Pair label="Montant total TTC" value={currency(row.totalWithTax ?? row.total)} />
                <Pair label="Montant payé" value={currency(row.paid)} />
                <Pair label="Reste dû" value={currency(row.due)} />
                <Badge danger={number(row.due) > 0}>
                  {translatedReference(
                    { label: row.paymentStatusLabel ?? 'Paiement', code: row.paymentStatusCode },
                    tDynamic,
                  )}
                </Badge>
              </Card>
            </ResponsiveGrid>
            <AppText variant="headlineSm">
              Produits réceptionnés · {items.length} référence(s)
            </AppText>
            <ResponsiveGrid maxColumns={3}>
              {items.slice(0, limit).map((item) => (
                <Card key={itemId(item)}>
                  <View style={ui.row}>
                    <AppText variant="labelLg" style={ui.grow}>
                      {String(item.title ?? 'Produit')}
                    </AppText>
                    <Badge>{String(item.qte)} unités</Badge>
                  </View>
                  <AppText variant="bodySm" color="outline">
                    {String(item.ref ?? '')}
                  </AppText>
                  <View style={ui.inset}>
                    <Pair label="P. U. achat" value={currency(item.price)} />
                    <Pair
                      label="Expiration"
                      value={item.dateExperation ? date(item.dateExperation) : 'Non renseignée'}
                    />
                    <Pair
                      label="Total ligne"
                      value={currency(number(item.qte) * number(item.price))}
                    />
                    {number(item.qte_returned) > 0 ? (
                      <Pair label="Quantité retournée" value={item.qte_returned} />
                    ) : null}
                  </View>
                </Card>
              ))}
            </ResponsiveGrid>
            {items.length > limit ? (
              <Button
                label={`Voir les ${Math.min(20, items.length - limit)} références suivantes`}
                variant="tonal"
                onPress={() => setLimit(limit + 20)}
              />
            ) : null}
            <ResponsiveGrid maxColumns={3}>
              <Button
                label="Imprimer le bon"
                icon="print"
                variant="primary"
                loading={docBusy === 'print'}
                disabled={!!docBusy}
                onPress={() => void exportDoc(true)}
              />
              <Button
                label="Envoyer le bon par e-mail"
                icon="picture-as-pdf"
                variant="tonal"
                loading={docBusy === 'mail'}
                disabled={!!docBusy}
                onPress={() => void exportDoc()}
              />
              {!document ? (
                <Button
                  label="Aperçu du document"
                  icon="description"
                  variant="outline"
                  onPress={() => setDocument(true)}
                />
              ) : null}
            </ResponsiveGrid>
            {docError ? <Notice>{docError}</Notice> : null}
            {!document && onEdit && can('entries.update') ? (
              <Button
                label="Modifier l’entrée"
                icon="edit"
                variant="outline"
                onPress={() => setEditConfirm(true)}
              />
            ) : null}
            {!document && can('entries.return') ? (
              <Button
                label="Retour fournisseur"
                icon="assignment-return"
                variant="dangerSoft"
                onPress={() => setReturnMode('return')}
              />
            ) : null}
            {!document && can('entries.cancel') && items.some((i) => number(i.qte_returned) > 0) ? (
              <Button
                label="Annuler un retour fournisseur"
                icon="restore"
                variant="tonal"
                onPress={() => setReturnMode('restore')}
              />
            ) : null}
          </>
        ) : null}
      </AccessGate>
      <ConfirmDialog
        visible={editConfirm}
        title="Modifier cette entrée ?"
        message="La mise à jour recalcule les quantités de stock liées à ce bon. Vérifiez les lignes et expirations avant d’enregistrer."
        confirmLabel="Modifier"
        cancelLabel="Annuler"
        onCancel={() => setEditConfirm(false)}
        onConfirm={() => {
          setEditConfirm(false);
          if (items.some((i) => number(i.countExpiredDate) > 1)) {
            setDocError(
              'Cette entrée contient plusieurs dates d’expiration par produit. Utilisez le web pour préserver ses lots.',
            );
            return;
          }
          if (data) onEdit?.(data);
        }}
      />
    </CommerceScreen>
  );
}
function ReturnDialog({
  mode,
  id,
  items,
  entry,
  onClose,
  onSaved,
}: {
  mode: 'return' | 'restore';
  id: string;
  items: Row[];
  entry: Row;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { can } = useCommerceAccess();
  const [qty, setQty] = useState<Record<string, string>>({}),
    [cause, setCause] = useState<'rejected' | 'nonConforme'>('rejected'),
    [confirm, setConfirm] = useState(false),
    [limit, setLimit] = useState(20);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!can(mode === 'return' ? 'entries.return' : 'entries.cancel'))
        throw new Error('Action non autorisée.');
      const selected = items
        .filter((i) => number(qty[itemId(i)]) > 0)
        .map((i) => ({ id: itemId(i), qte: number(qty[itemId(i)]) }));
      if (!selected.length) throw new Error('Indiquez les quantités concernées.');
      for (const i of items) {
        const q = Number(qty[itemId(i)] || 0),
          max = mode === 'return' ? number(i.qte) : number(i.qte_returned);
        if (!Number.isInteger(q) || q < 0 || q > max)
          throw new Error('Une quantité dépasse le nombre d’unités de la ligne.');
      }
      return commerceApi.write(
        'post',
        `/entrees/${mode === 'return' ? 'retour' : 'restorer'}/${encodeURIComponent(id)}`,
        { items: selected, ...(mode === 'return' ? { return_status: cause } : {}) },
      );
    },
    onSuccess: (result) => {
      const raw = record(result);
      onSaved(String(raw.message ?? 'Opération terminée.'));
    },
    retry: false,
  });
  return (
    <CommerceScreen
      title={mode === 'return' ? 'Retour fournisseur' : 'Annuler le retour'}
      onBack={() => !mutation.isPending && onClose()}
    >
      <Notice>
        Cette opération modifie le stock et le montant du bon. Les unités déjà utilisées peuvent
        être refusées par le serveur.
      </Notice>
      <Card title="Détails du bon d’origine" icon="receipt-long">
        <Pair label="Référence" value={entry.ref} />
        <Pair label="Fournisseur" value={entry.providersName ?? entry.provider} />
        <Pair label="Date" value={date(entry.date)} />
      </Card>
      {mode === 'return' ? (
        <View style={ui.row}>
          <Button
            label="Refusé"
            compact
            variant={cause === 'rejected' ? 'primary' : 'tonal'}
            fullWidth={false}
            onPress={() => setCause('rejected')}
          />
          <Button
            label="Non conforme"
            compact
            variant={cause === 'nonConforme' ? 'primary' : 'tonal'}
            fullWidth={false}
            onPress={() => setCause('nonConforme')}
          />
        </View>
      ) : null}
      {items
        .filter((i) => mode === 'return' || number(i.qte_returned) > 0)
        .slice(0, limit)
        .map((i) => (
          <TextField
            key={itemId(i)}
            label={`${String(i.title)} · maximum ${mode === 'return' ? i.qte : i.qte_returned}`}
            value={qty[itemId(i)] ?? ''}
            keyboardType="number-pad"
            onChangeText={(v) => setQty({ ...qty, [itemId(i)]: v })}
          />
        ))}
      {items.length > limit ? (
        <Button
          label="Afficher les articles suivants"
          variant="tonal"
          onPress={() => setLimit(limit + 20)}
        />
      ) : null}
      <Card title="Valeur indicative des lignes" icon="payments">
        <Pair
          label="Quantités concernées"
          value={Object.values(qty).reduce((sum, q) => sum + number(q), 0)}
        />
        <Pair
          label="Total avant taxe et remise"
          value={currency(
            items.reduce((sum, i) => sum + number(qty[itemId(i)]) * number(i.price), 0),
          )}
        />
        <Notice>
          Le serveur confirme les quantités effectivement retournables et recalcule le bon. Cette
          estimation n’est pas un avoir fournisseur.
        </Notice>
      </Card>
      {mutation.isError ? <ErrorState error={mutation.error} /> : null}
      {confirm ? (
        <Notice>Confirmez les quantités saisies : l’opération sera appliquée au stock.</Notice>
      ) : null}
      <Button
        label={confirm ? 'Confirmer l’opération' : 'Vérifier et continuer'}
        variant="danger"
        loading={mutation.isPending}
        onPress={() => (confirm ? mutation.mutate() : setConfirm(true))}
      />
      <Button label="Annuler" variant="tonal" disabled={mutation.isPending} onPress={onClose} />
    </CommerceScreen>
  );
}
