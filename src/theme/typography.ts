import type { TextStyle } from 'react-native';

/** Font family names registered in the root layout (expo-google-fonts). */
export const fontFamilies = {
  headingSemiBold: 'PlusJakartaSans_600SemiBold',
  headingBold: 'PlusJakartaSans_700Bold',
  headingExtraBold: 'PlusJakartaSans_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Type scale from the Stitch DESIGN.md / Tailwind config. */
export const typography = {
  displayLg: { fontFamily: fontFamilies.headingBold, fontSize: 32, lineHeight: 40 },
  headlineLg: { fontFamily: fontFamilies.headingBold, fontSize: 24, lineHeight: 32 },
  headlineMd: { fontFamily: fontFamilies.headingSemiBold, fontSize: 20, lineHeight: 28 },
  headlineSm: { fontFamily: fontFamilies.headingSemiBold, fontSize: 18, lineHeight: 24 },
  dataMetric: { fontFamily: fontFamilies.headingBold, fontSize: 28, lineHeight: 34 },
  bodyLg: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 16 },
  labelLg: { fontFamily: fontFamilies.bodySemiBold, fontSize: 14, lineHeight: 20 },
  labelMd: { fontFamily: fontFamilies.bodySemiBold, fontSize: 12, lineHeight: 16 },
  labelSm: { fontFamily: fontFamilies.bodySemiBold, fontSize: 11, lineHeight: 14 },
  badge: { fontFamily: fontFamilies.bodyBold, fontSize: 10, lineHeight: 12, letterSpacing: 0.4 },
  dataTabular: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

const WEIGHT_BY_FAMILY: Record<string, TextStyle['fontWeight']> = {
  [fontFamilies.headingSemiBold]: '600',
  [fontFamilies.headingBold]: '700',
  [fontFamilies.headingExtraBold]: '800',
  [fontFamilies.body]: '400',
  [fontFamilies.bodyMedium]: '500',
  [fontFamilies.bodySemiBold]: '600',
  [fontFamilies.bodyBold]: '700',
};

/**
 * Plus Jakarta Sans and Inter have no Arabic glyphs: Android then measures the
 * text with the brand font and renders it with a fallback, which truncates
 * labels. For scripts they do not cover, use the system font with the same weight.
 */
export function fontForScript(fontFamily: string | undefined, usesLatinFonts: boolean): TextStyle {
  if (usesLatinFonts || !fontFamily) return { fontFamily };
  return { fontFamily: undefined, fontWeight: WEIGHT_BY_FAMILY[fontFamily] ?? '400' };
}
