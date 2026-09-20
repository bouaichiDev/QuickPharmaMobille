import { Text, type TextProps, type TextStyle } from 'react-native';

import { useI18nStore } from '@/i18n/i18nStore';
import { isRTLLanguage } from '@/i18n/languages';
import {
  colors,
  fontForScript,
  typography,
  type ColorToken,
  type TypographyVariant,
} from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
}

/** True while the interface language is written with a script the brand fonts cover. */
export function useLatinFonts(): boolean {
  return !isRTLLanguage(useI18nStore((state) => state.language));
}

export function AppText({
  variant = 'bodyMd',
  color = 'onSurface',
  align,
  uppercase,
  style,
  ...rest
}: AppTextProps) {
  const latin = useLatinFonts();
  const base = typography[variant];
  return (
    <Text
      {...rest}
      style={[
        base,
        fontForScript(base.fontFamily, latin),
        { color: colors[color] },
        align ? { textAlign: align } : null,
        uppercase ? { textTransform: 'uppercase' } : null,
        style,
      ]}
    />
  );
}
