import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing, type ColorToken } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ListRowProps {
  icon?: IconName;
  iconTone?: ColorToken;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  divider?: boolean;
}

/** Settings row of the Stitch profile screen. */
export function ListRow({
  icon,
  iconTone = 'primary',
  title,
  subtitle,
  right,
  onPress,
  showChevron = !!onPress,
  divider = false,
}: ListRowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, divider ? styles.divider : null, pressed ? styles.pressed : null]}
    >
      {icon ? (
        <View style={styles.iconBox}>
          <Icon name={icon} size="md" color={iconTone} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="labelLg">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySm" color="onSurfaceVariant">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Icon name="chevron-right" size="md" color="outline" flipInRTL /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  pressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
