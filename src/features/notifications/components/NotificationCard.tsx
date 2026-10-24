import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSessionStore } from '@/features/auth/sessionStore';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';
import type { NotificationItem } from '../types';
interface NotificationCardProps {
  item: NotificationItem;
  onMarkRead: (id: number) => void;
}
export function NotificationCard({ item, onMarkRead }: NotificationCardProps) {
  const ta = useAccountTranslation();
  const { t } = useTranslation();
  const unread = item.isRead === 0;
  const platform = useSessionStore((s) => s.session?.role?.toLowerCase() === 'superadmin');
  return (
    <Card accent={unread ? 'primary' : 'outlineVariant'}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Icon name="campaign" size="md" color="primary" />
        </View>
        <View style={styles.body}>
          <View style={styles.meta}>
            <AppText
              variant="labelSm"
              color="onSurfaceVariant"
              numberOfLines={1}
              style={styles.from}
            >
              {item.from ?? ''}
            </AppText>
            {unread ? <View style={styles.unreadDot} accessibilityLabel="unread" /> : null}
            <AppText variant="labelSm" color="outline">
              {item.time}
            </AppText>
          </View>
          <AppText variant="headlineSm">{item.title}</AppText>
          {platform && item.title === 'Demande de suppression de compte' && (
            <Button
              label={ta('account_security_manage_request')}
              variant="outline"
              onPress={() => {
                if (unread) onMarkRead(item.id);
                router.push('/account-deletion-requests' as Href);
              }}
            />
          )}
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {item.content}
          </AppText>
          {unread ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onMarkRead(item.id)}
              hitSlop={8}
              style={styles.action}
            >
              <Icon name="done" size="sm" color="primary" />
              <AppText variant="labelMd" color="primary">
                {t('mobile.notifications.markRead')}
              </AppText>
            </Pressable>
          ) : null}
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
    backgroundColor: colors.primaryFixed,
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
  },
  from: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
});
