import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { config } from '@/constants/config';
import { apiGet, httpClient } from '@/services/api/client';
import { errorMessage } from '@/utils/errorMessage';
import { useTranslation } from '@/i18n/useTranslation';
import { itemId, photoMatchesContext, record, unwrap } from './crmApi';
import { can } from './modules';
import { ReferencePicker } from './ReferencePicker';
import { CrmPage, crmStyles } from './components/CrmDesign';
import { Badge } from '@/components/ui/Badge';
import { uploadCarePhoto, loadCarePhoto } from './crmPhotos';
import { CarePhotoButtons } from './components/CarePhotoButtons';

function CarePhoto({
  source,
  height,
  contain = false,
  onPress,
  caption = 'Photo de soin',
}: {
  source: { uri: string; headers: Record<string, string> };
  height: number;
  contain?: boolean;
  onPress?: () => void;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);
  const photo = useQuery({
    queryKey: ['crm', 'photo-file', source.uri],
    // Native Image requests bypass API authentication/context interceptors.
    queryFn: ({ signal }) => loadCarePhoto(source.uri, source.headers, signal),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
  if (photo.isLoading)
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
        <AppText color="outline">Chargement de la photo…</AppText>
      </View>
    );
  return failed || photo.isError ? (
    <View
      style={{
        height,
        borderRadius: 12,
        backgroundColor: '#F1F5FF',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      }}
    >
      <AppText color="outline">Photo indisponible.</AppText>
      <Button
        label="Réessayer"
        compact
        onPress={() => {
          void photo.refetch();
          setFailed(false);
        }}
      />
    </View>
  ) : (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'Ouvrir la photo' : undefined}
    >
      <Image
        accessibilityLabel={caption}
        style={{ width: '100%', height, borderRadius: 12 }}
        resizeMode={contain ? 'contain' : 'cover'}
        source={photo.data ? { uri: photo.data } : undefined}
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

export function ClientPhotos({
  clientId,
  serviceId,
  packageId,
  sessionId,
  defaultServiceId,
  collapsible = false,
}: {
  clientId: string;
  serviceId?: string;
  packageId?: string;
  sessionId?: string;
  defaultServiceId?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(!collapsible);
  const session = useSessionStore((state) => state.session);
  const access = useAccess();
  const translator = useTranslation();
  const cache = useQueryClient();
  const [service, setService] = useState(serviceId ?? defaultServiceId ?? '');
  const [opened, setOpened] = useState<ReturnType<typeof record> | null>(null);
  const [stage, setStage] = useState('before');
  const [caption, setCaption] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const query = useQuery({
    queryKey: [
      'crm',
      session?.activeStore?.id,
      'photos',
      clientId,
      serviceId,
      packageId,
      sessionId,
    ],
    enabled: expanded && can(access.data, 'services.documents.view'),
    queryFn: async () => {
      const value = unwrap(
        await apiGet(`/crm-care/clients/${encodeURIComponent(clientId)}/photos`, {
          params: {
            service_id: serviceId,
            customer_service_package_id: packageId,
            session_id: sessionId,
          },
        }),
      );
      if (!Array.isArray(value)) throw new Error('Réponse photo invalide.');
      return value.map(record).filter((photo) =>
        photoMatchesContext(photo, {
          serviceId,
          packageId,
          sessionId,
          standalone: !!serviceId && !packageId && !sessionId,
        }),
      );
    },
  });
  const mutation = useMutation({
    mutationFn: async (input: string | ImagePickerAsset) => {
      if (!can(access.data, 'services.documents.manage')) throw new Error('Accès refusé.');
      if (typeof input === 'string') {
        unwrap((await httpClient.delete(`/crm-care/photos/${encodeURIComponent(input)}`)).data);
        return;
      }
      await uploadCarePhoto(input, {
        clientId,
        serviceId: service,
        packageId,
        sessionId,
        stage,
        caption,
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['crm'] });
      setDeleting(null);
    },
  });
  if (!expanded)
    return (
      <Button
        label="Afficher les photos avant / après"
        icon="photo-library"
        variant="tonal"
        onPress={() => setExpanded(true)}
      />
    );
  return (
    <View style={{ gap: 12 }}>
      {collapsible ? (
        <Button
          label="Masquer les photos"
          icon="expand-less"
          variant="tonal"
          onPress={() => setExpanded(false)}
        />
      ) : null}
      {can(access.data, 'services.documents.manage') ? (
        <>
          {!serviceId ? (
            <ReferencePicker
              field={{
                key: 'service_id',
                label: 'Service de la photo',
                reference: '/services',
                required: true,
              }}
              value={service}
              onChange={setService}
            />
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['before', 'after'].map((value) => (
              <Button
                key={value}
                label={value === 'before' ? 'Avant' : 'Après'}
                fullWidth={false}
                variant={stage === value ? 'primary' : 'tonal'}
                onPress={() => setStage(value)}
              />
            ))}
          </View>
          <TextField label="Légende" maxLength={500} value={caption} onChangeText={setCaption} />
          <CarePhotoButtons
            disabled={!service}
            loading={mutation.isPending}
            onPhoto={(asset) => mutation.mutate(asset)}
          />
        </>
      ) : null}
      {query.isLoading ? (
        <AppText>Chargement…</AppText>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {!query.data?.length ? (
            <AppText color="outline">Aucune photo enregistrée.</AppText>
          ) : null}
          {query.data?.map((photo) => (
            <View key={itemId(photo)} style={{ width: '48%', flexGrow: 1, gap: 8 }}>
              <CarePhoto
                onPress={() => setOpened(photo)}
                caption={String(photo.caption ?? 'Photo de soin')}
                height={150}
                source={{
                  uri: `${config.apiBaseUrl}/crm-care/photos/${encodeURIComponent(itemId(photo))}?store_id=${encodeURIComponent(session?.activeStore?.id ?? '')}`,
                  headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${session?.token ?? ''}`,
                  },
                }}
              />
              <Badge
                label={photo.stage === 'before' ? 'Avant' : 'Après'}
                tone={photo.stage === 'before' ? 'primary' : 'success'}
              />
              {photo.caption ? <AppText variant="bodySm">{String(photo.caption)}</AppText> : null}
              {can(access.data, 'services.documents.manage') ? (
                <Button
                  label="Supprimer"
                  compact
                  variant="dangerSoft"
                  onPress={() => setDeleting(itemId(photo))}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}
      <CrmPage
        visible={!!opened}
        title={opened?.stage === 'before' ? 'Photo avant' : 'Photo après'}
        onClose={() => setOpened(null)}
      >
        {opened ? (
          <View style={crmStyles.stack}>
            <CarePhoto
              height={450}
              contain
              source={{
                uri: `${config.apiBaseUrl}/crm-care/photos/${encodeURIComponent(itemId(opened))}?store_id=${encodeURIComponent(session?.activeStore?.id ?? '')}`,
                headers: {
                  Accept: 'application/json',
                  Authorization: `Bearer ${session?.token ?? ''}`,
                },
              }}
            />
            <AppText>{String(opened.caption ?? '')}</AppText>
          </View>
        ) : null}
      </CrmPage>
      {mutation.isError ? (
        <View style={{ gap: 8 }}>
          <AppText color="error">{errorMessage(mutation.error, translator)}</AppText>
          {mutation.variables && typeof mutation.variables !== 'string' ? (
            <Button
              label="Réessayer l’envoi"
              onPress={() => mutation.mutate(mutation.variables!)}
            />
          ) : null}
        </View>
      ) : null}
      <ConfirmDialog
        visible={!!deleting}
        title="Supprimer cette photo ?"
        message="La photo sera retirée du dossier client."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        loading={mutation.isPending}
        onConfirm={() => mutation.mutate(deleting!)}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}
