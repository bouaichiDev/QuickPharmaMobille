import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AccessGate,
  CommerceList,
  ReferenceSelect,
  SearchFilterRow,
  ErrorState,
  SkeletonCards,
} from '@/features/commerce/CommerceUI';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { itemId, record } from '@/features/crm/crmApi';
import { useQuota } from '@/features/access/hooks';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminApi, asRows, useAdminAction, useAdminQuery, type Row } from './api';
import { useAdminList } from './useAdminList';
import { userPayload } from './model';
import {
  AdminPage,
  Panel,
  AppText,
  Button,
  TextField,
  Toggle,
  Notice,
  ReadOnly,
  FormActions,
  useDirtyBack,
  useCommerceAccess,
  design,
} from './AdminDesign';
export default function TeamUsersScreen() {
  const { can } = useCommerceAccess();
  const quota = useQuota('users.total');
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [selected, setSelected] = useState<Row>();
  const [filters, setFilters] = useState({ firstName: '', lastName: '', phone: '', email: '' }),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false);
  const query = useAdminList(
    '/usersListe',
    { searchValue: term, ...filters, sortField: 'firstName', sortOrder: 'ascend' },
    'team.users.view',
  );
  const blocked = quota.state === 'not_configured' || (quota.state === 'limited' && quota.exceeded);
  if (selected) return <TeamUserForm row={selected} onBack={() => setSelected(undefined)} />;
  return (
    <AdminPage title="Utilisateurs" scroll={false}>
      <AccessGate permission="team.users.view">
        <ReadOnly />
        <View style={design.row}>
          <AppText style={design.grow}>
            {quota.state === 'limited'
              ? `${quota.used ?? '—'} / ${quota.limit} utilisateurs`
              : quota.state === 'unlimited'
                ? 'Utilisateurs illimités'
                : 'Quota non configuré'}
          </AppText>
          {can('team.users.manage') ? (
            <Button
              label="Ajouter"
              compact
              fullWidth={false}
              disabled={blocked}
              onPress={() => setSelected({})}
            />
          ) : null}
        </View>
        {blocked ? <Notice>Le quota ne permet pas d’ajouter un utilisateur.</Notice> : null}
        <SearchFilterRow
          label="Rechercher un utilisateur"
          placeholder="Nom, e-mail, téléphone…"
          value={search}
          onChangeText={setSearch}
          filterLabel="Filtres"
          onFilterPress={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        />
        <CommerceList
          header={null}
          query={query}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => setSelected(item)}>
              <Panel>
                <View style={design.row}>
                  <AppText variant="labelLg" style={design.grow}>
                    {String(item.firstName ?? '')} {String(item.lastName ?? '')}
                  </AppText>
                  <AppText color={item.active ? 'secondary' : 'error'}>
                    {item.active ? 'Actif' : 'Inactif'}
                  </AppText>
                </View>
                <AppText>{String(item.email ?? '')}</AppText>
                <AppText variant="bodySm">
                  {String(item.roleLabel ?? '')} • {String(item.phone ?? '')}
                </AppText>
                <AppText variant="bodySm">
                  {Array.isArray(item.stores)
                    ? item.stores.map((v) => String(record(v).name ?? '')).join(', ')
                    : ''}
                </AppText>
              </Panel>
            </Pressable>
          )}
        />
        <SelectionDialog
          visible={filterOpen}
          title="Filtres utilisateurs"
          onClose={() => setFilterOpen(false)}
        >
          {[
            ['firstName', 'Prénom'],
            ['lastName', 'Nom'],
            ['phone', 'Téléphone'],
            ['email', 'E-mail'],
          ].map(([key, label]) => (
            <TextField
              key={key}
              label={label!}
              value={draft[key as keyof typeof draft]}
              onChangeText={(v) => setDraft({ ...draft, [key!]: v })}
            />
          ))}
          <Button
            label="Appliquer"
            onPress={() => {
              setFilters(draft);
              setFilterOpen(false);
            }}
          />
          <Button
            label="Réinitialiser"
            variant="tonal"
            onPress={() => setDraft({ firstName: '', lastName: '', phone: '', email: '' })}
          />
        </SelectionDialog>
      </AccessGate>
    </AdminPage>
  );
}
function TeamUserForm({ row, onBack }: { row: Row; onBack: () => void }) {
  const { can } = useCommerceAccess();
  const quota = useQuota('users.total');
  const id = row.id ? itemId(row) : '';
  const query = useAdminQuery(`/users/show/${id}`, {}, 'team.users.view', !!id);
  if (id && query.isPending)
    return (
      <AdminPage title="Utilisateur" onBack={onBack}>
        <SkeletonCards count={2} />
      </AdminPage>
    );
  if (id && query.isError)
    return (
      <AdminPage title="Utilisateur" onBack={onBack}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </AdminPage>
    );
  const value = id ? (asRows(query.data)[0] ?? row) : {};
  return (
    <UserEditor
      key={id || 'new'}
      row={value}
      onBack={onBack}
      canEdit={can('team.users.manage')}
      blocked={
        !id && (quota.state === 'not_configured' || (quota.state === 'limited' && quota.exceeded))
      }
    />
  );
}
function UserEditor({
  row,
  onBack,
  canEdit,
  blocked,
}: {
  row: Row;
  onBack: () => void;
  canEdit: boolean;
  blocked: boolean;
}) {
  const { can } = useCommerceAccess();
  const id = row.id ? itemId(row) : '';
  const [form, setForm] = useState<Row>({
      ...row,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      role: row.role ?? '',
      active: row.active == null ? true : !!row.active,
      initialise: !!row.initialise,
      password: '',
    }),
    [dirty, setDirty] = useState(false),
    [passwordVisible, setPasswordVisible] = useState(false),
    [storeConfirm, setStoreConfirm] = useState<Row>(),
    [deleting, setDeleting] = useState(false);
  const leave = useDirtyBack(dirty, onBack),
    update = (key: string, value: unknown) => {
      setDirty(true);
      setForm({ ...form, [key]: value });
    };
  const save = useAdminAction(
    'team.users.manage',
    () => {
      if (blocked) throw new Error('Quota atteint.');
      return adminApi.write(
        id ? 'put' : 'post',
        id ? '/users/update' : '/users',
        userPayload(form, !!id),
      );
    },
    onBack,
  );
  const linked = useAdminQuery('/users/getUserStores', { userid: id }, 'team.users.view', !!id);
  const available = useAdminQuery(
    '/users/getAvailableStores',
    { userid: id },
    'team.stores.assign',
    !!id,
  );
  const assign = useAdminAction(
    'team.stores.assign',
    (data) =>
      adminApi.write(
        'post',
        data.unlink ? '/users/unlinkUserFromStore' : '/users/linkUserToStore',
        { userId: id, storeId: data.storeId },
      ),
    () => setStoreConfirm(undefined),
  );
  const remove = useAdminAction(
    'team.users.manage',
    () => adminApi.get(`/users/delete/${id}`),
    onBack,
  );
  return (
    <AdminPage
      title={id ? (canEdit ? 'Modifier l’utilisateur' : 'Utilisateur') : 'Nouvel utilisateur'}
      onBack={leave.back}
      footer={
        canEdit ? (
          <FormActions
            onCancel={leave.back}
            onSave={() => save.mutate({})}
            busy={save.isPending}
            disabled={blocked}
          />
        ) : undefined
      }
    >
      <ReadOnly />
      <Panel title="Informations utilisateur">
        <View style={design.inset}>
          <AppText variant="headlineSm">
            {String(form.firstName).slice(0, 1)}
            {String(form.lastName).slice(0, 1)}
          </AppText>
        </View>
        {[
          ['firstName', 'Prénom *'],
          ['lastName', 'Nom *'],
          ['email', 'E-mail *'],
          ['phone', 'Téléphone *'],
        ].map(([key, label]) => (
          <TextField
            key={key}
            label={label!}
            value={String(form[key!])}
            editable={canEdit}
            keyboardType={
              key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'
            }
            onChangeText={(v) => update(key!, v)}
          />
        ))}
        {canEdit ? (
          <ReferenceSelect
            label="Rôle *"
            path="/team/assignable-roles"
            value={String(form.role)}
            onChange={(v) => update('role', v)}
          />
        ) : (
          <AppText>Rôle : {String(row.roleLabel ?? '—')}</AppText>
        )}
        {!id ? (
          <>
            <TextField
              label="Mot de passe initial *"
              value={String(form.password)}
              secureTextEntry={!passwordVisible}
              onChangeText={(v) => update('password', v)}
            />
            <Button
              label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              variant="ghost"
              onPress={() => setPasswordVisible(!passwordVisible)}
            />
          </>
        ) : null}
        <Toggle
          label="Compte actif"
          value={!!form.active}
          onChange={(v) => update('active', v)}
          disabled={!canEdit}
        />
        <Toggle
          label="Changer le mot de passe à la première connexion"
          value={!!form.initialise}
          onChange={(v) => update('initialise', v)}
          disabled={!canEdit}
        />
      </Panel>
      {id ? (
        <Panel title="Magasins associés">
          {linked.isPending ? (
            <AppText>Chargement…</AppText>
          ) : linked.isError ? (
            <Notice>{linked.error.message}</Notice>
          ) : (
            asRows(linked.data).map((store) => (
              <View key={String(store.storeId)} style={design.row}>
                <AppText style={design.grow}>{String(store.storeName)}</AppText>
                {can('team.stores.assign') ? (
                  <Button
                    compact
                    fullWidth={false}
                    label="Dissocier"
                    variant="ghost"
                    onPress={() => setStoreConfirm({ ...store, unlink: true })}
                  />
                ) : null}
              </View>
            ))
          )}
          {can('team.stores.assign') && available.data
            ? asRows(available.data).map((store) => (
                <View key={String(store.storeId)} style={design.row}>
                  <AppText style={design.grow}>{String(store.storeName)}</AppText>
                  <Button
                    label="Associer"
                    compact
                    fullWidth={false}
                    variant="tonal"
                    onPress={() => setStoreConfirm(store)}
                  />
                </View>
              ))
            : null}
          {available.isError ? <Notice>{available.error.message}</Notice> : null}
        </Panel>
      ) : (
        <Notice>
          Le nouvel utilisateur sera associé au magasin connecté. Les autres magasins pourront être
          ajoutés depuis sa fiche.
        </Notice>
      )}
      {id && canEdit ? (
        <Button
          label="Supprimer l’utilisateur"
          variant="dangerSoft"
          onPress={() => setDeleting(true)}
        />
      ) : null}
      {save.isError ? <Notice>{save.error.message}</Notice> : null}
      {assign.isError ? <Notice>{assign.error.message}</Notice> : null}
      {remove.isError ? <Notice>{remove.error.message}</Notice> : null}
      {leave.dialog}
      <ConfirmDialog
        visible={!!storeConfirm}
        title={storeConfirm?.unlink ? 'Dissocier ce magasin ?' : 'Associer ce magasin ?'}
        message={String(storeConfirm?.storeName ?? '')}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        loading={assign.isPending}
        onConfirm={() => storeConfirm && assign.mutate(storeConfirm)}
        onCancel={() => setStoreConfirm(undefined)}
      />
      <ConfirmDialog
        visible={deleting}
        title="Supprimer l’utilisateur ?"
        message="Cette action retire l’accès de cet utilisateur selon les règles du serveur."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate({})}
        onCancel={() => setDeleting(false)}
      />
    </AdminPage>
  );
}
