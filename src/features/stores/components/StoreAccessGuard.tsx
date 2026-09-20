import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/EmptyState';
import { InlineNotice } from '@/components/feedback/InlineNotice';
import { Button } from '@/components/ui/Button';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { isApiError } from '@/services/api/apiError';
import { colors, layout, spacing } from '@/theme';

import { resolveStoreAccessError } from '../storeSelection';

/**
 * Revalidates the active store at startup and after every change: the API
 * decides (GET /access/me). A refused selected store falls back to the login
 * default store; a refused default store blocks the app.
 */
export function StoreAccessGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const session = useSessionStore((state) => state.session);
  const notice = useSessionStore((state) => state.notice);
  const clearNotice = useSessionStore((state) => state.clearNotice);
  const resetActiveStoreToDefault = useSessionStore((state) => state.resetActiveStoreToDefault);
  const signOut = useSessionStore((state) => state.signOut);
  const access = useAccess();

  const resolution =
    access.error && isApiError(access.error) ? resolveStoreAccessError(session, access.error) : 'none';

  useEffect(() => {
    if (resolution === 'resetToDefault') void resetActiveStoreToDefault();
  }, [resolution, resetActiveStoreToDefault]);

  const isSuperAdmin = session?.role === 'SuperAdmin';
  const blocked = resolution === 'blocked' || (!session?.activeStore && !isSuperAdmin);

  if (blocked) {
    const suspended = isApiError(access.error) && access.error.isStoreSuspended;
    return (
      <SafeAreaView style={styles.blocked}>
        <EmptyState
          icon={suspended ? 'block' : 'store'}
          tone="error"
          title={suspended ? t('mobile.store.suspended') : t('mobile.store.noStore')}
          message={isApiError(access.error) ? access.error.message : undefined}
        />
        <View style={styles.actions}>
          <Button label={t('mobile.common.retry')} variant="tonal" onPress={() => void access.refetch()} />
          <Button label={t('mobile.profile.logoutButton')} variant="dangerSoft" onPress={() => void signOut()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      {notice === 'storeAccessLost' ? (
        <SafeAreaView edges={['top']} style={styles.notice}>
          <InlineNotice
            tone="warning"
            message={t('mobile.store.accessLost')}
            onDismiss={clearNotice}
            dismissLabel={t('mobile.common.close')}
          />
        </SafeAreaView>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  blocked: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenPadding,
    backgroundColor: colors.background,
  },
  actions: {
    gap: spacing.md,
  },
  notice: {
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colors.background,
  },
});
