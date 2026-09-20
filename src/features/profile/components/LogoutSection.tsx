import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { useLogout } from '@/features/auth/useAuthMutations';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';

export function LogoutSection() {
  const { t } = useTranslation();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Icon name="logout" size="md" color="error" flipInRTL />
        <AppText variant="labelLg" color="onErrorContainer">
          {t('mobile.profile.sessionTitle')}
        </AppText>
      </View>
      <AppText variant="bodyMd" color="onSurfaceVariant">
        {t('mobile.profile.logoutMessage')}
      </AppText>
      <Button
        label={t('mobile.profile.logoutButton')}
        icon="power-settings-new"
        variant="dangerSoft"
        onPress={() => setConfirming(true)}
        testID="logout-button"
      />
      <ConfirmDialog
        visible={confirming}
        title={t('mobile.profile.logoutConfirmTitle')}
        message={t('mobile.profile.logoutConfirmMessage')}
        confirmLabel={t('mobile.common.confirm')}
        cancelLabel={t('mobile.common.cancel')}
        destructive
        loading={logout.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => logout.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.errorContainer,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
