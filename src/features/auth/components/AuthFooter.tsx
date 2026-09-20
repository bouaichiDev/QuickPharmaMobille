import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';

export function AuthFooter() {
  const { t } = useTranslation();
  return (
    <View style={styles.footer}>
      <View style={styles.row}>
        <Icon name="verified-user" size="xs" color="secondary" />
        <AppText variant="bodySm" color="outline" align="center">
          {t('mobile.auth.secureFooter')}
        </AppText>
      </View>
      <AppText variant="bodySm" color="outline" align="center">
        {t('mobile.auth.copyright', { year: new Date().getFullYear() })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: spacing.xs,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
