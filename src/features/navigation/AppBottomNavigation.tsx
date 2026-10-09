import { router, usePathname } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme';
import { useAccess } from '@/features/access/useAccess';
import { usePageLayers } from './PageLayers';
import { useTranslation } from '@/i18n/useTranslation';
import { useAlertsDashboard } from '@/features/dashboard/useDashboard';
import { useNotificationsList } from '@/features/notifications/useNotifications';
import { can } from '@/features/crm/modules';

export function AppBottomNavigation({
  onMore,
  onNavigate,
  preview = false,
  activePath,
}: {
  onMore: () => void;
  onNavigate?: (path: string) => void;
  preview?: boolean;
  activePath?: string;
}) {
  const { t } = useTranslation();
  const notifications = useNotificationsList();
  const alerts = useAlertsDashboard();
  const unread =
    (notifications.data?.pages[0]?.unreadCount ?? 0) + (alerts.data?.total_unread ?? 0);
  const routePath = usePathname();
  const pathname = activePath ?? routePath;
  const pages = usePageLayers();
  const insets = useSafeAreaInsets();
  const access = useAccess();
  const items: {
    label: string;
    icon: IconName;
    path: '/home' | '/stock' | '/notifications';
  }[] = [
    { label: t('mobile.nav.home'), icon: 'home', path: '/home' },
    ...(preview || can(access.data, 'products.view')
      ? [{ label: t('mobile.nav.stock'), icon: 'inventory-2' as IconName, path: '/stock' as const }]
      : []),
    { label: t('mobile.nav.notifications'), icon: 'notifications-none', path: '/notifications' },
  ];
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <Pressable
            key={item.path}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              pages?.clear();
              if (onNavigate) onNavigate(item.path);
              else router.navigate(item.path);
            }}
          >
            <View>
              <Icon name={item.icon} size={23} color={active ? 'primary' : 'onSurfaceVariant'} />
              {item.path === '/notifications' && unread > 0 ? (
                <View style={styles.badge}>
                  <AppText style={{ fontSize: 9, color: '#fff' }}>
                    {unread > 99 ? '99+' : unread}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              variant="labelSm"
              numberOfLines={1}
              color={active ? 'primary' : 'onSurfaceVariant'}
              style={{ fontSize: 10 }}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
      <Pressable
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel={t('mobile.nav.more')}
        onPress={onMore}
      >
        <Icon name="more-horiz" size={23} color="onSurfaceVariant" />
        <AppText variant="labelSm" style={{ fontSize: 10 }}>
          {t('mobile.nav.more')}
        </AppText>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outlineSoft,
    backgroundColor: colors.surface,
  },
  item: { flex: 1, minHeight: 44, gap: 4, alignItems: 'center', justifyContent: 'center' },
});
