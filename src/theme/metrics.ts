import type { ViewStyle } from 'react-native';

/** Spacing scale (Stitch: xs 4, sm 8, md 12, lg 16, xl 24). */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Radii as rendered in the Stitch HTML (Tailwind overrides). */
export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
} as const;

/** Layout constants shared by the app shell. */
export const layout = {
  screenPadding: spacing.lg,
  headerHeight: 64,
  tabBarHeight: 64,
  touchTarget: 48,
  fabSize: 56,
  cardAccentHeight: 4,
  maxContentWidth: 560,
} as const;

export const shadows = {
  none: {},
  sm: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0b1c30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  fab: {
    shadowColor: '#1cb5a9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
} satisfies Record<string, ViewStyle>;
