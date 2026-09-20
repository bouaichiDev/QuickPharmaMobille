import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';

export function PlansHero() {
  const { t } = useTranslation();
  return (
    <View style={styles.hero}>
      <View style={styles.badge}>
        <Icon name="verified-user" size={14} color="secondaryFixed" />
        <AppText variant="labelSm" color="inverseOnSurface">
          {t('mobile.plans.heroBadge')}
        </AppText>
      </View>
      <AppText variant="headlineLg" color="onPrimary">
        {t('mobile.plans.heroTitle')}
      </AppText>
      <AppText variant="bodyMd" color="onPrimaryContainer">
        {t('mobile.plans.heroSubtitle')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    borderBottomWidth: 4,
    borderBottomColor: colors.secondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.onPrimaryOverlay,
  },
});
