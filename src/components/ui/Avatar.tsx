import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

import { AppText } from './AppText';

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

export function Avatar({ name, size = 40 }: { name: string | null | undefined; size?: number }) {
  return (
    <View
      style={[styles.avatar, { width: size, height: size }]}
      accessibilityLabel={name ?? undefined}
    >
      <AppText variant={size > 48 ? 'headlineMd' : 'labelLg'} color="onPrimaryFixed">
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
