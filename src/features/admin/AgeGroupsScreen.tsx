import { useState } from 'react';
import { View } from 'react-native';
import { itemId } from '@/features/crm/crmApi';
import { AccessGate, ErrorState, SkeletonCards } from '@/features/commerce/CommerceUI';
import { adminApi, asRows, type Row, useAdminAction, useAdminQuery } from './api';
import { ageGroupPayload } from './model';
import {
  AdminPage,
  AppText,
  Button,
  TextField,
  Panel,
  Fold,
  Notice,
  ReadOnly,
  FormActions,
  useDirtyBack,
  useCommerceAccess,
  design,
} from './AdminDesign';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
export default function AgeGroupsScreen() {
  const { can } = useCommerceAccess();
  const query = useAdminQuery('/age-groups', {}, 'catalog.references.view');
  const [editing, setEditing] = useState<Row>(),
    [removing, setRemoving] = useState<Row>(),
    [limit, setLimit] = useState(20);
  const remove = useAdminAction(
    'catalog.references.manage',
    (r) => adminApi.write('delete', `/age-groups/${itemId(r)}`),
    () => setRemoving(undefined),
  );
  if (editing) return <AgeForm row={editing} onBack={() => setEditing(undefined)} />;
  const rows = query.data ? asRows(query.data) : [];
  return (
    <AdminPage title="Groupes d’âge">
      <AccessGate permission="catalog.references.view">
        <ReadOnly />
        {can('catalog.references.manage') ? (
          <Button label="Ajouter un groupe d’âge" icon="add" onPress={() => setEditing({})} />
        ) : null}
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <Panel>
              {rows.slice(0, limit).map((row) => (
                <View key={itemId(row)} style={design.stack}>
                  <View style={design.row}>
                    <View style={design.grow}>
                      <AppText variant="labelLg">{String(row.name)}</AppText>
                      <AppText>
                        {String(row.min_age)} – {String(row.max_age)} ans
                      </AppText>
                    </View>
                    {can('catalog.references.manage') ? (
                      <>
                        <Button
                          label="Modifier"
                          compact
                          fullWidth={false}
                          variant="ghost"
                          onPress={() => setEditing(row)}
                        />
                        <Button
                          label="Supprimer"
                          compact
                          fullWidth={false}
                          variant="ghost"
                          onPress={() => setRemoving(row)}
                        />
                      </>
                    ) : null}
                  </View>
                  {row.description ? (
                    <AppText variant="bodySm">{String(row.description)}</AppText>
                  ) : null}
                </View>
              ))}
              {!rows.length ? <Notice>Aucun groupe d’âge.</Notice> : null}
            </Panel>
            {limit < rows.length ? (
              <Button label="Afficher davantage" onPress={() => setLimit(limit + 20)} />
            ) : null}
          </>
        )}
        {remove.isError ? <Notice>{remove.error.message}</Notice> : null}
        <ConfirmDialog
          visible={!!removing}
          title="Supprimer ce groupe d’âge ?"
          message={String(removing?.name ?? '')}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          destructive
          loading={remove.isPending}
          onConfirm={() => removing && remove.mutate(removing)}
          onCancel={() => setRemoving(undefined)}
        />
      </AccessGate>
    </AdminPage>
  );
}
function AgeForm({ row, onBack }: { row: Row; onBack: () => void }) {
  const [form, setForm] = useState<Row>({
      name: row.name ?? '',
      min_age: String(row.min_age ?? 0),
      max_age: String(row.max_age ?? 0),
      description: row.description ?? '',
    }),
    [dirty, setDirty] = useState(false);
  const leave = useDirtyBack(dirty, onBack);
  const action = useAdminAction(
    'catalog.references.manage',
    () =>
      adminApi.write(
        row.id ? 'put' : 'post',
        row.id ? `/age-groups/${itemId(row)}` : '/age-groups',
        ageGroupPayload(form),
      ),
    onBack,
  );
  const update = (key: string, value: string) => {
    setDirty(true);
    setForm({ ...form, [key]: value });
  };
  return (
    <AdminPage
      title={row.id ? 'Modifier le groupe d’âge' : 'Ajouter un groupe d’âge'}
      onBack={leave.back}
      footer={
        <FormActions
          onCancel={leave.back}
          onSave={() => action.mutate({})}
          busy={action.isPending}
        />
      }
    >
      <Panel>
        {[
          ['name', 'Nom *'],
          ['min_age', 'Âge minimum *'],
          ['max_age', 'Âge maximum *'],
        ].map(([key, label]) => (
          <TextField
            key={key}
            label={label!}
            value={String(form[key!] ?? '')}
            keyboardType={key === 'name' ? 'default' : 'number-pad'}
            onChangeText={(v) => update(key!, v)}
          />
        ))}
      </Panel>
      <Fold label="Description (facultatif)">
        <TextField
          label="Description"
          value={String(form.description)}
          multiline
          onChangeText={(v) => update('description', v)}
        />
      </Fold>
      {action.isError ? <Notice>{action.error.message}</Notice> : null}
      {leave.dialog}
    </AdminPage>
  );
}
