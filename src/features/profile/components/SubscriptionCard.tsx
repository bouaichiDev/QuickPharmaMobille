import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { quotaStateView } from '@/features/access/decisions';
import { useAnyPermission, useCanManageSubscription } from '@/features/access/hooks';
import { openWebApp } from '@/features/subscriptions/openWebApp';
import { useTranslation } from '@/i18n/useTranslation';
import type { EffectiveAccess } from '@/types/access';
import { colors, radii, spacing } from '@/theme';
import { formatDate, formatNumber } from '@/utils/format';

interface SubscriptionCardProps {
  access: EffectiveAccess;
}

export function SubscriptionCard({ access }: SubscriptionCardProps) {
  const { t, tDynamic, locale } = useTranslation();
  const router = useRouter();
  const canViewPlans = useAnyPermission(['subscription.view', 'subscription.manage']).state === 'allowed';
  const canManage = useCanManageSubscription();
  const subscription = access.subscription;
  const isPlatform = subscription?.terms === 'platform';

  const quotas = Object.values(access.quotas ?? {});

  return (
    <View style={styles.section}>
      <SectionHeader icon="workspace-premium" title={t('mobile.profile.subscriptionTitle')} />
      <Card accent="primary">
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="headlineMd">
              {isPlatform
                ? t('mobile.profile.platformAccess')
                : (subscription?.plan_name ?? t('mobile.profile.noSubscription'))}
            </AppText>
            {subscription?.end_date && !isPlatform ? (
              <AppText variant="bodySm" color="onSurfaceVariant">
                {t('mobile.profile.endsOn', { date: formatDate(subscription.end_date, locale) })}
              </AppText>
            ) : null}
          </View>
          {subscription ? (
            <Badge tone="secondary" icon="check" label={t('mobile.profile.planActive')} />
          ) : (
            <Badge tone="danger" label={t('mobile.profile.noSubscription')} />
          )}
        </View>

        {quotas.length > 0 ? (
          <View style={styles.quotas}>
            <AppText variant="labelMd" color="onSurfaceVariant" uppercase>
              {t('mobile.profile.quotasTitle')}
            </AppText>
            {quotas.map((quota) => {
              const view = quotaStateView(quota, quota.key);
              const value =
                view.state === 'unlimited'
                  ? t('mobile.profile.quotaUnlimited')
                  : view.state === 'limited'
                    ? // Isolated left-to-right run: "2 / 1" must not read "1 / 2" in Arabic.
                      `⁦${t('mobile.profile.quotaUsage', {
                        used: view.used === null ? '—' : formatNumber(view.used, locale),
                        limit: formatNumber(view.limit, locale),
                      })}⁩`
                    : t('mobile.profile.quotaNotConfigured');
              const exceeded = view.state === 'limited' && view.exceeded;
              return (
                <View key={quota.key} style={styles.quotaRow}>
                  <AppText variant="bodyMd" style={styles.flex}>
                    {tDynamic(`access.quota.${quota.key}`, quota.key)}
                  </AppText>
                  <AppText variant="dataTabular" color={exceeded ? 'error' : 'onSurface'}>
                    {value}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={styles.actions}>
          {canManage && !isPlatform ? (
            <Button label={t('mobile.profile.manageOnWeb')} icon="open-in-new" onPress={() => void openWebApp()} />
          ) : null}
          {canViewPlans && !isPlatform ? (
            <Button
              label={canManage ? t('mobile.profile.changePlan') : t('mobile.profile.viewPlans')}
              variant="tonal"
              onPress={() => router.push('/plans')}
            />
          ) : null}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  quotas: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    gap: spacing.sm,
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
