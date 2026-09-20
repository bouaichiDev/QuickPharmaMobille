import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';
import { formatAmount } from '@/utils/format';

import type { PlanView } from '../types';

interface PlanComparisonTableProps {
  plans: PlanView[];
  focusedPlanId: number;
  currency: string | null;
}

const LABEL_WIDTH = 132;
const COLUMN_WIDTH = 120;

/** Side-by-side comparison built only from GET /plans fields. */
export function PlanComparisonTable({ plans, focusedPlanId, currency }: PlanComparisonTableProps) {
  const { t, locale } = useTranslation();
  const allFeatures = Array.from(new Set(plans.flatMap((plan) => plan.features)));

  const rows: { label: string; render: (plan: PlanView) => ReactNode }[] = [
    {
      label: t('mobile.plans.price'),
      render: (plan) => (
        <AppText variant="labelLg">{plan.isFree ? t('mobile.plans.free') : formatAmount(plan.price, currency, locale)}</AppText>
      ),
    },
    {
      label: t('mobile.plans.users'),
      render: (plan) => <AppText variant="bodyMd">{plan.maxUsers ?? '∞'}</AppText>,
    },
    {
      label: t('mobile.plans.stores'),
      render: (plan) => <AppText variant="bodyMd">{plan.maxStores ?? '∞'}</AppText>,
    },
    ...allFeatures.map((feature) => ({
      label: feature,
      render: (plan: PlanView) =>
        plan.features.includes(feature) ? (
          <Icon name="check-circle" size="sm" color="secondary" accessibilityLabel="✓" />
        ) : (
          <Icon name="remove" size="sm" color="outlineVariant" accessibilityLabel="—" />
        ),
    })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.row}>
          <View style={[styles.labelCell, styles.headerCell]}>
            <AppText variant="labelMd" color="onSurfaceVariant">
              {t('mobile.plans.compareFeature')}
            </AppText>
          </View>
          {plans.map((plan) => (
            <View
              key={plan.id}
              style={[styles.cell, styles.headerCell, plan.id === focusedPlanId ? styles.focused : null]}
            >
              <AppText variant="labelLg" color={plan.id === focusedPlanId ? 'onPrimary' : 'onSurface'} align="center">
                {plan.name}
              </AppText>
            </View>
          ))}
        </View>
        {rows.map((row, index) => (
          <View key={`${row.label}-${index}`} style={[styles.row, index % 2 === 0 ? styles.striped : null]}>
            <View style={styles.labelCell}>
              <AppText variant="bodySm" color="onSurfaceVariant">
                {row.label}
              </AppText>
            </View>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.cell}>
                {row.render(plan)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    backgroundColor: colors.surfaceContainerLowest,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  striped: {
    backgroundColor: colors.surfaceContainerLow,
  },
  labelCell: {
    width: LABEL_WIDTH,
    padding: spacing.md,
    justifyContent: 'center',
  },
  cell: {
    width: COLUMN_WIDTH,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCell: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  focused: {
    backgroundColor: colors.primary,
  },
});
