import { useContext, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentStore } from '@/features/stores/useCurrentStore';
import { StoreSwitcherSheet } from '@/features/stores/components/StoreSwitcherSheet';
import { displayName, useProfile } from '@/features/profile/profileApi';
import { useSessionStore } from '@/features/auth/sessionStore';
import { StockContext } from './StockContext';
interface Props {
  onSearch: () => void;
  onScan: () => void;
}
function Header({
  onSearch,
  onScan,
  name,
  onStore,
  canSwitch = false,
  user,
  onUser,
}: Props & {
  name?: string | null;
  onStore?: () => void;
  canSwitch?: boolean;
  user?: string | null;
  onUser?: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#f8f9ff' }}>
      <View
        style={{
          height: 64,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderColor: '#e5eeff',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Établissement actif"
          onPress={onStore}
          disabled={!canSwitch}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#00417c',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="local-pharmacy" color="onPrimary" size={23} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="labelLg" color="primary">
              QuickPharma
            </AppText>
            <AppText variant="labelSm" color="outline" numberOfLines={1}>
              Stock{name ? ` · ${name}` : ''}
            </AppText>
          </View>
          {canSwitch ? <Icon name="expand-more" color="outline" size={16} /> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rechercher un produit"
          onPress={onSearch}
          hitSlop={8}
        >
          <Icon name="search" color="outline" size={23} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scanner un produit"
          onPress={onScan}
          hitSlop={8}
        >
          <Icon name="qr-code-scanner" color="primary" size={23} />
        </Pressable>
        {onUser ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Mon compte" onPress={onUser}>
            <Avatar name={user ?? null} size={30} />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
function ConnectedHeader(props: Props) {
  const router = useRouter(),
    { store, canSwitch } = useCurrentStore(),
    profile = useProfile(),
    email = useSessionStore((s) => s.session?.email ?? '');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Header
        {...props}
        name={store?.name}
        onStore={() => setOpen(true)}
        canSwitch={canSwitch}
        user={displayName(profile.data, email)}
        onUser={() => router.push('/more')}
      />
      <StoreSwitcherSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
export function StockHeader(props: Props) {
  return useContext(StockContext) ? <Header {...props} /> : <ConnectedHeader {...props} />;
}
