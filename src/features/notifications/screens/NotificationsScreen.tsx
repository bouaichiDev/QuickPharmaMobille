import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useAlertsDashboard } from '@/features/dashboard/useDashboard';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, layout, spacing } from '@/theme';

import { AlertCard } from '../components/AlertCard';
import { NotificationCard } from '../components/NotificationCard';
import type { NotificationFilter } from '../types';
import {
  useAlertsList,
  useMarkAlertRead,
  useMarkAllAlertsRead,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
} from '../useNotifications';

export function NotificationsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<NotificationFilter>(params.filter === 'alerts' ? 'alerts' : 'messages');

  const messages = useNotificationsList();
  const alerts = useAlertsList(filter === 'alerts');
  const alertsSummary = useAlertsDashboard();
  const markMessage = useMarkNotificationRead();
  const markAllMessages = useMarkAllNotificationsRead();
  const markAlert = useMarkAlertRead();
  const markAllAlerts = useMarkAllAlertsRead();

  const unreadMessages = messages.data?.pages[0]?.unreadCount ?? 0;
  const unreadAlerts = alertsSummary.data?.total_unread ?? 0;
  const unread = filter === 'messages' ? unreadMessages : unreadAlerts;
  const active = filter === 'messages' ? messages : alerts;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <View style={styles.titleLine}>
            <AppText variant="headlineLg" accessibilityRole="header">
              {t('mobile.notifications.title')}
            </AppText>
            {unread > 0 ? <Badge tone="danger" label={t('mobile.notifications.unread', { count: unread })} /> : null}
          </View>
          <AppText variant="bodySm" color="onSurfaceVariant">
            {t('mobile.notifications.subtitle')}
          </AppText>
        </View>
        {unread > 0 ? (
          <Button
            label={t('mobile.notifications.markAllRead')}
            icon="done-all"
            variant="tonal"
            compact
            fullWidth={false}
            loading={filter === 'messages' ? markAllMessages.isPending : markAllAlerts.isPending}
            onPress={() => (filter === 'messages' ? markAllMessages.mutate() : markAllAlerts.mutate())}
          />
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={t('mobile.notifications.filterMessages')}
          count={unreadMessages}
          selected={filter === 'messages'}
          onPress={() => setFilter('messages')}
        />
        <Chip
          label={t('mobile.notifications.filterAlerts')}
          count={unreadAlerts}
          selected={filter === 'alerts'}
          onPress={() => setFilter('alerts')}
        />
      </ScrollView>
    </View>
  );

  const footer = active.hasNextPage ? (
    <Button
      label={t('mobile.notifications.loadMore')}
      variant="ghost"
      loading={active.isFetchingNextPage}
      onPress={() => void active.fetchNextPage()}
    />
  ) : null;

  const empty = active.isLoading ? (
    <SkeletonCards count={3} height={120} />
  ) : active.isError ? (
    <ErrorState error={active.error} onRetry={() => void active.refetch()} />
  ) : (
    <EmptyState
      icon="notifications-none"
      title={t('mobile.notifications.emptyTitle')}
      message={filter === 'messages' ? t('mobile.notifications.emptyMessage') : t('mobile.notifications.emptyAlerts')}
    />
  );

  const refreshControl = (
    <RefreshControl
      refreshing={active.isRefetching && !active.isFetchingNextPage}
      onRefresh={() => void active.refetch()}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  if (filter === 'messages') {
    const items = messages.data?.pages.flatMap((page) => page.notifications.data) ?? [];
    return (
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotificationCard item={item} onMarkRead={(id) => markMessage.mutate(id)} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        refreshControl={refreshControl}
        ItemSeparatorComponent={Separator}
      />
    );
  }

  const alertItems = alerts.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={alertItems}
      keyExtractor={(item) => item.uid}
      renderItem={({ item }) => <AlertCard alert={item} onMarkRead={(uid) => markAlert.mutate(uid)} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      refreshControl={refreshControl}
      ItemSeparatorComponent={Separator}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
});
