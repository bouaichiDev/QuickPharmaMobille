import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';

import type { SessionStore } from '../../auth/types';
import { isSameStore } from '../storeSelection';
import { useCurrentStore } from '../useCurrentStore';

interface StoreSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function StoreSwitcherSheet({ visible, onClose }: StoreSwitcherSheetProps) {
  const { t } = useTranslation();
  const { store, stores, storesLoading, storesError, refetchStores, switchStore } = useCurrentStore();

  async function select(next: SessionStore) {
    onClose();
    if (!isSameStore(store, next)) await switchStore(next);
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('mobile.store.selectTitle')}
      subtitle={t('mobile.store.selectSubtitle')}
    >
      {storesLoading ? (
        <SkeletonCards count={2} height={56} />
      ) : storesError ? (
        <ErrorState error={storesError} onRetry={() => void refetchStores()} />
      ) : stores.length === 0 ? (
        <AppText variant="bodyMd" color="onSurfaceVariant">
          {t('mobile.store.empty')}
        </AppText>
      ) : (
        stores.map((item, index) => {
          const current = isSameStore(store, item);
          return (
            <Pressable
              key={`${item.name}-${index}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: current }}
              onPress={() => void select(item)}
              style={[styles.row, current ? styles.current : null]}
            >
              <Icon name="storefront" size="md" color={current ? 'onPrimary' : 'primary'} />
              <AppText variant="labelLg" color={current ? 'onPrimary' : 'onSurface'} style={styles.name}>
                {item.name}
              </AppText>
              {current ? (
                <View style={styles.badge}>
                  <AppText variant="labelSm" color="primary">
                    {t('mobile.store.current')}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  current: {
    backgroundColor: colors.primary,
  },
  name: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.onPrimary,
  },
});
