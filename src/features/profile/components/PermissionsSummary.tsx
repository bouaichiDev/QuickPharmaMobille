import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import type { EffectiveAccess } from '@/types/access';
import { spacing } from '@/theme';
import { accessCodeMessage } from '@/utils/accessMessage';

const MAX_RESTRICTIONS = 5;

/** Read-only summary of the role's permissions as computed by /access/me. */
export function PermissionsSummary({ access }: { access: EffectiveAccess }) {
  const translator = useTranslation();
  const { t, tDynamic } = translator;
  const restrictions = access.restrictions ?? [];

  return (
    <Card>
      <View style={styles.header}>
        <Icon name="admin-panel-settings" size="md" color="primary" />
        <AppText variant="labelLg" style={styles.flex}>
          {t('mobile.profile.permissionsTitle')}
        </AppText>
      </View>
      <View style={styles.badges}>
        <Badge tone="secondary" label={t('mobile.profile.permissionsCount', { count: access.permissions.length })} />
        {restrictions.length > 0 ? (
          <Badge tone="locked" icon="lock" label={t('mobile.profile.restrictionsCount', { count: restrictions.length })} />
        ) : null}
      </View>
      {restrictions.slice(0, MAX_RESTRICTIONS).map((restriction) => (
        <View key={restriction.permission} style={styles.restriction}>
          <Icon name="lock-outline" size="xs" color="locked" />
          <View style={styles.flex}>
            <AppText variant="labelMd">
              {tDynamic(`access.permission.${restriction.permission}`, restriction.permission)}
            </AppText>
            <AppText variant="bodySm" color="onSurfaceVariant">
              {accessCodeMessage(restriction.code, restriction.message_key, translator)}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  restriction: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
