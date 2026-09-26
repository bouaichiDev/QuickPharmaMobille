import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useCanManageSubscription } from '@/features/access/hooks';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

import { PlanComparisonTable } from '../components/PlanComparisonTable';
import { PlanLimits, PlanPrice } from '../components/PlanCard';
import { usePlans } from '../plansApi';
import { openWebApp } from '../openWebApp';

export function PlanDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currency = useCurrency();
  const canManage = useCanManageSubscription();
  const { plans, isLoading, isError, error, refetch } = usePlans();

  const plan = plans.find((item) => String(item.id) === id);

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <SkeletonCards count={2} height={200} />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Screen>
    );
  }
  if (!plan) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="search-off" title={t('mobile.plans.notFound')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: plan.name }} />

      <Card accent={plan.isCurrent ? 'secondary' : 'primary'}>
        <View style={styles.header}>
          <View style={styles.flex}>
            {plan.isCurrent ? <Badge tone="secondary" icon="check" label={t('mobile.plans.currentBadge')} /> : null}
            <AppText variant="headlineLg">{plan.name}</AppText>
            {plan.description ? (
              <AppText variant="bodyMd" color="onSurfaceVariant">
                {plan.description}
              </AppText>
            ) : null}
          </View>
          <PlanPrice plan={plan} currency={currency} />
        </View>
        <View style={styles.lines}>
          <PlanLimits plan={plan} />
        </View>
      </Card>

      {plan.features.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={t('mobile.plans.features')} />
          <Card>
            <View style={styles.lines}>
              {plan.features.map((feature) => (
                <View key={feature} style={styles.line}>
                  <Icon name="check-circle-outline" size="sm" color="secondary" />
                  <AppText variant="bodyMd" style={styles.flex}>
                    {feature}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      {plans.length > 1 ? (
        <View style={styles.section}>
          <SectionHeader title={t('mobile.plans.compareTitle')} />
          <PlanComparisonTable plans={plans} focusedPlanId={plan.id} currency={currency} />
        </View>
      ) : null}

      {!canManage ? (
        <InlineNotice tone="locked" message={t('mobile.plans.managerOnly')} />
      ) : plan.isCurrent ? (
        <Button label={t('mobile.plans.currentPlan')} variant="tonal" disabled />
      ) : plan.isFree ? null : (
        <>
          <InlineNotice tone="info" message={t('mobile.plans.webOnly')} />
          <Button label={t('mobile.plans.goToWeb')} icon="open-in-new" onPress={() => void openWebApp()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  lines: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
