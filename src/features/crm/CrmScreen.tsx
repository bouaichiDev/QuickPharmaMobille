import { canConvertAppointment, linkedAppointmentSession } from './appointmentSession';
import { CrmReports } from './components/CrmReports';
import { CrmDetailContent } from './components/CrmDetailContent';
import { useEffect, useRef, useState } from 'react';
import { Stack, router, type Href, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, useLatinFonts } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LockedFeature } from '@/components/feedback/LockedFeature';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { CrmDashboard } from '@/features/dashboard/components/CrmDashboard';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, fontFamilies, fontForScript, radii, spacing } from '@/theme';
import { formatAmount, formatDateTime, formatNumber } from '@/utils/format';
import { useCurrency } from '@/features/settings/settingsApi';
import { errorMessage } from '@/utils/errorMessage';
import { can, canCreate, crmModules } from './modules';
import { crmApi, itemId, itemName, listPayload, record, unwrap, type CrmRecord } from './crmApi';
import { apiGet } from '@/services/api/client';
import { CrmForm } from './CrmForm';
import { ReferencePicker } from './ReferencePicker';
import { CrmFilter as Chip, CrmShellHeader, CrmListHeading } from './components/StitchChrome';
import { useCurrentStore } from '@/features/stores/useCurrentStore';
import { StoreSwitcherSheet } from '@/features/stores/components/StoreSwitcherSheet';
import { ClientDossier } from './components/ClientDossier';
import { CrmCalendar } from './components/CrmCalendar';
import { CrmPage } from './components/CrmDesign';
import { CrmScanner } from './components/CrmScanner';
import { CrmRecordCard } from './components/CrmRecordCard';

// Deliberate field labels keep internal IDs and API metadata out of the client view.
const labels: Record<string, string> = {
  name: 'Nom',
  FirstName: 'Prénom',
  LastName: 'Nom',
  Email: 'E-mail',
  Phone: 'Téléphone',
  date_of_birth: 'Date de naissance',
  medical_conditions: 'Antécédents médicaux',
  description: 'Description',
  default_price: 'Prix',
  price: 'Prix',
  duration_minutes: 'Durée (minutes)',
  recommended_sessions: 'Séances recommandées',
  sessions_count: 'Séances',
  sessions_total: 'Séances incluses',
  sessions_used: 'Séances utilisées',
  remaining_sessions: 'Séances restantes',
  price_paid: 'Prix de vente',
  amount_paid: 'Montant payé',
  due: 'Reste à payer',
  discount: 'Remise',
  session_date: 'Date',
  starts_at: 'Début',
  ends_at: 'Fin',
  observation: 'Observations',
  notes: 'Notes',
  treatment_zones: 'Zones traitées',
  expiration_date: 'Expiration',
  ref: 'Référence',
  payingAmount: 'Montant',
  receivedAmount: 'Montant reçu',
  date: 'Date',
  details: 'Activité',
  created_at: 'Créé le',
  revenue: 'Chiffre d’affaires',
  appointments: 'Rendez-vous',
  total: 'Total',
  new_clients: 'Nouveaux clients',
  total_clients: 'Clients',
  total_spent: 'Total dépensé',
  sessions: 'Séances',
  packages: 'Forfaits',
  total_revenue: 'Recettes',
  outstanding_balance: 'Reste à payer',
  pending_count: 'Règlements attendus',
};
function DisplayFields({ data }: { data: CrmRecord }) {
  const { tDynamic, locale } = useTranslation();
  const currency = useCurrency();
  return (
    <View style={styles.fields}>
      {Object.entries(data)
        .filter(
          ([key, value]) =>
            labels[key] && value !== null && value !== undefined && typeof value !== 'object',
        )
        .map(([key, value]) => (
          <View
            key={key}
            style={[
              styles.field,
              ['description', 'observation', 'notes', 'details'].includes(key) && styles.fullField,
            ]}
          >
            <AppText variant="bodySm" color="onSurfaceVariant">
              {tDynamic(`mobile.crm.fields.${key}`, labels[key] ?? key)}
            </AppText>
            <AppText variant="labelMd">
              {[
                'price',
                'default_price',
                'price_paid',
                'amount_paid',
                'due',
                'discount',
                'payingAmount',
                'receivedAmount',
                'revenue',
                'total_spent',
                'total_revenue',
                'outstanding_balance',
              ].includes(key)
                ? formatAmount(value, currency, locale)
                : [
                      'session_date',
                      'starts_at',
                      'ends_at',
                      'date',
                      'created_at',
                      'expiration_date',
                      'date_of_birth',
                    ].includes(key)
                  ? formatDateTime(String(value), locale)
                  : String(value)}
            </AppText>
          </View>
        ))}
      {['customer', 'service', 'service_package', 'employee', 'status'].map((key) => {
        const nested = record(data[key]);
        const name = itemName(nested) || String(nested.code ?? '');
        return name ? (
          <View key={key} style={styles.field}>
            <AppText variant="bodySm" color="onSurfaceVariant">
              {
                {
                  customer: 'Client',
                  service: 'Service',
                  service_package: 'Forfait',
                  employee: 'Praticien',
                  status: 'Statut',
                }[key]
              }
            </AppText>
            <AppText>{name}</AppText>
          </View>
        ) : null;
      })}
      {['medical_conditions', 'treatment_zones'].map((key) =>
        Array.isArray(data[key]) ? (
          <AppText key={key}>
            {labels[key]} : {(data[key] as unknown[]).map(String).join(', ')}
          </AppText>
        ) : null,
      )}
      {Array.isArray(data.prescription)
        ? (data.prescription as unknown[]).map((entry, index) => (
            <AppText key={index}>
              {Object.values(record(entry)).filter(Boolean).join(' · ')}
            </AppText>
          ))
        : null}
    </View>
  );
}

