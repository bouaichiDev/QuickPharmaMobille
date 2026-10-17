import { ResponsiveList } from '@/components/ui/ResponsiveGrid';
import { useResponsiveLayout } from '@/components/ui/useResponsiveLayout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useTranslation } from '@/i18n/useTranslation';
import { errorMessage } from '@/utils/errorMessage';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { can, canCreate } from '@/features/crm/modules';
import { itemId, listPayload, type CrmRecord } from '@/features/crm/crmApi';
import { useProducts } from '@/features/stores/useProducts';
import type { Product } from '@/features/stores/productsApi';
import { salePayload, saleTotals, salesApi, type CartLine } from './salesApi';
import {
  CustomerSummary,
  SalesCustomerPicker,
  isCounter,
  useSalesCustomers,
} from './SalesCustomers';
import { PosBadge, PosButton, PosLine, PosPage, PosSearch, money, pos, s } from './SalesDesign';
import { referenceText } from './salesModel';
import { PosScanner } from './PosScanner';

export const saleModule = {
  key: 'sales',
  label: 'Ventes',
  icon: 'point-of-sale' as const,
  endpoint: '/sales',
  view: 'sales.view',
  create: 'sales.create',
  quota: 'sales.monthly',
};
export interface CompletedSale {
  id: string;
  customer?: CrmRecord;
  lines: CartLine[];
  totals: ReturnType<typeof saleTotals>;
  received: number;
  paymentMethod: string;
  date: string;
}
export function SaleCheckout({
  access,
  onClose,
  onCreated,
}: {
  access: ReturnType<typeof useAccess>['data'];
  onClose: () => void;
  onCreated: (sale: CompletedSale) => void;
}) {
  const translation = useTranslation();
  const { needsReflow } = useResponsiveLayout();
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedCustomer, setCustomer] = useState<CrmRecord>();
  const [picking, setPicking] = useState(false);
  const customers = useSalesCustomers();
  const customer = selectedCustomer ?? customers.data?.find(isCounter);
  const [status, setStatus] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [search, setSearch] = useState('');
  const [settled, setSettled] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [scan, setScan] = useState(false);
  const [discount, setDiscount] = useState('0');
  const [tax, setTax] = useState('0');
  const [received, setReceived] = useState('0');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [localError, setLocalError] = useState('');
  const key = useRef('');
  useEffect(() => {
    const timer = setTimeout(() => setSettled(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const products = useProducts({ search: settled, active: '1' }, step === 0);
  const rows = useMemo(
    () =>
      products.data?.pages
        .flatMap((page) => page.data)
        .filter((p) => !availableOnly || (p.quantity ?? 0) > 0) ?? [],
    [products.data, availableOnly],
  );
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const statuses = useQuery({
    queryKey: ['sale-statuses', store],
    queryFn: async ({ signal }) =>
      listPayload(await apiGet('/statuses', { params: { src: 'sales' }, signal })).rows,
    staleTime: 300000,
  });
  const methods = useQuery({
    queryKey: ['sale-payment-methods', store],
    queryFn: async ({ signal }) => listPayload(await apiGet('/types/payments', { signal })).rows,
    staleTime: 300000,
  });
  const paymentStatuses = useQuery({
    queryKey: ['payment-statuses', store],
    queryFn: async ({ signal }) =>
      listPayload(await apiGet('/statuses', { params: { src: 'payments' }, signal })).rows,
    staleTime: 300000,
  });
  const defaultStatus = statuses.data?.find((row) =>
    ['complete', 'completed'].includes(String(row.code).toLowerCase()),
  );
  const statusId = status || (defaultStatus ? itemId(defaultStatus) : '');
  const statusRow = statuses.data?.find((row) => itemId(row) === statusId);
  const method = methods.data?.find((row) => itemId(row) === paymentType);
  const num = (value: string) => Number(value.replace(',', '.'));
  const actualDiscount = can(access, 'sales.apply_discount') ? num(discount) : 0;
  const validNumbers =
    [actualDiscount, num(tax), num(received)].every(Number.isFinite) &&
    actualDiscount >= 0 &&
    actualDiscount <= 100 &&
    num(tax) >= 0 &&
    num(tax) <= 100 &&
    num(received) >= 0;
  const totals = saleTotals(
    lines,
    validNumbers ? actualDiscount : 0,
    validNumbers ? num(tax) : 0,
    validNumbers ? num(received) : 0,
  );
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!canCreate(access, saleModule)) throw new Error('Droit ou quota de vente insuffisant.');
      const code = totals.due === 0 ? 'paid' : totals.paid > 0 ? 'partial' : 'unpaid';
      const paymentStatus = paymentStatuses.data?.find(
        (row) => String(row.code).toLowerCase().replace(/[_ -]/g, '') === code,
      );
      return salesApi.create(
        salePayload({
          lines,
          customer: customer ? itemId(customer) : '',
          status: statusId,
          paymentType,
          paymentStatus: paymentStatus ? itemId(paymentStatus) : '',
          discount: actualDiscount,
          tax: num(tax),
          received: num(received),
          note,
          reference: 'SL-MOB-',
        }),
        key.current,
      );
    },
    onSuccess: (id) =>
      onCreated({
        id,
        customer,
        lines,
        totals,
        received: num(received),
        paymentMethod: method ? referenceText(method) : '',
        date: new Date().toISOString(),
      }),
  });
  function add(product: Product) {
    setLocalError('');
    setLines((old) => {
      const existing = old.find((line) => line.product.id === product.id);
      if (product.quantity === null || (existing?.quantity ?? 0) >= product.quantity) return old;
      return existing
        ? old.map((line) =>
            line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...old, { product, quantity: 1 }];
    });
  }
  const close = () => {
    if (!mutation.isPending) {
      if (step > 0) setStep(step - 1);
      else onClose();
    }
  };
  const footer = (
    <View style={s.footer}>
      {step === 0 ? (
        <View style={s.row}>
          <View style={s.grow}>
            <AppText variant="bodySm" color="outline">
              {count} article{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}
            </AppText>
            <AppText
              variant="dataMetric"
              style={{ color: pos.blue }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(totals.subtotal)} <AppText variant="bodySm">DH</AppText>
            </AppText>
          </View>
          <View style={{ flex: 1.25 }}>
            <PosButton
              label="Voir le panier"
              icon="arrow-forward"
              disabled={!lines.length || !customer}
              onPress={() => setStep(1)}
            />
          </View>
        </View>
      ) : step < 2 ? (
        <>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <View style={s.row}>
              <Icon name="shopping-bag" color="primary" size={22} />
              <AppText color="outline">
                {count} article{count > 1 ? 's' : ''}
              </AppText>
            </View>
            <AppText variant="dataMetric" style={{ color: pos.blue }}>
              {money(totals.subtotal)} <AppText variant="bodySm">DH</AppText>
            </AppText>
          </View>
          <PosButton
            label="Continuer vers le paiement"
            icon="arrow-forward"
            disabled={!lines.length || !customer}
            onPress={() => setStep(step + 1)}
          />
        </>
      ) : (
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <PosButton label="Retour" secondary disabled={mutation.isPending} onPress={close} />
          </View>
          <View style={{ flex: 2 }}>
            <PosButton
              label="Enregistrer la vente"
              icon="check-circle-outline"
              loading={mutation.isPending}
              disabled={
                !lines.length ||
                !customer ||
                !statusId ||
                !method ||
                !validNumbers ||
                paymentStatuses.isLoading ||
                paymentStatuses.isError
              }
              onPress={() => {
                if (!key.current)
                  key.current = `mobile-sale-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                mutation.mutate();
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
  return (
    <>
      <PosPage
        title={['Nouvelle vente', 'Panier', 'Paiement'][step]!}
        onClose={close}
        scroll={step === 2}
        steps={step}
        footer={footer}
      >
        {step === 0 ? (
          <ResponsiveList
            data={rows}
            keyExtractor={(p) => String(p.id)}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.listContent}
            ListHeaderComponent={
              <View style={s.stack}>
                <CustomerSummary
                  customer={customer}
                  onChange={() => {
                    if (!mutation.isPending) setPicking(true);
                  }}
                />
                <PosSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Médicament, nom ou code-barres…"
                  onScan={() => setScan(true)}
                />
                <View style={s.row}>
                  <PosButton
                    label="Tous les stocks"
                    compact
                    secondary={availableOnly}
                    onPress={() => setAvailableOnly(false)}
                  />
                  <PosButton
                    label="Disponibles"
                    compact
                    secondary={!availableOnly}
                    onPress={() => setAvailableOnly(true)}
                  />
                </View>
                <AppText variant="labelLg">
                  Produits disponibles{' '}
                  <AppText variant="bodySm" color="outline">
                    ({rows.length})
                  </AppText>
                </AppText>
                {customers.isError ? (
                  <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
                ) : null}
                {products.isError ? (
                  <ErrorState error={products.error} onRetry={() => void products.refetch()} />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <AppText color="outline">
                {products.isLoading ? 'Chargement des produits…' : 'Aucun produit trouvé.'}
              </AppText>
            }
            ListFooterComponent={
              products.hasNextPage ? (
                <PosButton
                  label="Plus de produits"
                  secondary
                  loading={products.isFetchingNextPage}
                  onPress={() => {
                    if (!products.isFetchingNextPage) void products.fetchNextPage();
                  }}
                />
              ) : null
            }
            renderItem={({ item: product }) => {
              const quantity = lines.find((line) => line.product.id === product.id)?.quantity ?? 0;
              const disabled = product.quantity === null || quantity >= product.quantity;
              return (
                <View
                  style={[
                    s.card,
                    s.row,
                    { padding: 14, opacity: product.quantity === 0 ? 0.65 : 1 },
                  ]}
                >
                  <View style={s.productTile}>
                    <Icon
                      name="medication"
                      color={product.quantity === 0 ? 'outline' : 'primary'}
                      size={26}
                    />
                  </View>
                  <View style={[s.grow, { gap: 5 }]}>
                    <AppText variant="headlineSm" numberOfLines={2}>
                      {product.productName}
                    </AppText>
                    <AppText variant="bodySm" color="outline" numberOfLines={1}>
                      Réf. {product.sku}
                    </AppText>
                    <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
                      <PosBadge
                        label={
                          product.quantity === null
                            ? 'Stock inconnu'
                            : product.quantity === 0
                              ? 'Épuisé'
                              : `${product.quantity} en stock`
                        }
                        tone={(product.quantity ?? 0) > 0 ? 'teal' : 'red'}
                      />
                      <AppText variant="labelLg" style={{ color: pos.blue }}>
                        {money(product.sellingPrice)} DH
                      </AppText>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter ${product.productName}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => add(product)}
                    style={[
                      s.iconButton,
                      {
                        backgroundColor: disabled ? pos.pale : pos.blue,
                        borderRadius: 24,
                        width: 46,
                        height: 46,
                      },
                    ]}
                  >
                    <Icon name="add" color={disabled ? 'outline' : 'onPrimary'} size={26} />
                  </Pressable>
                </View>
              );
            }}
          />
        ) : step === 1 ? (
          <ResponsiveList
            data={lines}
            keyExtractor={(line) => String(line.product.id)}
            contentContainerStyle={s.listContent}
            initialNumToRender={8}
            windowSize={5}
            ListHeaderComponent={
              <CustomerSummary
                customer={customer}
                onChange={() => {
                  if (!mutation.isPending) setPicking(true);
                }}
              />
            }
            ListEmptyComponent={<AppText>Votre panier est vide.</AppText>}
            ListFooterComponent={
              <PosButton
                label="Ajouter d’autres produits"
                secondary
                icon="add-circle-outline"
                onPress={() => setStep(0)}
              />
            }
            renderItem={({ item: line }) => (
              <View style={s.card}>
                <View style={s.row}>
                  <View style={s.productTile}>
                    <Icon name="medication" color="primary" size={26} />
                  </View>
                  <View style={s.grow}>
                    <AppText variant="headlineSm" numberOfLines={2}>
                      {line.product.productName}
                    </AppText>
                    <AppText variant="bodySm" color="outline">
                      P.U. {money(line.product.sellingPrice)} DH • Dispo. {line.product.quantity}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${line.product.productName}`}
                    onPress={() =>
                      setLines((old) => old.filter((x) => x.product.id !== line.product.id))
                    }
                    style={s.iconButton}
                  >
                    <Icon name="delete-outline" color="outline" size={22} />
                  </Pressable>
                </View>
                <View style={[s.row, { justifyContent: 'space-between' }]}>
                  <View style={[s.row, s.inset, { padding: 4 }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Diminuer ${line.product.productName}`}
                      onPress={() =>
                        setLines((old) =>
                          old
                            .map((x) =>
                              x.product.id === line.product.id
                                ? { ...x, quantity: x.quantity - 1 }
                                : x,
                            )
                            .filter((x) => x.quantity > 0),
                        )
                      }
                      style={[s.iconButton, { backgroundColor: '#fff' }]}
                    >
                      <Icon name="remove" size={20} />
                    </Pressable>
                    <AppText variant="labelLg">{line.quantity}</AppText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Augmenter ${line.product.productName}`}
                      disabled={line.quantity >= (line.product.quantity ?? 0)}
                      onPress={() => add(line.product)}
                      style={[
                        s.iconButton,
                        {
                          backgroundColor: '#fff',
                          opacity: line.quantity >= (line.product.quantity ?? 0) ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Icon name="add" size={20} />
                    </Pressable>
                  </View>
                  <View>
                    <AppText variant="bodySm" align="right" color="outline">
                      Sous-total
                    </AppText>
                    <AppText variant="headlineMd" style={{ color: pos.blue }}>
                      {money(line.quantity * line.product.sellingPrice)} DH
                    </AppText>
                  </View>
                </View>
              </View>
            )}
          />
        ) : (
          <>
            <CustomerSummary
              customer={customer}
              onChange={() => {
                if (!mutation.isPending) setPicking(true);
              }}
            />
            <View style={s.row}>
              <AppText variant="headlineSm" style={s.grow}>
                Mode de règlement
              </AppText>
              <PosBadge label={`${count} articles`} />
            </View>
            {methods.isError ? (
              <ErrorState error={methods.error} onRetry={() => void methods.refetch()} />
            ) : methods.isLoading ? (
              <AppText>Chargement des modes de paiement…</AppText>
            ) : null}
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              {methods.data?.map((row) => (
                <Pressable
                  key={itemId(row)}
                  accessibilityRole="button"
                  accessibilityLabel={referenceText(row)}
                  accessibilityState={{
                    selected: paymentType === itemId(row),
                    disabled: mutation.isPending,
                  }}
                  disabled={mutation.isPending}
                  onPress={() => setPaymentType(itemId(row))}
                  style={[
                    s.card,
                    {
                      width: needsReflow ? '100%' : '48%',
                      minHeight: 98,
                      borderColor: paymentType === itemId(row) ? pos.blue : '#fff',
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View style={[s.row, { justifyContent: 'space-between' }]}>
                    <View style={s.iconTile}>
                      <Icon
                        name={
                          referenceText(row) === 'Espèces'
                            ? 'payments'
                            : referenceText(row) === 'Carte TPE'
                              ? 'credit-card'
                              : 'account-balance'
                        }
                        color="primary"
                      />
                    </View>
                    <Icon
                      name={paymentType === itemId(row) ? 'check-circle' : 'radio-button-unchecked'}
                      color={paymentType === itemId(row) ? 'primary' : 'outline'}
                      size={20}
                    />
                  </View>
                  <AppText variant="labelLg">{referenceText(row)}</AppText>
                </Pressable>
              ))}
            </View>
            <View style={s.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Statut de la vente"
                onPress={() => setShowStatus(!showStatus)}
                style={s.row}
              >
                <Icon name="verified" color="secondary" size={20} />
                <AppText style={s.grow}>Statut de la vente</AppText>
                <AppText variant="labelMd">
                  {statusRow ? referenceText(statusRow) : 'Choisir'}
                </AppText>
                <Icon name="expand-more" color="outline" size={20} />
              </Pressable>
              {showStatus
                ? statuses.data?.map((row) => (
                    <PosButton
                      key={itemId(row)}
                      label={referenceText(row)}
                      secondary={itemId(row) !== statusId}
                      compact
                      disabled={mutation.isPending}
                      onPress={() => {
                        setStatus(itemId(row));
                        setShowStatus(false);
                      }}
                    />
                  ))
                : null}
              {can(access, 'sales.apply_discount') ? (
                <TextField
                  appearance="crm"
                  label="Remise (%)"
                  keyboardType="decimal-pad"
                  value={discount}
                  onChangeText={setDiscount}
                  editable={!mutation.isPending}
                />
              ) : null}
              <TextField
                appearance="crm"
                label="Taxe (%)"
                keyboardType="decimal-pad"
                value={tax}
                onChangeText={setTax}
                editable={!mutation.isPending}
              />
            </View>
            <View style={s.card}>
              <View style={[s.inset, s.row]}>
                <View style={s.grow}>
                  <AppText variant="labelMd" style={{ color: pos.blue }}>
                    NET À PAYER
                  </AppText>
                  <AppText variant="bodySm" color="outline">
                    {count} articles • Total final
                  </AppText>
                </View>
                <AppText variant="dataMetric" style={{ color: pos.blue }}>
                  {money(totals.total)} <AppText variant="bodySm">DH</AppText>
                </AppText>
              </View>
              <TextField
                appearance="crm"
                label="Montant reçu"
                keyboardType="decimal-pad"
                value={received}
                onChangeText={setReceived}
                suffix="DH"
                editable={!mutation.isPending}
              />
              <PosButton
                label={`Paiement intégral (${money(totals.total)} DH)`}
                compact
                secondary
                icon="done-all"
                disabled={mutation.isPending}
                onPress={() => setReceived(String(totals.total))}
              />
              <View style={s.inset}>
                <PosLine label="Montant payé" value={totals.paid} />
                <PosLine
                  label="Reste à payer"
                  value={totals.due}
                  tone={totals.due > 0 ? pos.red : pos.teal}
                />
                <View style={s.divider} />
                <PosLine label="Monnaie à rendre" value={totals.change} strong tone={pos.teal} />
                <PosBadge
                  label={
                    totals.due === 0
                      ? 'Intégralement réglée'
                      : totals.paid > 0
                        ? 'Paiement partiel'
                        : 'Impayée'
                  }
                  tone={totals.due === 0 ? 'teal' : totals.paid > 0 ? 'blue' : 'red'}
                />
              </View>
              {!validNumbers ? (
                <AppText color="error">
                  Saisissez des montants valides. Remise et taxe : 0 à 100 %.
                </AppText>
              ) : null}
            </View>
            <View style={s.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter une note"
                onPress={() => setShowNote(!showNote)}
                style={s.row}
              >
                <Icon name="edit-note" color="primary" />
                <AppText variant="labelLg" style={s.grow}>
                  Ajouter une note
                </AppText>
                <Icon name={showNote ? 'expand-less' : 'expand-more'} color="outline" />
              </Pressable>
              {showNote ? (
                <TextField
                  appearance="crm"
                  label="Note"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  editable={!mutation.isPending}
                />
              ) : null}
            </View>
            {statuses.isError ? (
              <ErrorState error={statuses.error} onRetry={() => void statuses.refetch()} />
            ) : null}
            {paymentStatuses.isError ? (
              <ErrorState
                error={paymentStatuses.error}
                onRetry={() => void paymentStatuses.refetch()}
              />
            ) : null}
            {localError ? <AppText color="error">{localError}</AppText> : null}
            {mutation.isError ? (
              <AppText color="error">{errorMessage(mutation.error, translation)}</AppText>
            ) : null}
          </>
        )}
      </PosPage>
      {picking ? (
        <SalesCustomerPicker
          value={customer ? itemId(customer) : ''}
          onClose={() => setPicking(false)}
          onSelect={(row) => {
            setCustomer(row);
            setPicking(false);
          }}
        />
      ) : null}
      {scan ? (
        <PosScanner
          onClose={() => setScan(false)}
          onRead={(value) => {
            setSearch(value);
            setSettled(value);
            setAvailableOnly(false);
            setScan(false);
          }}
        />
      ) : null}
    </>
  );
}
