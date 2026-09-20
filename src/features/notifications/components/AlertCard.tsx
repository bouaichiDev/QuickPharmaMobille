import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translate';
import { colors, radii, spacing, type ColorToken } from '@/theme';
import { formatDateTime } from '@/utils/format';

import type { AlertItem } from '../../dashboard/types';

const PRIORITY_VISUALS: Record<string, { accent: ColorToken; tone: BadgeTone; iconBg: ColorToken; iconColor: ColorToken }> = {
  critical: { accent: 'error', tone: 'danger', iconBg: 'errorContainer', iconColor: 'error' },
  high: { accent: 'error', tone: 'danger', iconBg: 'errorContainer', iconColor: 'error' },
  medium: { accent: 'warning', tone: 'warning', iconBg: 'warningContainer', iconColor: 'onWarningContainer' },
  low: { accent: 'tertiary', tone: 'neutral', iconBg: 'surfaceContainerHigh', iconColor: 'tertiary' },
};

const TYPE_ICONS: Record<string, IconName> = {
  stock_low: 'trending-down',
  stock_out: 'error-outline',
  product_expiring: 'timer',
  product_expired: 'event-busy',
  credit_limit: 'credit-card',
  credit_overdue: 'credit-card-off',
  cheque_due: 'request-quote',
  cheque_rejected: 'block',
  sales_drop: 'show-chart',
  system: 'settings',
};

interface AlertCardProps {
  alert: AlertItem;
  onMarkRead: (uid: string) => void;
}

export function AlertCard({ alert, onMarkRead }: AlertCardProps) {
  const { t, tDynamic, locale } = useTranslation();
  const visual = PRIORITY_VISUALS[alert.priority] ?? PRIORITY_VISUALS.low!;
  const typeLabel = tDynamic(`mobile.notifications.alertType.${alert.type}`, alert.type);
  const priorityLabel = tDynamic(`mobile.notifications.priority.${alert.priority}`, alert.priority);

  return (
    <Card accent={alert.is_read ? 'outlineVariant' : visual.accent}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: colors[visual.iconBg] }]}>
          <Icon name={TYPE_ICONS[alert.type] ?? 'notifications'} size="md" color={visual.iconColor} />
        </View>
        <View style={styles.body}>
          <View style={styles.meta}>
            <Badge label={typeLabel} tone={visual.tone} uppercase />
            {!alert.is_read ? <View style={styles.unreadDot} /> : null}
            <AppText variant="labelSm" color="outline" style={styles.time}>
              {formatDateTime(alert.created_at, locale)}
            </AppText>
          </View>
          <AppText variant="headlineSm">{alert.title}</AppText>
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {alert.message}
          </AppText>
          <View style={styles.footer}>
            <AppText variant="labelSm" color="outline">
              {priorityLabel}
            </AppText>
            {!alert.is_read ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onMarkRead(alert.uid)}
                hitSlop={8}
                style={styles.action}
              >
                <Icon name="done" size="sm" color="primary" />
                <AppText variant="labelMd" color="primary">
                  {t('mobile.notifications.markRead' satisfies TranslationKey)}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  time: {
    marginStart: 'auto',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
