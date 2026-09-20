import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useCanManageSubscription } from '@/features/access/hooks';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

import { PlanCard } from '../components/PlanCard';
import { PlansHero } from '../components/PlansHero';
import { usePlans } from '../plansApi';
import { useBillingAvailability, useRestorePurchases, useSubscribe } from '../useBilling';

export function PlansScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currency = useCurrency();
  const canManage = useCanManageSubscription();
  const { plans, isLoading, isError, error, refetch, isRefetching } = usePlans();
  const availability = useBillingAvailability();
  const subscribe = useSubscribe();
  const restore = useRestorePurchases();

  const billingAvailable = availability.data?.available ?? false;
  const billingBlocked = subscribe.isError || restore.isError;

  return (
    <Screen edges={['bottom']} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <PlansHero />

      {!canManage ? <InlineNotice tone="locked" message={t('mobile.plans.managerOnly')} /> : null}
      {canManage && (!billingAvailable || billingBlocked) ? (
        <InlineNotice
          tone="warning"
          message={restore.isError ? t('mobile.plans.restoreUnavailable') : t('mobile.plans.billingUnavailable')}
        />
      ) : null}

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
              billingAvailable={billingAvailable}
              subscribing={subscribe.isPending && subscribe.variables?.id === plan.id}
              onSubscribe={() => subscribe.mutate(plan)}
              onDetails={() => router.push({ pathname: '/plans/[id]', params: { id: String(plan.id) } })}
            />
          ))}
        </View>
      )}

      {canManage ? (
        <Button
          label={t('mobile.plans.restorePurchases')}
          icon="restore"
          variant="ghost"
          loading={restore.isPending}
          onPress={() => restore.mutate()}
        />
      ) : null}

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
