import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radii, spacing, type ColorToken } from '@/theme';

import { AppText } from './AppText';
import { useResponsiveLayout } from './useResponsiveLayout';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'tonal' | 'outline' | 'danger' | 'dangerSoft' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: ColorToken; fg: ColorToken; border?: ColorToken }> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  tonal: { bg: 'surfaceContainerHigh', fg: 'primary' },
  outline: { bg: 'surfaceContainerLowest', fg: 'primary', border: 'outlineVariant' },
  danger: { bg: 'error', fg: 'onError' },
  dangerSoft: { bg: 'errorContainer', fg: 'onErrorContainer' },
  ghost: { bg: 'transparent', fg: 'primary' },
};

/**
 * Loading buttons ignore presses, which prevents double submissions while a
 * mutation is running.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = true,
  compact = false,
  style,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { needsReflow } = useResponsiveLayout();
  const palette = VARIANTS[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        needsReflow ? styles.adaptiveButton : null,
        compact ? styles.compact : null,
        fullWidth ? styles.fullWidth : null,
        {
          backgroundColor: colors[palette.bg],
          borderColor: palette.border ? colors[palette.border] : colors.transparent,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[palette.fg]} />
      ) : (
        <View style={needsReflow ? [styles.content, styles.adaptiveContent] : styles.content}>
          {icon ? <Icon name={icon} size="sm" color={palette.fg} /> : null}
          <AppText
            variant="labelLg"
            color={palette.fg}
            numberOfLines={needsReflow ? undefined : 1}
            style={needsReflow ? styles.adaptiveLabel : undefined}
          >
            {label}
          </AppText>
          {trailingIcon ? <Icon name={trailingIcon} size="sm" color={palette.fg} flipInRTL /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  adaptiveButton: { paddingVertical: spacing.sm },
  adaptiveContent: { maxWidth: '100%', minWidth: 0 },
  adaptiveLabel: { flexShrink: 1, textAlign: 'center' },
  base: {
    minHeight: layout.touchTarget,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
