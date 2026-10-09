import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import { CrmFilter as Chip } from '@/features/crm/components/StitchChrome';
import { CrmGradient } from './CrmGradient';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { can, canCreate, crmModules } from '@/features/crm/modules';
import { itemName, listPayload, record, type CrmRecord } from '@/features/crm/crmApi';
import { CrmRecordCard } from '@/features/crm/components/CrmRecordCard';
import { crmStyles } from '@/features/crm/components/CrmDesign';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { colors } from '@/theme';
import { formatAmount, formatNumber } from '@/utils/format';
import { apiGet } from '@/services/api/client';
import { useCrmDashboard } from '../useDashboard';
import type { CrmDashboard as DashboardData } from '../types';
import { CrmRevenueGoal } from './CrmRevenueGoal';
import { CrmDateField } from '@/features/crm/components/CrmDateField';

function dates(period: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (period === 'week') {
    start.setTime(now.getTime());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  }
  const local = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { date_from: local(start), date_to: local(end) };
}
export function CrmDashboard() {
  const { locale } = useTranslation();
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState(dates('month'));
  const filters = period === 'custom' ? custom : dates(period);
  const query = useCrmDashboard(filters.date_from <= filters.date_to, filters);
  const appointments = useQuery({
    queryKey: ['crm', store, 'dashboard-appointments'],
    enabled: can(access.data, 'services.appointments.view'),
    queryFn: async () =>
      listPayload(
        await apiGet('/service-appointments', {
          params: {
            date_from: new Date().toLocaleDateString('en-CA'),
            date_to: new Date().toLocaleDateString('en-CA'),
            per_page: 5,
          },
        }),
      ).rows,
  });
  const activities = useQuery({
    queryKey: ['crm', store, 'dashboard-activity'],
    enabled: can(access.data, 'services.audit.view'),
    queryFn: async () =>
      listPayload(await apiGet('/crm-timeline', { params: { per_page: 4 } })).rows,
  });
  const shortcuts = ['sessions', 'appointments', 'clients', 'packages'].filter((key) => {
    const module = crmModules.find((entry) => entry.key === key)!;
    return canCreate(access.data, module);
  });
  return (
    <View style={{ gap: 12 }}>
      <View style={crmStyles.row}>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText variant="labelSm" color="secondary" style={{ fontSize: 10 }}>
            PRATIQUE OFFICINALE & CABINE
          </AppText>
          <AppText variant="headlineMd">Tableau de Bord CRM</AppText>
        </View>
        <Pressable
          accessibilityLabel="Personnaliser la période"
          onPress={() => setPeriod(period === 'custom' ? 'month' : 'custom')}
          style={{ padding: 8, backgroundColor: '#e5eeff', borderRadius: 20 }}
        >
          <Icon name="tune" size={20} color="primary" />
        </Pressable>
      </View>
      <View style={crmStyles.row}>
        {[
          [
            'month',
            `Ce mois (${new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })})`,
          ],
          ['week', 'Semaine'],
          ['custom', 'Personnalisé'],
        ].map(([key, label]) => (
          <Chip
            key={key}
            label={label!}
            selected={period === key}
            onPress={() => setPeriod(key!)}
          />
        ))}
      </View>
      {period === 'custom' ? (
        <View style={crmStyles.card}>
          <CrmDateField
            label="Du"
            value={custom.date_from}
            onChange={(value) => setCustom((old) => ({ ...old, date_from: value }))}
          />
          <CrmDateField
            label="Au"
            value={custom.date_to}
            onChange={(value) => setCustom((old) => ({ ...old, date_to: value }))}
          />
          {custom.date_from > custom.date_to ? (
            <AppText color="error">La fin doit être après le début.</AppText>
          ) : null}
        </View>
      ) : null}
      {query.isLoading ? (
        <SkeletonCards count={3} />
      ) : query.isError || !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <CrmDashboardView
          data={query.data}
          showMoney={can(access.data, 'services.payments.view')}
          shortcuts={shortcuts}
          appointments={appointments.data}
          activities={activities.data}
          onOpen={(key, create) =>
            router.push(`/crm/${key}${create ? '?action=create' : ''}` as Href)
          }
        />
      )}
      {appointments.isError ? (
        <ErrorState error={appointments.error} onRetry={() => void appointments.refetch()} />
      ) : null}
      {activities.isError ? (
        <ErrorState error={activities.error} onRetry={() => void activities.refetch()} />
      ) : null}
    </View>
  );
}
export function CrmDashboardView({
  data,
  showMoney,
  shortcuts,
  appointments,
  activities,
  onOpen,
  previewGoal,
}: {
  data: DashboardData;
  previewGoal?: number;
  showMoney: boolean;
  shortcuts: string[];
  appointments?: CrmRecord[];
  activities?: CrmRecord[];
  onOpen: (key: string, create?: boolean) => void;
}) {
  const { locale } = useTranslation();
  const currency = useCurrency();
  const amount = (value: unknown) => formatAmount(value, currency, locale);
  const number = (value: unknown) => formatNumber(value, locale);
  const metric = (label: string, value: string, icon: IconName, key: string) => (
    <Pressable
      style={styles.metric}
      onPress={() => onOpen(key)}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[crmStyles.row, { justifyContent: 'space-between' }]}>
        <View
          style={{
            padding: 5,
            borderRadius: 7,
            backgroundColor: key === 'payments' ? '#ffebea' : '#e5eeff',
          }}
        >
          <Icon name={icon} size={19} color={key === 'payments' ? 'error' : 'primary'} />
        </View>
        {key === 'payments' ? (
          <AppText variant="labelSm" color="error" style={{ fontSize: 10 }}>
            {number(data.pending_payments_count)} règlements
          </AppText>
        ) : null}
      </View>
      <AppText variant="headlineMd" color={key === 'payments' ? 'error' : 'onSurface'}>
        {value}
      </AppText>
      <AppText variant="bodySm" color="outline" style={{ fontSize: 11 }}>
        {label}
      </AppText>
    </Pressable>
  );
  const labels: Record<string, [string, string, IconName]> = {
    sessions: ['Nouvelle séance', 'Démarrer un soin', 'play-circle-outline'],
    appointments: ['Nouveau RDV', 'Planning agenda', 'event-available'],
    clients: ['Nouveau client', 'Créer un dossier', 'person-add'],
    packages: ['Vendre forfait', 'Cure et carnet', 'card-membership'],
  };
  const popular = data.popular_services.map(record);
  return (
    <View style={{ gap: 12 }}>
      {showMoney ? (
        <CrmGradient style={styles.revenue}>
          <View style={crmStyles.row}>
            <View style={{ backgroundColor: '#ffffff25', padding: 6, borderRadius: 7 }}>
              <Icon name="payments" size={18} color="onPrimary" />
            </View>
            <AppText variant="labelMd" color="onPrimary" style={{ flex: 1 }}>
              Recettes encaissées du mois
            </AppText>
            {typeof data.revenue_trend === 'number' ? (
              <View
                style={{
                  backgroundColor: '#ffffff26',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 14,
                }}
              >
                <AppText variant="labelSm" style={{ color: '#75f7ea', fontSize: 10 }}>
                  {data.revenue_trend > 0 ? '+' : ''}
                  {data.revenue_trend}%
                </AppText>
              </View>
            ) : null}
          </View>
          <View>
            <AppText variant="displayLg" color="onPrimary">
              {amount(data.revenue)}
            </AppText>
            <AppText variant="bodySm" color="onPrimary">
              Soins & prestations de services
            </AppText>
          </View>
          <CrmRevenueGoal revenue={data.revenue} previewGoal={previewGoal} />
          <Pressable
            onPress={() => onOpen('payments')}
            accessibilityRole="button"
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#ffffff22',
              borderRadius: 7,
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}
          >
            <AppText variant="labelSm" color="onPrimary">
              Reste à encaisser : {amount(data.unpaid_total)} ({number(data.pending_payments_count)}{' '}
              règlements)
            </AppText>
          </Pressable>
        </CrmGradient>
      ) : null}
      <View style={styles.grid}>
        {metric('Séances réalisées', number(data.sessions_count), 'event-note', 'sessions')}
        {metric('Clients servis', number(data.customers_count), 'group', 'clients')}
        {metric(
          'Rendez-vous aujourd’hui',
          number(data.appointments_today),
          'event-available',
          'appointments',
        )}
        {showMoney
          ? metric(
              'Reste à encaisser',
              amount(data.unpaid_total),
              'account-balance-wallet',
              'payments',
            )
          : null}
      </View>
      {shortcuts.length ? (
        <>
          <View style={crmStyles.row}>
            <AppText variant="headlineSm" style={{ flex: 1 }}>
              Actions Rapides
            </AppText>
            <AppText variant="bodySm" color="outline">
              Accès direct
            </AppText>
          </View>
          <View style={styles.grid}>
            {shortcuts.map((key, index) => {
              const info = labels[key]!;
              return (
                <Pressable
                  key={key}
                  style={[styles.shortcut, index === 0 && styles.primaryShortcut]}
                  onPress={() => onOpen(key, true)}
                  accessibilityRole="button"
                  accessibilityLabel={info[0]}
                >
                  <View style={[styles.icon, index === 0 && { backgroundColor: '#ffffff25' }]}>
                    <Icon name={info[2]} color={index === 0 ? 'onPrimary' : 'primary'} size={24} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText
                      variant="labelMd"
                      color={index === 0 ? 'onPrimary' : 'primary'}
                      numberOfLines={1}
                    >
                      {info[0]}
                    </AppText>
                    <AppText
                      variant="bodySm"
                      color={index === 0 ? 'onPrimaryContainer' : 'outline'}
                      style={{ fontSize: 10, lineHeight: 13 }}
                      numberOfLines={1}
                    >
                      {info[1]}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      {appointments ? (
        <>
          <View style={crmStyles.row}>
            <AppText variant="headlineSm" style={crmStyles.grow}>
              Rendez-vous du Jour
            </AppText>
            <Pressable onPress={() => onOpen('appointments')} accessibilityRole="button">
              <AppText variant="labelMd" color="primary">
                Voir tout
              </AppText>
            </Pressable>
          </View>
          {appointments.length ? (
            appointments.map((row) => (
              <CrmRecordCard
                key={String(row.uid)}
                row={row}
                module={crmModules.find((module) => module.key === 'appointments')!}
                showMoney={showMoney}
                onPress={() => onOpen('appointments')}
              />
            ))
          ) : (
            <View style={crmStyles.card}>
              <AppText color="outline">Aucun rendez-vous aujourd’hui.</AppText>
            </View>
          )}
        </>
      ) : null}
      <View style={crmStyles.card}>
        <AppText variant="headlineSm">Services les plus utilisés</AppText>
        {popular.length ? (
          popular.map((row, index) => (
            <View key={index} style={crmStyles.row}>
              <Icon name="medical-services" color="secondary" size={18} />
              <AppText style={crmStyles.grow}>
                {itemName(record(row.service)) ||
                  itemName(row) ||
                  String(row.service_name ?? 'Service')}
              </AppText>
              <AppText variant="labelMd">
                {number(row.sessions_count ?? row.count ?? row.total)} séances
              </AppText>
            </View>
          ))
        ) : (
          <AppText color="outline">Aucune séance sur cette période.</AppText>
        )}
      </View>
      {activities ? (
        <View style={crmStyles.card}>
          <AppText variant="headlineSm">Activités récentes</AppText>
          {activities.length ? (
            activities.map((row, index) => (
              <View key={index} style={crmStyles.row}>
                <View style={styles.icon}>
                  <Icon name="history" color="secondary" size={20} />
                </View>
                <View style={crmStyles.grow}>
                  <AppText variant="labelMd">
                    {String(row.description ?? row.details ?? row.action ?? 'Activité')}
                  </AppText>
                  <AppText variant="bodySm" color="outline">
                    {itemName(record(row.user))}
                  </AppText>
                </View>
              </View>
            ))
          ) : (
            <AppText color="outline">Aucune activité récente.</AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  period: {
    ...crmStyles.row,
    backgroundColor: colors.surfaceContainerLow,
    padding: 14,
    borderRadius: 12,
  },
  revenue: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: colors.primary,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  notice: { ...crmStyles.row, backgroundColor: colors.surfaceContainer, padding: 10, gap: 6 },
  revenueBody: { padding: 16, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    gap: 5,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#edf0f8',
  },
  shortcut: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
  },
  primaryShortcut: { backgroundColor: colors.primary },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
