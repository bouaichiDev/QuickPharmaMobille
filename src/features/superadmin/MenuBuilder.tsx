import { useState } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePlatformAction, usePlatformList } from './hooks';
import { AdminScreen, AdminList, Panel, Note, QueryState, Pager, Button, sa } from './AdminUI';
import { ActionForm, type FormField } from './ActionForm';
import type { Row } from './api';
interface Menu {
  id: number;
  label: string;
  route: string | null;
  parent_id: number | null;
  order: number;
  hidden: number;
  public: number;
  header: string | null;
  icon: string | null;
  children?: Menu[];
}
const flatten = (menus: Menu[]): Menu[] => menus.flatMap((m) => [m, ...flatten(m.children ?? [])]);
export function MenuBuilder() {
  const query = usePlatformList<Menu>('/menus', { per_page: 0 });
  const [edit, setEdit] = useState<Menu>(),
    [create, setCreate] = useState(false);
  const rows = flatten(query.data?.data ?? []);
  const fields: FormField[] = [
    { key: 'label', label: 'Libellé', required: true },
    { key: 'header', label: 'En-tête' },
    { key: 'route', label: 'Route' },
    {
      key: 'parent_id',
      label: 'Parent',
      type: 'number',
      options: [
        ['', 'Premier niveau'],
        ...(query.data?.data ?? [])
          .filter((m) => m.id !== edit?.id)
          .map((m) => [String(m.id), m.label] as [string, string]),
      ],
    },
    { key: 'order', label: 'Ordre', type: 'number' },
    { key: 'hidden', label: 'Masqué pour tous les rôles', type: 'bool' },
    { key: 'public', label: 'Public', type: 'bool' },
  ];
  return (
    <AdminScreen title="Hiérarchie des menus" scroll={!!edit || create}>
      {edit || create ? (
        <ActionForm
          title={edit ? 'Modifier le menu' : 'Nouveau menu'}
          path={`/menus${edit ? `/${edit.id}` : ''}`}
          method={edit ? 'put' : 'post'}
          fields={fields}
          initial={Object.fromEntries(
            fields.map((f) => [
              f.key,
              f.type === 'bool'
                ? !!(edit as unknown as Row)?.[f.key]
                : String((edit as unknown as Row)?.[f.key] ?? ''),
            ]),
          )}
          onClose={() => {
            setEdit(undefined);
            setCreate(false);
          }}
        />
      ) : (
        <AdminList
          data={rows}
          header={
            <>
              <Note>
                Les modifications de structure et du drapeau Masqué affectent tous les rôles. Les
                attributions par rôle se gèrent séparément.
              </Note>
              <Button label="Nouveau menu" icon="add" onPress={() => setCreate(true)} />
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={`${item.parent_id ? '↳ ' : ''}${item.label}`}>
              <Note>{item.route || 'Groupe de menus'}</Note>
              <Button label="Modifier" variant="tonal" onPress={() => setEdit(item)} />
            </Panel>
          )}
        />
      )}
    </AdminScreen>
  );
}
function RoleMenus({ role, onClose }: { role: Row; onClose: () => void }) {
  const menus = usePlatformList<Menu>('/menus', { per_page: 0 });
  const assignments = usePlatformList<{
    menu_id: number;
    parent_id: number | null;
    order: number;
    menu?: Menu;
  }>('/menu-role', { per_page: 0, role_id: role.id });
  if (!menus.data || !assignments.data)
    return (
      <>
        <QueryState query={menus} />
        <QueryState query={assignments} />
      </>
    );
  return (
    <RoleMenuEditor
      key={String(role.id)}
      role={role}
      menus={flatten(menus.data.data)}
      current={assignments.data.data}
      onClose={onClose}
    />
  );
}
function RoleMenuEditor({
  role,
  menus,
  current,
  onClose,
}: {
  role: Row;
  menus: Menu[];
  current: { menu_id: number; parent_id: number | null; order: number }[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(current.map((m) => m.menu_id)),
    [review, setReview] = useState(false);
  const action = usePlatformAction(onClose);
  return (
    <Panel title={`Menus du rôle ${role.label ?? role.code}`}>
      <Note>
        Les attributions remplacent la liste complète du rôle après confirmation. La hiérarchie et
        l’ordre existants sont conservés.
      </Note>
      {menus.map((m) => (
        <Checkbox
          key={m.id}
          checked={selected.includes(m.id)}
          label={`${m.parent_id ? 'Sous-menu · ' : ''}${m.label}`}
          onChange={(checked) =>
            setSelected((ids) =>
              checked
                ? [...new Set([...ids, ...(m.parent_id ? [m.parent_id] : []), m.id])]
                : ids.filter(
                    (id) => id !== m.id && menus.find((menu) => menu.id === id)?.parent_id !== m.id,
                  ),
            )
          }
        />
      ))}
      <View style={sa.row}>
        <Button
          label="Annuler"
          variant="tonal"
          style={sa.grow}
          disabled={action.isPending}
          onPress={onClose}
        />
        <Button label="Vérifier" style={sa.grow} onPress={() => setReview(true)} />
      </View>
      <ConfirmDialog
        visible={review}
        title="Enregistrer les menus du rôle"
        message={`${role.label ?? role.code} · ${selected.length} menus${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(false);
        }}
        onConfirm={() =>
          void action
            .run({
              path: '/menu-role/sync',
              body: {
                role_id: role.id,
                menus: menus
                  .filter((m) => selected.includes(m.id))
                  .map((m) => ({
                    menu_id: m.id,
                    parent_id: current.some((a) => a.menu_id === m.id)
                      ? current.find((a) => a.menu_id === m.id)!.parent_id
                      : m.parent_id,
                    order: current.find((a) => a.menu_id === m.id)?.order ?? m.order,
                    hidden: !!m.hidden,
                  })),
              },
            })
            .catch(() => undefined)
        }
      />
    </Panel>
  );
}
export function RoleAssignments() {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<Row>(),
    [route, setRoute] = useState<Row>();
  const roles = usePlatformList<Row>('/rolesListe', { page });
  return (
    <AdminScreen title="Attribution des menus & accueil" scroll={!!selected || !!route}>
      {selected ? (
        <RoleMenus role={selected} onClose={() => setSelected(undefined)} />
      ) : route ? (
        <ActionForm
          title={`Accueil · ${route.label ?? route.code}`}
          path="/roles/update"
          method="put"
          fields={[
            {
              key: 'default_route',
              label: 'Page d’accueil',
              required: true,
              options: [
                ['/superadmin/dashboard', 'Tableau de bord Super Admin'],
                ['/services-crm', 'Tableau de bord Services CRM'],
                ['/dashboard', 'Tableau de bord ventes'],
              ],
            },
          ]}
          initial={{ default_route: String(route.default_route ?? '') }}
          extra={{ id: route.id }}
          onClose={() => setRoute(undefined)}
        />
      ) : (
        <AdminList
          data={roles.data?.data ?? []}
          header={<QueryState query={roles} />}
          renderItem={({ item }) => (
            <Panel title={String(item.label || item.code)}>
              <Button
                label="Attribuer les menus"
                variant="tonal"
                onPress={() => setSelected(item)}
              />
              <Button
                label="Configurer la page d’accueil"
                variant="tonal"
                onPress={() => setRoute(item)}
              />
            </Panel>
          )}
          footer={<Pager result={roles.data} setPage={setPage} busy={roles.isFetching} />}
        />
      )}
    </AdminScreen>
  );
}
