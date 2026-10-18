import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { LogoMark } from '@/components/ui/Logo';
import { colors, layout, radii, shadows, spacing } from '@/theme';

interface AppHeaderProps {
  storeName: string | null;
  canSwitchStore: boolean;
  onStorePress?: () => void;
  userName: string | null;
  onAvatarPress?: () => void;
  storeLabel: string;
  logo?: ReactNode;
  title?: string;
  onBack?: () => void;
}

/** Top bar shared by the signed-in screens (Stitch header). */
export function AppHeader({
  storeName,
  canSwitchStore,
  onStorePress,
  userName,
  onAvatarPress,
  storeLabel,
  logo,
  title,
  onBack,
}: AppHeaderProps) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          style={{ minWidth: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrow-back" color="primary" />
        </Pressable>
      ) : null}
      {logo ?? <LogoMark size={40} />}
      <Pressable
        accessibilityRole={canSwitchStore ? 'button' : 'text'}
        accessibilityLabel={`${storeLabel}: ${storeName ?? ''}`}
        disabled={!canSwitchStore}
        onPress={onStorePress}
        style={styles.storePill}
      >
        <View style={styles.dot} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            variant="labelLg"
            color="onPrimaryFixed"
            numberOfLines={1}
            style={styles.storeName}
          >
            {storeName ?? '—'}
          </AppText>
          {title ? (
            <AppText variant="labelSm" color="outline" numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
        </View>
        {canSwitchStore ? <Icon name="arrow-drop-down" size="md" color="onPrimaryFixed" /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onAvatarPress} hitSlop={6}>
        <Avatar name={userName} size={40} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  storePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
  },
  storeName: {
    flexShrink: 1,
  },
});
