import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { I18nManager, type StyleProp, type TextStyle } from 'react-native';

import { colors, iconSizes, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface IconProps {
  name: IconName;
  size?: keyof typeof iconSizes | number;
  color?: ColorToken;
  /** Mirror directional glyphs (arrows, chevrons) in right-to-left layouts. */
  flipInRTL?: boolean;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

/** Material icons: the closest Expo-compatible set to Stitch's Material Symbols. */
export function Icon({
  name,
  size = 'md',
  color = 'onSurface',
  flipInRTL,
  style,
  accessibilityLabel,
}: IconProps) {
  const pixelSize = typeof size === 'number' ? size : iconSizes[size];
  return (
    <MaterialIcons
      name={name}
      size={pixelSize}
      color={colors[color]}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[flipInRTL && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null, style]}
    />
  );
}
