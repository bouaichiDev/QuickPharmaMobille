import { lazy, Suspense, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { itemId } from '@/features/crm/crmApi';
import { DateInput, currency } from '@/features/superadmin/AdminUI';
import { saleLineTotal, saleTotals, type CartLine } from '@/features/sales/salesApi';
import type { StockProduct } from '@/features/catalogue/stockApi';
import { ProductPrice } from '@/features/catalogue/ProductPrice';
import { commerceApi, type Row } from './api';
import { defaultOrderStatus, orderLines, orderPayload, type OrderFormData } from './orderModel';
import {
  AccessGate,
  AppText,
  Button,
  Card,
  CommerceScreen,
  Notice,
  Pair,
  ReferenceSelect,
  ResponsiveGrid,
  SkeletonCards,
  TextField,
  ui,
  useCommerceAccess,
} from './CommerceUI';
const ProductPicker = lazy(() => import('./EntryForm').then((m) => ({ default: m.ProductPicker })));
export interface OrderData {
  order: Row;
  items: Row[];
}
export default function OrderForm({
  data,
  onClose,
  onSaved,
}: {
  data?: OrderData;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const { can, store } = useCommerceAccess(),
    qc = useQueryClient(),
    row = data?.order;
  const [step, setStep] = useState(1),
    [dirty, setDirty] = useState(false),
    [leave, setLeave] = useState(false),
    [noteOpen, setNoteOpen] = useState(false),
    [error, setError] = useState('');
  const [form, setForm] = useState<OrderFormData>(() => ({
    ref: String(row?.ref ?? `CMD-${Date.now()}-`),
    date: String(row?.date ?? new Date().toISOString()).slice(0, 10),
    customer: String(row?.customer_id ?? ''),
    status: String(row?.statuse_id ?? ''),
    discount: String(row?.discount ?? 0),
    tax: String(row?.tax ?? 0),
    paid: String(row?.paid ?? 0),
    note: String(row?.note ?? ''),
  }));
  const [lines, setLines] = useState<CartLine[]>(() => (data ? orderLines(data.items) : [])),
    [picking, setPicking] = useState<'search' | 'scan'>(),
    [editing, setEditing] = useState<{ line: CartLine; index: number }>();
  const permission = row ? 'orders.update' : 'orders.create';
  const statuses = useQuery({
    queryKey: ['commerce-reference', store, '/statuses', { src: 'commandes' }, '', 1],
    queryFn: ({ signal }) =>
      commerceApi.list(
        '/statuses',
        { src: 'commandes', search: '', page: 1, per_page: 50 },
        signal,
      ),
    enabled: !row && can(permission),
    staleTime: 300000,
    retry: false,
  });
  const effectiveForm = {
    ...form,
    status: form.status || (!row ? defaultOrderStatus(statuses.data?.rows ?? []) : ''),
  };
  const number = (value: string) => Number(value.replace(',', '.'));
  const totals = saleTotals(
    lines,
    number(form.discount) || 0,
    number(form.tax) || 0,
    number(form.paid) || 0,
  );
  const update = (key: keyof OrderFormData, value: string) => {
    setDirty(true);
    setForm({ ...form, [key]: value });
  };
  const back = () => !mutation.isPending && (dirty ? setLeave(true) : onClose());
  const mutation = useMutation({
    mutationFn: () => {
      if (!can(permission)) throw new Error('Action non autorisée.');
      return commerceApi.write(
        'post',
        row ? '/commandeupdate' : '/commandes',
        orderPayload(effectiveForm, lines, row ? itemId(row) : undefined),
      );
    },
    onSuccess: (result) => {
      void Promise.all(
        ['commerce', 'catalogue', 'products', 'stock-product'].map((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        ),
      );
      const id = row
        ? itemId(row)
        : result && typeof result === 'object'
          ? itemId(result as Row)
          : undefined;
      onSaved(id);
    },
    retry: false,
  });
  function next() {
    setError('');
    if (
      step === 1 &&
      (!effectiveForm.customer || !effectiveForm.status || !form.ref || !form.date)
    ) {
      setError('Renseignez le client, la référence, la date et le statut.');
      return;
    }
    if (step === 2 && !lines.length) {
      setError('Ajoutez au moins un produit.');
      return;
    }
    setStep(step + 1);
  }
  function select(product: StockProduct) {
    const index = lines.findIndex((line) => line.product.id === product.id),
      existing = lines[index];
    const reserved = data?.items.find((item) => Number(item.product_id) === product.id);
    setPicking(undefined);
    setEditing({
      index,
      line: existing
        ? {
            ...existing,
            product: {
              ...existing.product,
              quantity: Number(product.quantity) + Number(reserved?.qte ?? 0),
            },
          }
        : {
            product: {
              ...product,
              categoryId: product.categoryId ?? 0,
              discount: product.discount ?? undefined,
              quantity: Number(product.quantity) + Number(reserved?.qte ?? 0),
            },
            quantity: 1,
            discount: 0,
          },
    });
  }
  return (
    <CommerceScreen
      title={row ? 'Modifier la commande' : 'Nouvelle commande'}
      onBack={back}
      footer={
        can(permission) ? (
          <View style={{ gap: 8 }}>
            {error || mutation.isError ? (
              <AppText color="error" accessibilityRole="alert">
                {error || mutation.error?.message}
              </AppText>
            ) : null}
            <View style={ui.row}>
              <Button
                label="Précédent"
                disabled={step === 1 || mutation.isPending}
                fullWidth={false}
                style={ui.grow}
                variant="tonal"
                onPress={() => setStep(step - 1)}
              />
              <Button
                label={step === 3 ? 'Enregistrer' : 'Suivant'}
                fullWidth={false}
                style={ui.grow}
                loading={mutation.isPending}
                disabled={step === 1 && (!form.customer || !effectiveForm.status)}
                onPress={() => (step === 3 ? mutation.mutate() : next())}
              />
            </View>
          </View>
        ) : undefined
      }
    >
      <AccessGate permission={permission}>
        <AppText variant="labelLg">
          {step}. {['Informations', 'Produits', 'Récapitulatif'][step - 1]}
        </AppText>
        {step === 1 ? (
          <>
            <Card title="Informations sur la commande">
              <TextField
                label="Référence *"
                value={form.ref}
                onChangeText={(v) => update('ref', v)}
              />
              <DateInput label="Date *" value={form.date} onChange={(v) => update('date', v)} />
              <ReferenceSelect
                label="Client *"
                path="/customerDropdown"
                value={form.customer}
                onChange={(v) => update('customer', v)}
              />
              <ReferenceSelect
                label="Statut *"
                path="/statuses"
                params={{ src: 'commandes' }}
                value={effectiveForm.status}
                onChange={(v) => update('status', v)}
              />
            </Card>
            <Card>
              <Button
                label="Note (facultatif)"
                variant="ghost"
                trailingIcon={noteOpen ? 'expand-less' : 'expand-more'}
                onPress={() => setNoteOpen(!noteOpen)}
              />
              {noteOpen ? (
                <TextField
                  label="Note"
                  multiline
                  value={form.note}
                  onChangeText={(v) => update('note', v)}
                />
              ) : null}
            </Card>
          </>
        ) : step === 2 ? (
          <>
            <ResponsiveGrid maxColumns={2}>
              <Button
                label="Rechercher un produit"
                icon="search"
                variant="tonal"
                onPress={() => setPicking('search')}
              />
              <Button
                label="Scanner un produit"
                icon="qr-code-scanner"
                onPress={() => setPicking('scan')}
              />
            </ResponsiveGrid>
            <AppText variant="headlineSm">{lines.length} références</AppText>
            {lines.map((line, index) => (
              <Card key={line.product.id} title={line.product.productName}>
                <Pair label="Quantité" value={line.quantity} />
                <Pair label="Total ligne" value={currency(saleLineTotal(line))} />
                <View style={ui.row}>
                  <Button
                    label="Modifier la ligne"
                    variant="tonal"
                    compact
                    fullWidth={false}
                    style={ui.grow}
                    onPress={() => setEditing({ line, index })}
                  />
                  <Button
                    label="Retirer"
                    variant="ghost"
                    compact
                    fullWidth={false}
                    onPress={() => {
                      setLines(lines.filter((_, i) => i !== index));
                      setDirty(true);
                    }}
                  />
                </View>
              </Card>
            ))}
            <Notice>
              La commande réserve les unités. Les lots avec expiration suivent l’ordre d’allocation
              du stock.
            </Notice>
          </>
        ) : (
          <>
            <Card title="Résumé de la commande">
              <Pair label="Référence" value={form.ref} />
              <Pair label="Sous-total" value={currency(totals.subtotal)} />
              <TextField
                label="Remise globale (%)"
                keyboardType="decimal-pad"
                editable={can('sales.apply_discount')}
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
              <TextField
                label="Acompte enregistré (DH)"
                keyboardType="decimal-pad"
                value={form.paid}
                onChangeText={(v) => update('paid', v)}
              />
              <Pair label="Reste dû" value={currency(totals.due)} />
            </Card>
            <Notice>Enregistrer réserve le stock de cette commande client.</Notice>
          </>
        )}
        {picking ? (
          <Suspense fallback={<SkeletonCards count={2} />}>
            <ProductPicker
              initialScan={picking === 'scan'}
              onClose={() => setPicking(undefined)}
              onSelect={select}
            />
          </Suspense>
        ) : null}
        {editing ? (
          <OrderLineEditor
            key={`${editing.line.product.id}-${editing.index}`}
            line={editing.line}
            canDiscount={can('sales.apply_discount')}
            onClose={() => setEditing(undefined)}
            onSave={(line) => {
              setLines((old) =>
                editing.index < 0
                  ? [...old, line]
                  : old.map((item, i) => (i === editing.index ? line : item)),
              );
              setEditing(undefined);
              setDirty(true);
            }}
          />
        ) : null}
        <ConfirmDialog
          visible={leave}
          title="Quitter sans enregistrer ?"
          message="Les modifications seront perdues."
          confirmLabel="Quitter"
          cancelLabel="Rester"
          onConfirm={onClose}
          onCancel={() => setLeave(false)}
        />
      </AccessGate>
    </CommerceScreen>
  );
}
function OrderLineEditor({
  line,
  canDiscount,
  onClose,
  onSave,
}: {
  line: CartLine;
  canDiscount: boolean;
  onClose: () => void;
  onSave: (line: CartLine) => void;
}) {
  const [quantity, setQuantity] = useState(String(line.quantity)),
    [price, setPrice] = useState(String(line.product.sellingPrice)),
    [discount, setDiscount] = useState(String(line.discount ?? 0)),
    [error, setError] = useState('');
  return (
    <SelectionDialog visible title={line.product.productName} onClose={onClose}>
      <AppText>
        {line.product.sku} · Maximum : {line.product.quantity}
      </AppText>
      <ProductPrice product={line.product} />
      <TextField
        label="Quantité *"
        value={quantity}
        keyboardType="number-pad"
        onChangeText={setQuantity}
      />
      <TextField
        label="Prix unitaire (DH) *"
        value={price}
        keyboardType="decimal-pad"
        onChangeText={setPrice}
      />
      <TextField
        label="Remise produit (%)"
        value={discount}
        keyboardType="decimal-pad"
        editable={canDiscount}
        onChangeText={setDiscount}
      />
      {error ? <Notice>{error}</Notice> : null}
      <Button
        label="Ajouter à la commande"
        onPress={() => {
          const q = Number(quantity),
            p = Number(price.replace(',', '.')),
            d = Number(discount.replace(',', '.'));
          if (
            !Number.isInteger(q) ||
            q < 1 ||
            q > (line.product.quantity ?? 0) ||
            !Number.isFinite(p) ||
            p < 0 ||
            !Number.isFinite(d) ||
            d < 0 ||
            d > 100
          ) {
            setError('Vérifiez la quantité disponible, le prix et la remise.');
            return;
          }
          onSave({
            ...line,
            quantity: q,
            product: { ...line.product, sellingPrice: p },
            discount: d,
          });
        }}
      />
      <Button label="Annuler" variant="tonal" onPress={onClose} />
    </SelectionDialog>
  );
}
