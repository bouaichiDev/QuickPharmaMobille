import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';
import { formatAmount, formatPercent } from '@/utils/format';

import type { PharmacyDashboardResponse } from '../types';

interface PerformanceCardProps {
  performance: NonNullable<PharmacyDashboardResponse['performance']>;
  currency: string | null;
}

export function PerformanceCard({ performance, currency }: PerformanceCardProps) {
  const { t, locale } = useTranslation();
  const items = [
    { label: t('mobile.dashboard.averageTicket'), value: formatAmount(performance.averageTicket, currency, locale) },
    { label: t('mobile.dashboard.peakHour'), value: performance.peakHour ?? '—' },
    { label: t('mobile.dashboard.returnRate'), value: formatPercent(performance.returnRate, locale) },
  ];

  return (
    <Card>
      <AppText variant="headlineSm">{t('mobile.dashboard.performanceTitle')}</AppText>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.label} style={styles.item}>
            <AppText variant="labelSm" color="onSurfaceVariant" align="center">
              {item.label}
            </AppText>
            <AppText variant="dataTabular" align="center" numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    gap: spacing.xs,
  },
});
