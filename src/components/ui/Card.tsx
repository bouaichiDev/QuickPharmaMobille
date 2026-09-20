import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, shadows, spacing, type ColorToken } from '@/theme';

interface CardProps {
  children: ReactNode;
  /** Coloured top bar used by Stitch to encode a card's status. */
  accent?: ColorToken;
  tone?: 'default' | 'muted' | 'danger' | 'primary';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<NonNullable<CardProps['tone']>, ColorToken> = {
  default: 'surfaceContainerLowest',
  muted: 'surfaceContainerLow',
  danger: 'errorContainer',
  primary: 'primary',
};

export function Card({ children, accent, tone = 'default', padded = true, style, testID }: CardProps) {
  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: colors[TONES[tone]] }, style]}
    >
      {accent ? <View style={[styles.accent, { backgroundColor: colors[accent] }]} /> : null}
      <View style={padded ? styles.padded : null}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    overflow: 'hidden',
    ...shadows.sm,
  },
  accent: {
    height: layout.cardAccentHeight,
  },
  padded: {
    padding: spacing.lg,
  },
});
