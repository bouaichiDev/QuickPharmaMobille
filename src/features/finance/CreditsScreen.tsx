import { useState } from 'react';
import { View } from 'react-native';
import { adminApi, asRecord, asRows, type Row } from '@/features/admin/api';
import { record, itemId } from '@/features/crm/crmApi';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { useDirtyBack } from '@/features/admin/AdminDesign';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  AdminPage,
  Panel,
  AppText,
  Button,
  TextField,
  Tabs,
  Notice,
  CommerceList,
  ReferenceSelect,
  Pair,
  date,
  currency,
  FinanceRow,
  Metric,
  QueryState,
  useFinanceList,
  useFinanceQuery,
  useFinanceAction,
  useCommerceAccess,
  go,
  f,
} from './FinanceUI';
export default function CreditsScreen({
  overview = false,
  id,
}: {
  overview?: boolean;
  id?: string;
}) {
  const [detail, setDetail] = useState(id ?? '');
  const { can } = useCommerceAccess();
  if (detail) return <CreditDetail id={detail} onBack={() => setDetail('')} />;
  if (overview)
    return (
      <AdminPage title="Crédits & chèques">
        <AppText>Suivre les encours, les règlements et les échéances du magasin.</AppText>
        <Panel title="Vos dossiers financiers">
          {can('payments.view') ? (
            <>
              <FinanceRow
                title="Vue d’ensemble des chèques"
                subtitle="Montants entrants, sortants et statuts"
                icon="account-balance"
                onPress={() => go('cheques-dashboard')}
              />
              <FinanceRow
                title="Chèques"
                subtitle="Consulter les chèques clients et fournisseurs"
                onPress={() => go('cheques')}
              />
              <FinanceRow
                title="Échéances des chèques"
                icon="event"
                onPress={() => go('cheques-alerts')}
              />
            </>
          ) : null}
          {can('credits.view') ? (
            <FinanceRow
              title="Crédits clients"
              subtitle="Suivre les crédits et encaissements"
              icon="account-balance-wallet"
              onPress={() => go('credits')}
            />
          ) : null}
        </Panel>
      </AdminPage>
    );
  return <CreditList onOpen={setDetail} />;
}
function CreditList({ onOpen }: { onOpen: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const term = useDebounce(search),
    query = useFinanceList('/credit-payment/report', { search: term }, 'credits.view'),
    summary = query.data?.pages[0]?.summary;
  return (
    <AdminPage title="Crédits clients" scroll={false}>
      <TextField
        label="Rechercher un client"
        value={search}
        onChangeText={setSearch}
        placeholder="Nom, e-mail, téléphone…"
      />
      {summary ? (
        <View style={f.grid}>
          <Metric
            label="Total des crédits clients"
            value={currency(summary.total_credit_amount)}
            tone="green"
          />
          <Metric
            label="Clients avec crédit"
            value={String(summary.total_customers_with_credit ?? 0)}
          />
        </View>
      ) : null}
      <CommerceList
        header={null}
        query={query}
        renderItem={({ item }) => (
          <FinanceRow
            title={String(item.customer_name)}
            subtitle={`${item.number_of_unpaid_sales ?? 0} ventes non soldées`}
            value={currency(item.total_credit)}
            icon="person-outline"
            onPress={() => onOpen(String(item.customer_id))}
          />
        )}
      />
    </AdminPage>
  );
}
function CreditDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { can } = useCommerceAccess(),
    [collect, setCollect] = useState(false),
    [tab, setTab] = useState('Ventes non soldées'),
    [limit, setLimit] = useState(20);
  const query = useFinanceQuery(`/credit-payment/${encodeURIComponent(id)}`, {}, 'credits.view'),
    history = useFinanceQuery(
      `/credit-payment/${encodeURIComponent(id)}/history`,
      {},
      'credits.view',
      tab === 'Historique',
    ),
    data = asRecord(query.data);
  const rows = (Array.isArray(data.credit_details) ? data.credit_details : []).map(record),
    historyRows = history.data ? asRows(history.data) : [];
  if (collect)
    return (
      <CreditPayment
        id={id}
        row={data}
        onBack={() => setCollect(false)}
        onSaved={() => {
          setCollect(false);
          void query.refetch();
          void history.refetch();
        }}
      />
    );
  return (
    <AdminPage
      title="Dossier client crédit"
      onBack={onBack}
      footer={
        can('payments.collect') && Number(data.total_credit) > 0 ? (
          <Button label="Encaisser un règlement" onPress={() => setCollect(true)} />
        ) : undefined
      }
    >
      <QueryState query={query}>
        <Panel title={String(data.customer_name ?? 'Client')}>
          <AppText>Solde en cours</AppText>
          <AppText style={[f.amount, { color: '#b42336' }]}>{currency(data.total_credit)}</AppText>
          <AppText>{String(data.number_of_unpaid_sales ?? 0)} ventes non soldées</AppText>
        </Panel>
        <Tabs
          values={['Ventes non soldées', 'Historique']}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setLimit(20);
          }}
        />
        {tab === 'Historique' ? (
          <QueryState query={history}>
            <Panel title="Historique des règlements">
              {historyRows.slice(0, limit).map((row, i) => (
                <FinanceRow
                  key={String(row.id ?? i)}
                  title={String(row.sale_ref ?? 'Règlement')}
                  subtitle={`${date(row.created_at ?? row.date)} · ${row.payment_method ?? row.payment_type_label ?? row.payment_type_code ?? ''}`}
                  value={currency(row.amount_paid)}
                  icon="receipt-long"
                />
              ))}
              {!historyRows.length ? <AppText>Aucun règlement enregistré.</AppText> : null}
              {historyRows.length > limit ? (
                <Button
                  label="Charger les suivants"
                  variant="tonal"
                  onPress={() => setLimit(limit + 20)}
                />
              ) : null}
            </Panel>
          </QueryState>
        ) : (
          <Panel title="Ventes non soldées">
            {rows.slice(0, limit).map((row) => (
              <View
                key={String(row.sale_id)}
                style={{
                  paddingVertical: 12,
                  gap: 6,
                  borderBottomWidth: 1,
                  borderColor: '#edf0f8',
                }}
              >
                <Pair label={String(row.sale_ref)} value={currency(row.credit ?? row.due)} />
                <AppText variant="bodySm">{date(row.date)}</AppText>
                <Pair label="Total vente" value={currency(row.total_ttc)} />
                <Pair label="Déjà payé" value={currency(row.paid)} />
              </View>
            ))}
            {!rows.length ? <AppText>Aucune vente à régler.</AppText> : null}
            {rows.length > limit ? (
              <Button
                label="Charger les suivantes"
                variant="tonal"
                onPress={() => setLimit(limit + 20)}
              />
            ) : null}
          </Panel>
        )}
      </QueryState>
    </AdminPage>
  );
}
function CreditPayment({
  id,
  row,
  onBack,
  onSaved,
}: {
  id: string;
  row: Row;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(''),
    [method, setMethod] = useState(''),
    [reference, setReference] = useState(''),
    [confirm, setConfirm] = useState(false),
    [done, setDone] = useState(false),
    [dirty, setDirty] = useState(false);
  const types = useFinanceQuery('/types/payments', {}, 'payments.collect'),
    methods = types.data ? asRows(types.data) : [],
    cash = methods.find((m) => String(m.code).toLowerCase() === 'cash'),
    effective = method || String(cash?.code ?? '');
  const value = Number(amount.replace(',', '.')),
    debt = Number(row.total_credit ?? 0),
    valid =
      Number.isFinite(value) &&
      value > 0 &&
      value <= debt &&
      !!effective &&
      !types.isError &&
      !types.isPending;
  const leave = useDirtyBack(dirty && !done, onBack);
  const save = useFinanceAction(
    'payments.collect',
    async () => {
      if (!valid)
        throw new Error('Le montant doit être positif et ne pas dépasser le crédit client.');
      return adminApi.write('post', '/credit-payment/pay', {
        customer_id: Number(id),
        amount: value,
        payment_method: effective,
        reference,
      });
    },
    () => {
      setDone(true);
      setConfirm(false);
    },
  );
  if (done)
    return (
      <AdminPage title="Règlement enregistré" onBack={onSaved}>
        <Panel title={String(row.customer_name)}>
          <AppText style={f.amount}>{currency(value)}</AppText>
          <AppText>Le serveur a imputé ce règlement sur les ventes les plus anciennes.</AppText>
        </Panel>
        <Button label="Retour au dossier client" onPress={onSaved} />
      </AdminPage>
    );
  return (
    <AdminPage
      title="Encaisser un règlement"
      onBack={leave.back}
      footer={
        <Button
          label="Enregistrer le règlement"
          disabled={!valid}
          loading={save.isPending}
          onPress={() => {
            if (valid) setConfirm(true);
          }}
        />
      }
    >
      <Panel title={String(row.customer_name ?? 'Client')}>
        <Pair label="Solde en cours" value={currency(debt)} />
      </Panel>
      <Panel>
        <TextField
          label="Montant du règlement (DH) *"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            setDirty(true);
          }}
        />
        <ReferenceSelect
          label="Mode de règlement *"
          path="/types/payments"
          value={itemId(methods.find((m) => m.code === effective) ?? {})}
          onChange={(_id, item) => {
            setMethod(String(item.code));
            setDirty(true);
          }}
        />
        <TextField
          label="Référence du règlement (facultatif)"
          value={reference}
          onChangeText={(v) => {
            setReference(v);
            setDirty(true);
          }}
        />
        <Pair
          label="Solde après règlement"
          value={currency(Math.max(0, debt - (Number.isFinite(value) ? value : 0)))}
        />
        <Notice>Imputation automatique sur les ventes les plus anciennes, comme sur le web.</Notice>
      </Panel>
      {types.isError ? <Notice>{types.error.message}</Notice> : null}
      {save.isError ? <Notice>{save.error.message}</Notice> : null}
      {leave.dialog}
      <ConfirmDialog
        visible={confirm}
        title="Confirmer l’encaissement ?"
        message={`${currency(value)} pour ${String(row.customer_name)}. Vérifiez le mode de règlement avant de confirmer.`}
        confirmLabel="Encaisser"
        cancelLabel="Retour"
        loading={save.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => save.mutate({})}
      />
    </AdminPage>
  );
}
