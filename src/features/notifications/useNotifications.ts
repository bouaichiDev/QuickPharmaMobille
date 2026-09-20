import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';

import { alertsApi, notificationsApi } from './notificationsApi';
import type { AlertsPage, NotificationsResponse } from './types';

/** Notifications are not pushed (no FCM/Pusher for mobile): poll every minute like the web app. */
const POLL_MS = 60_000;

export function useNotificationsList() {
  return useInfiniteQuery({
    queryKey: ['notifications', 'messages'],
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last?.notifications && last.notifications.current_page < last.notifications.last_page
        ? last.notifications.current_page + 1
        : undefined,
    refetchInterval: POLL_MS,
  });
}

export function useAlertsList(enabled = true) {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);
  return useInfiniteQuery({
    queryKey: ['alerts', 'list', storeId],
    queryFn: ({ pageParam }) => alertsApi.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last?.pagination && last.pagination.current_page < last.pagination.last_page
        ? last.pagination.current_page + 1
        : undefined,
    enabled,
    refetchInterval: POLL_MS,
  });
}

type MessagesCache = InfiniteData<NotificationsResponse, number>;
type AlertsCache = InfiniteData<AlertsPage, number>;

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onMutate: (id) => {
      client.setQueryData<MessagesCache>(['notifications', 'messages'], (cache) =>
        cache
          ? {
              ...cache,
              pages: cache.pages.map((page) => ({
                unreadCount: Math.max(0, page.unreadCount - 1),
                notifications: {
                  ...page.notifications,
                  data: page.notifications.data.map((item) =>
                    item.id === id ? { ...item, isRead: 1 } : item,
                  ),
                },
              })),
            }
          : cache,
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSettled: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAlertRead() {
  const client = useQueryClient();
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);
  return useMutation({
    mutationFn: (uid: string) => alertsApi.markRead(uid),
    onMutate: (uid) => {
      client.setQueryData<AlertsCache>(['alerts', 'list', storeId], (cache) =>
        cache
          ? {
              ...cache,
              pages: cache.pages.map((page) => ({
                ...page,
                data: page.data.map((alert) => (alert.uid === uid ? { ...alert, is_read: true } : alert)),
              })),
            }
          : cache,
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useMarkAllAlertsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: alertsApi.markAllRead,
    onSettled: () => client.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
