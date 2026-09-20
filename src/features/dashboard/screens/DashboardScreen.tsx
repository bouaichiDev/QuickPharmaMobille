import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { displayName, useProfile } from '@/features/profile/profileApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

import { CrmDashboard } from '../components/CrmDashboard';
import { PharmacyDashboard } from '../components/PharmacyDashboard';
import { resolveDashboardKind } from '../resolveDashboardKind';

export function DashboardScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const access = useAccess();
  const profile = useProfile();
  const session = useSessionStore((state) => state.session);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['access'] }),
    ]);
    setRefreshing(false);
  }

  const kind = access.data
    ? resolveDashboardKind(session?.defaultRoute, access.data.role.code ?? session?.role, access.data)
    : null;

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={() => void refresh()}>
      <View style={styles.heading}>
        <AppText variant="bodyMd" color="onSurfaceVariant">
          {t('mobile.dashboard.greeting')} {displayName(profile.data, '')}
        </AppText>
        <AppText variant="headlineLg" color="primary" accessibilityRole="header">
          {kind === 'crm' ? t('mobile.dashboard.crmTitle') : t('mobile.dashboard.title')}
        </AppText>
      </View>

      {access.isLoading ? (
        <SkeletonCards count={4} />
      ) : access.isError || !access.data ? (
        <ErrorState error={access.error} onRetry={() => void access.refetch()} />
      ) : kind === 'pharmacy' ? (
        <PharmacyDashboard />
      ) : kind === 'crm' ? (
        <CrmDashboard />
      ) : kind === 'platform' ? (
        <EmptyState icon="admin-panel-settings" title={t('mobile.dashboard.platformTitle')} message={t('mobile.dashboard.platformMessage')} />
      ) : (
        <EmptyState icon="lock-outline" tone="locked" title={t('mobile.dashboard.noDashboardTitle')} message={t('mobile.dashboard.noDashboardMessage')} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xxs,
  },
});
