import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, spacing } from '@/theme';

export function OfflineBanner() {
  const { online } = useNetworkStatus();
  const { t } = useTranslation();
  if (online) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="cloud-off" size="sm" color="inverseOnSurface" />
      <AppText variant="labelMd" color="inverseOnSurface" style={styles.text}>
        {t('mobile.common.offlineTitle')} — {t('mobile.common.offlineMessage')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inverseSurface,
  },
  text: {
    flex: 1,
  },
});
