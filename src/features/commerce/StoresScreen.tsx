import { memo, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { StoreLogo } from './StoreLogo';
import { useSessionStore } from '@/features/auth/sessionStore';
import { storesApi } from '@/features/stores/storesApi';
import { itemId, record } from '@/features/crm/crmApi';
import { date } from '@/features/superadmin/AdminUI';
import { commerceApi, fieldError, text, type Row } from './api';
import {
  AccessGate,
  AppText,
  Badge,
  Button,
  Card,
  CommerceList,
  CommerceScreen,
  ErrorState,
  Notice,
  Pair,
  ResponsiveGrid,
  SkeletonCards,
  TextField,
  ui,
  useCommerceAccess,
  useCommerceList,
  useDebounce,
} from './CommerceUI';

const StoreCard = memo(function StoreCard({
  row,
  onOpen,
}: {
  row: Row;
  onOpen: (id: string) => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(itemId(row))}>
      <Card>
        <View style={ui.row}>
          <StoreLogo row={row} />
          <View style={ui.grow}>
            <AppText variant="headlineSm">{text(row.name)}</AppText>
            <AppText variant="bodySm" color="outline">
              {text(record(row.owner).email)}
            </AppText>
          </View>
        </View>
        <View style={ui.inset}>
          <AppText variant="bodyMd">{text(row.address)}</AppText>
          <AppText variant="labelLg" color="primary">
            {text(row.phone)}
          </AppText>
        </View>
        <AppText variant="bodySm" color="primary">
          Consulter la fiche →
        </AppText>
      </Card>
    </Pressable>
  );
});

export default function StoresScreen() {
  const { can, store, readOnly } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search);
  const [filters, setFilters] = useState({ sort_by: 'name', sort_order: 'asc', owner_id: '' });
  const [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false);
  const [id, setId] = useState<string>(),
    [edit, setEdit] = useState<Row | null>();
  const owners = useQuery({
    queryKey: ['commerce', store, 'store-owner-options'],
    queryFn: ({ signal }) => commerceApi.references('/stores-options', {}, signal),
    enabled: filterOpen && can('stores.view'),
    staleTime: 300_000,
    retry: false,
  });
  const ownerOptions = [
    ...new Map((owners.data ?? []).map((r) => [String(r.user_id), record(r.owner)])).entries(),
  ];
  const query = useCommerceList('/stores', { search: term, ...filters }, 'stores.view');
  const stats = useQuery({
    queryKey: ['commerce', store, 'store-stats'],
    queryFn: ({ signal }) => commerceApi.get('/stores-stats', signal),
    enabled: can('stores.view'),
    staleTime: 60_000,
    retry: false,
  });
  const quota = stats.data,
    canCreate = can('stores.create') && quota?.can_create_more === true;
  if (edit !== undefined)
    return (
      <StoreForm
        row={edit}
        onClose={() => setEdit(undefined)}
        onSaved={() => {
          setEdit(undefined);
          void query.refetch();
          void stats.refetch();
        }}
      />
    );
  if (id) return <StoreDetail id={id} onBack={() => setId(undefined)} onEdit={setEdit} />;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title="Magasins" scroll={false}>
        <AccessGate permission="stores.view">
          <CommerceList
            query={query}
            renderItem={({ item }) => <StoreCard row={item} onOpen={setId} />}
            header={
              <>
                <View style={ui.row}>
                  <AppText variant="headlineMd" style={ui.grow}>
                    Magasins
                  </AppText>
                  {can('stores.create') ? (
                    <Button
                      label="Ajouter"
                      icon="add"
                      compact
                      fullWidth={false}
                      disabled={!canCreate}
                      onPress={() => setEdit(null)}
                    />
                  ) : null}
                </View>
                {quota ? (
                  <Card>
                    <View style={ui.row}>
                      <AppText variant="labelLg" style={ui.grow}>
                        Capacité de votre compte
                      </AppText>
                      <Badge>
                        {String(quota.current_stores ?? '—')} /{' '}
                        {quota.unlimited ? 'Illimité' : String(quota.max_stores ?? 'Non configuré')}
                      </Badge>
                    </View>
                    <AppText variant="bodySm">
                      {quota.remaining_stores == null
                        ? quota.unlimited
                          ? 'Création sans limite de magasins.'
                          : 'Quota non configuré.'
                        : `${quota.remaining_stores} place(s) disponible(s)`}
                    </AppText>
                    {!quota.can_create_more ? (
                      <Notice>
                        La création est indisponible pour les droits, l’abonnement ou le quota
                        actuels.
                      </Notice>
                    ) : null}
                  </Card>
                ) : stats.isError ? (
                  <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
                ) : null}
                {readOnly ? (
                  <Notice>
                    Assistance en lecture seule. Aucun magasin ne peut être modifié ou sélectionné.
                  </Notice>
                ) : null}
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <TextField
                      label="Rechercher un magasin"
                      placeholder="Nom, adresse, téléphone…"
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                  <Button
                    label="Filtres"
                    compact
                    fullWidth={false}
                    variant="tonal"
                    icon="tune"
                    onPress={() => {
                      setDraft(filters);
                      setFilterOpen(true);
                    }}
                  />
                </View>
              </>
            }
          />
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Filtres des magasins"
        onClose={() => setFilterOpen(false)}
      >
        <AppText variant="labelLg">Propriétaire</AppText>
        <Button
          label="Tous les propriétaires"
          variant={draft.owner_id ? 'tonal' : 'primary'}
          onPress={() => setDraft({ ...draft, owner_id: '' })}
        />
        {owners.isError ? (
          <ErrorState error={owners.error} onRetry={() => void owners.refetch()} />
        ) : (
          ownerOptions.map(([ownerId, owner]) => (
            <Button
              key={ownerId}
              label={
                [owner.firstName, owner.lastName].filter(Boolean).join(' ') ||
                'Propriétaire du compte'
              }
              variant={draft.owner_id === ownerId ? 'primary' : 'tonal'}
              onPress={() => setDraft({ ...draft, owner_id: ownerId })}
            />
          ))
        )}
        <AppText variant="labelLg">Trier par</AppText>
        {(
          [
            ['name', 'Nom'],
            ['created_at', 'Création'],
            ['updated_at', 'Modification'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            label={label}
            variant={draft.sort_by === value ? 'primary' : 'tonal'}
            onPress={() => setDraft({ ...draft, sort_by: value })}
          />
        ))}
        <Button
          label={draft.sort_order === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
          variant="tonal"
          onPress={() =>
            setDraft({ ...draft, sort_order: draft.sort_order === 'asc' ? 'desc' : 'asc' })
          }
        />
        <Button
          label="Appliquer"
          onPress={() => {
            setFilters(draft);
            setFilterOpen(false);
          }}
        />
        <Button
          label="Réinitialiser"
          variant="ghost"
          onPress={() => {
            setFilters({ sort_by: 'name', sort_order: 'asc', owner_id: '' });
            setFilterOpen(false);
          }}
        />
      </SelectionDialog>
    </>
  );
}

function StoreDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (row: Row) => void;
}) {
  const { store, can, readOnly } = useCommerceAccess(),
    qc = useQueryClient();
  const session = useSessionStore((s) => s.session),
    setActive = useSessionStore((s) => s.setActiveStore);
  const [confirm, setConfirm] = useState<'switch' | 'delete'>();
  const query = useQuery({
    queryKey: ['commerce', store, 'store', id],
    queryFn: ({ signal }) => commerceApi.get(`/stores/${encodeURIComponent(id)}`, signal),
    enabled: can('stores.view'),
    retry: false,
  });
  const row = query.data;
  const action = useMutation({
    mutationFn: async (kind: 'switch' | 'delete') => {
      if (readOnly) throw new Error('Assistance en lecture seule.');
      if (kind === 'delete') {
        await commerceApi.write('delete', `/stores/${encodeURIComponent(id)}`);
        void qc.invalidateQueries({ queryKey: ['commerce'] });
        onBack();
        return;
      }
      const choices = await storesApi.listForUser(session?.userId ?? '');
      // Only use API-issued encrypted identifiers, never the numeric list id.
      const matches = choices.filter((s) => s.name === row?.name);
      const encrypted =
        typeof row?.encrypted_id === 'string'
          ? row.encrypted_id
          : matches.length === 1
            ? matches[0]?.id
            : undefined;
      if (!encrypted)
        throw new Error('Ce magasin ne peut pas être sélectionné avec les accès actuels.');
      await setActive({ id: encrypted, name: String(row?.name ?? '') });
      router.replace('/home');
    },
    onSuccess: () => setConfirm(undefined),
    retry: false,
  });
  return (
    <CommerceScreen title="Fiche magasin" onBack={onBack}>
      <AccessGate permission="stores.view">
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : row ? (
          <>
            <Card>
              <View style={ui.row}>
                <StoreLogo row={row} large />
                <AppText variant="headlineMd" style={ui.grow}>
                  {text(row.name)}
                </AppText>
              </View>
              {row.name === session?.activeStore?.name ? (
                <Badge>Magasin actif de votre session</Badge>
              ) : null}
            </Card>
            <ResponsiveGrid maxColumns={2}>
              <Card title="Identité & rattachement" icon="badge">
                <Pair
                  label="Propriétaire"
                  value={[record(row.owner).firstName, record(row.owner).lastName]
                    .filter(Boolean)
                    .join(' ')}
                />
                <Pair label="Référence magasin" value={row.id} />
              </Card>
              <Card title="Coordonnées" icon="storefront">
                <Pair label="Adresse" value={row.address} />
                <Pair label="Téléphone" value={row.phone} />
                {row.phone ? (
                  <Button
                    label="Appeler"
                    icon="call"
                    variant="tonal"
                    onPress={() =>
                      void Linking.openURL(`tel:${String(row.phone).replace(/[^+\d]/g, '')}`)
                    }
                  />
                ) : null}
              </Card>
              <Card title="Informations" icon="info-outline">
                <Pair label="Créé le" value={date(row.created_at)} />
                <Pair label="Modifié le" value={date(row.updated_at)} />
              </Card>
            </ResponsiveGrid>
            {can('stores.update') ? (
              <Button label="Modifier les coordonnées" icon="edit" onPress={() => onEdit(row)} />
            ) : null}
            {!readOnly && row.name !== session?.activeStore?.name ? (
              <Button
                label="Changer de magasin actif"
                icon="swap-horiz"
                variant="outline"
                onPress={() => setConfirm('switch')}
              />
            ) : null}
            {can('stores.delete') ? (
              <Button
                label="Supprimer ce magasin"
                icon="delete-outline"
                variant="dangerSoft"
                onPress={() => setConfirm('delete')}
              />
            ) : null}
            {action.isError ? <ErrorState error={action.error} /> : null}
          </>
        ) : null}
      </AccessGate>
      <ConfirmDialog
        visible={!!confirm}
        title={confirm === 'delete' ? 'Supprimer ce magasin ?' : 'Changer de magasin actif ?'}
        message={`${text(row?.name)} — ${confirm === 'delete' ? 'Cette action ne peut pas être annulée.' : 'Les prochaines données concerneront ce magasin.'}`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        destructive={confirm === 'delete'}
        loading={action.isPending}
        onCancel={() => !action.isPending && setConfirm(undefined)}
        onConfirm={() => confirm && action.mutate(confirm)}
      />
    </CommerceScreen>
  );
}

