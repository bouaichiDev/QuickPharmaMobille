import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing, type ColorToken } from '@/theme';
import { formatAmount, formatDateTime } from '@/utils/format';

import type { RecentActivity } from '../types';

const ICONS: Record<RecentActivity['type'], { icon: IconName; tone: ColorToken }> = {
  sale: { icon: 'shopping-bag', tone: 'primary' },
  stock: { icon: 'inventory', tone: 'secondary' },
  low_stock: { icon: 'warning-amber', tone: 'error' },
};

interface RecentActivityListProps {
  items: RecentActivity[];
  currency: string | null;
  limit?: number;
}

export function RecentActivityList({ items, currency, limit = 6 }: RecentActivityListProps) {
  const { t, locale } = useTranslation();

  function describe(item: RecentActivity): { title: string; value: string | null } {
    switch (item.type) {
      case 'sale':
        return {
          title: t('mobile.dashboard.activitySale', { reference: item.reference }),
          value: formatAmount(item.amount, currency, locale),
        };
      case 'stock':
        return {
          title: t('mobile.dashboard.activityStock', { reference: item.reference }),
          value: `+${item.delta}`,
        };
      default:
        return {
          // The backend message is already specific (product + threshold).
          title: item.label || t('mobile.dashboard.activityLowStock'),
          value: item.remaining !== null ? String(item.remaining) : null,
        };
    }
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={t('mobile.dashboard.recentActivity')} />
      {items.length === 0 ? (
        <Card>
          <EmptyState icon="history" title={t('mobile.dashboard.noActivity')} />
        </Card>
      ) : (
        items.slice(0, limit).map((item, index) => {
          const visual = ICONS[item.type];
          const { title, value } = describe(item);
          return (
            <Card key={`${item.type}-${item.at}-${index}`} padded={false}>
              <View style={styles.row}>
                <View style={styles.iconCircle}>
                  <Icon name={visual.icon} size="md" color={visual.tone} />
                </View>
                <View style={styles.texts}>
                  <AppText variant="labelLg" numberOfLines={2}>
                    {title}
                  </AppText>
                  <AppText variant="bodySm" color="onSurfaceVariant">
                    {formatDateTime(item.at, locale)}
                  </AppText>
                </View>
                {value ? (
                  <AppText variant="dataTabular" color={item.type === 'low_stock' ? 'error' : 'onSurface'}>
                    {value}
                  </AppText>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
