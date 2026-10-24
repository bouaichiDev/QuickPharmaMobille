import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { AccessGate, ErrorState, SkeletonCards, Pair } from '@/features/commerce/CommerceUI';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { record, itemId } from '@/features/crm/crmApi';
import { currency, date } from '@/features/superadmin/AdminUI';
import { billingService } from '@/services/billing/billingService';
import { useAdminQuery, useAdminAction, asRows, adminApi } from './api';
import { useAdminList } from './useAdminList';
import {
  AdminPage,
  Panel,
  AppText,
  Button,
  Notice,
  ReadOnly,
  useCommerceAccess,
  design,
} from './AdminDesign';
export default function AdminSubscriptionsScreen() {
  const { access, can } = useCommerceAccess();
  const query = useAdminQuery('/subscriptions/my', {}, 'subscription.view');
  const [selected, setSelected] = useState(''),
    [confirm, setConfirm] = useState(false),
    [docError, setDocError] = useState(''),
    [docBusy, setDocBusy] = useState(false);
  const rows = query.data ? asRows(query.data) : [];
  const current =
    rows.find((row) => itemId(row) === selected) ||
    rows.find((row) => String(row.id) === String(access.data?.subscription?.id)) ||
    rows[0];
  const plan = record(current?.plan),
    status = record(current?.status);
  const history = useAdminList(
    '/subscription-billings',
    current?.id ? { subscription_id: current.id } : {},
    'subscription.view',
    !!current?.id,
  );
  const cancel = useAdminAction(
    'subscription.manage',
    () => adminApi.write('post', `/subscriptions/${itemId(current!)}/cancel`),
    () => setConfirm(false),
  );
  async function pdf(id: string) {
    if (docBusy) return;
    setDocBusy(true);
    setDocError('');
    try {
      const { openAdminPdf } = await import('./documents');
      await openAdminPdf(`/subscription-billings/${id}/pdf`, `abonnement-${id}`);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'PDF indisponible.');
    } finally {
      setDocBusy(false);
    }
  }
  const quotas = Object.values(access.data?.quotas ?? {});
  return (
    <AdminPage title="Abonnements">
      <AccessGate permission="subscription.view">
        <ReadOnly />
        {query.isPending ? (
          <SkeletonCards count={2} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <Panel title="Mon abonnement">
              <View style={design.row}>
                <AppText variant="headlineSm" style={design.grow}>
                  {String(
                    plan.name ?? access.data?.subscription?.plan_name ?? 'Aucun abonnement actif',
                  )}
                </AppText>
                <AppText color="secondary">
                  {String(status.designation ?? status.label ?? status.code ?? '')}
                </AppText>
              </View>
              {current ? (
                <>
                  <Pair
                    label="Prix du plan"
                    value={plan.price == null ? null : currency(plan.price)}
                  />
                  <Pair label="Date de début" value={date(current.start_date)} />
                  <Pair label="Date de fin" value={date(current.end_date)} />
                  <Pair
                    label="Renouvellement automatique"
                    value={current.autorenew ? 'Activé' : 'Désactivé'}
                  />
                </>
              ) : null}
            </Panel>
            <Panel title="Quotas inclus">
              {quotas.map((quota) => (
                <View key={quota.key} style={design.row}>
                  <AppText style={design.grow}>
                    {quota.key === 'users.total'
                      ? 'Utilisateurs'
                      : quota.key === 'stores.total'
                        ? 'Magasins'
                        : quota.key}
                  </AppText>
                  <AppText>
                    {!quota.configured
                      ? 'Non configuré'
                      : quota.unlimited || quota.limit === null
                        ? 'Illimité'
                        : `${quota.used ?? '—'} / ${quota.limit}`}
                  </AppText>
                </View>
              ))}
            </Panel>
            {current ? (
              <>
                <Panel title="Fonctionnalités incluses">
                  {Array.isArray(plan.features) ? (
                    plan.features.map((feature, index) => (
                      <AppText key={index}>
                        {typeof feature === 'string'
                          ? feature
                          : String(record(feature).label ?? record(feature).key ?? '')}
                      </AppText>
                    ))
                  ) : (
                    <AppText>{String(plan.description ?? 'Consultez le détail du plan.')}</AppText>
                  )}
                </Panel>
                <AppText variant="headlineSm">Historique de facturation</AppText>
                {history.isPending ? (
                  <AppText>Chargement…</AppText>
                ) : history.isError ? (
                  <ErrorState error={history.error} onRetry={() => void history.refetch()} />
                ) : (
                  <View style={design.stack}>
                    {history.data?.pages
                      .flatMap((page) => page.rows)
                      .map((item) => (
                        <Panel key={itemId(item)}>
                          <Pair
                            label={String(item.ref ?? `Facture ${item.id}`)}
                            value={currency(item.total ?? item.amount)}
                          />
                          <AppText>
                            {date(item.billing_date)} •{' '}
                            {String(record(item.status).label ?? record(item.status).code ?? '')}
                          </AppText>
                          <Button
                            label="PDF"
                            compact
                            variant="tonal"
                            disabled={docBusy}
                            onPress={() => void pdf(itemId(item))}
                          />
                        </Panel>
                      ))}
                    {!history.data?.pages[0]?.rows.length ? (
                      <Notice>Aucune facture d’abonnement.</Notice>
                    ) : null}
                    {history.hasNextPage ? (
                      <Button
                        label="Charger les suivantes"
                        variant="tonal"
                        loading={history.isFetchingNextPage}
                        onPress={() => void history.fetchNextPage()}
                      />
                    ) : null}
                  </View>
                )}
              </>
            ) : (
              <Notice>Aucun historique d’abonnement disponible pour cet utilisateur.</Notice>
            )}
            {can('subscription.manage') ? (
              <>
                <Button
                  label="Choisir ou renouveler un abonnement"
                  icon="workspace-premium"
                  onPress={() => router.push('/plans')}
                />
                <Button
                  label="Gérer dans Google Play"
                  variant="tonal"
                  onPress={() => {
                    void billingService
                      .openManageSubscriptions()
                      .catch((e) =>
                        setDocError(e instanceof Error ? e.message : 'Gestion indisponible.'),
                      );
                  }}
                />
                {current && String(status.code) !== 'cancelled' ? (
                  <Button
                    label="Annuler l’abonnement"
                    variant="dangerSoft"
                    onPress={() => setConfirm(true)}
                  />
                ) : null}
              </>
            ) : null}
            {rows.length > 1 ? (
              <Panel title="Autres abonnements">
                {rows.map((row) => (
                  <Button
                    key={itemId(row)}
                    label={`${record(row.plan).name ?? 'Abonnement'} • ${date(row.end_date)}`}
                    variant="ghost"
                    onPress={() => setSelected(itemId(row))}
                  />
                ))}
              </Panel>
            ) : null}
          </>
        )}
        {docError ? <Notice>{docError}</Notice> : null}
        {cancel.isError ? (
          <Notice>{cancel.error.message}</Notice>
        ) : cancel.isSuccess ? (
          <Notice>Demande d’annulation enregistrée.</Notice>
        ) : null}
        <ConfirmDialog
          visible={confirm}
          title="Annuler cet abonnement ?"
          message="Vérifiez les conséquences sur votre accès. Un abonnement géré par Google Play doit être modifié dans Google Play."
          confirmLabel="Confirmer"
          cancelLabel="Retour"
          destructive
          loading={cancel.isPending}
          onConfirm={() => {
            setConfirm(false);
            cancel.mutate({});
          }}
          onCancel={() => setConfirm(false)}
        />
      </AccessGate>
    </AdminPage>
  );
}
