import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, spacing } from '@/theme';
import { formatAmount } from '@/utils/format';

import type { PlanView } from '../types';

interface PlanCardProps {
  plan: PlanView;
  currency: string | null;
  canManage: boolean;
  onDetails: () => void;
  onOpenWeb: () => void;
}

const MAX_FEATURES = 6;

export function PlanLimits({ plan }: { plan: PlanView }) {
  const { t } = useTranslation();
  const lines = [
    {
      icon: 'group' as const,
      text: plan.maxUsers ? t('mobile.plans.maxUsers', { count: plan.maxUsers }) : t('mobile.plans.unlimitedUsers'),
    },
    {
      icon: 'domain' as const,
      text: plan.maxStores ? t('mobile.plans.maxStores', { count: plan.maxStores }) : t('mobile.plans.unlimitedStores'),
    },
  ];
  return (
    <>
      {lines.map((line) => (
        <View key={line.icon} style={styles.line}>
          <Icon name={line.icon} size="sm" color="primary" />
          <AppText variant="bodyMd" style={styles.lineText}>
            {line.text}
          </AppText>
        </View>
      ))}
    </>
  );
}

export function PlanPrice({ plan, currency }: { plan: PlanView; currency: string | null }) {
  const { t, locale } = useTranslation();
  return (
    <View style={styles.price}>
      <AppText variant="headlineLg" color="primary">
        {plan.isFree ? t('mobile.plans.free') : formatAmount(plan.price, currency, locale)}
      </AppText>
      {!plan.isFree && plan.durationDays ? (
        <AppText variant="bodySm" color="onSurfaceVariant">
          {t('mobile.plans.duration', { days: plan.durationDays })}
        </AppText>
      ) : null}
    </View>
  );
}

export function PlanCard({
  plan,
  currency,
  canManage,
  onDetails,
  onOpenWeb,
}: PlanCardProps) {
  const { t } = useTranslation();

  return (
    <Card accent={plan.isCurrent ? 'secondary' : 'primary'} tone={plan.isCurrent ? 'muted' : 'default'}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          {plan.isCurrent ? (
            <Badge tone="secondary" icon="check" label={t('mobile.plans.currentBadge')} />
          ) : null}
          <AppText variant="headlineMd">{plan.name}</AppText>
          {plan.description ? (
            <AppText variant="bodySm" color="onSurfaceVariant">
              {plan.description}
            </AppText>
          ) : null}
        </View>
        <PlanPrice plan={plan} currency={currency} />
      </View>

      <View style={styles.divider} />

      <View style={styles.lines}>
        <PlanLimits plan={plan} />
        {plan.features.slice(0, MAX_FEATURES).map((feature) => (
          <View key={feature} style={styles.line}>
            <Icon name="check-circle-outline" size="sm" color="secondary" />
            <AppText variant="bodyMd" style={styles.lineText}>
              {feature}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {plan.isCurrent ? (
          <Button label={t('mobile.plans.currentPlan')} variant="tonal" disabled />
        ) : canManage && !plan.isFree ? (
          // Payment happens on the web app only; the manager is sent there.
          <Button label={t('mobile.plans.goToWeb')} icon="open-in-new" onPress={onOpenWeb} />
        ) : null}
        <Button label={t('mobile.plans.details')} variant="ghost" onPress={onDetails} trailingIcon="chevron-right" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  price: {
    alignItems: 'flex-end',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.lg,
  },
  lines: {
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lineText: {
    flex: 1,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
