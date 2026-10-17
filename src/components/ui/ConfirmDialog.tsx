import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { useResponsiveLayout } from './useResponsiveLayout';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { needsReflow, height } = useResponsiveLayout();
  const [measurement, setMeasurement] = useState<{
    title: string;
    message: string;
    height: number;
  }>();
  const overflow =
    measurement?.title === title &&
    measurement.message === message &&
    measurement.height > height - spacing.xl * 2;
  const adaptive = needsReflow || overflow;
  const content = (
    <>
      <AppText variant="headlineSm">{title}</AppText>
      <AppText variant="bodyMd" color="onSurfaceVariant">
        {message}
      </AppText>
      <View style={adaptive ? [styles.actions, styles.stackedActions] : styles.actions}>
        <Button
          label={cancelLabel}
          variant="tonal"
          onPress={onCancel}
          disabled={loading}
          style={adaptive ? undefined : styles.action}
        />
        <Button
          label={confirmLabel}
          variant={destructive ? 'danger' : 'primary'}
          onPress={onConfirm}
          loading={loading}
          style={adaptive ? undefined : styles.action}
        />
      </View>
    </>
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? () => {} : onCancel}
    >
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={loading ? undefined : onCancel}
        />
        <View
          style={adaptive ? [styles.dialog, styles.adaptiveDialog] : styles.dialog}
          accessibilityRole="alert"
          onLayout={
            adaptive
              ? undefined
              : (event) => {
                  const measured = event.nativeEvent.layout.height;
                  if (measured > height - spacing.xl * 2)
                    setMeasurement({ title, message, height: measured });
                }
          }
        >
          {adaptive ? (
            <ScrollView bounces={false} contentContainerStyle={styles.adaptiveContent}>
              {content}
            </ScrollView>
          ) : (
            content
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  scrim: { backgroundColor: colors.scrim },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  action: { flex: 1 },
  adaptiveDialog: { maxHeight: '90%', padding: 0, gap: 0 },
  adaptiveContent: { padding: spacing.xl, gap: spacing.md },
  stackedActions: { flexDirection: 'column' },
});
