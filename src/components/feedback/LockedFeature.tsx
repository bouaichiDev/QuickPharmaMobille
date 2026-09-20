import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors, radii, spacing } from '@/theme';

interface LockedFeatureProps {
  title: string;
  /** Why access is blocked (translated from the backend decision). */
  reason: string;
  /** Only provided when the viewer is allowed to manage the subscription. */
  upgradeLabel?: string;
  onUpgrade?: () => void;
  hint?: string;
  compact?: boolean;
}

/** Padlock state for a feature refused by role, plan, quota or store. */
export function LockedFeature({
  title,
  reason,
  upgradeLabel,
  onUpgrade,
  hint,
  compact,
}: LockedFeatureProps) {
  return (
    <View style={[styles.box, compact ? styles.compact : null]} accessibilityRole="summary">
      <View style={styles.header}>
        <View style={styles.lock}>
          <Icon name="lock" size="md" color="locked" />
        </View>
        <View style={styles.texts}>
          <AppText variant="labelLg" color="locked">
            {title}
          </AppText>
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {reason}
          </AppText>
        </View>
      </View>
      {hint ? (
        <AppText variant="bodySm" color="outline">
          {hint}
        </AppText>
      ) : null}
      {upgradeLabel && onUpgrade ? (
        <Button label={upgradeLabel} onPress={onUpgrade} icon="workspace-premium" variant="tonal" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.lockedContainer,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
  },
  compact: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  lock: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
