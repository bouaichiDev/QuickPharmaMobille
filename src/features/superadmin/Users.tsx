import { useState } from 'react';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { usePlatformAction, usePlatformList } from './hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Tag,
  Note,
  Choice,
  QueryState,
  Pager,
  AppText,
  TextField,
  Button,
} from './AdminUI';
import { ActionForm, type FormField } from './ActionForm';
import type { AdminRole } from './accessTypes';
export interface PlatformUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  active: number;
  role: number;
  role_code: string;
  stores: { id: number; name: string }[];
}
interface StoreOption {
  id: number;
  name: string;
  user_id: number;
}
function StoreChoice({ onChange, label }: { onChange: (row: StoreOption) => void; label: string }) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    term = useDebounce(search);
  const query = usePlatformList<StoreOption>(
    '/superadmin/mobile/store-options',
    { search: term, page },
    open,
  );
  return (
    <>
      <Button label={label} variant="tonal" onPress={() => setOpen(true)} />
      <SelectionDialog visible={open} title="Magasin" onClose={() => setOpen(false)}>
        <TextField
          label="Rechercher"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <QueryState query={query} />
        {query.data?.data.map((row) => (
          <Button
            key={row.id}
            label={row.name}
            variant="ghost"
            onPress={() => {
              onChange(row);
              setOpen(false);
            }}
          />
        ))}
        <Pager result={query.data} setPage={setPage} busy={query.isFetching} />
      </SelectionDialog>
    </>
  );
}
function UserEditor({ user, onClose }: { user?: PlatformUser; onClose: () => void }) {
  const roles = usePlatformList<AdminRole>('/access-admin/roles', {
    scope: 'global',
    per_page: 200,
  });
  const [store, setStore] = useState(user?.stores[0]?.id ? String(user.stores[0].id) : ''),
    [storeName, setStoreName] = useState(user?.stores[0]?.name ?? '');
  const fields: FormField[] = [
    { key: 'firstName', label: 'Prénom', required: true },
    { key: 'lastName', label: 'Nom', required: true },
    { key: 'email', label: 'E-mail', required: true },
    { key: 'phone', label: 'Téléphone', required: !user },
    {
      key: 'role',
      label: 'Rôle global',
      type: 'number',
      required: true,
      options: (roles.data?.data ?? []).map((r) => [String(r.id), r.label || r.code]),
    },
    { key: 'active', label: 'Actif', type: 'bool' },
    { key: 'initialise', label: 'Demander une initialisation', type: 'bool' },
    ...(!user
      ? [
          {
            key: 'password',
            label: 'Mot de passe initial',
            required: true,
            type: 'password' as const,
          },
        ]
      : []),
  ];
  return (
    <>
      <Button label="Retour aux utilisateurs" variant="ghost" onPress={onClose} />
      {user ? <UserAssignments user={user} onSaved={onClose} /> : null}
      <Panel title={user ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}>
        {user ? (
          <Choice
            label="Magasin de rattachement"
            value={store}
            options={user.stores.map((s) => [String(s.id), s.name])}
            onChange={setStore}
          />
        ) : (
          <StoreChoice
            label={storeName || 'Choisir le magasin de rattachement'}
            onChange={(s) => {
              setStore(String(s.id));
              setStoreName(s.name);
            }}
          />
        )}
        <Note>
          Le rôle est celui du compte utilisateur, comme sur le web. Le magasin détermine le
          rattachement ; il ne transforme pas le rôle en rôle propre à ce magasin.
        </Note>
        <QueryState query={roles} />
      </Panel>
      {store && roles.data ? (
        <ActionForm
          key={`${user?.id ?? 'new'}-${store}`}
          title="Identité et accès"
          path={`/superadmin/mobile/users${user ? `/${user.id}` : ''}`}
          method={user ? 'put' : 'post'}
          fields={fields}
          initial={{
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
            phone: user?.phone ?? '',
            email: user?.email ?? '',
            role: user ? String(user.role) : '',
            active: user ? !!user.active : true,
            initialise: false,
          }}
          extra={{ target_store_id: Number(store) }}
          validate={(v) =>
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.email ?? ''))
              ? 'Vérifiez l’adresse e-mail.'
              : !user && String(v.password ?? '').length < 8
                ? 'Utilisez au moins 8 caractères pour le mot de passe.'
                : null
          }
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
function UserAssignments({ user, onSaved }: { user: PlatformUser; onSaved: () => void }) {
  const [target, setTarget] = useState<{ id: number; name: string; unlink: boolean }>();
  const action = usePlatformAction(onSaved);
  return (
    <Panel title="Affectations aux magasins">
      {user.stores.map((s) => (
        <Button
          key={s.id}
          label={`Retirer le rattachement · ${s.name}`}
          variant="dangerSoft"
          disabled={action.isPending}
          onPress={() => setTarget({ ...s, unlink: true })}
        />
      ))}
      <StoreChoice
        label="Rattacher à un autre magasin"
        onChange={(s) => setTarget({ id: s.id, name: s.name, unlink: false })}
      />
      <ConfirmDialog
        visible={!!target}
        title={target?.unlink ? 'Retirer le rattachement' : 'Ajouter le rattachement'}
        message={`${user.firstName} ${user.lastName} · ${target?.name}${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        destructive={target?.unlink}
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setTarget(undefined);
        }}
        onConfirm={() => {
          if (target)
            void action
              .run({
                path: `/superadmin/mobile/users/${user.id}/stores`,
                body: { target_store_id: target.id, unlink: target.unlink },
              })
              .catch(() => undefined);
        }}
      />
    </Panel>
  );
}
export function Users() {
  const [search, setSearch] = useState(''),
    [role, setRole] = useState(''),
    [active, setActive] = useState(''),
    [store, setStore] = useState(''),
    [storeName, setStoreName] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<PlatformUser>(),
    [create, setCreate] = useState(false);
  const term = useDebounce(search),
    query = usePlatformList<PlatformUser>('/superadmin/mobile/users', {
      search: term,
      role_id: role,
      active,
      target_store_id: store,
      page,
    });
  const roles = usePlatformList<AdminRole>('/access-admin/roles', {
    scope: 'global',
    per_page: 200,
  });
  return (
    <AdminScreen title="Utilisateurs multi-comptes" scroll={!!selected || create}>
      {selected || create ? (
        <UserEditor
          user={selected}
          onClose={() => {
            setSelected(undefined);
            setCreate(false);
          }}
        />
      ) : (
        <AdminList
          data={query.data?.data ?? []}
          header={
            <>
              <Button
                label="Nouvel utilisateur"
                icon="person-add"
                onPress={() => setCreate(true)}
              />
              <TextField
                label="Nom, e-mail ou téléphone"
                value={search}
                onChangeText={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Rôle"
                value={role}
                options={[
                  ['', 'Tous'],
                  ...(roles.data?.data ?? []).map(
                    (r) => [String(r.id), r.label || r.code] as [string, string],
                  ),
                ]}
                onChange={(v) => {
                  setRole(v);
                  setPage(1);
                }}
              />
              <Choice
                label="Statut"
                value={active}
                options={[
                  ['', 'Tous'],
                  ['1', 'Actifs'],
                  ['0', 'Inactifs'],
                ]}
                onChange={(v) => {
                  setActive(v);
                  setPage(1);
                }}
              />
              <StoreChoice
                label={storeName || 'Filtrer par magasin'}
                onChange={(s) => {
                  setStore(String(s.id));
                  setStoreName(s.name);
                  setPage(1);
                }}
              />
              <Button
                label="Réinitialiser"
                variant="ghost"
                onPress={() => {
                  setSearch('');
                  setRole('');
                  setActive('');
                  setStore('');
                  setStoreName('');
                  setPage(1);
                }}
              />
              <QueryState query={query} />
              <QueryState query={roles} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={`${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.email}>
              <AppText color="outline" variant="bodySm">
                {item.email}
              </AppText>
              <Tag label={Number(item.active) === 1 ? 'Actif' : 'Inactif'} />
              <Pair label="Rôle" value={item.role_code} />
              <Pair
                label="Magasins"
                value={item.stores.map((s) => s.name).join(', ') || 'Aucun rattachement'}
              />
              <Button
                label="Fiche et affectations"
                variant="tonal"
                onPress={() => setSelected(item)}
              />
            </Panel>
          )}
          footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
          empty={query.data ? <Note>Aucun utilisateur pour ces filtres.</Note> : null}
        />
      )}
    </AdminScreen>
  );
}
