import { router, type Href } from 'expo-router';
import { useContext } from 'react';
import { colors } from '@/theme';
import { PlatformContext } from './PlatformContext';
import { Pressable, View } from 'react-native';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { Icon } from '@/components/ui/Icon';
import { useAccess } from '@/features/access/useAccess';
import { usePlatformGet } from './hooks';
import {
  AdminScreen,
  Panel,
  Metric,
  Pair,
  Note,
  QueryState,
  Button,
  AppText,
  currency,
  date,
  sa,
} from './AdminUI';
import { platformModules } from './modules';
import { activityLabel } from './activityLabel';
import type { PlatformOverview, DashboardSnapshot, PlatformHealth } from './types';
type Extra = {
  stores_active: number;
  stores_suspended: number;
  registrations: { month: string; count: number }[];
  plans: { id: number; name: string; count: number }[];
  generated_at: string;
};
export function PlatformHome() {
  const preview = useContext(PlatformContext);
  const overview = usePlatformGet<PlatformOverview>('/superadmin/overview');
  const snapshot = usePlatformGet<DashboardSnapshot>('/superadmin/dashboard/snapshot');
  const extra = usePlatformGet<Extra>('/superadmin/mobile/dashboard');
  const access = useAccess();
  const data = overview.data,
    s = snapshot.data,
    e = extra.data;
  const max = Math.max(1, ...(e?.registrations.map((r) => r.count) ?? []));
  const totalPlans = e?.plans.reduce((sum, p) => sum + Number(p.count), 0) ?? 0;
  return (
    <AdminScreen title="Tableau de bord" back={false}>
      <View style={{ gap: 4 }}>
        <AppText variant="bodyMd" style={{ maxWidth: 290 }}>
          Supervision globale de la plateforme SaaS
        </AppText>
        <AppText variant="labelSm" color="secondary">
          Administration globale • Tous les magasins
        </AppText>
      </View>
      <QueryState query={overview} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric
          label="Établissements actifs"
          icon="storefront"
          value={e?.stores_active}
          hint={e ? `${e.registrations.at(-1)?.count ?? 0} créés ce mois` : undefined}
        />
        <Metric label="Suspendus" icon="block" value={e?.stores_suspended} />
        <Metric
          label="Abonnements actifs"
          icon="credit-card"
          value={data?.subscriptions.active}
          hint={`MRR : ${currency(data?.revenue.mrr)}`}
        />
        <Metric
          label="Expiration sous 7 jours"
          icon="timer"
          value={data?.subscriptions.expiring_in_7_days}
        />
      </View>
      <ResponsiveGrid maxColumns={2}>
        <Panel title="Croissance des inscriptions">
          <AppText variant="bodySm" color="outline">
            Nouveaux magasins sur les six derniers mois
          </AppText>
          <QueryState query={extra} />
          {e ? (
            <View style={[sa.row, { alignItems: 'flex-end', height: 140 }]}>
              {e.registrations.map((r, index) => (
                <View key={r.month} style={[sa.grow, { gap: 8, alignItems: 'center' }]}>
                  <AppText variant="labelSm">{r.count}</AppText>
                  <View
                    style={{
                      height: Math.max(2, (r.count / max) * 100),
                      width: '85%',
                      backgroundColor:
                        index === e.registrations.length - 1 ? colors.primary : '#dce9ff',
                      borderTopLeftRadius: 8,
                      borderTopRightRadius: 8,
                    }}
                  />
                  <AppText variant="labelSm">{r.month.slice(5)}</AppText>
                </View>
              ))}
            </View>
          ) : null}
          <AppText variant="labelSm" color="secondary">
            Historique · Mois courant à droite
          </AppText>
        </Panel>
        <Panel title="Répartition par formule">
          {e?.plans.length ? (
            e.plans.map((p) => (
              <View key={p.id} style={{ gap: 8 }}>
                <Pair label={p.name} value={`${p.count} abonnements actifs`} />
                <View style={{ backgroundColor: '#e5eeff', height: 8, borderRadius: 8 }}>
                  <View
                    style={{
                      backgroundColor: '#006a63',
                      height: 8,
                      borderRadius: 8,
                      width: `${totalPlans ? (Number(p.count) / totalPlans) * 100 : 0}%`,
                    }}
                  />
                </View>
              </View>
            ))
          ) : (
            <Note>Aucun abonnement actif ou données indisponibles.</Note>
          )}
        </Panel>
        <Panel title="Revenus des abonnements">
          <Pair label="Mensuel récurrent" value={currency(data?.revenue.mrr)} />
          <Pair label="Annuel récurrent" value={currency(data?.revenue.arr)} />
          <Pair label="Total encaissé" value={currency(data?.revenue.collected_total)} />
          <Pair label="En attente" value={currency(data?.revenue.pending_total)} />
          <Pair label="Factures en attente" value={data?.revenue.pending_count} />
        </Panel>
        <Panel title="Activité du jour">
          <QueryState query={snapshot} />
          <Pair label="Magasins actifs aujourd’hui" value={s?.active_stores_today} />
          <Pair label="Ventes aujourd’hui" value={currency(s?.sales_today.total)} />
          <Pair label="Nouveaux magasins" value={s?.new_today.stores} />
          <Pair label="Nouveaux utilisateurs" value={s?.new_today.users} />
        </Panel>
        <Panel title="Activité récente">
          {s?.recent_activity.slice(0, 10).map((r) => (
            <View key={r.id} style={sa.inset}>
              <AppText variant="labelMd">{activityLabel(r.action)}</AppText>
              <AppText variant="bodySm" color="outline">
                {r.store_name ?? 'Plateforme'} · {r.user_email ?? 'Utilisateur'} ·{' '}
                {date(r.created_at)}
              </AppText>
            </View>
          ))}
          {s && !s.recent_activity.length ? <Note>Aucune activité récente.</Note> : null}
        </Panel>
        <Panel title="Actions rapides">
          <View style={sa.stack}>
            {platformModules
              .filter(
                (m) =>
                  ['tenants', 'billings', 'plans', 'health'].includes(m.key) &&
                  (preview?.permissions ?? access.data?.permissions)?.includes(m.permission),
              )
              .slice(0, 4)
              .map((m) => (
                <Button
                  key={m.key}
                  label={m.title}
                  icon={m.icon}
                  variant="tonal"
                  disabled={!!preview && !['tenants', 'billings'].includes(m.key)}
                  onPress={() =>
                    preview
                      ? preview.navigate?.(`sa-${m.key}`)
                      : router.push(`/superadmin/${m.key}` as Href)
                  }
                />
              ))}
          </View>
        </Panel>
      </ResponsiveGrid>
      <Button
        variant="ghost"
        label="Actualiser les indicateurs"
        disabled={overview.isFetching || snapshot.isFetching || extra.isFetching}
        onPress={() => {
          void overview.refetch();
          void snapshot.refetch();
          void extra.refetch();
        }}
      />
    </AdminScreen>
  );
}
export function PlatformHealthScreen() {
  const query = usePlatformGet<PlatformHealth>('/superadmin/health', { limit: 25 });
  return (
    <AdminScreen title="Santé de la plateforme">
      <Note>
        Actions opérationnelles remontées par le serveur. Cet écran ne mesure pas la disponibilité
        technique des services.
      </Note>
      <QueryState query={query} />
      {query.data ? (
        <ResponsiveGrid maxColumns={2}>
          <Panel title="Factures à valider">
            {query.data.billings_to_validate.map((b) => (
              <View key={b.id} style={sa.inset}>
                <Pair label={b.owner_email ?? 'Compte'} value={currency(b.total)} />
                <Pair label="Échéance" value={date(b.due_date)} />
              </View>
            ))}
            {!query.data.billings_to_validate.length ? (
              <Note>Aucune facture à valider.</Note>
            ) : null}
            <Button
              label="Ouvrir les validations"
              variant="tonal"
              onPress={() => router.push('/superadmin/billings' as Href)}
            />
          </Panel>
          <Panel title="Abonnements à renouveler">
            {query.data.subscriptions_expiring.map((s) => (
              <View key={s.id} style={sa.inset}>
                <AppText variant="labelMd">{s.owner_email ?? 'Compte'}</AppText>
                <Pair label={s.plan_name ?? 'Plan'} value={date(s.end_date)} />
              </View>
            ))}
            {!query.data.subscriptions_expiring.length ? (
              <Note>Aucune échéance proche.</Note>
            ) : null}
          </Panel>
          <Panel title="Sans abonnement">
            {query.data.stores_without_subscription.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push(`/superadmin/tenant?id=${s.id}` as Href)}
                style={sa.inset}
              >
                <View style={sa.row}>
                  <Icon name="storefront" color="primary" />
                  <AppText variant="labelLg" style={sa.grow}>
                    {s.name}
                  </AppText>
                  <Icon name="chevron-right" />
                </View>
                <AppText variant="bodySm">{s.owner_email}</AppText>
              </Pressable>
            ))}
            {!query.data.stores_without_subscription.length ? (
              <Note>Aucun magasin concerné.</Note>
            ) : null}
          </Panel>
        </ResponsiveGrid>
      ) : null}
    </AdminScreen>
  );
}
