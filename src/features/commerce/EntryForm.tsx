import { lazy, Suspense, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { stockApi, type StockProduct } from '@/features/catalogue/stockApi';
import { itemId } from '@/features/crm/crmApi';
import { DateInput, currency } from '@/features/superadmin/AdminUI';
import { commerceApi, number } from './api';
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
  TextField,
  ui,
  useCommerceAccess,
  useDebounce,
} from './CommerceUI';
import {
  entryPayload,
  entryTotals,
  linesFrom,
  type EntryFormData,
  type EntryLine,
} from './entryModel';
import type { EntryData } from './EntriesScreen';
const Scanner = lazy(() => import('@/features/catalogue/StockScannerCamera'));

export default function EntryForm({
  data,
  onClose,
  onSaved,
}: {
  data: EntryData | null;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const row = data?.entry,
    qc = useQueryClient(),
    { can } = useCommerceAccess();
  const [step, setStep] = useState(1),
    [dirty, setDirty] = useState(false),
    [leave, setLeave] = useState(false);
  const [form, setForm] = useState<EntryFormData>(() => ({
    ref: String(row?.ref ?? `ENT-${Date.now()}-`),
    date: String(row?.date ?? new Date().toISOString()).slice(0, 10),
    provider_id: String(row?.provider_id ?? ''),
    status: String(row?.statuse_id ?? ''),
    paymentType: String(row?.typePaymentId ?? ''),
    paymentStatus: String(row?.paymentStatus ?? ''),
    discount: String(row?.discount ?? 0),
    tax: String(row?.tax ?? 0),
    paid: String(row?.paid ?? 0),
    note: String(row?.note ?? ''),
  }));
  const [lines, setLines] = useState<EntryLine[]>(data ? linesFrom(data.items) : []),
    [picking, setPicking] = useState(false),
    [line, setLine] = useState<EntryLine>(),
    [error, setError] = useState('');
  const [limit, setLimit] = useState(20),
    [removed, setRemoved] = useState<EntryLine>();
  const update = (key: keyof EntryFormData, value: string) => {
    setForm({ ...form, [key]: value });
    setDirty(true);
  };
  const totals = entryTotals(
    lines,
    number(form.discount.replace(',', '.')),
    number(form.tax.replace(',', '.')),
    number(form.paid.replace(',', '.')),
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (!can(row ? 'entries.update' : 'entries.create')) throw new Error('Action non autorisée.');
      return commerceApi.write(
        'post',
        row ? '/entreesupdate' : '/entrees',
        entryPayload(form, lines, row ? itemId(row) : undefined),
      );
    },
    onSuccess: async (result) => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: ['commerce'] }),
        qc.invalidateQueries({ queryKey: ['stock'] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      const raw = result && typeof result === 'object' ? (result as Record<string, unknown>) : {};
      onSaved(String(row?.id ?? raw.id ?? '') || undefined);
    },
    retry: false,
  });
  const back = () => !mutation.isPending && (dirty ? setLeave(true) : onClose());
  function next() {
    setError('');
    if (step === 1 && (!form.date || !form.ref.trim() || !form.provider_id || !form.status)) {
      setError('Renseignez la référence, la date, le fournisseur et le statut.');
      return;
    }
    if (step === 2 && !lines.length) {
      setError('Ajoutez au moins un produit.');
      return;
    }
    setStep(step + 1);
  }
  return (
    <CommerceScreen title={row ? 'Modifier l’entrée' : 'Nouvelle entrée de stock'} onBack={back}>
      <AccessGate permission={row ? 'entries.update' : 'entries.create'}>
        <View style={ui.row}>
          {['1. Informations', '2. Produits', '3. Récapitulatif'].map((label, i) => (
            <View key={label} style={ui.grow}>
              <Badge danger={false}>{i + 1 === step ? `● ${label}` : label}</Badge>
            </View>
          ))}
        </View>
        {step === 1 ? (
          <ResponsiveGrid maxColumns={2}>
            <Card title="Bon d’entrée" icon="receipt-long">
              <TextField
                label="Référence *"
                value={form.ref}
                onChangeText={(v) => update('ref', v)}
              />
              <DateInput
                label="Date de réception *"
                value={form.date}
                onChange={(v) => update('date', v)}
              />
              <ReferenceSelect
                label="Fournisseur *"
                path="/providerDropdown"
                value={form.provider_id}
                onChange={(v) => update('provider_id', v)}
              />
              <ReferenceSelect
                label="Statut de l’entrée *"
                path="/statuses"
                params={{ src: 'entrees' }}
                value={form.status}
                onChange={(v) => update('status', v)}
              />
            </Card>
            <Card title="Note" icon="notes">
              <TextField
                label="Note (facultatif)"
                multiline
                value={form.note}
                onChangeText={(v) => update('note', v)}
              />
              <Notice>Les montants et le paiement seront vérifiés au récapitulatif.</Notice>
            </Card>
          </ResponsiveGrid>
        ) : null}
        {step === 2 ? (
          <>
            <Button
              label="Rechercher ou scanner un produit"
              icon="qr-code-scanner"
              onPress={() => setPicking(true)}
            />
            <AppText variant="headlineSm">Lignes du bon · {lines.length} article(s)</AppText>
            <ResponsiveGrid maxColumns={3}>
              {lines.slice(0, limit).map((l) => (
                <Card key={l.key}>
                  <View style={ui.row}>
                    <AppText variant="labelLg" style={ui.grow}>
                      {l.title}
                    </AppText>
                    <Button
                      label="Modifier"
                      icon="edit"
                      compact
                      fullWidth={false}
                      variant="ghost"
                      onPress={() => setLine(l)}
                    />
                  </View>
                  <View style={ui.inset}>
                    <Pair label="Quantité" value={l.qte} />
                    <Pair label="P. U. achat" value={currency(l.price)} />
                    <Pair label="Expiration" value={l.dateExperation ?? 'Non renseignée'} />
                    <Pair label="Total" value={currency(l.qte * l.price)} />
                  </View>
                  <Button
                    label="Retirer la ligne"
                    icon="delete-outline"
                    variant="dangerSoft"
                    compact
                    onPress={() => {
                      setRemoved(l);
                      setLines(lines.filter((x) => x.key !== l.key));
                      setDirty(true);
                    }}
                  />
                </Card>
              ))}
            </ResponsiveGrid>
            {lines.length > limit ? (
              <Button
                label="Afficher les lignes suivantes"
                variant="tonal"
                onPress={() => setLimit(limit + 20)}
              />
            ) : null}
            {removed ? (
              <Button
                label={`Annuler le retrait : ${removed.title}`}
                variant="outline"
                onPress={() => {
                  setLines((current) => [...current, removed]);
                  setRemoved(undefined);
                }}
              />
            ) : null}
            <Notice>
              Volume reçu : {totals.quantity} unité(s). Sous-total : {currency(totals.subtotal)}.
            </Notice>
          </>
        ) : null}
        {step === 3 ? (
          <ResponsiveGrid maxColumns={2}>
            <Card title="Récapitulatif de réception" icon="fact-check">
              <Pair label="Référence" value={form.ref} />
              <Pair label="Date" value={form.date} />
              <Pair label="Articles" value={lines.length} />
              <Pair label="Volume reçu" value={totals.quantity} />
              <Pair label="Sous-total" value={currency(totals.subtotal)} />
              <TextField
                label="Remise fournisseur (DH)"
                keyboardType="decimal-pad"
                value={form.discount}
                onChangeText={(v) => update('discount', v)}
              />
              <TextField
                label="Taxe (%)"
                keyboardType="decimal-pad"
                value={form.tax}
                onChangeText={(v) => update('tax', v)}
              />
              <Pair label="Montant de la taxe" value={currency(totals.taxAmount)} />
              <Pair label="Total TTC" value={currency(totals.total)} />
            </Card>
            <Card title="Paiement" icon="payments">
              <ReferenceSelect
                label="Mode de paiement *"
                path="/types/payments"
                value={form.paymentType}
                onChange={(v) => update('paymentType', v)}
              />
              <ReferenceSelect
                label="Statut du paiement *"
                path="/statuses"
                params={{ src: 'payments' }}
                value={form.paymentStatus}
                onChange={(v) => update('paymentStatus', v)}
              />
              <TextField
                label="Montant payé (DH)"
                keyboardType="decimal-pad"
                value={form.paid}
                onChangeText={(v) => update('paid', v)}
              />
              <Pair label="Reste à payer" value={currency(totals.due)} />
              <Notice>
                Vérifiez les quantités, expirations et règlements avant d’enregistrer. L’entrée
                modifiera le stock.
              </Notice>
            </Card>
          </ResponsiveGrid>
        ) : null}
        {error ? <Notice>{error}</Notice> : null}
        {mutation.isError ? <ErrorState error={mutation.error} /> : null}
        {step < 3 ? (
          <Button
            label={step === 1 ? 'Continuer vers les produits' : 'Passer au récapitulatif'}
            trailingIcon="arrow-forward"
            onPress={next}
          />
        ) : (
          <Button
            label="Valider et enregistrer l’entrée"
            icon="check-circle-outline"
            loading={mutation.isPending}
            onPress={() => mutation.mutate()}
          />
        )}
        {step > 1 ? (
          <Button
            label="Étape précédente"
            variant="tonal"
            disabled={mutation.isPending}
            onPress={() => setStep(step - 1)}
          />
        ) : null}
        <ConfirmDialog
          visible={leave}
          title="Abandonner cette entrée ?"
          message="Les lignes et modifications non enregistrées seront perdues."
          confirmLabel="Abandonner"
          cancelLabel="Continuer"
          onConfirm={onClose}
          onCancel={() => setLeave(false)}
        />
        {picking ? (
          <ProductPicker
            onClose={() => setPicking(false)}
            onSelect={(p) => {
              setPicking(false);
              setLine({
                key: `new-${Date.now()}`,
                product_id: p.id,
                title: p.productName,
                ref: p.sku,
                qte: 1,
                price: p.buyingPrice ?? 0,
                dateExperation: null,
                hasExpiration: Number(p.hasExpiration) === 1,
              });
            }}
          />
        ) : null}
        {line ? (
          <LineEditor
            line={line}
            onClose={() => setLine(undefined)}
            onSave={(l) => {
              setLines((current) =>
                current.some((x) => x.key === l.key)
                  ? current.map((x) => (x.key === l.key ? l : x))
                  : [...current, l],
              );
              setLine(undefined);
              setDirty(true);
            }}
          />
        ) : null}
      </AccessGate>
    </CommerceScreen>
  );
}
export function ProductPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (p: StockProduct) => void;
}) {
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [page, setPage] = useState(1),
    [scan, setScan] = useState(false),
    [error, setError] = useState(''),
    [looking, setLooking] = useState(false);
  const { store } = useCommerceAccess(),
    lastScan = useRef({ value: '', at: 0 }),
    busy = useRef(false);
  const query = useQuery({
    queryKey: ['commerce-product', store, term, page],
    queryFn: ({ signal }) => stockApi.products({ search: term, page, per_page: 20 }, signal),
    enabled: !scan,
    staleTime: 30_000,
    retry: false,
  });
  async function read(code: string) {
    if (
      busy.current ||
      (lastScan.current.value === code && Date.now() - lastScan.current.at < 2000)
    )
      return;
    lastScan.current = { value: code, at: Date.now() };
    busy.current = true;
    setLooking(true);
    setScan(false);
    setError('');
    try {
      const result = await stockApi.lookup(code);
      if (!result.product) {
        setSearch(code);
        setPage(1);
        setError('Aucun produit trouvé. Recherchez-le par nom.');
        return;
      }
      onSelect(result.product);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recherche indisponible.');
    } finally {
      busy.current = false;
      setLooking(false);
    }
  }
  return (
    <SelectionDialog visible title="Ajouter un produit" onClose={onClose}>
      <TextField
        label="Nom, CIP ou code-barres"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <Button
        label={scan ? 'Fermer la caméra' : 'Scanner un produit'}
        icon="qr-code-scanner"
        variant="tonal"
        disabled={looking}
        onPress={() => setScan(!scan)}
      />
      {scan ? (
        <Suspense fallback={<ActivityIndicator />}>
          <Scanner onRead={(code) => void read(code)} />
        </Suspense>
      ) : null}
      {looking ? <ActivityIndicator /> : null}
      {error ? <Notice>{error}</Notice> : null}
      {!scan ? (
        query.isPending ? (
          <ActivityIndicator />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            {query.data?.data.map((p) => (
              <Button
                key={p.id}
                label={`${p.productName} · ${p.sku}`}
                variant="outline"
                onPress={() => onSelect(p)}
              />
            ))}
            {!query.data?.data.length ? <Notice>Aucun produit trouvé.</Notice> : null}
            <View style={ui.row}>
              <Button
                label="Précédent"
                compact
                fullWidth={false}
                disabled={page === 1}
                variant="tonal"
                onPress={() => setPage(page - 1)}
              />
              <AppText variant="bodySm" style={ui.grow}>
                Page {page}
              </AppText>
              <Button
                label="Suivant"
                compact
                fullWidth={false}
                disabled={page >= (query.data?.last_page ?? 1)}
                variant="tonal"
                onPress={() => setPage(page + 1)}
              />
            </View>
          </>
        )
      ) : null}
    </SelectionDialog>
  );
}
function LineEditor({
  line,
  onClose,
  onSave,
}: {
  line: EntryLine;
  onClose: () => void;
  onSave: (line: EntryLine) => void;
}) {
  const [qty, setQty] = useState(String(line.qte)),
    [price, setPrice] = useState(String(line.price)),
    [expiry, setExpiry] = useState(line.dateExperation ?? ''),
    [error, setError] = useState('');
  return (
    <SelectionDialog visible title={line.title} onClose={onClose}>
      <Badge>{line.ref}</Badge>
      <TextField
        label="Quantité reçue *"
        keyboardType="number-pad"
        value={qty}
        onChangeText={setQty}
      />
      <TextField
        label="Prix d’achat unitaire (DH) *"
        keyboardType="decimal-pad"
        value={price}
        onChangeText={setPrice}
      />
      <DateInput
        label={`Expiration${line.hasExpiration ? ' *' : ' (facultatif)'}`}
        value={expiry}
        onChange={setExpiry}
      />
      <Pair label="Total ligne" value={currency(number(qty) * number(price.replace(',', '.')))} />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        label="Ajouter au bon"
        icon="add-task"
        onPress={() => {
          const q = Number(qty),
            p = Number(price.replace(',', '.'));
          if (!Number.isInteger(q) || q <= 0 || !Number.isFinite(p) || p < 0) {
            setError('Quantité entière positive et prix valide requis.');
            return;
          }
          if (line.hasExpiration && !expiry) {
            setError('L’expiration est obligatoire pour ce produit.');
            return;
          }
          onSave({ ...line, qte: q, price: p, dateExperation: expiry || null });
        }}
      />
      <Button label="Annuler" variant="tonal" onPress={onClose} />
    </SelectionDialog>
  );
}
