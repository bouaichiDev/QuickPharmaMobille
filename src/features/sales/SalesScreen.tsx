import { ResponsiveList } from '@/components/ui/ResponsiveGrid';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LockedFeature } from '@/components/feedback/LockedFeature';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { can, canCreate } from '@/features/crm/modules';
import { itemId, type CrmRecord } from '@/features/crm/crmApi';
import { salesApi } from './salesApi';
import { SaleCheckout, saleModule, type CompletedSale } from './SaleCheckout';
import { SaleDetail } from './SaleDetail';
import { CreditCollection } from './CreditCollection';
import { customerName } from './SalesCustomers';
import {
  PosBadge,
  PosButton,
  PosHeader,
  PosMetric,
  PosPage,
  PosSearch,
  pos,
  s,
} from './SalesDesign';
import {
  paymentLabels,
  paymentState,
  saleDate,
  salePeriodDates,
  type PaymentFilter,
  type SalePeriod,
} from './salesModel';
const periods: Record<SalePeriod, string> = {
  all: 'Toutes les dates',
  month: 'Ce mois',
  week: 'Cette semaine',
  today: 'Aujourd’hui',
};
const SaleCard = memo(function SaleCard({
  sale,
  onPress,
}: {
  sale: CrmRecord;
  onPress: () => void;
}) {
  const state = paymentState(sale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Détail de la vente ${String(sale.ref ?? '')} de ${customerName(sale)}`}
      onPress={onPress}
      style={s.card}
    >
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <View style={s.grow}>
          <AppText variant="headlineSm" numberOfLines={1}>
            {customerName(sale)}
          </AppText>
          <AppText variant="bodySm" color="outline" numberOfLines={1}>
            {String(sale.ref ?? 'Vente')} · {saleDate(sale.date)}
          </AppText>
        </View>
        <PosBadge
          label={paymentLabels[state]}
          tone={state === 'paid' ? 'teal' : state === 'unpaid' ? 'red' : 'blue'}
          icon={
            state === 'paid'
              ? 'check-circle-outline'
              : state === 'partial'
                ? 'timelapse'
                : 'error-outline'
          }
        />
        <Icon name="chevron-right" color="outline" size={18} />
      </View>
      <View style={[s.inset, s.row]}>
        <PosMetric label="Total" value={sale.totalWithTax ?? sale.total} />
        <PosMetric label="Encaissé" value={sale.paid} tone="teal" />
        <PosMetric label="Reste dû" value={sale.due} tone="red" />
      </View>
    </Pressable>
  );
});
export function SalesScreen() {
  const params = useLocalSearchParams<{ action?: string; id?: string }>();
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  return (
    <SalesWorkspace
      key={`${store}-${params.action ?? ''}-${params.id ?? ''}`}
      initialSale={params.id}
      createInitially={params.action === 'create'}
      access={access.data}
    />
  );
}
function SalesWorkspace({
  createInitially,
  access,
  initialSale,
}: {
  createInitially: boolean;
  access: ReturnType<typeof useAccess>['data'];
  initialSale?: string;
}) {
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [settled, setSettled] = useState('');
  const [period, setPeriod] = useState<SalePeriod>('all');
  const [pickingPeriod, setPickingPeriod] = useState(false);
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [creating, setCreating] = useState(createInitially);
  const [selected, setSelected] = useState(initialSale ?? '');
  const [completed, setCompleted] = useState<CompletedSale>();
  const [creditCustomer, setCreditCustomer] = useState<string>();
  const view = can(access, 'sales.view');
  const collect = can(access, 'credits.view') && can(access, 'payments.collect');
  useEffect(() => {
    const timer = setTimeout(() => setSettled(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ['sales', store, settled, period],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      salesApi.list(pageParam, settled, salePeriodDates(period), signal),
    getNextPageParam: (last, pages) =>
      pages.length < last.lastPage ? pages.length + 1 : undefined,
    enabled: view && !creating && !selected && creditCustomer === undefined,
    staleTime: 30000,
  });
  const rows = useMemo(
    () => [
      ...new Map(
        (query.data?.pages.flatMap((page) => page.rows) ?? []).map((row) => [itemId(row), row]),
      ).values(),
    ],
    [query.data],
  );
  const visible = useMemo(
    () => rows.filter((row) => filter === 'all' || paymentState(row) === filter),
    [rows, filter],
  );
  const totals = useMemo(
    () =>
      rows.reduce<{ sold: number; paid: number; due: number }>(
        (total, row) => ({
          sold: total.sold + Number(row.totalWithTax ?? row.total ?? 0),
          paid: total.paid + Number(row.paid ?? 0),
          due: total.due + Number(row.due ?? 0),
        }),
        { sold: 0, paid: 0, due: 0 },
      ),
    [rows],
  );
  function changed() {
    for (const key of ['sales', 'sale', 'products', 'dashboard', 'customer-credit'])
      void qc.invalidateQueries({ queryKey: [key] });
  }
  if (!view && !can(access, 'sales.create'))
    return (
      <Screen>
        <LockedFeature
          title="Ventes"
          reason={access ? 'Accès non autorisé' : 'Vérification des droits…'}
        />
      </Screen>
    );
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        scroll={false}
        header={<PosHeader title="Ventes & encaissements" />}
        contentStyle={{ padding: 0, paddingBottom: 0, gap: 0 }}
      >
        <ResponsiveList
          data={visible}
          keyExtractor={itemId}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.listContent}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={view ? () => void query.refetch() : undefined}
          ListHeaderComponent={
            <View style={s.stack}>
              <View style={s.row}>
                <View style={s.grow}>
                  <PosButton
                    label={periods[period]}
                    icon="calendar-today"
                    secondary
                    compact
                    onPress={() => setPickingPeriod(true)}
                  />
                </View>
                <View style={s.grow}>
                  <PosButton
                    label="Nouvelle vente"
                    icon="add-circle-outline"
                    compact
                    disabled={!canCreate(access, saleModule)}
                    onPress={() => setCreating(true)}
                  />
                </View>
              </View>
              {can(access, 'sales.create') && !canCreate(access, saleModule) ? (
                <AppText variant="bodySm" color="outline">
                  Votre quota de ventes ne permet pas une nouvelle vente.
                </AppText>
              ) : null}
              {view ? (
                <View style={s.card}>
                  <AppText variant="labelSm" color="outline">
                    VENTES CHARGÉES · {rows.length} / {query.data?.pages[0]?.total ?? 0}
                  </AppText>
                  <View style={[s.row, { alignItems: 'stretch', gap: 8 }]}>
                    <View style={{ flex: 1, padding: 8 }}>
                      <PosMetric label="Vendu" value={totals.sold} />
                    </View>
                    <View style={[s.inset, { flex: 1, padding: 8 }]}>
                      <PosMetric label="Encaissé" value={totals.paid} tone="teal" />
                    </View>
                    <View style={[s.inset, { flex: 1, padding: 8, backgroundColor: '#fff1f1' }]}>
                      <PosMetric label="À encaisser" value={totals.due} tone="red" />
                    </View>
                  </View>
                </View>
              ) : null}
              {collect ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Encaisser un crédit client"
                  onPress={() => setCreditCustomer('')}
                  style={[s.inset, s.row]}
                >
                  <View style={s.iconTile}>
                    <Icon name="account-balance-wallet" color="secondary" />
                  </View>
                  <View style={s.grow}>
                    <AppText variant="labelLg" style={{ color: pos.teal }}>
                      Encaisser un crédit client
                    </AppText>
                  </View>
                  <Icon name="chevron-right" color="secondary" />
                </Pressable>
              ) : null}
              {view ? (
                <>
                  <PosSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Rechercher une vente ou un client"
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {(['all', 'paid', 'partial', 'unpaid'] as const).map((value) => (
                      <PosButton
                        key={value}
                        label={value === 'all' ? 'Toutes' : paymentLabels[value]}
                        compact
                        secondary={filter !== value}
                        onPress={() => setFilter(value)}
                      />
                    ))}
                  </ScrollView>
                  {filter !== 'all' ? (
                    <AppText variant="bodySm" color="outline">
                      Filtre sur les ventes chargées. Chargez la suite pour voir davantage de
                      résultats.
                    </AppText>
                  ) : null}
                </>
              ) : null}
              {query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <SaleCard
              sale={item}
              onPress={() => {
                setCompleted(undefined);
                setSelected(itemId(item));
              }}
            />
          )}
          ListEmptyComponent={
            <AppText align="center" color="outline">
              {query.isLoading
                ? 'Chargement des ventes…'
                : view
                  ? 'Aucune vente à afficher.'
                  : 'Créez une vente pour commencer.'}
            </AppText>
          }
          ListFooterComponent={
            query.hasNextPage ? (
              <PosButton
                label="Charger davantage"
                secondary
                loading={query.isFetchingNextPage}
                onPress={() => void query.fetchNextPage()}
              />
            ) : null
          }
        />
      </Screen>
      {pickingPeriod ? (
        <PosPage title="Période des ventes" onClose={() => setPickingPeriod(false)}>
          {(Object.keys(periods) as SalePeriod[]).map((value) => (
            <PosButton
              key={value}
              label={periods[value]}
              secondary={period !== value}
              onPress={() => {
                setPeriod(value);
                setPickingPeriod(false);
              }}
            />
          ))}
        </PosPage>
      ) : null}
      {creating && canCreate(access, saleModule) ? (
        <SaleCheckout
          access={access}
          onClose={() => setCreating(false)}
          onCreated={(sale) => {
            setCreating(false);
            setCompleted(sale);
            setSelected(sale.id);
            changed();
          }}
        />
      ) : null}
      {selected ? (
        <SaleDetail
          key={selected}
          id={selected}
          canView={view}
          completed={completed}
          onClose={() => {
            setSelected('');
            setCompleted(undefined);
          }}
          onNew={
            canCreate(access, saleModule)
              ? () => {
                  setSelected('');
                  setCompleted(undefined);
                  setCreating(true);
                }
              : undefined
          }
          onCollect={collect ? setCreditCustomer : undefined}
        />
      ) : null}
      {creditCustomer !== undefined && collect ? (
        <CreditCollection
          initialCustomer={creditCustomer}
          onClose={() => setCreditCustomer(undefined)}
          onPaid={changed}
        />
      ) : null}
    </>
  );
}
