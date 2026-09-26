import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useCanManageSubscription } from '@/features/access/hooks';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

import { PlanCard } from '../components/PlanCard';
import { PlansHero } from '../components/PlansHero';
import { usePlans } from '../plansApi';
import { openWebApp } from '../openWebApp';

export function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currency = useCurrency();
  const canManage = useCanManageSubscription();
  const { plans, isLoading, isError, error, refetch, isRefetching } = usePlans();

  return (
    <Screen edges={['bottom']} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PlansHero />

      {canManage ? (
        <InlineNotice tone="info" message={t('mobile.plans.webOnly')} />
      ) : (
        <InlineNotice tone="locked" message={t('mobile.plans.managerOnly')} />
      )}

      {isLoading ? (
        <SkeletonCards count={3} height={220} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : plans.length === 0 ? (
        <EmptyState icon="workspace-premium" title={t('mobile.plans.emptyTitle')} />
      ) : (
        <View style={styles.list}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              canManage={canManage}
              onOpenWeb={() => void openWebApp()}
              onDetails={() => router.push({ pathname: '/plans/[id]', params: { id: String(plan.id) } })}
            />
          ))}
        </View>
      )}

      <AppText variant="bodySm" color="outline" align="center">
        {t('mobile.plans.terms')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
});
