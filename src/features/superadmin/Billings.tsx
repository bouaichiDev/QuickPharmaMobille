import { useState, useContext } from 'react';
import { PlatformContext } from './PlatformContext';
import { useMutation } from '@tanstack/react-query';
import { openBillingPdf } from './billingPdf';
import { View } from 'react-native';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Checkbox } from '@/components/ui/Checkbox';
import { usePlatformAction, usePlatformGet, usePlatformList } from './hooks';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Tag,
  Note,
  Choice,
  DateInput,
  QueryState,
  Pager,
  AppText,
  TextField,
  Button,
  currency,
  date,
  sa,
} from './AdminUI';
import type { SuperAdminPlan } from './types';
import type { Row } from './api';
export interface Billing {
  id: number | string;
  active?: number;
  amount: string;
  tax: string;
  total: string;
  transaction_id: string | null;
  billing_date: string;
  due_date: string;
  subscription?: {
    user?: { name?: string; firstName?: string; lastName?: string; email: string };
    plan?: { name: string };
  };
  status?: { code: string; designation?: string; label?: string };
  payment_method?: { designation?: string; label?: string };
}
function billingStatus(code?: string) {
  const labels: Record<string, string> = {
    paid: 'Payée',
    unpaid: 'En attente',
    cancelled: 'Annulée',
    echec: 'Échec',
  };
  return labels[code ?? ''];
}
export function Billings() {
  const preview = useContext(PlatformContext);
  const [page, setPage] = useState(1),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [status, setStatus] = useState(''),
    [plan, setPlan] = useState(''),
    [selected, setSelected] = useState<Billing>(),
    [filtersOpen, setFiltersOpen] = useState(false),
    [transaction, setTransaction] = useState(''),
    [received, setReceived] = useState(false),
    [confirm, setConfirm] = useState<'validate' | 'delete' | 'restore' | null>(null);
  const valid = !from || !to || from <= to;
  const query = usePlatformList<Billing>(
    '/subscription-billings',
    { page, from_date: from, to_date: to, status_id: status, plan_id: plan },
    valid,
  );
  const statuses = usePlatformGet<Row[]>('/statusliste/subscription_billings');
  const plans = usePlatformGet<SuperAdminPlan[]>('/superadmin/plans');
  const action = usePlatformAction(() => {
    setConfirm(null);
    setSelected(undefined);
    setTransaction('');
    setReceived(false);
  });
  const pdf = useMutation({
    mutationFn: (id: number | string) => openBillingPdf(id),
    retry: false,
  });
  async function submit() {
    if (!selected || !confirm) return;
    try {
      await action.run({
        path: `/subscription-billings/${selected.id}${confirm === 'delete' ? '' : `/${confirm}`}`,
        method: confirm === 'delete' ? 'delete' : 'post',
        body:
          confirm === 'validate' ? { transaction_id: transaction.trim() || undefined } : undefined,
      });
    } catch {
      /* Keep the invoice and confirmation for review. */
    }
  }
  if (selected) {
    const user = selected.subscription?.user,
      name =
        user?.name ||
        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
        user?.email ||
        'Compte propriétaire';
    return (
      <AdminScreen title="Facturation & règlements">
        <Button
          label="Retour aux factures"
          variant="ghost"
          icon="arrow-back"
          disabled={action.isPending}
          onPress={() => {
            setSelected(undefined);
            setReceived(false);
            setTransaction('');
            action.reset();
          }}
        />
        <Panel title={name} icon="receipt-long">
          <AppText color="outline">{user?.email}</AppText>
          <Tag
            label={
              Number(selected.active) === -1
                ? 'En corbeille'
                : billingStatus(selected.status?.code) ||
                  selected.status?.label ||
                  selected.status?.designation ||
                  'Statut inconnu'
            }
          />
          <Pair label="Formule" value={selected.subscription?.plan?.name} />
          <Pair label="Facture" value={`#${selected.id}`} />
          <Pair label="Date" value={date(selected.billing_date)} />
          <Pair label="Échéance" value={date(selected.due_date)} />
          <View style={sa.inset}>
            <Pair label="Montant HT" value={currency(selected.amount)} />
            <Pair label="Taxe" value={currency(selected.tax)} />
            <Pair label="Total TTC" value={currency(selected.total)} />
          </View>
          <Pair
            label="Mode de paiement"
            value={selected.payment_method?.label || selected.payment_method?.designation}
          />
          <Pair label="Transaction actuelle" value={selected.transaction_id} />
        </Panel>
        <Panel title="Actions administratives">
          <Button
            label="PDF de la facture"
            disabled={!!preview}
            icon="picture-as-pdf"
            loading={pdf.isPending}
            onPress={() => pdf.mutate(selected.id)}
          />
          {pdf.isError ? <Note>{pdf.error.message}</Note> : null}
          {Number(selected.active) !== -1 && selected.status?.code !== 'paid' ? (
            <>
              <TextField
                label="Identifiant de transaction (facultatif)"
                value={transaction}
                onChangeText={setTransaction}
                editable={!action.isPending}
              />
              <Checkbox
                checked={received}
                onChange={setReceived}
                label="Je confirme la réception effective des fonds."
              />
              <Button
                label="Valider et marquer la facture payée"
                icon="verified"
                disabled={!received || action.isPending}
                onPress={() => setConfirm('validate')}
              />
              <Note>
                La validation peut activer ou prolonger l’abonnement. Vérifiez le paiement avant de
                confirmer.
              </Note>
            </>
          ) : null}
          {Number(selected.active) === -1 ? (
            <Button
              label="Restaurer la facture"
              variant="tonal"
              disabled={action.isPending}
              onPress={() => setConfirm('restore')}
            />
          ) : (
            <Button
              label="Supprimer la facture"
              variant="dangerSoft"
              disabled={action.isPending}
              onPress={() => setConfirm('delete')}
            />
          )}
          <Note>La suppression et la restauration sont distinctes d’un refus de paiement.</Note>
        </Panel>
        {action.isError ? <Note>{action.error.message}</Note> : null}
        <ConfirmDialog
          visible={!!confirm}
          title={
            confirm === 'validate'
              ? 'Confirmer le paiement reçu'
              : confirm === 'delete'
                ? 'Mettre en corbeille'
                : 'Restaurer la facture'
          }
          message={`${name} · ${selected.subscription?.plan?.name ?? ''} · ${currency(selected.total)}${confirm === 'validate' && transaction ? ` · ${transaction}` : ''}${action.error ? `\n${action.error.message}` : ''}`}
          confirmLabel="Confirmer"
          cancelLabel="Annuler"
          loading={action.isPending}
          destructive={confirm === 'delete'}
          onConfirm={() => void submit()}
          onCancel={() => {
            if (!action.isPending) setConfirm(null);
          }}
        />
      </AdminScreen>
    );
  }
  return (
    <AdminScreen title="Validation des factures" scroll={false}>
      <AdminList
        data={query.data?.data ?? []}
        header={
          <>
            <View style={sa.row}>
              <AppText variant="bodySm" style={sa.grow}>
                {query.data?.total ?? '—'} factures
              </AppText>
              <Button
                label={filtersOpen ? 'Masquer les filtres' : 'Filtres'}
                icon="tune"
                variant="tonal"
                fullWidth={false}
                compact
                onPress={() => setFiltersOpen(!filtersOpen)}
              />
            </View>
            {filtersOpen ? (
              <Panel>
                <DateInput
                  label="Du"
                  value={from}
                  onChange={(v) => {
                    setFrom(v);
                    setPage(1);
                  }}
                />
                <DateInput
                  label="Au"
                  value={to}
                  onChange={(v) => {
                    setTo(v);
                    setPage(1);
                  }}
                />
                <Choice
                  label="Statut"
                  value={status}
                  options={[
                    ['', 'Tous'],
                    ...(statuses.data ?? []).map(
                      (s) =>
                        [
                          String(s.value),
                          billingStatus(String(s.code ?? s.title)) || String(s.title ?? s.code),
                        ] as [string, string],
                    ),
                  ]}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                />
                <Choice
                  label="Plan"
                  value={plan}
                  options={[
                    ['', 'Tous'],
                    ...(plans.data ?? []).map((s) => [String(s.id), s.name] as [string, string]),
                  ]}
                  onChange={(v) => {
                    setPlan(v);
                    setPage(1);
                  }}
                />
                <Button
                  label="Réinitialiser"
                  variant="ghost"
                  onPress={() => {
                    setStatus('');
                    setPlan('');
                    setFrom('');
                    setTo('');
                    setPage(1);
                  }}
                />
              </Panel>
            ) : null}
            {!valid ? (
              <Note>La date de fin doit suivre la date de début.</Note>
            ) : (
              <QueryState query={query} />
            )}
            <QueryState query={statuses} />
            <QueryState query={plans} />
          </>
        }
        renderItem={({ item }) => {
          const user = item.subscription?.user;
          return (
            <Panel>
              <AppText variant="headlineSm">
                {user?.name ||
                  [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                  user?.email ||
                  'Compte propriétaire'}
              </AppText>
              <AppText variant="bodySm" color="outline">
                {item.subscription?.plan?.name ?? 'Abonnement'} · {date(item.billing_date)}
              </AppText>
              <Tag
                label={
                  Number(item.active) === -1
                    ? 'En corbeille'
                    : billingStatus(item.status?.code) ||
                      item.status?.label ||
                      item.status?.designation ||
                      'Inconnu'
                }
              />
              <Pair label="Total TTC" value={currency(item.total)} />
              <Button
                label="Consulter la facture"
                variant="tonal"
                onPress={() => {
                  setSelected(item);
                  setTransaction(item.transaction_id ?? '');
                }}
              />
            </Panel>
          );
        }}
        footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
        empty={query.data ? <Note>Aucune facture pour ces filtres.</Note> : null}
      />
    </AdminScreen>
  );
}
