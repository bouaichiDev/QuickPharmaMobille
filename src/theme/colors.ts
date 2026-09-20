/**
 * Colour tokens extracted from the Stitch export (Material 3 palette shared by
 * the dashboard, notifications, plans and profile screens). The auth screens
 * use the same palette, as decided for the mobile app.
 */
export const palette = {
  primary: '#00417c',
  onPrimary: '#ffffff',
  primaryContainer: '#0a58a3',
  onPrimaryContainer: '#b4d0ff',
  primaryFixed: '#d5e3ff',
  primaryFixedDim: '#a6c8ff',
  onPrimaryFixed: '#001c3b',
  onPrimaryOverlay: 'rgba(255, 255, 255, 0.15)',

  secondary: '#006a63',
  onSecondary: '#ffffff',
  secondaryContainer: '#72f4e7',
  onSecondaryContainer: '#006f67',
  secondaryFixed: '#75f7ea',
  secondaryFixedDim: '#55dacd',
  brandTeal: '#1cb5a9',

  tertiary: '#384055',
  tertiaryContainer: '#4f576d',
  tertiaryFixed: '#dae2fd',
  onTertiaryFixed: '#131b2e',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceDim: '#cbdbf5',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#424751',
  outline: '#727782',
  outlineVariant: '#c2c6d3',
  outlineSoft: 'rgba(194, 198, 211, 0.4)',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',

  // Semantic status colours from DESIGN.md.
  success: '#059669',
  successContainer: '#ecfdf5',
  onSuccessContainer: '#047857',
  warning: '#d97706',
  warningContainer: '#fffbeb',
  onWarningContainer: '#b45309',
  locked: '#334155',
  lockedContainer: '#f1f5f9',
  lockedBadge: '#4f46e5',

  transparent: 'transparent',
  scrim: 'rgba(11, 28, 48, 0.45)',
} as const;

export type ColorToken = keyof typeof palette;

export const colors = palette;
