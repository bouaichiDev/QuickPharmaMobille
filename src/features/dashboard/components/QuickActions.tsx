import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAccess } from '@/features/access/useAccess';
import { decideAny } from '@/features/access/decisions';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translate';
import { colors, radii, shadows, spacing } from '@/theme';

interface QuickAction {
  key: string;
  icon: IconName;
  title: TranslationKey;
  hint: TranslationKey;
  href: Href;
  /** Empty = available to every signed-in user (backend `self` routes). */
  anyOf: readonly string[];
}

/**
 * Only actions with a real mobile screen are listed (sale, stock entry and
 * scanner screens do not exist yet — see docs/implementation-status.md).
 */
const ACTIONS: QuickAction[] = [
  {
    key: 'notifications',
    icon: 'notifications-none',
    title: 'mobile.dashboard.actionNotifications',
    hint: 'mobile.dashboard.actionNotificationsHint',
    href: '/notifications',
    anyOf: [],
  },
  {
    key: 'plans',
    icon: 'workspace-premium',
    title: 'mobile.dashboard.actionPlans',
    hint: 'mobile.dashboard.actionPlansHint',
    href: '/plans',
    anyOf: ['subscription.view', 'subscription.manage'],
  },
];

export function QuickActions() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: access } = useAccess();

  const visible = ACTIONS.filter((action) => decideAny(access, action.anyOf).state === 'allowed');
  if (visible.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('mobile.dashboard.quickActions')} overline />
      <View style={styles.grid}>
        {visible.map((action, index) => {
          const featured = index === 0;
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={() => router.push(action.href)}
              style={({ pressed }) => [
                styles.tile,
                featured ? styles.featured : styles.regular,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.iconBox, featured ? styles.iconFeatured : styles.iconRegular]}>
                <Icon name={action.icon} size="md" color={featured ? 'onPrimary' : 'primary'} />
              </View>
              <View>
                <AppText variant="headlineSm" color={featured ? 'onPrimary' : 'onSurface'}>
                  {t(action.title)}
                </AppText>
                <AppText variant="bodySm" color={featured ? 'onPrimaryContainer' : 'onSurfaceVariant'}>
                  {t(action.hint)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 112,
    borderRadius: radii.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadows.sm,
  },
  featured: {
    backgroundColor: colors.primary,
  },
  regular: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
  },
  pressed: {
    opacity: 0.9,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFeatured: {
    backgroundColor: colors.primaryContainer,
  },
  iconRegular: {
    backgroundColor: colors.surfaceContainerHigh,
  },
});
