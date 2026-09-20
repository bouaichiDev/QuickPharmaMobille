import { Image, StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

import { Icon } from './Icon';

// Official logo exported with the Stitch assets (517x184).
const LOGO = require('../../../assets/logo.png');
const LOGO_RATIO = 517 / 184;

export function Logo({ width = 200 }: { width?: number }) {
  return (
    <Image
      source={LOGO}
      accessibilityLabel="QuickPharma"
      resizeMode="contain"
      style={{ width, height: width / LOGO_RATIO }}
    />
  );
}

/** Compact brand mark of the app header (Stitch: local_pharmacy in a blue square). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]} accessibilityLabel="QuickPharma">
      <Icon name="local-pharmacy" size={size * 0.55} color="onPrimary" />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    borderRadius: radii.lg,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
