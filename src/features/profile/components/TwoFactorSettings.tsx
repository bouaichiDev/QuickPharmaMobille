import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Image, Linking, View } from 'react-native';
import createQrCode from 'qrcode-generator';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { apiGet, apiPost } from '@/services/api/client';
import { useSessionStore } from '@/features/auth/sessionStore';
function AuthenticatorQr({ uri }: { uri: string }) {
  const ta = useAccountTranslation();
  const source = useMemo(() => {
    const qr = createQrCode(0, 'M');
    qr.addData(uri);
    qr.make();
    return qr.createDataURL(4, 16);
  }, [uri]);
  return (
    <Image
      source={{ uri: source }}
      accessibilityLabel={ta('account_security_qr_alt')}
      style={{
        width: 256,
        height: 256,
        maxWidth: '100%',
        backgroundColor: '#fff',
        alignSelf: 'center',
      }}
      resizeMode="contain"
    />
  );
}
interface FactorResult {
  enabled?: boolean;
  secret?: string;
  uri?: string;
  recovery_codes?: string[];
}
export function TwoFactorSettings() {
  const ta = useAccountTranslation();
  const user = useSessionStore((s) => s.session?.userId);
  const status = useQuery({
    queryKey: ['two-factor', user],
    queryFn: () =>
      apiGet<{
        enabled: boolean;
      }>('/auth/two-factor'),
    retry: false,
  });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<FactorResult | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: (action: string) =>
      apiPost<FactorResult>('/auth/two-factor', { action, password, code: code.trim() }),
    onSuccess: (data) => {
      setMessage('');
      if (data.secret) setSetup(data);
      else {
        setSetup(null);
        setPassword('');
        setCode('');
        setCodes(data.recovery_codes ?? []);
        setMessage(
          data.enabled
            ? ta('account_security_factor_enabled_message')
            : ta('account_security_factor_disabled_message'),
        );
      }
      void status.refetch();
    },
    onError: () => setMessage(ta('account_security_factor_failed')),
  });
  function clear() {
    setSetup(null);
    setPassword('');
    setCode('');
    setCodes([]);
    setMessage('');
    mutation.reset();
  }
  return (
    <Card>
      <View style={{ gap: 12 }}>
        <AppText variant="headlineSm">{ta('account_security_factor_title')}</AppText>
        <AppText>{ta('account_security_factor_intro') + ' '}</AppText>
        {status.isLoading ? (
          <AppText>{ta('account_security_loading')}</AppText>
        ) : status.isError ? (
          <Button label={ta('account_security_retry')} onPress={() => void status.refetch()} />
        ) : (
          <>
            <AppText>
              {status.data?.enabled
                ? ta('account_security_factor_enabled')
                : ta('account_security_factor_disabled')}
            </AppText>
            {codes.length > 0 ? (
              <>
                <AppText>{ta('account_security_recovery_info') + ' '}</AppText>
                <AppText selectable>{codes.join('\n')}</AppText>
                <Button label={ta('account_security_saved_codes')} onPress={clear} />
              </>
            ) : (
              <>
                <TextField
                  label={ta('account_security_current_password')}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                {setup?.secret && (
                  <>
                    {setup.uri && <AuthenticatorQr uri={setup.uri} />}
                    <AppText>{ta('account_security_qr_instructions') + ' '}</AppText>
                    <AppText selectable>{setup.secret}</AppText>
                    <Button
                      label={ta('account_security_open_authenticator')}
                      variant="outline"
                      onPress={() => {
                        if (setup.uri)
                          void Linking.openURL(setup.uri).catch(() =>
                            setMessage(ta('account_security_manual_key_fallback')),
                          );
                      }}
                    />
                  </>
                )}
                {(setup || status.data?.enabled) && (
                  <TextField
                    label={ta('account_security_factor_code')}
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="none"
                    maxLength={64}
                  />
                )}
                <Button
                  label={
                    setup
                      ? ta('account_security_enable_factor')
                      : status.data?.enabled
                        ? ta('account_security_disable_factor_full')
                        : ta('account_security_configure_factor')
                  }
                  loading={mutation.isPending}
                  disabled={!password || (!!(setup || status.data?.enabled) && !code.trim())}
                  onPress={() =>
                    mutation.mutate(setup ? 'enable' : status.data?.enabled ? 'disable' : 'setup')
                  }
                />
                {status.data?.enabled && (
                  <Button
                    label={ta('account_security_regenerate_codes')}
                    variant="outline"
                    disabled={!password || !code.trim()}
                    loading={mutation.isPending}
                    onPress={() => mutation.mutate('recovery')}
                  />
                )}
                {setup && (
                  <Button
                    label={ta('account_security_cancel_setup')}
                    variant="ghost"
                    onPress={clear}
                  />
                )}
              </>
            )}
          </>
        )}
        {message ? <AppText accessibilityRole="alert">{message}</AppText> : null}
      </View>
    </Card>
  );
}