export function CrmScreen() {
  const params = useLocalSearchParams<{
    module: string;
    action?: string;
    record?: string;
    customer?: string;
    service?: string;
  }>();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  return (
    <CrmModuleScreen
      key={`${store}-${params.module}-${params.action}-${params.record}-${params.customer}-${params.service}`}
    />
  );
}

function CrmModuleScreen() {
  const params = useLocalSearchParams<{
    module: string;
    action?: string;
    record?: string;
    customer?: string;
    service?: string;
  }>();
  const baseModule = crmModules.find((item) => item.key === params.module);
  const searchInput = useRef<TextInput>(null);
  const [serviceId, setServiceId] = useState(params.service ?? '');
  const currentStore = useCurrentStore();
  const [switchStore, setSwitchStore] = useState(false);
  const [careKind, setCareKind] = useState('disease');
  const module =
    baseModule?.key === 'form-builder'
      ? { ...baseModule, endpoint: `/services/${encodeURIComponent(serviceId)}/fields` }
      : baseModule;
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const translator = useTranslation();
  const cache = useQueryClient();
  const latin = useLatinFonts();
  const [search, setSearch] = useState('');
  const [settledSearch, setSettledSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setSettledSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState('month');
  const [selected, setSelected] = useState<CrmRecord | null>(
    params.record ? { uid: params.record, id: params.record } : null,
  );
  const [calendarDate, setCalendarDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [form, setForm] = useState<'create' | 'edit' | 'payment' | null>(
    params.action === 'create' ? 'create' : null,
  );
  const [confirm, setConfirm] = useState(false);
  const allowed = !!module && can(access.data, module.view);
  const aggregate = module?.key === 'reports';
  const appointmentStatuses = useQuery({
    queryKey: ['crm', store, module?.key, 'list-statuses'],
    enabled: allowed && ['appointments', 'sessions'].includes(module?.key ?? ''),
    queryFn: async () =>
      listPayload(
        await apiGet('/statuses', {
          params: {
            src: module?.key === 'sessions' ? 'service_sessions' : 'service_appointments',
            per_page: 100,
          },
        }),
      ).rows,
  });
  const list = useQuery({
    queryKey: [
      'crm',
      store,
      module?.key,
      serviceId,
      careKind,
      page,
      settledSearch,
      statusFilter,
      period,
      calendarDate,
      employeeId,
    ],
    enabled:
      allowed && module?.key !== 'dashboard' && (module?.key !== 'form-builder' || !!serviceId),
    queryFn: async () =>
      aggregate
        ? record(unwrap(await apiGet(module!.endpoint, { params: { period } })))
        : crmApi.list(module!, page, settledSearch, {
            ...(module?.key === 'care-catalogs' ? { kind: careKind } : {}),
            ...(module?.key === 'appointments' && employeeId ? { employee_id: employeeId } : {}),
            ...(module?.key === 'appointments' && calendarDate
              ? { date_from: calendarDate, date_to: calendarDate }
              : {}),
            ...(statusFilter
              ? {
                  [module?.key === 'sessions'
                    ? 'status_id'
                    : module?.key === 'services'
                      ? 'active'
                      : module?.key === 'clients'
                        ? 'status'
                        : 'status_id']: statusFilter,
                }
              : {}),
          }),
  });
  const summary = useQuery({
    queryKey: ['crm', store, module?.key, 'list-summary', settledSearch, employeeId],
    enabled: allowed && ['sessions', 'appointments'].includes(module?.key ?? ''),
    queryFn: async () => {
      let currentPage = 1;
      let lastPage = 1;
      const rows: CrmRecord[] = [];
      do {
        const result = listPayload(
          await apiGet(module!.endpoint, {
            params: {
              page: currentPage,
              per_page: 500,
              search: settledSearch,
              ...(employeeId ? { employee_id: employeeId } : {}),
            },
          }),
        );
        rows.push(...result.rows);
        lastPage = result.lastPage;
        currentPage++;
      } while (currentPage <= lastPage);
      return rows;
    },
  });
  const detail = useQuery({
    queryKey: ['crm', store, module?.key, 'detail', selected && itemId(selected)],
    enabled:
      allowed &&
      !!selected &&
      !['payments', 'timeline', 'care-catalogs'].includes(module?.key ?? ''),
    queryFn: () => crmApi.detail(module!, itemId(selected!)),
  });
  const action = useMutation({
    mutationFn: (kind: 'delete' | 'convert' | { convert: CrmRecord }) =>
      typeof kind === 'object'
        ? crmApi.action(module!, itemId(kind.convert), 'convert-to-session')
        : kind === 'delete'
          ? crmApi.remove(module!, itemId(selected!))
          : crmApi.action(module!, itemId(selected!), 'convert-to-session'),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['crm'] }),
        cache.invalidateQueries({ queryKey: ['access'] }),
        cache.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      setConfirm(false);
      setSelected(null);
    },
  });
  if (!module)
    return (
      <Screen>
        <AppText>Service introuvable.</AppText>
      </Screen>
    );
  const title = translator.tDynamic(`mobile.crm.${module.key}`, module.label);
  if (access.isLoading)
    return (
      <Screen>
        <SkeletonCards count={3} />
      </Screen>
    );
  if (access.isError)
    return (
      <Screen>
        <ErrorState error={access.error} onRetry={() => void access.refetch()} />
      </Screen>
    );
  if (!allowed)
    return (
      <Screen>
        <LockedFeature
          title={title}
          reason="Ce service n’est pas disponible avec vos droits actuels."
        />
      </Screen>
    );
  if (module.key === 'dashboard')
    return (
      <Screen
        edges={[]}
        header={
          <CrmShellHeader
            name={currentStore.store?.name ?? 'QuickPharma'}
            onSearch={() => searchInput.current?.focus()}
            onStore={currentStore.canSwitch ? () => setSwitchStore(true) : undefined}
          />
        }
        contentStyle={styles.screenContent}
        innerStyle={{ gap: 12 }}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <StoreSwitcherSheet visible={switchStore} onClose={() => setSwitchStore(false)} />
        <CrmDashboard />
      </Screen>
    );
  const pageData = list.data as { rows: CrmRecord[]; lastPage: number; total: number } | undefined;
  const rawDetail = detail.data ?? selected ?? {};
  const current =
    module.key === 'clients'
      ? { ...record(rawDetail.customer), ...record(rawDetail.stats), id: selected?.id }
      : rawDetail;
  return (
    <Screen
      edges={[]}
      header={
        <CrmShellHeader
          name={currentStore.store?.name ?? 'QuickPharma'}
          onSearch={() => searchInput.current?.focus()}
          onStore={currentStore.canSwitch ? () => setSwitchStore(true) : undefined}
        />
      }
      innerStyle={{ gap: 12 }}
      contentStyle={styles.screenContent}
      onRefresh={() => void list.refetch()}
      refreshing={list.isRefetching}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StoreSwitcherSheet visible={switchStore} onClose={() => setSwitchStore(false)} />
      <CrmListHeading
        title={
          module.key === 'clients'
            ? 'Clients & Dossiers'
            : module.key === 'services'
              ? 'Catalogue des services'
              : module.key === 'sessions'
                ? 'Séances de soins'
                : module.key === 'appointments'
                  ? 'Rendez-vous & Planning'
                  : title
        }
        subtitle={
          module.key === 'sessions'
            ? 'Cabinet & officine esthétique intégrée'
            : module.key === 'appointments'
              ? `${pageData?.total ?? 0} rendez-vous`
              : module.key === 'clients'
                ? 'Dossiers patients et suivi des soins'
                : 'Prestations et programmes de soins'
        }
        count={
          !aggregate
            ? `${formatNumber(pageData?.total ?? 0, translator.locale)} au total`
            : undefined
        }
        action={
          (
            {
              clients: 'Nouveau client',
              services: 'Nouveau service',
              sessions: 'Nouvelle séance',
              appointments: 'Nouveau RDV',
              packages: 'Vendre un forfait',
            } as Record<string, string>
          )[module.key] ?? 'Ajouter'
        }
        onCreate={module.create ? () => setForm('create') : undefined}
        disabled={!canCreate(access.data, module) || (module.key === 'form-builder' && !serviceId)}
      />
      {module.key === 'form-builder' ? (
        <ReferencePicker
          field={{ key: 'service_id', label: 'Service', required: true, reference: '/services' }}
          value={serviceId}
          onChange={(value) => {
            setServiceId(value);
            setPage(1);
          }}
        />
      ) : null}
      {module.key === 'care-catalogs' ? (
        <View style={styles.actions}>
          {(['disease', 'medicine'] as const).map((kind) => (
            <Button
              key={kind}
              label={kind === 'disease' ? 'Antécédents' : 'Médicaments'}
              variant={careKind === kind ? 'primary' : 'tonal'}
              fullWidth={false}
              onPress={() => {
                setCareKind(kind);
                setPage(1);
              }}
            />
          ))}
        </View>
      ) : null}
      {aggregate ? (
        <View style={styles.actions}>
          {(
            [
              ['week', 'Semaine'],
              ['month', 'Mois'],
              ['quarter', 'Trimestre'],
              ['year', 'Année'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              label={label}
              compact
              fullWidth={false}
              variant={period === value ? 'primary' : 'tonal'}
              onPress={() => setPeriod(value)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.searchField}>
          <Icon name="search" size="md" color="outline" />
          <TextInput
            ref={searchInput}
            accessibilityLabel={`Rechercher dans ${title}`}
            placeholder="Rechercher par client, soin, praticien…"
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(1);
            }}
            returnKeyType="search"
            style={[styles.searchInput, fontForScript(fontFamilies.body, latin)]}
          />
        </View>
      )}
      {module.key === 'appointments' ? (
        <ReferencePicker
          field={{ key: 'employee_id', label: 'Tous les praticiens', reference: '/usersListe' }}
          value={employeeId}
          onChange={(value) => {
            setEmployeeId(value);
            setPage(1);
          }}
        />
      ) : null}
      {module.key === 'appointments' ? (
        <CrmCalendar
          value={calendarDate}
          markers={(summary.data ?? []).reduce<Record<string, number>>((out, row) => {
            const date = String(row.starts_at ?? '').slice(0, 10);
            out[date] = (out[date] ?? 0) + 1;
            return out;
          }, {})}
          onChange={(value) => {
            setCalendarDate(value);
            setPage(1);
          }}
        />
      ) : null}
      {['sessions', 'appointments', 'services'].includes(module.key) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(['sessions', 'appointments'].includes(module.key)
            ? [
                ['', module.key === 'sessions' ? 'Toutes' : 'Tous'],
                ...(appointmentStatuses.data ?? [])
                  .sort((a, b) => {
                    const order = [
                      'in_progress',
                      'completed',
                      'confirmed',
                      'planned',
                      'pending',
                      'cancelled',
                      'no_show',
                    ];
                    return order.indexOf(String(a.code)) - order.indexOf(String(b.code));
                  })
                  .map((status) => [itemId(status), String(status.label ?? status.code)]),
              ]
            : [
                ['', 'Tous'],
                ['1', 'Actifs'],
                ['0', 'Inactifs'],
              ]
          ).map(([value = '', label = '']) => (
            <Chip
              key={value}
              label={label}
              count={
                ['sessions', 'appointments'].includes(module.key) && summary.data
                  ? value
                    ? summary.data.filter(
                        (row) => String(row.status_id ?? record(row.status).id) === value,
                      ).length
                    : summary.data.length
                  : undefined
              }
              selected={statusFilter === value}
              onPress={() => {
                setStatusFilter(value);
                setPage(1);
              }}
            />
          ))}
        </ScrollView>
      ) : null}
      {list.isLoading ? (
        <SkeletonCards count={3} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : aggregate ? (
        <CrmReports data={record(list.data)} />
      ) : (
        <>
          {pageData?.rows.map((row) => (
            <CrmRecordCard
              key={itemId(row)}
              row={row}
              module={module}
              onEdit={
                can(access.data, module.update)
                  ? () => {
                      setSelected(row);
                      setForm('edit');
                    }
                  : undefined
              }
              onCollect={
                ['sessions', 'packages'].includes(module.key) &&
                can(access.data, 'services.payments.collect')
                  ? () => {
                      setSelected(row);
                      setForm('payment');
                    }
                  : undefined
              }
              onDelete={
                can(access.data, module.remove)
                  ? () => {
                      setSelected(row);
                      setConfirm(true);
                    }
                  : undefined
              }
              onConvert={
                module.key === 'appointments' &&
                canConvertAppointment(row) &&
                can(access.data, 'services.appointments.convert')
                  ? () => action.mutate({ convert: row })
                  : undefined
              }
              showMoney={
                can(access.data, 'services.payments.view') ||
                module.key === 'services' ||
                module.key === 'service-packages'
              }
              onPress={() => {
                setSelected(row);
                action.reset();
              }}
            />
          ))}
          {!pageData?.rows.length ? (
            <Card>
              <EmptyState
                icon={module.icon}
                title="Aucun résultat"
                message="Essayez une autre recherche ou modifiez les filtres."
              />
            </Card>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Précédent"
              variant="outline"
              compact
              disabled={page <= 1}
              fullWidth={false}
              onPress={() => setPage(page - 1)}
            />
            <AppText>
              {page} / {pageData?.lastPage ?? 1}
            </AppText>
            <Button
              label="Suivant"
              variant="outline"
              compact
              disabled={page >= (pageData?.lastPage ?? 1)}
              fullWidth={false}
              onPress={() => setPage(page + 1)}
            />
          </View>
        </>
      )}
      {module.key === 'clients' && selected && !form ? (
        <ClientDossier
          selected={selected}
          profile={detail.data}
          loading={detail.isLoading}
          error={detail.error}
          onRetry={() => void detail.refetch()}
          onClose={() => setSelected(null)}
          onEdit={() => setForm('edit')}
        />
      ) : null}
      <CrmPage
        visible={!!selected && !form && module.key !== 'clients'}
        onClose={() => {
          setSelected(null);
          setConfirm(false);
        }}
        title={selected ? itemName(selected) || title : title}
        footer={
          <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {can(access.data, module.update) && !detail.isLoading && !detail.isError ? (
              <Button
                label="Modifier"
                icon="edit"
                style={{ flexGrow: 1, flexBasis: '45%' }}
                variant="tonal"
                onPress={() => setForm('edit')}
              />
            ) : null}
            {['sessions', 'packages'].includes(module.key) &&
            can(access.data, 'services.payments.collect') ? (
              <Button
                label="Encaisser"
                icon="payments"
                style={{ flexGrow: 1, flexBasis: '45%' }}
                onPress={() => setForm('payment')}
              />
            ) : null}
            {module.key === 'appointments' &&
            linkedAppointmentSession(current) &&
            can(access.data, 'services.sessions.view') ? (
              <Button
                style={{ flexGrow: 1, flexBasis: '45%' }}
                label="Voir la séance"
                onPress={() =>
                  router.push(
                    `/crm/sessions?record=${encodeURIComponent(linkedAppointmentSession(current))}` as Href,
                  )
                }
              />
            ) : null}
            {module.key === 'appointments' &&
            !detail.isLoading &&
            !detail.isError &&
            canConvertAppointment(current) &&
            can(access.data, 'services.appointments.convert') ? (
              <Button
                style={{ flexGrow: 1, flexBasis: '45%' }}
                label="Convertir en séance"
                loading={action.isPending}
                onPress={() => action.mutate('convert')}
              />
            ) : null}
            {can(access.data, module.remove) ? (
              <Button
                style={{ flexGrow: 1, flexBasis: '45%' }}
                label="Supprimer"
                icon="delete-outline"
                variant="dangerSoft"
                onPress={() => setConfirm(true)}
              />
            ) : null}
          </View>
        }
      >
        {detail.isLoading ? (
          <SkeletonCards count={2} />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        ) : [
            'services',
            'service-packages',
            'packages',
            'sessions',
            'appointments',
            'payments',
          ].includes(module.key) ? (
          <CrmDetailContent
            row={current}
            moduleKey={module.key}
            showMoney={can(access.data, 'services.payments.view')}
          />
        ) : (
          <DisplayFields
            data={
              can(access.data, 'services.payments.view') ||
              ['services', 'service-packages'].includes(module.key)
                ? current
                : Object.fromEntries(
                    Object.entries(current).filter(
                      ([key]) =>
                        ![
                          'price',
                          'amount_paid',
                          'due',
                          'discount',
                          'price_paid',
                          'payingAmount',
                          'receivedAmount',
                        ].includes(key),
                    ),
                  )
            }
          />
        )}
        {action.isError ? (
          <AppText color="error">{errorMessage(action.error, translator)}</AppText>
        ) : null}
      </CrmPage>
      {form ? (
        <CrmForm
          key={`${store}-${module.key}-${form}`}
          module={module}
          extra={module.key === 'care-catalogs' ? { kind: careKind } : undefined}
          row={form === 'create' ? undefined : current}
          initialValues={params.customer ? { customer_id: params.customer } : undefined}
          payment={form === 'payment'}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            setSelected(null);
          }}
        />
      ) : null}
      {scanOpen ? (
        <CrmScanner
          visible
          onClose={() => setScanOpen(false)}
          onRead={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
      ) : null}
      <ConfirmDialog
        visible={confirm}
        title="Supprimer cet élément ?"
        message="Cette suppression sera enregistrée dans votre établissement."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        loading={action.isPending}
        onConfirm={() => action.mutate('delete')}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  addButton: { flex: 1.2, paddingHorizontal: spacing.sm },
  relatedButton: { flex: 0.8, paddingHorizontal: spacing.sm },
  fullField: { width: '100%' },
  screenContent: { padding: 16, gap: 12 },
  searchField: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.transparent,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14, color: colors.onSurface, textAlign: 'auto' },
  filters: { gap: spacing.sm },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
  field: {
    width: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
});
