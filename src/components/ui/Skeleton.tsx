import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { colors, radii, spacing } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 16, radius = radii.md }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius: radius, opacity }]}
    />
  );
}

/** Placeholder for a stack of cards while data is loading. */
export function SkeletonCards({ count = 3, height = 96 }: { count?: number; height?: number }) {
  return (
    <View style={styles.stack} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius={radii.lg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  stack: {
    gap: spacing.md,
  },
});
