import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  /** Small caps style used for "ACTIONS RAPIDES" in Stitch. */
  overline?: boolean;
}

export function SectionHeader({ title, icon, actionLabel, onAction, overline }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.title}>
        {icon ? <Icon name={icon} size="md" color="primary" /> : null}
        <AppText
          variant={overline ? 'labelMd' : 'headlineSm'}
          color={overline ? 'onSurfaceVariant' : 'onSurface'}
          uppercase={overline}
          accessibilityRole="header"
        >
          {title}
        </AppText>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={styles.action}>
          <AppText variant="labelMd" color="primary">
            {actionLabel}
          </AppText>
          <Icon name="chevron-right" size="sm" color="primary" flipInRTL />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
