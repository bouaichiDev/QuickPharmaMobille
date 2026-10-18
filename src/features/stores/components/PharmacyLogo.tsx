import { useState } from 'react';
import { Image, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { loadAuthenticatedImage } from '@/services/api/loadAuthenticatedImage';
import { Icon } from '@/components/ui/Icon';

function Fallback() {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#eff4ff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="local-pharmacy" color="primary" size={25} />
    </View>
  );
}
function ConnectedLogo({ store, user }: { store: string; user: string }) {
  const [failed, setFailed] = useState<string>();
  const company = useQuery({
    queryKey: ['pharmacy-brand', user, store],
    queryFn: async ({ signal }) => {
      const rows = await apiGet<{ name: string; value: unknown }[]>('/companyliste', { signal });
      const fields = Object.fromEntries(rows.map((row) => [row.name, row.value]));
      const id = Array.isArray(fields.companyId) ? fields.companyId[0] : fields.companyId;
      const image = Array.isArray(fields.image) ? fields.image[0] : fields.image;
      return { id, image: typeof image === 'string' ? image : '' };
    },
    staleTime: 300000,
    retry: false,
  });
  const path =
    company.data?.id && company.data.image
      ? `Company/${company.data.id}/logo/${company.data.image}`
      : '';
  const photo = useQuery({
    queryKey: ['pharmacy-logo', user, store, path],
    queryFn: ({ signal }) => loadAuthenticatedImage(path, signal),
    enabled: !!path,
    staleTime: 300000,
    gcTime: 300000,
    retry: false,
  });
  return photo.data && failed !== photo.data ? (
    <Image
      accessibilityLabel="Logo de la pharmacie"
      source={{ uri: photo.data }}
      resizeMode="contain"
      style={{ width: 40, height: 40, borderRadius: 8 }}
      onError={() => setFailed(photo.data)}
    />
  ) : (
    <Fallback />
  );
}
export function PharmacyLogo() {
  const session = useSessionStore((state) => state.session);
  return session?.token && session.activeStore?.id ? (
    <ConnectedLogo
      key={session.activeStore.id}
      store={session.activeStore.id}
      user={session.userId}
    />
  ) : (
    <Fallback />
  );
}
