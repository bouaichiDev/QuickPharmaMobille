import { useAccountTranslation } from '@/i18n/useAccountTranslation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet, apiPost } from '@/services/api/client';
export const PRIVACY_URL = 'https://quickpharma.ma/politique-de-confidentialite';
type DeletionRequest = {
  id: number;
  status: string;
  email?: string;
  response?: string;
  created_at: string;
  confirmation_mail_status?: string;
};
export function AccountPrivacy({ management = false }: { management?: boolean }) {
  const ta = useAccountTranslation();
  const role = useSessionStore((s) => s.session?.role?.toLowerCase());
  const platform = role === 'superadmin';
  const allowed = platform || role === 'admin';
  const client = useQueryClient();
  const [response, setResponse] = useState('');
  const query = useQuery({
    queryKey: ['account-deletion-requests', role],
    queryFn: () =>
      apiGet<{
        data: DeletionRequest[];
      }>('/account-deletion-requests'),
    enabled: allowed && (!platform || management),
    refetchInterval: 60000,
  });
  const mutation = useMutation({
    mutationFn: (action?: { id: number; completed?: boolean; retryMail?: boolean }) =>
      apiPost(
        action
          ? `/account-deletion-requests/${action.id}/${action.retryMail ? 'retry-mail' : 'review'}`
          : '/account-deletion-requests',
        action
          ? {
              status: action.completed ? 'completed' : 'processing',
              response,
              ...(action.completed ? { deletion_verified: true } : {}),
            }
          : { confirmed: true },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['account-deletion-requests'] });
      void client.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  function requestDeletion() {
    Alert.alert(
      ta('account_security_request_confirm'),
      ta('account_security_request_confirmation'),
      [
        { text: ta('account_security_cancel'), style: 'cancel' },
        {
          text: ta('account_security_send_request'),
          style: 'destructive',
          onPress: () => mutation.mutate(undefined),
        },
      ],
    );
  }
  if (platform && !management)
    return (
      <Card>
        <View style={{ gap: 12 }}>
          <AppText variant="headlineSm">{ta('account_security_privacy_title')}</AppText>
          <Button
            label={ta('account_security_privacy_policy')}
            variant="outline"
            onPress={() => {
              void Linking.openURL(PRIVACY_URL);
            }}
          />
          <Button
            label={ta('account_security_manage_requests')}
            onPress={() => router.push('/account-deletion-requests' as Href)}
          />
        </View>
      </Card>
    );
  return (
    <Card>
      <View style={{ gap: 12 }}>
        <AppText variant="headlineSm">{ta('account_security_privacy_title')}</AppText>
        <Button
          label={ta('account_security_privacy_policy')}
          variant="outline"
          onPress={() => {
            void Linking.openURL(PRIVACY_URL).catch(() =>
              Alert.alert(ta('account_security_link_unavailable'), PRIVACY_URL),
            );
          }}
        />
        {Platform.OS !== 'web' && (
          <Button
            label={ta('account_security_notification_permission')}
            variant="outline"
            onPress={() => {
              void (async () => {
                if (Constants.executionEnvironment === 'storeClient') {
                  Alert.alert(
                    ta('account_security_build_required'),
                    ta('account_security_push_build_hint'),
                  );
                  return;
                }
                const notifications = await import('expo-notifications');
                if (Platform.OS === 'android')
                  await notifications.setNotificationChannelAsync('quickpharma-alerts', {
                    name: 'Alertes QuickPharma',
                    importance: notifications.AndroidImportance.HIGH,
                  });
                const permission = await notifications.requestPermissionsAsync();
                if (!permission.granted)
                  Alert.alert(
                    ta('account_security_notifications_disabled'),
                    ta('account_security_notifications_settings_hint'),
                    [
                      { text: ta('account_security_close'), style: 'cancel' },
                      {
                        text: ta('account_security_settings'),
                        onPress: () => {
                          void Linking.openSettings();
                        },
                      },
                    ],
                  );
              })().catch(() =>
                Alert.alert(
                  ta('account_security_notifications'),
                  ta('account_security_permission_failed'),
                ),
              );
            }}
          />
        )}
        {allowed && (
          <>
            <AppText variant="labelLg">
              {platform
                ? ta('account_security_requests_title')
                : ta('account_security_deletion_title')}
            </AppText>
            {query.isLoading && <AppText>{ta('account_security_loading')}</AppText>}
            {query.isError && (
              <Button
                label={ta('account_security_retry_loading')}
                variant="outline"
                onPress={() => void query.refetch()}
              />
            )}
            {platform && (
              <TextField label="Message au demandeur" value={response} onChangeText={setResponse} />
            )}
            {query.data?.data.map((row) => (
              <View key={row.id} style={{ gap: 8 }}>
                <AppText>
                  {platform
                    ? `#${row.id} · ${row.email ?? ta('account_security_account_deleted')}`
                    : ta('account_security_request_id', { id: row.id })}
                </AppText>
                <AppText>
                  {row.status === 'pending'
                    ? ta('account_security_pending')
                    : row.status === 'processing'
                      ? ta('account_security_processing')
                      : row.status === 'completed'
                        ? ta('account_security_completed')
                        : row.status}
                </AppText>
                {row.response && <AppText>{row.response}</AppText>}
                {platform && row.status === 'completed' && (
                  <>
                    <AppText>
                      {row.confirmation_mail_status === 'sent'
                        ? ta('account_security_mail_sent')
                        : row.confirmation_mail_status === 'failed'
                          ? ta('account_security_mail_failed')
                          : row.confirmation_mail_status === 'pending'
                            ? ta('account_security_mail_pending')
                            : ta('account_security_mail_not_scheduled')}
                    </AppText>
                    {row.confirmation_mail_status === 'failed' && (
                      <Button
                        label={ta('account_security_retry_mail')}
                        loading={mutation.isPending}
                        onPress={() => mutation.mutate({ id: row.id, retryMail: true })}
                      />
                    )}
                  </>
                )}
                {platform && row.status === 'pending' && (
                  <Button
                    label={ta('account_security_take_charge')}
                    disabled={!response.trim()}
                    loading={mutation.isPending}
                    onPress={() => mutation.mutate({ id: row.id })}
                  />
                )}
                {platform && row.status === 'processing' && (
                  <>
                    <AppText>{ta('account_security_manual_deletion') + ' '}</AppText>
                    <Button
                      label={ta('account_security_close_request')}
                      variant="dangerSoft"
                      disabled={!response.trim()}
                      loading={mutation.isPending}
                      onPress={() => {
                        Alert.alert(
                          ta('account_security_attest_title'),
                          ta('account_security_attest_body'),
                          [
                            { text: ta('account_security_cancel'), style: 'cancel' },
                            {
                              text: ta('account_security_deletion_verified'),
                              style: 'destructive',
                              onPress: () => mutation.mutate({ id: row.id, completed: true }),
                            },
                          ],
                        );
                      }}
                    />
                  </>
                )}
              </View>
            ))}
            {!platform && query.data?.data.length === 0 && (
              <Button
                label={ta('account_security_request_button')}
                variant="dangerSoft"
                loading={mutation.isPending}
                onPress={requestDeletion}
              />
            )}
            {platform && query.data?.data.length === 0 && (
              <AppText>{ta('account_security_none')}</AppText>
            )}
            {mutation.isError && <AppText>{ta('account_security_request_failed')}</AppText>}
          </>
        )}
      </View>
    </Card>
  );
}
