import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, radii, spacing, type ColorToken } from '@/theme';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  accent?: ColorToken;
  size?: 'large' | 'small';
  testID?: string;
}

/** Metric card of the Stitch dashboard (large "CA réalisé" and small tiles). */
export function KpiCard({ label, value, hint, icon, accent = 'primary', size = 'small', testID }: KpiCardProps) {
  const large = size === 'large';
  return (
    <Card accent={accent} style={large ? null : styles.small} testID={testID}>
      <View style={styles.header}>
        <AppText variant={large ? 'labelLg' : 'labelMd'} color="onSurfaceVariant" style={styles.label}>
          {label}
        </AppText>
        {large ? (
          <View style={styles.iconCircle}>
            <Icon name={icon} size="lg" color={accent} />
          </View>
        ) : (
          <Icon name={icon} size="sm" color={accent} />
        )}
      </View>
      <AppText
        variant={large ? 'displayLg' : 'dataMetric'}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.value}
      >
        {value}
      </AppText>
      {hint ? (
        <AppText variant="bodySm" color="onSurfaceVariant">
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  small: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});
