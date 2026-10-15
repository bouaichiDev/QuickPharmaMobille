import { CreditConfirmation, type CreditReceipt } from './CreditConfirmation';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/services/api/client';
import { itemId, record, type CrmRecord } from '@/features/crm/crmApi';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { errorMessage } from '@/utils/errorMessage';
import { escapeHtml, printCrmDocument } from '@/features/crm/documents';
import {
  CustomerSummary,
  customerName,
  SalesCustomerPicker,
  useSalesCustomers,
} from './SalesCustomers';
import { PosButton, PosLine, PosPage, money, pos, s } from './SalesDesign';
import { saleDate } from './salesModel';
export function CreditCollection({
  initialCustomer = '',
  onClose,
  onPaid,
}: {
  initialCustomer?: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const translation = useTranslation();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const customers = useSalesCustomers();
  const [customer, setCustomer] = useState(initialCustomer);
  const [picking, setPicking] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Espèces');
  const [reference, setReference] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<CreditReceipt>();
  const credit = useQuery({
    queryKey: ['customer-credit', store, customer],
    queryFn: async ({ signal }) =>
      record(await apiGet(`/credit-payment/${encodeURIComponent(customer)}`, { signal })),
    enabled: !!customer,
    staleTime: 30000,
  });
  const data = record(credit.data?.data ?? credit.data);
  const debt = Number(data.total_credit ?? data.total_credit_amount ?? 0);
  const selected =
    customers.data?.find((row) => itemId(row) === customer) ??
    (customer ? { id: customer, name: data.customer_name ?? 'Client sélectionné' } : undefined);
  const lines = Array.isArray(data.credit_details) ? data.credit_details.map(record) : [];
  const [limit, setLimit] = useState(10);
  const value = Number(amount.replace(',', '.'));
  const valid =
    !!customer &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= debt &&
    !credit.isError &&
    !credit.isFetching;
  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!valid)
        throw new Error('Le montant doit être positif et ne pas dépasser le crédit client.');
      const before = {
        name: customerName(selected),
        debt,
        amount: value,
        method,
        date: new Date().toISOString(),
      };
      const result = record(
        await apiPost('/credit-payment/pay', {
          customer_id: Number(customer),
          amount: value,
          payment_method: method,
          reference,
        }),
      );
      if (result.success !== true)
        throw new Error(String(result.message ?? 'Le règlement n’a pas été confirmé.'));
      return { result, before };
    },
    onSuccess: ({ before, result }) => {
      const summary = record(result.payment_summary);
      setSnapshot({
        ...before,
        allocations: Array.isArray(summary.payment_details)
          ? summary.payment_details.map(record)
          : [],
      });
      onPaid();
      void credit.refetch();
    },
  });
  const close = () => {
    if (!mutation.isPending && !busy) onClose();
  };
  const receipt = snapshot
    ? `Règlement de crédit client\n${snapshot.name}\n${saleDate(snapshot.date)}\nMontant : ${money(snapshot.amount)} DH\nMode : ${snapshot.method}${reference ? `\nRéférence : ${reference}` : ''}${snapshot.allocations?.length ? '\nImputation :\n' + snapshot.allocations.map((row) => `${String(row.sale_ref ?? 'Vente')} : ${money(row.amount_paid)} DH (${row.payment_type === 'full' ? 'soldée' : 'partielle'})`).join('\n') : ''}`
    : '';
  async function print() {
    if (busy || !snapshot) return;
    setBusy(true);
    setDocumentError('');
    try {
      await printCrmDocument(
        `<html lang="fr"><meta charset="utf-8"><body style="font:16px Arial;color:#00417c;padding:32px"><h1>Reçu de règlement</h1><p style="white-space:pre-line">${escapeHtml(receipt)}</p></body></html>`,
      );
    } catch (error) {
      setDocumentError(errorMessage(error, translation));
    } finally {
      setBusy(false);
    }
  }
  const footer = snapshot ? (
    <PosButton label="Retour aux ventes" onPress={close} disabled={busy} />
  ) : (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <PosButton label="Annuler" secondary onPress={close} disabled={mutation.isPending} />
      </View>
      <View style={{ flex: 1.8 }}>
        <PosButton
          label="Confirmer le règlement"
          icon="check-circle-outline"
          disabled={!valid}
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </View>
    </View>
  );
  return (
    <PosPage
      title={snapshot ? 'Confirmation de règlement' : 'Encaisser un crédit client'}
      onClose={close}
      footer={footer}
    >
      {snapshot ? (
        <CreditConfirmation
          payment={snapshot}
          reference={reference}
          remaining={
            credit.isFetching || credit.isError
              ? Math.max(0, snapshot.debt - snapshot.amount)
              : debt
          }
          estimated={credit.isFetching || credit.isError}
          busy={busy}
          onPrint={() => void print()}
          onShare={() =>
            void Share.share({ message: receipt }).catch((error) =>
              setDocumentError(errorMessage(error, translation)),
            )
          }
        />
      ) : (
        <>
          <CustomerSummary
            customer={selected}
            onChange={() => {
              if (!mutation.isPending) setPicking(true);
            }}
          />
          <View style={[s.inset, s.row]}>
            <Icon name="info-outline" color="secondary" />
            <AppText variant="bodySm" style={s.grow}>
              Le règlement est réparti sur les ventes impayées, de la plus ancienne à la plus
              récente.
            </AppText>
          </View>
          {credit.isLoading ? <AppText>Chargement du crédit…</AppText> : null}
          {credit.isError ? (
            <ErrorState error={credit.error} onRetry={() => void credit.refetch()} />
          ) : null}
          <View style={s.card}>
            <AppText variant="labelSm" color="outline">
              CRÉDIT TOTAL RESTANT
            </AppText>
            <AppText variant="dataMetric" style={{ color: pos.blue }}>
              {money(debt)} DH
            </AppText>
            <AppText color="outline">
              {Number(data.number_of_unpaid_sales ?? lines.length)} vente(s) impayée(s)
            </AppText>
            {lines.slice(0, limit).map((row: CrmRecord, index: number) => (
              <View key={String(row.sale_id ?? index)} style={[s.inset, s.row]}>
                <View style={s.grow}>
                  <AppText variant="labelLg">{String(row.sale_ref ?? 'Vente impayée')}</AppText>
                  <AppText variant="bodySm" color="outline">
                    {saleDate(row.date)}
                  </AppText>
                </View>
                <AppText variant="labelLg" style={{ color: pos.red }}>
                  {money(row.credit)} DH
                </AppText>
              </View>
            ))}
            {lines.length > limit ? (
              <PosButton
                label="Afficher davantage de ventes"
                secondary
                compact
                onPress={() => setLimit(limit + 10)}
              />
            ) : null}
          </View>
          <View style={s.card}>
            <AppText variant="headlineSm">Montant du règlement</AppText>
            <TextField
              label="Montant à encaisser (DH)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!mutation.isPending}
            />
            <View style={s.row}>
              <View style={s.grow}>
                <PosButton
                  label="Régler le total"
                  compact
                  secondary
                  disabled={!customer || debt <= 0 || mutation.isPending}
                  onPress={() => setAmount(String(debt))}
                />
              </View>
              <View style={s.grow}>
                <PosButton
                  label="Montant partiel"
                  compact
                  secondary
                  disabled={mutation.isPending}
                  onPress={() => setAmount('')}
                />
              </View>
            </View>
          </View>
          <View style={s.card}>
            <AppText variant="headlineSm">Mode de paiement</AppText>
            <View style={[s.row, { flexWrap: 'wrap' }]}>
              {['Espèces', 'Carte TPE', 'Virement', 'Chèque'].map((label) => (
                <View key={label} style={{ width: '47%' }}>
                  <PosButton
                    label={label}
                    secondary={method !== label}
                    disabled={mutation.isPending}
                    onPress={() => setMethod(label)}
                  />
                </View>
              ))}
            </View>
            <TextField
              label="Référence (facultative)"
              value={reference}
              onChangeText={setReference}
              editable={!mutation.isPending}
            />
          </View>
          {valid ? (
            <View style={s.inset}>
              <PosLine
                label="Nouveau crédit restant"
                value={Math.max(0, debt - value)}
                strong
                tone={pos.teal}
              />
            </View>
          ) : amount ? (
            <AppText color="error">
              Saisissez un montant positif inférieur ou égal au crédit restant.
            </AppText>
          ) : null}
          {mutation.isError ? (
            <AppText color="error">{errorMessage(mutation.error, translation)}</AppText>
          ) : null}
        </>
      )}
      {documentError ? <AppText color="error">{documentError}</AppText> : null}
      {picking ? (
        <SalesCustomerPicker
          value={customer}
          onClose={() => setPicking(false)}
          onSelect={(row) => {
            setCustomer(itemId(row));
            setAmount('');
            setLimit(10);
            mutation.reset();
            setPicking(false);
          }}
        />
      ) : null}
    </PosPage>
  );
}
