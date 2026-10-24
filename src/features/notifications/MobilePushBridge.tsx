import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/services/api/client';
import { useSessionStore } from '@/features/auth/sessionStore';
import { logger } from '@/utils/logger';
import { isPlatformPush, pushTarget } from './pushModel';
let deviceToken: string | undefined;
let work: Promise<unknown> = Promise.resolve();
export async function unregisterMobilePush() {
  if (!deviceToken) return;
  await work.catch(() => undefined);
  try {
    await httpClient.delete('/mobile-push/devices', {
      data: { token: deviceToken },
      timeout: 5000,
    });
  } catch {
    /* A revoked API session is also checked by the sender. */
  }
  deviceToken = undefined;
}
export function MobilePushBridge() {
  const session = useSessionStore((s) => s.session),
    client = useQueryClient();
  const token = session?.token,
    store = session?.activeStore?.id,
    role = session?.role,
    userKey = session?.userId,
    support = !!session?.supportAccess;
  useEffect(() => {
    if (
      Platform.OS === 'web' ||
      Constants.executionEnvironment === 'storeClient' ||
      process.env.EXPO_PUBLIC_PUSH_ENABLED !== 'true' ||
      !token ||
      (!store && role !== 'SuperAdmin') ||
      support
    )
      return;
    let cancelled = false,
      running = false;
    let received: { remove: () => void } | undefined, response: { remove: () => void } | undefined;
    async function initialize() {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;
      received?.remove();
      response?.remove();
      const redirect = (data: Record<string, unknown> | undefined) => {
        const current = useSessionStore.getState().session;
        if (current && !current.supportAccess && isPlatformPush(data, current.role, current.userId)) {
          router.push('/notifications');
          return;
        }
        if (!current?.activeStore?.id || current.supportAccess) return;
        const target = pushTarget(data, current.activeStore.id);
        if (target)
          router.push({
            pathname: '/finance/[module]',
            params: { ...target, notification: String(Date.now()) },
          } as Href);
      };
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const current = useSessionStore.getState().session;
          const valid =
            !!current && !current.supportAccess && (
              isPlatformPush(notification.request.content.data, current.role, current.userId) ||
              (!!current.activeStore?.id && !!pushTarget(notification.request.content.data, current.activeStore.id))
            );
          return {
            shouldShowBanner: valid,
            shouldShowList: valid,
            shouldPlaySound: valid,
            shouldSetBadge: false,
          };
        },
      });
      response = Notifications.addNotificationResponseReceivedListener((event) =>
        redirect(event.notification.request.content.data),
      );
      received = Notifications.addNotificationReceivedListener(() => {
        void client.invalidateQueries({ queryKey: ['notifications'] });
        void client.invalidateQueries({ queryKey: ['admin'] });
      });
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        redirect(last.notification.request.content.data);
        await Notifications.clearLastNotificationResponseAsync();
      }
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('quickpharma-alerts', {
          name: 'Alertes QuickPharma',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      const permission = await Notifications.getPermissionsAsync();
      const allowed = permission.granted
        ? permission
        : await Notifications.requestPermissionsAsync();
      if (!allowed.granted || cancelled) return;
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) throw new Error('Projet EAS manquant.');
      const value = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (cancelled) return;
      deviceToken = value;
      // Serialize store changes so a slow former registration cannot win last.
      work = work
        .catch(() => undefined)
        .then(async () => {
          if (cancelled || useSessionStore.getState().session?.token !== token) return;
          await httpClient.post(
            '/mobile-push/devices',
            { token: value, platform: Platform.OS, ...(role === 'SuperAdmin' ? { user_key: userKey } : {}) },
            { timeout: 15000, skipStoreContext: role === 'SuperAdmin' },
          );
        });
      await work;
    }
    const run = () => {
      if (running) return;
      running = true;
      void initialize()
        .catch(() => logger.warn('Notifications du téléphone non configurées ou indisponibles.'))
        .finally(() => {
          running = false;
        });
    };
    run();
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      cancelled = true;
      foreground.remove();
      received?.remove();
      response?.remove();
    };
  }, [token, store, role, userKey, support, client]);
  return null;
}
