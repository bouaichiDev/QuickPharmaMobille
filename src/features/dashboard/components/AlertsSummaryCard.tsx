import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translate';
import { colors, radii, spacing, type ColorToken } from '@/theme';

import type { AlertsDashboard, AlertType } from '../types';

interface AlertsSummaryCardProps {
  data: AlertsDashboard | undefined;
  loading: boolean;
  /** Fallback counters from GET /dashboard when /alerts/dashboard is unavailable. */
  fallback?: { expiredOrExpiring: number; lowOrOutOfStock: number };
}

const TILES: { type: AlertType; label: TranslationKey; tone: ColorToken; bg: ColorToken }[] = [
  { type: 'stock_out', label: 'mobile.dashboard.outOfStock', tone: 'error', bg: 'errorContainer' },
  { type: 'stock_low', label: 'mobile.dashboard.lowStock', tone: 'onWarningContainer', bg: 'warningContainer' },
  { type: 'product_expiring', label: 'mobile.dashboard.expiringSoon', tone: 'tertiary', bg: 'surfaceContainerLow' },
  { type: 'product_expired', label: 'mobile.dashboard.expired', tone: 'error', bg: 'errorContainer' },
];

export function AlertsSummaryCard({ data, loading, fallback }: AlertsSummaryCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const tiles: { type: string; label: string; tone: ColorToken; bg: ColorToken; value: number }[] =
    data
      ? TILES.map((tile) => ({ ...tile, value: data.by_type[tile.type] ?? 0, label: t(tile.label) }))
      : fallback
        ? [
            {
              type: 'low_or_out',
              label: t('mobile.dashboard.lowOrOutOfStock'),
              tone: 'error',
              bg: 'errorContainer',
              value: fallback.lowOrOutOfStock,
            },
            {
              type: 'expired_or_expiring',
              label: t('mobile.dashboard.expiredOrExpiring'),
              tone: 'tertiary',
              bg: 'surfaceContainerLow',
              value: fallback.expiredOrExpiring,
            },
          ]
        : [];

  const toProcess = data?.total_unread;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.title}>
          <Icon name="notifications-active" size="md" color="error" />
          <AppText variant="headlineSm">{t('mobile.dashboard.alertsTitle')}</AppText>
        </View>
        {toProcess !== undefined ? (
          <Badge tone="danger" label={t('mobile.dashboard.toProcess', { count: toProcess })} />
        ) : null}
      </View>

      {loading && !data ? (
        <Skeleton height={80} />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/notifications?filter=alerts')}
          style={styles.grid}
        >
          {tiles.map((tile) => (
            <View key={tile.type} style={[styles.tile, { backgroundColor: colors[tile.bg] }]}>
              <AppText variant="dataMetric" color={tile.tone}>
                {tile.value}
              </AppText>
              <AppText variant="labelSm" color="onSurfaceVariant" align="center">
                {tile.label}
              </AppText>
            </View>
          ))}
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    gap: spacing.xxs,
  },
});
