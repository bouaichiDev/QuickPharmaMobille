import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { colors, shadows, spacing, type ColorToken } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export type AlertVariant = 'success' | 'error' | 'warning';
export interface AlertDialogState {
  title: string;
  message: string;
  variant: AlertVariant;
  actionLabel: string;
  onConfirm?: () => void;
}

const variants: Record<
  AlertVariant,
  { icon: IconName; color: ColorToken; background: ColorToken }
> = {
  success: { icon: 'check-circle-outline', color: 'success', background: 'successContainer' },
  error: { icon: 'error-outline', color: 'error', background: 'errorContainer' },
  warning: { icon: 'info-outline', color: 'warning', background: 'warningContainer' },
};

export function AlertDialog({ alert, onClose }: { alert: AlertDialogState; onClose: () => void }) {
  const palette = variants[alert.variant];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
          <View style={[styles.accent, { backgroundColor: colors[palette.color] }]} />
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <View style={[styles.iconHalo, { backgroundColor: colors[palette.background] }]}>
              <Icon name={palette.icon} size={40} color={palette.color} />
            </View>
            <AppText
              variant="headlineSm"
              align="center"
              accessibilityRole="header"
              style={styles.title}
            >
              {alert.title}
            </AppText>
            <AppText
              testID="alert-message"
              variant="bodyMd"
              color="onSurfaceVariant"
              align="center"
              style={styles.message}
            >
              {alert.message}
            </AppText>
          </ScrollView>
          <View style={styles.footer}>
            <Button label={alert.actionLabel} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.scrim,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLowest,
    ...shadows.lg,
  },
  accent: { height: 5 },
  content: { alignItems: 'center', padding: spacing.xl, paddingTop: 28 },
  iconHalo: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { marginBottom: spacing.sm },
  message: { lineHeight: 23 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, paddingTop: spacing.xs },
});
