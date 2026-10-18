import { printSalePdf, printSaleReceipt } from './printSalePdf';
import { SaleReceipt } from './SaleReceipt';
import { ReceiptImageExport } from './ReceiptImageExport';
import { record } from '@/features/crm/crmApi';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { errorMessage } from '@/utils/errorMessage';
import { saleLineTotal, salesApi } from './salesApi';
import { receiptCustomer, receiptItemTotal, type ReceiptData } from './SaleDocuments';
import { PosAvatar, PosBadge, PosButton, PosLine, PosPage, money, pos, s } from './SalesDesign';
import { paymentLabels, paymentState, referenceText, saleDate } from './salesModel';
import type { CompletedSale } from './SaleCheckout';

export function completedReceipt(completed: CompletedSale): ReceiptData {
  return {
    sale: {
      customer: completed.customer
        ? receiptCustomer({
            customersName: completed.customer.FirstName,
            customersCode: completed.customer.LastName,
            customer: completed.customer.name ?? completed.customer.label,
          })
        : 'Client comptoir',
      date: completed.date,
      total: completed.totals.total,
      totalWithTax: completed.totals.total,
      subTotal: completed.totals.subtotal,
      calDiscount: completed.totals.discountAmount,
      paid: completed.totals.paid,
      due: completed.totals.due,
      receivedAmount: completed.received,
      typePayment: completed.paymentMethod,
    },
    company: {},
    items: completed.lines.map((line) => ({
      title: line.product.productName,
      qte: line.quantity,
      price: line.product.sellingPrice,
      discount: line.discount ?? 0,
      callDiscount:
        Math.round((line.quantity * line.product.sellingPrice - saleLineTotal(line)) * 100) / 100,
    })),
  };
}
export function SaleDetail({
  id,
  canView = true,
  completed,
  onClose,
  onNew,
  onCollect,
}: {
  id: string;
  canView?: boolean;
  completed?: CompletedSale;
  onClose: () => void;
  onNew?: () => void;
  onCollect?: (customer: string) => void;
}) {
  const translation = useTranslation();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const [mode, setMode] = useState<'detail' | 'confirmation' | 'receipt'>(
    completed ? 'confirmation' : 'detail',
  );
  const [documentError, setDocumentError] = useState('');
  const [visibleItems, setVisibleItems] = useState(20);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [mailing, setMailing] = useState(false);
  const query = useQuery({
    queryKey: ['sale', store, id],
    queryFn: ({ signal }) => salesApi.detail(id, signal),
    enabled: !!id && canView,
    staleTime: 30000,
  });
  const data = query.data ?? (completed ? completedReceipt(completed) : undefined);
  async function email() {
    if (!data || busy) return;
    setBusy(true);
    setMailing(true);
    setDocumentError('');
    try {
      const customer = record(data.sale.customer);
      const recipient =
        data.sale.customersEmail ??
        customer.Email ??
        customer.email ??
        completed?.customer?.Email ??
        completed?.customer?.email;
      const { emailSalePdf } = await import('./saleMail');
      await emailSalePdf(
        id,
        String(data.sale.ref ?? id),
        recipient ? String(recipient) : undefined,
      );
    } catch (error) {
      setDocumentError(errorMessage(error, translation));
    } finally {
      setMailing(false);
      setBusy(false);
    }
  }
  async function print(format: 'pdf' | 'receipt' = 'pdf') {
    if (!data || busy) return;
    setBusy(true);
    setDocumentError('');
    try {
      if (format === 'receipt') await printSaleReceipt(data);
      else await printSalePdf(id, String(data.sale.ref ?? id));
    } catch (error) {
      setDocumentError(errorMessage(error, translation));
    } finally {
      setBusy(false);
    }
  }
  function share() {
    if (!data || busy) return;
    setDocumentError('');
    setBusy(true);
    setSharing(true);
  }
  const actions = (
    <View style={{ gap: 8, width: '100%' }}>
      {sharing && data ? (
        <ReceiptImageExport
          data={data}
          onDone={(error) => {
            setSharing(false);
            setBusy(false);
            if (error) setDocumentError(errorMessage(error, translation));
          }}
        />
      ) : null}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <PosButton
            label="Partager"
            icon="share"
            secondary
            disabled={!data || busy}
            onPress={share}
          />
        </View>
        <View style={{ flex: 1.5 }}>
          <PosButton
            label="PDF de vente"
            icon="picture-as-pdf"
            loading={busy && !mailing}
            disabled={!data || busy}
            onPress={() => void print()}
          />
        </View>
      </View>
      <PosButton
        label="Envoyer le PDF par e-mail"
        icon="mail-outline"
        secondary
        loading={mailing}
        disabled={!data || busy || !id}
        onPress={() => void email()}
      />
      <PosButton
        label="Imprimer le ticket de caisse"
        icon="print"
        secondary
        disabled={!data || busy}
        onPress={() => void print('receipt')}
      />
    </View>
  );
  if (isReceiptMode(mode) && data)
    return (
      <PosPage
        key="receipt"
        title="Reçu de vente"
        onClose={() => setMode(completed ? 'confirmation' : 'detail')}
        footer={actions}
      >
        <PosBadge
          label={paymentLabels[paymentState(data.sale)]}
          tone={paymentState(data.sale) === 'paid' ? 'teal' : 'blue'}
          icon="check-circle-outline"
        />
        <SaleReceipt data={data} />
        {documentError ? <AppText color="error">{documentError}</AppText> : null}
      </PosPage>
    );
  return (
    <PosPage
      key={mode}
      title={
        mode === 'confirmation'
          ? 'Confirmation de vente'
          : isReceiptMode(mode)
            ? 'Reçu de vente'
            : 'Détail d’une vente'
      }
      onClose={() =>
        isReceiptMode(mode) ? setMode(completed ? 'confirmation' : 'detail') : onClose()
      }
      footer={mode !== 'confirmation' ? actions : undefined}
    >
      {query.isLoading && !data ? <AppText>Chargement de la vente…</AppText> : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {data ? (
        <>
          {mode === 'confirmation' ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <View style={s.success}>
                <Icon name="check-circle-outline" color="secondary" size={42} />
              </View>
              <AppText variant="headlineLg" align="center">
                Vente enregistrée avec succès
              </AppText>
              <AppText align="center" color="outline">
                La vente a été confirmée par le serveur.
              </AppText>
              {data.sale.ref ? (
                <View style={[s.inset, { width: '100%', alignItems: 'center' }]}>
                  <AppText variant="labelLg">{String(data.sale.ref)}</AppText>
                  <AppText variant="bodySm" color="outline">
                    {saleDate(data.sale.date)}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : mode === 'detail' ? (
            <View style={s.row}>
              <View style={s.iconTile}>
                <Icon name="receipt-long" color="primary" />
              </View>
              <View style={s.grow}>
                <AppText variant="labelSm" color="outline">
                  RÉFÉRENCE DE VENTE
                </AppText>
                <AppText variant="headlineSm" numberOfLines={1}>
                  {String(data.sale.ref ?? 'Vente enregistrée')}
                </AppText>
              </View>
            </View>
          ) : (
            <PosBadge
              label={paymentLabels[paymentState(data.sale)]}
              tone={paymentState(data.sale) === 'paid' ? 'teal' : 'blue'}
              icon="verified"
            />
          )}
          <View style={s.card}>
            {isReceiptMode(mode) ? (
              <>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={s.iconTile}>
                    <Icon name="local-pharmacy" color="primary" />
                  </View>
                  <AppText variant="headlineLg" align="center">
                    {String(data.company.companyName ?? 'QuickPharma')}
                  </AppText>
                  {data.company.address ? (
                    <AppText align="center" color="outline">
                      {String(data.company.address)}
                    </AppText>
                  ) : null}
                  <AppText variant="bodySm">
                    Reçu {String(data.sale.ref ?? '')} • {saleDate(data.sale.date)}
                  </AppText>
                </View>
                <View style={s.divider} />
              </>
            ) : null}
            <View style={[s.inset, s.row]}>
              <PosAvatar name={receiptCustomer(data.sale)} />
              <View style={s.grow}>
                <AppText variant="labelSm" color="outline">
                  CLIENT
                </AppText>
                <AppText variant="headlineSm" numberOfLines={2}>
                  {receiptCustomer(data.sale)}
                </AppText>
                {data.sale.customersTell ? (
                  <AppText variant="bodySm" color="outline">
                    {String(data.sale.customersTell)}
                  </AppText>
                ) : null}
              </View>
            </View>
            {!isReceiptMode(mode) ? (
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                <Icon name="schedule" color="outline" size={17} />
                <AppText variant="bodySm" color="outline">
                  {saleDate(data.sale.date)}
                </AppText>
                <PosBadge
                  label={paymentLabels[paymentState(data.sale)]}
                  tone={
                    paymentState(data.sale) === 'paid'
                      ? 'teal'
                      : paymentState(data.sale) === 'unpaid'
                        ? 'red'
                        : 'blue'
                  }
                />
              </View>
            ) : null}
            {mode === 'confirmation' ? (
              <>
                <PosLine
                  label="Total vente"
                  value={data.sale.totalWithTax ?? data.sale.total}
                  strong
                />
                <PosLine label="Montant payé" value={data.sale.paid} tone={pos.teal} />
                <AppText variant="bodySm" color="outline">
                  Mode de règlement :{' '}
                  {completed?.paymentMethod || referenceText({ code: data.sale.typePayment })}
                </AppText>
                {data.sale.receivedAmount !== undefined ? (
                  <View style={s.inset}>
                    <PosLine label="Montant perçu" value={data.sale.receivedAmount} />
                    <PosLine
                      label="Monnaie rendue"
                      value={Math.max(
                        0,
                        Number(data.sale.receivedAmount) -
                          Number(data.sale.totalWithTax ?? data.sale.total),
                      )}
                      tone={pos.teal}
                    />
                  </View>
                ) : null}
                <PosLine
                  label="Reste à payer"
                  value={data.sale.due}
                  tone={Number(data.sale.due) > 0 ? pos.red : pos.teal}
                />
              </>
            ) : null}
          </View>
          {mode !== 'confirmation' ? (
            <>
              <View style={s.row}>
                <Icon name="medication" color="primary" size={20} />
                <AppText variant="headlineSm" style={s.grow}>
                  Produits délivrés
                </AppText>
                <AppText variant="bodySm" color="outline">
                  {data.items.length} lignes
                </AppText>
              </View>
              {data.items.length > visibleItems ? (
                <PosButton
                  label="Afficher davantage d’articles"
                  secondary
                  compact
                  onPress={() => setVisibleItems(visibleItems + 20)}
                />
              ) : null}
              {data.items.slice(0, visibleItems).map((row, index) => (
                <View key={String(row.id ?? index)} style={[s.card, s.row]}>
                  {mode === 'detail' ? (
                    <View style={s.productTile}>
                      <Icon name="medication" color="primary" />
                    </View>
                  ) : null}
                  <View style={s.grow}>
                    <AppText variant="headlineSm" numberOfLines={2}>
                      {String(row.title ?? row.productName ?? 'Produit')}
                    </AppText>
                    <AppText variant="bodySm" color="outline">
                      {String(row.qte ?? 0)} × {money(row.price)} DH
                    </AppText>
                  </View>
                  <AppText variant="labelLg" style={{ color: pos.blue }}>
                    {money(receiptItemTotal(row))} DH
                  </AppText>
                </View>
              ))}
              {data.sale.note && data.sale.note !== '.' ? (
                <View style={s.inset}>
                  <AppText variant="labelLg">Observations</AppText>
                  <AppText>{String(data.sale.note)}</AppText>
                </View>
              ) : null}
              <View style={s.card}>
                <AppText variant="headlineSm">Synthèse financière</AppText>
                <PosLine label="Sous-total" value={data.sale.subTotal ?? data.sale.total} />
                <PosLine label="Remise commerciale" value={data.sale.calDiscount} />
                <AppText variant="bodySm" color="outline">
                  Taxe : {String(data.sale.tax ?? 0)} %
                </AppText>
                <View style={s.divider} />
                <PosLine
                  label="TOTAL NET"
                  value={data.sale.totalWithTax ?? data.sale.total}
                  strong
                  tone={pos.blue}
                />
                <View style={s.divider} />
                <PosLine label="Montant encaissé" value={data.sale.paid} tone={pos.teal} />
                <PosLine label="Reste dû" value={data.sale.due} />
                {data.sale.receivedAmount !== undefined ? (
                  <PosLine
                    label="Monnaie rendue"
                    value={Math.max(
                      0,
                      Number(data.sale.receivedAmount) -
                        Number(data.sale.totalWithTax ?? data.sale.total),
                    )}
                    tone={pos.teal}
                  />
                ) : null}
                <PosBadge
                  label={
                    referenceText({ code: data.sale.typePayment }) ||
                    completed?.paymentMethod ||
                    'Règlement de vente'
                  }
                  tone="teal"
                  icon="payments"
                />
              </View>
              {isReceiptMode(mode) ? (
                <AppText align="center" color="outline">
                  Merci de votre visite. Conservez votre reçu.
                </AppText>
              ) : (
                <PosButton
                  label="Voir le reçu de caisse"
                  secondary
                  icon="receipt-long"
                  onPress={() => setMode('receipt')}
                />
              )}
              {mode === 'detail' && onCollect && data.sale.customer_id ? (
                <View style={s.inset}>
                  <AppText variant="labelLg">Crédit du client</AppText>
                  <AppText variant="bodySm" color="outline">
                    Consulter et encaisser les ventes impayées de ce client.
                  </AppText>
                  <PosButton
                    label="Encaisser ce crédit"
                    secondary
                    compact
                    icon="account-balance-wallet"
                    onPress={() => onCollect(String(data.sale.customer_id))}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <PosButton
                label="Voir le reçu de caisse"
                icon="receipt-long"
                onPress={() => setMode('receipt')}
              />
              {actions}
              {onNew ? (
                <PosButton
                  label="Nouvelle vente"
                  icon="add-circle-outline"
                  secondary
                  onPress={onNew}
                />
              ) : null}
              <PosButton label="Retour aux ventes" secondary icon="arrow-back" onPress={onClose} />
            </>
          )}
        </>
      ) : null}
      {documentError ? <AppText color="error">{documentError}</AppText> : null}
    </PosPage>
  );
}

function isReceiptMode(mode: string): boolean {
  return mode === 'receipt';
}
