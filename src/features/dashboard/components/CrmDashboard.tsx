import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';
import { formatAmount, formatNumber } from '@/utils/format';

import { useCrmDashboard } from '../useDashboard';
import { KpiCard } from './KpiCard';
import { QuickActions } from './QuickActions';

/** Dashboard of CRM-oriented roles (default_route /services-crm). */
export function CrmDashboard() {
  const { t, locale } = useTranslation();
  const currency = useCurrency();
  const query = useCrmDashboard();
  const data = query.data;

  return (
    <View style={styles.container}>
      <QuickActions />
      {query.isLoading ? (
        <SkeletonCards count={3} />
      ) : query.isError || !data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <KpiCard
            size="large"
            icon="medical-services"
            label={t('mobile.dashboard.crmRevenue')}
            value={formatAmount(data.revenue, currency, locale)}
            hint={`${data.period.from} → ${data.period.to}`}
          />
          <View style={styles.row}>
            <KpiCard icon="event-note" label={t('mobile.dashboard.crmSessions')} value={formatNumber(data.sessions_count, locale)} />
            <KpiCard
              icon="group"
              accent="secondary"
              label={t('mobile.dashboard.crmCustomers')}
              value={formatNumber(data.customers_count, locale)}
            />
          </View>
          <View style={styles.row}>
            <KpiCard
              icon="hourglass-empty"
              accent="error"
              label={t('mobile.dashboard.crmUnpaid')}
              value={formatAmount(data.unpaid_total, currency, locale)}
              hint={t('mobile.dashboard.crmPendingPayments', { count: data.pending_payments_count })}
            />
            <KpiCard
              icon="event-available"
              accent="tertiary"
              label={t('mobile.dashboard.crmAppointmentsToday')}
              value={formatNumber(data.appointments_today, locale)}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
