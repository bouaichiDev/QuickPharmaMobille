import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme';

export function CrmOverview({
  title,
  subtitle,
  icon,
  count,
  value,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  count?: string;
  value?: string;
}) {
  return (
    <View style={styles.overview}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <AppText variant="labelSm" color="secondary" uppercase>
            QuickPharma CRM
          </AppText>
          <AppText variant="headlineLg">{title}</AppText>
        </View>
        <View style={styles.icon}>
          <Icon name={icon} color="primary" size={24} />
        </View>
      </View>
      <AppText variant="bodyMd" color="onSurfaceVariant">
        {subtitle}
      </AppText>
      {count ? (
        <AppText variant="labelMd" color="secondary">
          {count}
        </AppText>
      ) : null}
      {value ? (
        <AppText variant="displayLg" color="primary">
          {value}
        </AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  overview: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 4 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
