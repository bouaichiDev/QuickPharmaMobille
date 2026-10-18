import { router } from 'expo-router';
import { AppHeader } from './AppHeader';
import { PharmacyLogo } from '@/features/stores/components/PharmacyLogo';
import { useSessionStore } from '@/features/auth/sessionStore';

/** Same pharmacy identity and layout for list, detail and form page headers. */
export function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const session = useSessionStore((state) => state.session);
  return (
    <AppHeader
      title={title}
      onBack={onBack}
      logo={<PharmacyLogo />}
      storeLabel="Établissement actif"
      storeName={session?.activeStore?.name ?? null}
      canSwitchStore={false}
      userName={session?.email ?? null}
      onAvatarPress={() => router.push('/more')}
    />
  );
}
