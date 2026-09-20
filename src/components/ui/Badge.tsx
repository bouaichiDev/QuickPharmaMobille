import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, type ColorToken } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type BadgeTone =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'locked';

const TONES: Record<BadgeTone, { bg: ColorToken; fg: ColorToken }> = {
  primary: { bg: 'primaryFixed', fg: 'onPrimaryFixed' },
  secondary: { bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  success: { bg: 'successContainer', fg: 'onSuccessContainer' },
  warning: { bg: 'warningContainer', fg: 'onWarningContainer' },
  danger: { bg: 'errorContainer', fg: 'onErrorContainer' },
  neutral: { bg: 'surfaceContainerHigh', fg: 'onSurfaceVariant' },
  locked: { bg: 'lockedContainer', fg: 'locked' },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  uppercase?: boolean;
}

export function Badge({ label, tone = 'neutral', icon, uppercase }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors[palette.bg] }]}>
      {icon ? <Icon name={icon} size={12} color={palette.fg} /> : null}
      <AppText variant="badge" color={palette.fg} uppercase={uppercase} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
});
