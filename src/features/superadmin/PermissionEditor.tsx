import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformAction, usePlatformGet, usePlatformList } from './hooks';
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
  sa,
} from './AdminUI';
import type { AdminRole, CatalogResponse, CatalogModule } from './accessTypes';
import { ActionForm } from './ActionForm';
export function PermissionSelection({
  modules,
  selected,
  onChange,
  protectedKey,
}: {
  modules: CatalogModule[];
  selected: string[];
  onChange: (s: string[]) => void;
  protectedKey?: string;
}) {
  const [open, setOpen] = useState(''),
    [search, setSearch] = useState('');
  const { tDynamic } = useTranslation();
  return (
    <>
      <TextField label="Rechercher une permission" value={search} onChangeText={setSearch} />
      {modules.map((module) => {
        const permissions = module.permissions.filter((p) =>
          `${tDynamic(p.label_key, p.key)} ${p.key}`.toLowerCase().includes(search.toLowerCase()),
        );
        if (!permissions.length) return null;
        return (
          <Panel key={module.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open === module.key || !!search }}
              onPress={() => setOpen(open === module.key ? '' : module.key)}
              style={sa.row}
            >
              <Icon name="verified-user" color="primary" />
              <AppText variant="labelLg" style={sa.grow}>
                {tDynamic(module.label_key, module.key)}
              </AppText>
              <Tag
                label={`${permissions.filter((p) => selected.includes(p.key)).length}/${permissions.length}`}
              />
              <Icon name={open === module.key ? 'expand-less' : 'expand-more'} />
            </Pressable>
            {open === module.key || search
              ? permissions.slice(0, 100).map((p) => (
                  <View key={p.key} style={sa.row}>
                    <View style={sa.grow}>
                      <AppText variant="labelMd">{tDynamic(p.label_key, p.key)}</AppText>
                      <AppText variant="bodySm" color="outline">
                        {p.key}
                        {p.key === protectedKey ? ' · Permission protégée' : ''}
                      </AppText>
                    </View>
                    <Switch
                      accessibilityLabel={tDynamic(p.label_key, p.key)}
                      disabled={p.key === protectedKey}
                      value={selected.includes(p.key)}
                      onValueChange={(checked) =>
                        onChange(
                          checked
                            ? [...new Set([...selected, p.key])]
                            : selected.filter((k) => k !== p.key),
                        )
                      }
                    />
                  </View>
                ))
              : null}
          </Panel>
        );
      })}
    </>
  );
}
function EditPermissions({
  title,
  current,
  path,
  lock,
  protectedKey,
  onClose,
}: {
  title: string;
  current: string[];
  path: string;
  lock?: number;
  protectedKey?: string;
  onClose: () => void;
}) {
  const catalog = usePlatformGet<CatalogResponse>('/access-admin/modules');
  const [selected, setSelected] = useState(current),
    [reason, setReason] = useState(''),
    [review, setReview] = useState(false);
  const action = usePlatformAction(onClose),
    { tDynamic } = useTranslation();
  const permissions = catalog.data?.modules.flatMap((m) => m.permissions) ?? [];
  const name = (key: string) => {
    const p = permissions.find((p) => p.key === key);
    return p ? tDynamic(p.label_key, key) : key;
  };
  const added = selected.filter((k) => !current.includes(k)),
    removed = current.filter((k) => !selected.includes(k));
  return (
    <>
      <Panel title={title}>
        <Note>
          {selected.length} permissions accordées. Les changements sont appliqués après
          confirmation.
        </Note>
        <TextField label="Motif" value={reason} onChangeText={setReason} />
        <QueryState query={catalog} />
      </Panel>
      {catalog.data ? (
        <PermissionSelection
          modules={catalog.data.modules}
          selected={selected}
          onChange={setSelected}
          protectedKey={protectedKey}
        />
      ) : null}
      <View style={sa.row}>
        <Button
          label="Annuler"
          variant="tonal"
          style={sa.grow}
          disabled={action.isPending}
          onPress={onClose}
        />
        <Button
          label="Voir les modifications"
          style={sa.grow}
          disabled={catalog.isPending || catalog.isError || (!added.length && !removed.length)}
          onPress={() => setReview(true)}
        />
      </View>
      {action.isError ? <Note>{action.error.message}</Note> : null}
      <ConfirmDialog
        visible={review}
        title="Enregistrer les permissions"
        message={`${title}\nAjoutées : ${added.map(name).join(', ') || 'aucune'}\nRetirées : ${removed.map(name).join(', ') || 'aucune'}${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(false);
        }}
        onConfirm={() =>
          void action
            .run({
              method: 'put',
              path,
              body: {
                permissions: selected,
                reason: reason.trim() || undefined,
                ...(lock == null ? {} : { lock_version: lock }),
              },
            })
            .catch(() => undefined)
        }
      />
    </>
  );
}
export function Roles() {
  const [scope, setScope] = useState(''),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<AdminRole>(),
    [create, setCreate] = useState(false);
  const query = usePlatformList<AdminRole>('/access-admin/roles', { scope, page });
  const title = selected?.label || selected?.code || 'Rôle';
  return (
    <AdminScreen title="Rôles & permissions" scroll={!selected && !create ? false : true}>
      {selected ? (
        <EditPermissions
          key={selected.id}
          title={title}
          current={selected.permissions}
          path={`/access-admin/roles/${selected.id}/permissions`}
          lock={selected.lock_version}
          protectedKey={selected.code === 'SuperAdmin' ? 'platform.permissions.manage' : undefined}
          onClose={() => setSelected(undefined)}
        />
      ) : create ? (
        <ActionForm
          title="Créer un modèle de rôle"
          path="/access-admin/roles/templates"
          fields={[
            { key: 'label', label: 'Nom', required: true },
            { key: 'reason', label: 'Motif' },
          ]}
          extra={{ permissions: [] }}
          onClose={() => setCreate(false)}
        />
      ) : (
        <AdminList
          data={query.data?.data ?? []}
          header={
            <>
              <Choice
                label="Périmètre"
                value={scope}
                options={[
                  ['', 'Tous'],
                  ['global', 'Globaux / système'],
                  ['template', 'Modèles'],
                  ['account', 'Comptes'],
                ]}
                onChange={(v) => {
                  setScope(v);
                  setPage(1);
                }}
              />
              <Button label="Créer un modèle" icon="add" onPress={() => setCreate(true)} />
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={item.label || item.code}>
              <Tag
                label={
                  item.is_system
                    ? 'Système'
                    : item.is_template
                      ? 'Modèle'
                      : item.account_id
                        ? 'Compte'
                        : 'Global'
                }
              />
              <Pair label="Permissions accordées" value={item.permissions.length} />
              <Button
                label="Gérer les permissions"
                variant="tonal"
                onPress={() => setSelected(item)}
              />
            </Panel>
          )}
          footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
        />
      )}
    </AdminScreen>
  );
}
interface MenuRule {
  id: number;
  label: string;
  route: string | null;
  parent_id: number | null;
  hidden: number;
  permissions: string[];
}
export function Menus() {
  const query = usePlatformGet<MenuRule[]>('/access-admin/menus/permissions');
  const [selected, setSelected] = useState<MenuRule>(),
    [search, setSearch] = useState('');
  const { tDynamic } = useTranslation();
  return (
    <AdminScreen title="Règles des menus" scroll={!!selected}>
      {selected ? (
        <EditPermissions
          key={selected.id}
          title={tDynamic(selected.label, selected.label)}
          current={selected.permissions}
          path={`/access-admin/menus/${selected.id}/permissions`}
          onClose={() => setSelected(undefined)}
        />
      ) : (
        <AdminList
          data={(query.data ?? []).filter((m) =>
            `${m.label} ${m.route}`.toLowerCase().includes(search.toLowerCase()),
          )}
          header={
            <>
              <Note>
                Ces règles contrôlent la visibilité. Une liste vide conserve les règles historiques
                d’attribution des menus aux rôles.
              </Note>
              <TextField label="Rechercher un menu" value={search} onChangeText={setSearch} />
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={tDynamic(item.label, item.label)}>
              <AppText variant="bodySm" color="outline">
                {item.route || 'Groupe de menus'}
              </AppText>
              <Pair label="Règles de permission" value={item.permissions.length} />
              <Tag label={item.hidden ? 'Masqué' : 'Visible selon les droits'} />
              <Button
                label="Configurer les permissions"
                variant="tonal"
                onPress={() => setSelected(item)}
              />
            </Panel>
          )}
        />
      )}
    </AdminScreen>
  );
}
