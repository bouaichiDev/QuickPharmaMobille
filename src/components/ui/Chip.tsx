import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  onPress?: () => void;
}

/** Filter chip of the Stitch notifications / dashboard screens. */
export function Chip({ label, selected = false, count, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : styles.unselected]}
    >
      <AppText variant="labelLg" color={selected ? 'onPrimary' : 'onSurfaceVariant'} numberOfLines={1}>
        {label}
      </AppText>
      {count !== undefined ? (
        <View style={[styles.count, selected ? styles.countSelected : styles.countUnselected]}>
          <AppText variant="labelSm" color={selected ? 'primary' : 'onSurfaceVariant'}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    borderRadius: radii.full,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  unselected: {
    backgroundColor: colors.surfaceContainer,
  },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countSelected: {
    backgroundColor: colors.onPrimary,
  },
  countUnselected: {
    backgroundColor: colors.surfaceContainerHighest,
  },
});
