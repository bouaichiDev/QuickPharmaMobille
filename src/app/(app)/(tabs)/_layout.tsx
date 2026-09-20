import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLatinFonts } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAlertsDashboard } from '@/features/dashboard/useDashboard';
import { useNotificationsList } from '@/features/notifications/useNotifications';
import { StoreHeader } from '@/features/stores/components/StoreHeader';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, fontFamilies, fontForScript, layout } from '@/theme';

function tabIcon(name: IconName) {
  function TabIcon({ focused }: { focused: boolean }) {
    return <Icon name={name} size="md" color={focused ? 'primary' : 'onSurfaceVariant'} />;
  }
  return TabIcon;
}

function Header() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }}>
      <StoreHeader />
    </SafeAreaView>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const latin = useLatinFonts();
  const messages = useNotificationsList();
  const alerts = useAlertsDashboard();
  const unread = (messages.data?.pages[0]?.unreadCount ?? 0) + (alerts.data?.total_unread ?? 0);

  return (
    <Tabs
      screenOptions={{
        header: Header,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: { ...fontForScript(fontFamilies.bodySemiBold, latin), fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineSoft,
          minHeight: layout.tabBarHeight,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t('mobile.nav.home'), tabBarIcon: tabIcon('dashboard') }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('mobile.nav.notifications'),
          tabBarIcon: tabIcon('notifications-none'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.error },
        }}
      />
      <Tabs.Screen name="more" options={{ title: t('mobile.nav.more'), tabBarIcon: tabIcon('grid-view') }} />
    </Tabs>
  );
}
