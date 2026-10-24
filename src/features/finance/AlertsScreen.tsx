import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { adminApi, asRecord, type Row } from '@/features/admin/api';
import { record } from '@/features/crm/crmApi';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { alertLabels, priorities } from './model';
import {
  AdminPage,
  Panel,
  AppText,
  Button,
  TextField,
  Tabs,
  Notice,
  CommerceList,
  DateInput,
  design,
  date,
  FinanceRow,
  Metric,
  QueryState,
  useFinanceList,
  useFinanceQuery,
  useFinanceAction,
  useCommerceAccess,
  go,
  f,
  WeekStrip,
} from './FinanceUI';
export default function AlertsScreen({
  dashboard = false,
  id,
}: {
  dashboard?: boolean;
  id?: string;
}) {
  const [detail, setDetail] = useState(id ?? '');
  if (detail) return <AlertDetail id={detail} onBack={() => setDetail('')} />;
  return dashboard ? <AlertDashboard onOpen={setDetail} /> : <AlertList onOpen={setDetail} />;
}
function AlertDashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const query = useFinanceQuery('/alerts/dashboard', {}, 'self'),
    data = asRecord(query.data),
    priority = record(data.by_priority);
  return (
    <AdminPage title="Tableau de bord des alertes">
      <Button
        label="Actualiser"
        icon="refresh"
        variant="tonal"
        compact
        onPress={() => void query.refetch()}
      />
      <QueryState query={query}>
        <AppText style={f.section}>Alertes non lues</AppText>
        <View style={f.grid}>
          {Object.entries(priorities).map(([key, label]) => (
            <Metric
              key={key}
              label={label}
              value={String(priority[key] ?? 0)}
              tone={key === 'critical' ? 'red' : key === 'high' ? 'amber' : 'blue'}
            />
          ))}
        </View>
        <Panel title="Par type">
          {Object.entries(record(data.by_type)).map(([key, count]) => (
            <FinanceRow
              key={key}
              icon="notifications-none"
              title={alertLabels[key] ?? key}
              value={String(count)}
              onPress={() => go('alerts')}
            />
          ))}
        </Panel>
        <Panel title="Dernières alertes">
          {(Array.isArray(data.latest) ? data.latest : []).map(record).map((row) => (
            <FinanceRow
              key={String(row.uid)}
              title={String(row.title)}
              subtitle={date(row.created_at)}
              badge={priorities[String(row.priority)]}
              icon="notifications-active"
              onPress={() => onOpen(String(row.uid))}
            />
          ))}
        </Panel>
        <Button label="Voir toutes les alertes" onPress={() => go('alerts')} />
      </QueryState>
    </AdminPage>
  );
}
function AlertList({ onOpen }: { onOpen: (id: string) => void }) {
  const { readOnly } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    [tab, setTab] = useState('Toutes'),
    [filters, setFilters] = useState<Row>({}),
    [draft, setDraft] = useState<Row>({}),
    [filterOpen, setFilterOpen] = useState(false),
    [confirm, setConfirm] = useState(false);
  const term = useDebounce(search),
    query = useFinanceList(
      '/alerts',
      {
        ...filters,
        search: term,
        ...(tab === 'Non lues' ? { is_read: 0 } : tab === 'Lues' ? { is_read: 1 } : {}),
        sort_by: 'created_at',
        sort_direction: 'desc',
      },
      'self',
    );
  const readAll = useFinanceAction(
    'self',
    () => adminApi.write('post', '/alerts/read-all'),
    () => setConfirm(false),
  );
  return (
    <AdminPage title="Alertes intelligentes" scroll={false}>
      <WeekStrip
        value={filters.from === filters.to ? String(filters.from ?? '') : ''}
        onChange={(day) => setFilters({ ...filters, from: day, to: day })}
      />
      <View style={f.row}>
        <View style={design.grow}>
          <TextField
            label="Rechercher"
            value={search}
            onChangeText={setSearch}
            placeholder="Alerte, message…"
          />
        </View>
        <Button
          label="Filtres"
          compact
          fullWidth={false}
          variant="tonal"
          onPress={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        />
      </View>
      <Tabs values={['Toutes', 'Non lues', 'Lues']} value={tab} onChange={setTab} />
      {!readOnly ? (
        <Button
          label="Tout marquer comme lu"
          variant="tonal"
          compact
          onPress={() => setConfirm(true)}
        />
      ) : null}
      <CommerceList
        header={null}
        query={query}
        renderItem={({ item }) => (
          <FinanceRow
            title={String(item.title)}
            subtitle={`${alertLabels[String(item.type)] ?? item.type} · ${date(item.created_at)}`}
            badge={`${priorities[String(item.priority)] ?? item.priority}${item.is_read ? '' : ' · Non lue'}`}
            icon="notifications-active"
            onPress={() => onOpen(String(item.uid))}
          />
        )}
      />
      {readAll.isError ? <Notice>{readAll.error.message}</Notice> : null}
      <SelectionDialog
        visible={filterOpen}
        title="Filtrer les alertes"
        onClose={() => setFilterOpen(false)}
      >
        <AppText>Priorité</AppText>
        <Tabs
          values={['Toutes', ...Object.values(priorities)]}
          value={priorities[String(draft.priority)] ?? 'Toutes'}
          onChange={(v) =>
            setDraft({
              ...draft,
              priority: Object.keys(priorities).find((k) => priorities[k] === v) ?? '',
            })
          }
        />
        <AppText>Type d’alerte</AppText>
        <Tabs
          values={['Tous', ...Object.values(alertLabels)]}
          value={alertLabels[String(draft.type)] ?? 'Tous'}
          onChange={(v) =>
            setDraft({
              ...draft,
              type: Object.keys(alertLabels).find((k) => alertLabels[k] === v) ?? '',
            })
          }
        />
        <DateInput
          label="Du"
          value={String(draft.from ?? '')}
          onChange={(v) => setDraft({ ...draft, from: v })}
        />
        <DateInput
          label="Au"
          value={String(draft.to ?? '')}
          onChange={(v) => setDraft({ ...draft, to: v })}
        />
        <Button
          label="Appliquer"
          disabled={!!draft.from && !!draft.to && String(draft.from) > String(draft.to)}
          onPress={() => {
            setFilters(draft);
            setFilterOpen(false);
          }}
        />
        <Button label="Réinitialiser" variant="tonal" onPress={() => setDraft({})} />
      </SelectionDialog>
      <ConfirmDialog
        visible={confirm}
        title="Tout marquer comme lu ?"
        message="Toutes les alertes du magasin seront marquées comme lues."
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        loading={readAll.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => readAll.mutate({})}
      />
    </AdminPage>
  );
}
function AlertDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { readOnly, can } = useCommerceAccess(),
    query = useFinanceQuery(`/alerts/${encodeURIComponent(id)}`, {}, 'self'),
    row = asRecord(query.data);
  const [confirm, setConfirm] = useState(false);
  const read = useFinanceAction('self', () =>
    adminApi.write('post', `/alerts/${encodeURIComponent(id)}/read`),
  );
  const dismiss = useFinanceAction(
    'self',
    () => adminApi.write('delete', `/alerts/${encodeURIComponent(id)}`),
    onBack,
  );
  return (
    <AdminPage title="Détail de l’alerte" onBack={onBack}>
      <QueryState query={query}>
        <Panel title={String(row.title ?? 'Alerte')}>
          <AppText>
            {priorities[String(row.priority)]} · {row.is_read ? 'Lue' : 'Non lue'}
          </AppText>
          <AppText variant="bodySm">{date(row.created_at)}</AppText>
          <AppText>{String(row.message ?? '')}</AppText>
          <AppText variant="bodySm">
            {alertLabels[String(row.type)] ?? String(row.type ?? '')}
          </AppText>
        </Panel>
        {!readOnly ? (
          <>
            <Button
              label={row.is_read ? 'Déjà lue' : 'Marquer comme lue'}
              disabled={!!row.is_read}
              loading={read.isPending}
              onPress={() => read.mutate({})}
            />
            <Button label="Ignorer cette alerte" variant="tonal" onPress={() => setConfirm(true)} />
          </>
        ) : null}
        {row.entity_name === 'cheque' && row.entity_id ? (
          <Button
            label="Voir le chèque"
            variant="outline"
            onPress={() => go('cheques', { id: String(row.entity_id) })}
          />
        ) : null}
        {row.entity_name === 'product' && row.entity_id && can('products.view') ? (
          <Button
            label="Voir le produit"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/stock',
                params: { product_id: String(row.entity_id) },
              } as never)
            }
          />
        ) : null}
        {row.entity_name === 'customer' && row.entity_id && can('credits.view') ? (
          <Button
            label="Voir le crédit client"
            variant="outline"
            onPress={() => go('credits', { id: String(row.entity_id) })}
          />
        ) : null}
        {read.isError || dismiss.isError ? (
          <Notice>{read.error?.message ?? dismiss.error?.message}</Notice>
        ) : null}
        <ConfirmDialog
          visible={confirm}
          title="Ignorer cette alerte ?"
          message="Cette alerte sera retirée de la liste active du magasin."
          confirmLabel="Ignorer"
          cancelLabel="Retour"
          destructive
          loading={dismiss.isPending}
          onCancel={() => setConfirm(false)}
          onConfirm={() => dismiss.mutate({})}
        />
      </QueryState>
    </AdminPage>
  );
}
