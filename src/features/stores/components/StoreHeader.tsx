import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppHeader } from '@/components/navigation/AppHeader';
import { useSessionStore } from '@/features/auth/sessionStore';
import { displayName, useProfile } from '@/features/profile/profileApi';
import { useTranslation } from '@/i18n/useTranslation';

import { useCurrentStore } from '../useCurrentStore';
import { StoreSwitcherSheet } from './StoreSwitcherSheet';

export function StoreHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { store, canSwitch } = useCurrentStore();
  const email = useSessionStore((state) => state.session?.email ?? null);
  const profile = useProfile();

  return (
    <>
      <AppHeader
        storeLabel={t('mobile.profile.activeStore')}
        storeName={store?.name ?? null}
        canSwitchStore={canSwitch}
        onStorePress={() => setSheetOpen(true)}
        userName={displayName(profile.data, email ?? '')}
        onAvatarPress={() => router.push('/more')}
      />
      <StoreSwitcherSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
