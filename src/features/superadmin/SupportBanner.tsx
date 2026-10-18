import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSessionStore } from '@/features/auth/sessionStore';
import { platformApi } from './api';
import { AppText, Button, sa } from './AdminUI';
export function SupportBanner() {
  const support = useSessionStore((s) => s.session?.supportAccess),
    leave = useSessionStore((s) => s.leaveSupport);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (!support) return;
    const delay = Math.max(0, Date.parse(support.expiresAt) - Date.now());
    const timer = setTimeout(
      () => {
        void leave().then(() => router.replace('/home'));
      },
      Math.min(Number.isFinite(delay) ? delay : 0, 2147483647),
    );
    return () => clearTimeout(timer);
  }, [support, leave]);
  if (!support) return null;
  async function exit() {
    if (!support || busy) return;
    setBusy(true);
    try {
      await platformApi.write('delete', `/superadmin/tenants/${support.tenantId}/impersonate`);
      await leave();
      router.replace(`/superadmin/tenant?id=${support.tenantId}` as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de terminer l’assistance.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ backgroundColor: '#fff1ce', padding: 10, gap: 6 }}>
      <View style={sa.row}>
        <AppText variant="labelMd" style={sa.grow}>
          Lecture seule · {support.storeName}
        </AppText>
        <Button
          label="Quitter"
          variant="outline"
          fullWidth={false}
          compact
          loading={busy}
          onPress={() => void exit()}
        />
      </View>
      {error ? (
        <AppText variant="bodySm" color="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
