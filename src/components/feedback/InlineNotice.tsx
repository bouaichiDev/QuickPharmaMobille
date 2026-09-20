import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, radii, spacing, type ColorToken } from '@/theme';

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'locked';

const TONES: Record<Tone, { bg: ColorToken; fg: ColorToken; icon: IconName }> = {
  info: { bg: 'surfaceContainerHigh', fg: 'onPrimaryFixed', icon: 'info-outline' },
  warning: { bg: 'warningContainer', fg: 'onWarningContainer', icon: 'warning-amber' },
  danger: { bg: 'errorContainer', fg: 'onErrorContainer', icon: 'error-outline' },
  success: { bg: 'successContainer', fg: 'onSuccessContainer', icon: 'check-circle-outline' },
  locked: { bg: 'lockedContainer', fg: 'locked', icon: 'lock-outline' },
};

interface InlineNoticeProps {
  tone?: Tone;
  title?: string;
  message: string;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function InlineNotice({
  tone = 'info',
  title,
  message,
  action,
  onDismiss,
  dismissLabel,
}: InlineNoticeProps) {
  const palette = TONES[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: colors[palette.bg] }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Icon name={palette.icon} size="md" color={palette.fg} />
      <View style={styles.texts}>
        {title ? (
          <AppText variant="labelLg" color={palette.fg}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="bodyMd" color={palette.fg}>
          {message}
        </AppText>
        {action}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel={dismissLabel}>
          <Icon name="close" size="sm" color={palette.fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
