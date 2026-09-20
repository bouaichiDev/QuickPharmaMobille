import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Chip } from '@/components/ui/Chip';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { usePermission } from '@/features/access/hooks';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';
import { formatAmount, formatNumber, formatTime } from '@/utils/format';

import { buildPeriods, useAlertsDashboard, usePharmacyDashboard } from '../useDashboard';
import { AlertsSummaryCard } from './AlertsSummaryCard';
import { KpiCard } from './KpiCard';
import { MonthlySalesChart } from './MonthlySalesChart';
import { PerformanceCard } from './PerformanceCard';
import { QuickActions } from './QuickActions';
import { RecentActivityList } from './RecentActivityList';

type PeriodKey = 'month' | 'previousMonth' | 'year';

export function PharmacyDashboard() {
  const { t, locale } = useTranslation();
  const currency = useCurrency();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('month');
  const periods = buildPeriods();
  const period = periods[periodKey];

  const dashboard = usePharmacyDashboard(period);
  const alerts = useAlertsDashboard();
  // Amount widgets follow the same permissions as the web dashboard.
  const canSeeSales = usePermission('sales.view').state === 'allowed';
  const canSeeEntries = usePermission('entries.view').state === 'allowed';

  const data = dashboard.data;
  const periodLabels: Record<PeriodKey, string> = {
    month: t('mobile.dashboard.periodMonth'),
    previousMonth: t('mobile.dashboard.periodPreviousMonth'),
    year: t('mobile.dashboard.periodYear', { year: periods.year.year }),
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
          <Chip key={key} label={periodLabels[key]} selected={key === periodKey} onPress={() => setPeriodKey(key)} />
        ))}
      </ScrollView>

      <QuickActions />

      <AlertsSummaryCard
        data={alerts.data}
        loading={alerts.isLoading}
        fallback={
          alerts.isError && data
            ? { expiredOrExpiring: data.expiredCount, lowOrOutOfStock: data.outOfStockCount }
            : undefined
        }
      />

      {dashboard.isLoading ? (
        <SkeletonCards count={3} />
      ) : dashboard.isError || !data ? (
        <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : (
        <>
          {canSeeSales ? (
            <KpiCard
              size="large"
              icon="payments"
              label={t('mobile.dashboard.revenue')}
              value={formatAmount(data.totalSalesComplete, currency, locale)}
              hint={`${t('mobile.dashboard.revenueHint')} • ${t('mobile.common.updatedAt', {
                time: formatTime(new Date(dashboard.dataUpdatedAt), locale),
              })}`}
              testID="kpi-revenue"
            />
          ) : null}

          <View style={styles.row}>
            {canSeeSales ? (
              <KpiCard
                icon="receipt-long"
                accent="secondary"
                label={t('mobile.dashboard.salesCount')}
                value={formatNumber(data.CountSales, locale)}
                hint={
                  data.previousPeriod
                    ? t('mobile.dashboard.previousYear', {
                        value: formatNumber(data.previousPeriod.CountSales, locale),
                        year: data.previousPeriod.year,
                      })
                    : t('mobile.dashboard.salesCountHint', { year: data.year })
                }
              />
            ) : null}
            <KpiCard
              icon="inventory-2"
              label={t('mobile.dashboard.stockReferences')}
              value={formatNumber(data.productsCount, locale)}
              hint={t('mobile.dashboard.unitsAvailable', { count: formatNumber(data.unitsAvailable, locale) })}
            />
          </View>

          <View style={styles.row}>
            {canSeeSales ? (
              <KpiCard
                icon="money-off"
                accent="error"
                label={t('mobile.dashboard.unpaidSales')}
                value={formatAmount(data.totalSalesUnpaid, currency, locale)}
              />
            ) : null}
            {canSeeEntries ? (
              <KpiCard
                icon="local-shipping"
                accent="tertiary"
                label={t('mobile.dashboard.purchases')}
                value={formatAmount(data.totalPurchaseComplete, currency, locale)}
              />
            ) : null}
          </View>

          <View style={styles.row}>
            <KpiCard icon="group" label={t('mobile.dashboard.customers')} value={formatNumber(data.totalCustomers, locale)} />
            <KpiCard
              icon="storefront"
              accent="secondary"
              label={t('mobile.dashboard.providers')}
              value={formatNumber(data.totalProviders, locale)}
            />
          </View>

          {canSeeSales ? (
            <MonthlySalesChart series={data.seriesPaid} year={data.year} highlightMonth={period.month} />
          ) : null}

          {data.performance && canSeeSales ? (
            <PerformanceCard performance={data.performance} currency={currency} />
          ) : null}

          {data.recentActivity ? <RecentActivityList items={data.recentActivity} currency={currency} /> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  chips: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
