import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { config } from '@/constants/config';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { StoreSwitcherSheet } from '@/features/stores/components/StoreSwitcherSheet';
import { useCurrentStore } from '@/features/stores/useCurrentStore';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

import { LanguageSetting } from '../components/LanguageSetting';
import { LogoutSection } from '../components/LogoutSection';
import { PermissionsSummary } from '../components/PermissionsSummary';
import { ProfileCard } from '../components/ProfileCard';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { displayName, useProfile } from '../profileApi';

export function ProfileScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const access = useAccess();
  const { store, canSwitch } = useCurrentStore();
  const session = useSessionStore((state) => state.session);
  const [storeSheet, setStoreSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['access'] }),
    ]);
    setRefreshing(false);
  }

  const email = session?.email ?? '';

  return (
    <Screen edges={[]} refreshing={refreshing} onRefresh={() => void refresh()}>
      <ProfileCard
        profile={profile.data}
        loading={profile.isLoading}
        name={displayName(profile.data, email)}
        email={email}
        roleCode={access.data?.role.code ?? session?.role ?? null}
        storeName={store?.name ?? access.data?.store?.name ?? null}
        canSwitchStore={canSwitch}
        onSwitchStore={() => setStoreSheet(true)}
      />

      {access.isLoading ? (
        <SkeletonCards count={2} height={140} />
      ) : access.isError || !access.data ? (
        <ErrorState error={access.error} onRetry={() => void access.refetch()} />
      ) : (
        <>
          <SubscriptionCard access={access.data} />
          <PermissionsSummary access={access.data} />
        </>
      )}

      <View style={styles.section}>
        <SectionHeader icon="tune" title={t('mobile.profile.settingsTitle')} />
        <Card padded={false}>
          <LanguageSetting />
        </Card>
      </View>

      <LogoutSection />

      <AppText variant="bodySm" color="outline" align="center">
        {t('mobile.profile.version', { version: config.appVersion })}
      </AppText>

      <StoreSwitcherSheet visible={storeSheet} onClose={() => setStoreSheet(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
});
