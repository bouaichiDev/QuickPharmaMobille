import { useState } from 'react';
import { Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/features/auth/sessionStore';
import { loadAuthenticatedImage } from '@/services/api/loadAuthenticatedImage';
import { CrmAvatar } from '@/features/crm/components/CrmDesign';
import type { Row } from './api';
/** Only mounted cells download logos; image cache is released when they leave the list. */
export function StoreLogo({ row, large = false }: { row: Row; large?: boolean }) {
  const session = useSessionStore((s) => s.session),
    [failed, setFailed] = useState(false);
  const filename = typeof row.logo === 'string' ? row.logo : '';
  const path = `stores/${row.id}/logo/${filename}`;
  const query = useQuery({
    queryKey: ['store-logo', session?.userId, path],
    queryFn: ({ signal }) => loadAuthenticatedImage(path, signal),
    enabled: !!filename && !!session?.token && !failed,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  return query.data && !failed ? (
    <Image
      source={{ uri: query.data }}
      style={{ width: large ? 60 : 44, height: large ? 60 : 44, borderRadius: 12 }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  ) : (
    <CrmAvatar name={String(row.name ?? 'Magasin')} large={large} />
  );
}
