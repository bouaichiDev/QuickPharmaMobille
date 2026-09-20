import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';

import type { UserProfile } from '../profileApi';

interface ProfileCardProps {
  profile: UserProfile | null | undefined;
  loading: boolean;
  name: string;
  email: string;
  roleCode: string | null;
  storeName: string | null;
  canSwitchStore: boolean;
  onSwitchStore: () => void;
}

export function ProfileCard({
  profile,
  loading,
  name,
  email,
  roleCode,
  storeName,
  canSwitchStore,
  onSwitchStore,
}: ProfileCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.identity}>
        <Avatar name={name} size={72} />
        <View style={styles.texts}>
          {loading ? (
            <Skeleton width="70%" height={24} />
          ) : (
            <AppText variant="headlineMd">{name}</AppText>
          )}
          {roleCode ? <Badge tone="primary" icon="badge" label={profile?.roleLabel ?? roleCode} /> : null}
          <View style={styles.contact}>
            <Icon name="mail-outline" size="xs" color="onSurfaceVariant" />
            <AppText variant="bodySm" color="onSurfaceVariant" numberOfLines={1}>
              {profile?.email ?? email}
            </AppText>
          </View>
          {profile?.phone ? (
            <View style={styles.contact}>
              <Icon name="call" size="xs" color="onSurfaceVariant" />
              <AppText variant="bodySm" color="onSurfaceVariant">
                {profile.phone}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.store}>
        <Icon name="storefront" size="md" color="primary" />
        <View style={styles.texts}>
          <AppText variant="labelSm" color="onSurfaceVariant">
            {t('mobile.profile.activeStore')}
          </AppText>
          <AppText variant="labelLg">{storeName ?? '—'}</AppText>
        </View>
        {canSwitchStore ? (
          <Button label={t('mobile.store.change')} variant="tonal" compact fullWidth={false} onPress={onSwitchStore} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  store: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
});
