import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import type { PasswordStrength } from '../schemas';

export function PasswordStrengthMeter({ strength }: { strength: PasswordStrength }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3, 4].map((segment) => (
        <View
          key={segment}
          style={[
            styles.segment,
            { backgroundColor: segment <= strength ? colors.brandTeal : colors.surfaceContainerHigh },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radii.full,
  },
});
