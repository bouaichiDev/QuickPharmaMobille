import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';
import { shortMonthName, toNumber } from '@/utils/format';

import type { ChartSeries } from '../types';

interface MonthlySalesChartProps {
  series: ChartSeries[] | undefined;
  year: number | string;
  highlightMonth: number;
}

const CHART_HEIGHT = 140;

function seriesData(series: ChartSeries[] | undefined, name: string): number[] {
  const found = Array.isArray(series) ? series.find((entry) => entry.name === name) : undefined;
  return Array.from({ length: 12 }, (_, index) => toNumber(found?.data?.[index]) ?? 0);
}

/** Paid sales vs paid purchases per month (seriesPaid of GET /dashboard). */
export function MonthlySalesChart({ series, year, highlightMonth }: MonthlySalesChartProps) {
  const { t, locale } = useTranslation();
  const sales = seriesData(series, 'Sales');
  const purchases = seriesData(series, 'Entrees');
  const max = Math.max(1, ...sales, ...purchases);

  return (
    <Card>
      <AppText variant="headlineSm">{t('mobile.dashboard.chartTitle')}</AppText>
      <View style={styles.legendRow}>
        <AppText variant="bodySm" color="onSurfaceVariant">
          {t('mobile.dashboard.chartSubtitle', { year })}
        </AppText>
        <View style={styles.legend}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <AppText variant="labelSm">{t('mobile.dashboard.chartSales')}</AppText>
          <View style={[styles.dot, { backgroundColor: colors.secondaryFixedDim }]} />
          <AppText variant="labelSm">{t('mobile.dashboard.chartPurchases')}</AppText>
        </View>
      </View>

      <View style={styles.chart} accessibilityRole="image" accessibilityLabel={t('mobile.dashboard.chartTitle')}>
        {sales.map((value, index) => {
          const active = index + 1 === highlightMonth;
          return (
            <View key={index} style={styles.column}>
              <View style={styles.bars}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(2, (value / max) * CHART_HEIGHT), backgroundColor: colors.primary },
                    !active && highlightMonth > 0 ? styles.dimmed : null,
                  ]}
                />
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(2, ((purchases[index] ?? 0) / max) * CHART_HEIGHT),
                      backgroundColor: colors.secondaryFixedDim,
                    },
                    !active && highlightMonth > 0 ? styles.dimmed : null,
                  ]}
                />
              </View>
              <AppText variant="labelSm" color={active ? 'primary' : 'outline'} numberOfLines={1}>
                {shortMonthName(index, locale).replace('.', '')}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginStart: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 24,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    height: CHART_HEIGHT,
  },
  bar: {
    width: 7,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  dimmed: {
    opacity: 0.55,
  },
});