function StoreForm({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can } = useCommerceAccess(),
    qc = useQueryClient();
  const [form, setForm] = useState({
    name: String(row?.name ?? ''),
    address: String(row?.address ?? ''),
    phone: String(row?.phone ?? ''),
  });
  const [logo, setLogo] = useState(''),
    [image, setImage] = useState(''),
    [photoError, setPhotoError] = useState(''),
    [leave, setLeave] = useState(false),
    [dirty, setDirty] = useState(false);
  const update = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
    setDirty(true);
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!can(row ? 'stores.update' : 'stores.create')) throw new Error('Action non autorisée.');
      if (!form.name.trim()) throw new Error('Le nom du magasin est obligatoire.');
      return commerceApi.write(row ? 'put' : 'post', row ? `/stores/${itemId(row)}` : '/stores', {
        ...form,
        ...(logo ? { logo } : {}),
      });
    },
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      void qc.invalidateQueries({ queryKey: ['access'] });
      onSaved();
    },
    retry: false,
  });
  async function pickLogo() {
    try {
      const picker = await import('expo-image-picker');
      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Autorisez la galerie pour choisir un logo.');
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      const asset = result.assets?.[0];
      if (!result.canceled && asset?.base64) {
        if (asset.base64.length > 2_700_000 || asset.width > 2048 || asset.height > 2048)
          throw new Error('Choisissez un logo de moins de 2 Mo et 2048 × 2048 pixels.');
        setLogo(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
        setImage(asset.uri);
        setDirty(true);
      }
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Logo indisponible.');
    }
  }
  const back = () => !save.isPending && (dirty ? setLeave(true) : onClose());
  return (
    <CommerceScreen title={row ? 'Modifier le magasin' : 'Nouveau magasin'} onBack={back}>
      <AccessGate permission={row ? 'stores.update' : 'stores.create'}>
        <ResponsiveGrid maxColumns={2}>
          <Card title="Identité du magasin" icon="storefront">
            <TextField
              label="Nom du magasin *"
              value={form.name}
              onChangeText={(v) => update('name', v)}
              maxLength={255}
              error={
                fieldError(save.error, 'name') ??
                (!form.name.trim() && save.isError ? 'Nom obligatoire' : undefined)
              }
            />
            <AppText variant="bodySm" color="outline">
              Nom utilisé sur les tickets et factures.
            </AppText>
            <Button
              label="Choisir un logo"
              icon="photo-library"
              variant="tonal"
              onPress={() => void pickLogo()}
            />
            {image ? (
              <Image source={{ uri: image }} style={{ width: 88, height: 88, borderRadius: 12 }} />
            ) : null}
            {photoError ? <Notice>{photoError}</Notice> : null}
          </Card>
          <Card title="Coordonnées" icon="place">
            <TextField
              label="Adresse (facultatif)"
              multiline
              value={form.address}
              onChangeText={(v) => update('address', v)}
              maxLength={500}
            />
            <TextField
              label="Téléphone (facultatif)"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => update('phone', v)}
              maxLength={20}
            />
            <Notice>
              Le propriétaire reste celui du compte. La modification des coordonnées ne transfère
              pas le magasin.
            </Notice>
          </Card>
        </ResponsiveGrid>
        {save.isError ? <ErrorState error={save.error} /> : null}
        <Button
          label={row ? 'Enregistrer les modifications' : 'Créer le magasin'}
          icon="check-circle-outline"
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
        <Button label="Annuler" variant="tonal" disabled={save.isPending} onPress={back} />
      </AccessGate>
      <ConfirmDialog
        visible={leave}
        title="Abandonner la saisie ?"
        message="Vos modifications ne seront pas enregistrées."
        confirmLabel="Abandonner"
        cancelLabel="Continuer"
        onConfirm={onClose}
        onCancel={() => setLeave(false)}
      />
    </CommerceScreen>
  );
}
