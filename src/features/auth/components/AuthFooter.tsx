import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { Linking, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';
export function AuthFooter() {
  const ta = useAccountTranslation();
  const { t } = useTranslation();
  return (
    <View style={styles.footer}>
      <Button
        label={ta('account_security_privacy_policy')}
        variant="ghost"
        onPress={() => {
          void Linking.openURL('https://quickpharma.ma/politique-de-confidentialite').catch(
            () => undefined,
          );
        }}
      />
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
