import { memo, useContext, useState } from 'react';
import { SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { PlatformContext } from './PlatformContext';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { useDebounce, STabs } from '@/features/catalogue/StockDesign';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { Icon } from '@/components/ui/Icon';
import { usePlatformGet, usePlatformList, usePlatformPermission } from './hooks';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Tag,
  Note,
  Choice,
  QueryState,
  Pager,
  AppText,
  Button,
  currency,
  date,
  sa,
} from './AdminUI';
import type { TenantRow, TenantDetail as Detail, SuperAdminPlan, TenantStats } from './types';
import { TenantStatistics, TenantLog } from './TenantActivity';
import { TenantActions } from './TenantActions';

export const TenantCard = memo(function TenantCard({
  tenant,
  onPress,
}: {
  tenant: TenantRow;
  onPress: () => void;
}) {
  const crm = tenant.activity.crm;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Fiche ${tenant.name}`}
      onPress={onPress}
      style={[
        sa.card,
        { borderTopWidth: 3, borderTopColor: tenant.state.suspended ? '#ba1a1a' : '#006a63' },
      ]}
    >
      <View style={sa.row}>
        <Icon name="storefront" color="primary" />
        <View style={sa.grow}>
          <AppText variant="headlineSm" numberOfLines={2}>
            {tenant.name}
          </AppText>
          <AppText variant="bodySm" color="outline">
            {tenant.owner?.name ?? 'Sans propriétaire'}
          </AppText>
          <AppText variant="bodySm" color="outline" numberOfLines={1}>
            {tenant.owner?.email ?? '—'}
          </AppText>
        </View>
        <Icon name="chevron-right" color="primary" />
      </View>
      <Tag
        label={tenant.state.suspended ? 'Suspendu' : 'En service'}
        danger={tenant.state.suspended}
      />
      <View style={sa.inset}>
        <Pair label="Abonnement" value={tenant.subscription?.plan_name ?? 'Sans abonnement'} />
        <Pair
          label="Expiration"
          value={
            tenant.subscription
              ? `${date(tenant.subscription.end_date)} · ${tenant.subscription.days_left} j`
              : '—'
          }
        />
        <Pair label="Créé le" value={date(tenant.created_at)} />
      </View>
      <View style={sa.inset}>
        <AppText variant="labelSm">QUOTAS DU COMPTE</AppText>
        <Pair
          label="Utilisateurs"
          value={`${tenant.usage.users} / ${tenant.usage.users_limit ?? '—'}`}
        />
        <Pair
          label="Magasins"
          value={`${tenant.usage.stores} / ${tenant.usage.stores_limit ?? '—'}`}
        />
        {tenant.usage.users_exceeded || tenant.usage.stores_exceeded ? (
          <Tag label="Limite dépassée" danger />
        ) : null}
      </View>
      <View style={sa.row}>
        <View style={[sa.inset, sa.grow]}>
          <AppText variant="labelSm" color="primary">
            Ventes cumulées
          </AppText>
          <AppText variant="headlineSm" color="primary">
            {currency(tenant.activity.sales_total)}
          </AppText>
          <AppText variant="bodySm">{tenant.activity.sales_count} ventes</AppText>
        </View>
        <View style={[sa.inset, sa.grow]}>
          <AppText variant="labelSm" color="secondary">
            Services CRM
          </AppText>
          <AppText variant="headlineSm">{currency(crm?.total)}</AppText>
          <AppText variant="bodySm">
            {crm?.sessions ?? '—'} séances · {crm?.packages ?? '—'} forfaits
          </AppText>
          <AppText variant="bodySm">{crm?.appointments ?? '—'} RDV</AppText>
        </View>
      </View>
    </Pressable>
  );
});

export function Tenants({ onSelect }: { onSelect?: (id: number) => void } = {}) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [state, setState] = useState(''),
    [plan, setPlan] = useState(''),
    [size, setSize] = useState('25'),
    [page, setPage] = useState(1),
    [filters, setFilters] = useState(false),
    [selected, setSelected] = useState<number>();
  const term = useDebounce(search),
    width = useWindowDimensions().width;
  const query = usePlatformList<TenantRow>('/superadmin/tenants', {
    search: term,
    status,
    state,
    plan_id: plan,
    per_page: Number(size),
    page,
  });
  const canMetrics = usePlatformPermission('platform.metrics.view'),
    canManagePlans = usePlatformPermission('platform.plans.manage');
  const canPlans = canMetrics || canManagePlans;
  const plans = usePlatformGet<SuperAdminPlan[]>('/superadmin/plans', {}, canPlans && filters);
  const open = (id: number) =>
    onSelect
      ? onSelect(id)
      : width >= 1100
        ? setSelected(id)
        : router.push(`/superadmin/tenant?id=${id}` as Href);
  return (
    <AdminScreen title="Magasins" scroll={false}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: selected && width >= 1100 ? 0.43 : 1 }}>
          <AdminList
            data={query.data?.data ?? []}
            renderItem={({ item }) => (
              <TenantCard tenant={item} onPress={() => open(item.store_id)} />
            )}
            header={
              <>
                <AppText variant="bodySm">
                  {query.data?.total ?? '—'} magasins correspondant aux filtres
                </AppText>
                <SearchFilterRow
                  label="Rechercher un établissement"
                  placeholder="Nom, e-mail ou propriétaire"
                  value={search}
                  onChangeText={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  filterLabel={filters ? 'Masquer les filtres' : 'Filtres'}
                  onFilterPress={() => setFilters(!filters)}
                />
                {filters ? (
                  <Panel>
                    <Choice
                      label="Abonnement"
                      value={status}
                      options={[
                        ['', 'Tous'],
                        ['active', 'Actif'],
                        ['expiring', 'Expiration sous 7 jours'],
                        ['none', 'Sans abonnement actif'],
                      ]}
                      onChange={(v) => {
                        setStatus(v);
                        setPage(1);
                      }}
                    />
                    <Choice
                      label="État"
                      value={state}
                      options={[
                        ['', 'Tous'],
                        ['active', 'En service'],
                        ['suspended', 'Suspendu'],
                      ]}
                      onChange={(v) => {
                        setState(v);
                        setPage(1);
                      }}
                    />
                    {canPlans ? (
                      <>
                        <QueryState query={plans} />
                        <Choice
                          label="Plan"
                          value={plan}
                          options={[
                            ['', 'Tous'],
                            ...(plans.data ?? []).map(
                              (p) => [String(p.id), p.name] as [string, string],
                            ),
                          ]}
                          onChange={(v) => {
                            setPlan(v);
                            setPage(1);
                          }}
                        />
                      </>
                    ) : null}
                    <Choice
                      label="Par page"
                      value={size}
                      options={['10', '25', '50'].map((s) => [s, s])}
                      onChange={(v) => {
                        setSize(v);
                        setPage(1);
                      }}
                    />
                    <Button
                      variant="ghost"
                      label="Réinitialiser les filtres"
                      onPress={() => {
                        setSearch('');
                        setStatus('');
                        setState('');
                        setPlan('');
                        setPage(1);
                      }}
                    />
                  </Panel>
                ) : null}
                <QueryState query={query} />
              </>
            }
            footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
            empty={
              !query.isPending && !query.isError ? (
                <Note>Aucun établissement pour ces filtres.</Note>
              ) : null
            }
          />
        </View>
        {selected && width >= 1100 ? (
          <View style={{ flex: 0.57, borderLeftWidth: 1, borderColor: '#dce9ff' }}>
            <TenantDetail key={selected} id={selected} embedded />
          </View>
        ) : null}
      </View>
    </AdminScreen>
  );
}

function Flow({ title, data }: { title: string; data: TenantStats['sales'] }) {
  return (
    <Panel title={title}>
      <Pair label="Nombre" value={data.count} />
      <Pair label="Montant total" value={currency(data.total)} />
      <Pair label="Payé" value={currency(data.paid)} />
      <Pair label="Reste dû" value={currency(data.due)} />
      <Pair label="30 derniers jours" value={currency(data.last_30_days.total)} />
      <Pair label="Mois en cours" value={currency(data.this_month.total)} />
    </Panel>
  );
}
function Overview({ id }: { id: number }) {
  const stats = usePlatformGet<TenantStats>(`/superadmin/tenants/${id}/stats`);
  const s = stats.data;
  return (
    <>
      <QueryState query={stats} />
      {s ? (
        <ResponsiveGrid maxColumns={2}>
          <Flow title="Ventes" data={s.sales} />
          <Flow title="Achats / entrées" data={s.purchases} />
          <Flow title="Commandes" data={s.orders} />
          <Panel title="Module soins & CRM" icon="medical-services">
            <Pair label="Chiffre CRM" value={currency(s.crm?.total)} />
            <Pair label="Paiements" value={currency(s.crm?.paid)} />
            <Pair label="Reste dû" value={currency(s.crm?.due)} />
            <Pair
              label="Séances / forfaits / RDV"
              value={`${s.crm?.sessions ?? '—'} / ${s.crm?.packages ?? '—'} / ${s.crm?.appointments ?? '—'}`}
            />
            <Pair label="Services" value={s.crm?.services} />
            <Pair label="Dernière séance" value={date(s.crm?.last_session_at)} />
            <Note>Les forfaits et leurs séances incluses ne sont pas comptabilisés deux fois.</Note>
          </Panel>
          <Panel title="Catalogue & stock réel" icon="inventory-2">
            {[
              ['Produits', s.catalogue.products],
              ['Ruptures', s.catalogue.out_of_stock],
              ['Stock faible', s.catalogue.low_stock],
              ['Valeur d’achat', currency(s.catalogue.stock_value_buying)],
              ['Valeur de vente', currency(s.catalogue.stock_value_selling)],
              ['Catégories', s.catalogue.categories],
              ['Fournisseurs', s.catalogue.providers],
            ].map(([k, v]) => (
              <Pair key={k} label={String(k)} value={v} />
            ))}
          </Panel>
          <Panel title="Inventaire" icon="fact-check">
            <Pair label="Lots / unités" value={s.inventory.items_total} />
            {Object.entries(s.inventory.by_status).map(([k, v]) => (
              <Pair key={k} label={k} value={v} />
            ))}
            <Pair label="Périmés" value={s.inventory.expired} />
            <Pair label="Expiration sous 30 jours" value={s.inventory.expiring_in_30_days} />
            <Pair label="Emplacements" value={s.inventory.locations} />
          </Panel>
          <Panel title="Facturation, clients & équipe">
            <Pair label="Factures" value={s.invoicing.count} />
            <Pair label="Total TTC" value={currency(s.invoicing.total_ttc)} />
            <Pair label="Clôturées" value={s.invoicing.closed} />
            <Pair label="Clients / actifs" value={`${s.customers.total} / ${s.customers.active}`} />
            <Pair label="Paiements reçus" value={currency(s.payments.received_total)} />
            <Pair label="Nombre de paiements" value={s.payments.count} />
            <Pair label="Équipe" value={s.team.users} />
          </Panel>
        </ResponsiveGrid>
      ) : null}
    </>
  );
}
export function TenantDetail({ id, embedded = false }: { id: number; embedded?: boolean }) {
  const preview = useContext(PlatformContext);
  const query = usePlatformGet<Detail>(`/superadmin/tenants/${id}`),
    [tab, setTab] = useState('overview');
  const [userLimit, setUserLimit] = useState(20);
  const t = query.data;
  const content = (
    <>
      <QueryState query={query} />
      {t ? (
        <>
          <Panel title={t.name} icon="storefront">
            <Tag label={t.state.suspended ? 'Suspendu' : 'En service'} danger={t.state.suspended} />
            <AppText variant="labelMd">{t.owner?.name ?? 'Sans propriétaire'}</AppText>
            <AppText variant="bodySm" color="outline">
              {t.owner?.email ?? '—'}
              {t.phone ? ` · ${t.phone}` : ''}
            </AppText>
            {t.address ? <AppText variant="bodySm">{t.address}</AppText> : null}
            <Pair
              label="Abonnement"
              value={
                t.subscription
                  ? `${t.subscription.plan_name} · ${date(t.subscription.end_date)}`
                  : 'Sans abonnement actif'
              }
            />
          </Panel>
          <STabs
            value={tab}
            onChange={setTab}
            values={[
              ['overview', 'Vue d’ensemble'],
              ['statistics', 'Statistiques'],
              ['logs', 'Journal d’activité'],
              ['users', 'Utilisateurs'],
              ['billings', 'Factures'],
              ['actions', 'Gérer'],
            ]}
          />
          {tab === 'overview' ? <Overview id={id} /> : null}
          {tab === 'statistics' ? <TenantStatistics id={id} /> : null}
          {tab === 'logs' ? <TenantLog id={id} users={t.activity_users ?? t.users} /> : null}
          {tab === 'users' ? (
            <Panel title="Équipe du magasin">
              {t.users.slice(0, userLimit).map((u) => (
                <View key={u.id} style={sa.inset}>
                  <AppText variant="labelLg">
                    {[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}
                  </AppText>
                  <AppText variant="bodySm">{u.email}</AppText>
                  <Pair label="Rôle" value={u.role_code} />
                  <Tag label={u.active ? 'Actif' : 'Inactif'} />
                </View>
              ))}
              {t.users.length > userLimit ? (
                <Button
                  label="Afficher davantage d’utilisateurs"
                  variant="tonal"
                  onPress={() => setUserLimit((n) => n + 20)}
                />
              ) : null}
            </Panel>
          ) : null}
          {tab === 'billings' ? (
            <Panel title="Factures d’abonnement">
              {t.billings.length ? (
                t.billings.map((b) => (
                  <View key={b.id} style={sa.inset}>
                    <Pair label={b.plan_name ?? 'Abonnement'} value={currency(b.total)} />
                    <Pair
                      label="Date / échéance"
                      value={`${date(b.billing_date)} / ${date(b.due_date)}`}
                    />
                    <Tag label={b.status_code} />
                  </View>
                ))
              ) : (
                <Note>Aucune facture.</Note>
              )}
            </Panel>
          ) : null}
          {tab === 'actions' ? (
            preview ? (
              <Note>La gestion du magasin est disponible dans l’application connectée.</Note>
            ) : (
              <TenantActions tenant={t} />
            )
          ) : null}
        </>
      ) : null}
    </>
  );
  return embedded ? (
    <AdminScreen title="Fiche magasin 360°">{content}</AdminScreen>
  ) : (
    <AdminScreen title="Fiche établissement">{content}</AdminScreen>
  );
}
