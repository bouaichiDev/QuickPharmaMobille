import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function CrmGradient({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View
      style={[
        style,
        { experimental_backgroundImage: 'linear-gradient(135deg, #00417c, #0a58a3, #006a63)' },
      ]}
    >
      {children}
    </View>
  );
}
