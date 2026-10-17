import { useState } from 'react';
import { View } from 'react-native';
import { STabs, useDebounce } from '@/features/catalogue/StockDesign';
import { usePlatformGet, usePlatformList } from './hooks';
import {
  Panel,
  Pair,
  Note,
  DateInput,
  Choice,
  QueryState,
  Pager,
  TextField,
  Button,
  AppText,
  sa,
  currency,
  date,
} from './AdminUI';
import type { TenantActivity, TenantMonthlyStats } from './types';
import { activityLabel } from './activityLabel';
const series: [string, string][] = [
  ['sales', 'Ventes'],
  ['purchases', 'Entrées / achats'],
  ['orders', 'Commandes'],
  ['crm', 'Services CRM'],
];
export function periodValid(from: string, to: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;
}
export function TenantStatistics({ id }: { id: number }) {
  const today = new Date(),
    start = `${today.getFullYear()}-01-01`,
    end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [from, setFrom] = useState(start),
    [to, setTo] = useState(end),
    [group, setGroup] = useState('month'),
    [filters, setFilters] = useState({ date_from: start, date_to: end, group_by: 'month' }),
    [selected, setSelected] = useState('sales'),
    [limit, setLimit] = useState(25);
  const query = usePlatformGet<TenantMonthlyStats>(
    `/superadmin/tenants/${id}/monthly-stats`,
    filters,
  );
  const rows = query.data?.months ?? [];
  const max = Math.max(1, ...rows.map((r) => Number(r[selected as 'sales'])));
  return (
    <>
      <Panel title="Flux & tendances">
        <DateInput label="Du" value={from} onChange={setFrom} />
        <DateInput label="Au" value={to} onChange={setTo} />
        <Choice
          label="Regroupement"
          value={group}
          options={[
            ['day', 'Par jour'],
            ['month', 'Par mois'],
          ]}
          onChange={setGroup}
        />
        <Button
          label="Appliquer les filtres"
          disabled={!periodValid(from, to)}
          onPress={() => {
            setFilters({ date_from: from, date_to: to, group_by: group });
            setLimit(25);
          }}
        />
        <Button
          label="Réinitialiser"
          variant="ghost"
          onPress={() => {
            setFrom(start);
            setTo(end);
            setGroup('month');
            setFilters({ date_from: start, date_to: end, group_by: 'month' });
          }}
        />
        <STabs values={series} value={selected} onChange={setSelected} />
        <QueryState query={query} />
        {query.data ? (
          <>
            <Pair
              label="Total de la période"
              value={currency(rows.reduce((sum, r) => sum + Number(r[selected as 'sales']), 0))}
            />
            <Note>
              Les forfaits CRM sont comptés à leur création, sans compter une seconde fois les
              séances incluses.
            </Note>
            {rows.slice(0, limit).map((row) => (
              <View key={row.month} style={sa.stack}>
                <Pair label={row.month} value={currency(row[selected as 'sales'])} />
                <View
                  accessibilityLabel={`${row.month} : ${currency(row[selected as 'sales'])}`}
                  style={{ height: 8, backgroundColor: '#e5eeff', borderRadius: 8 }}
                >
                  <View
                    style={{
                      height: 8,
                      backgroundColor: '#00417c',
                      borderRadius: 8,
                      width: `${Math.max(0, (Number(row[selected as 'sales']) / max) * 100)}%`,
                    }}
                  />
                </View>
              </View>
            ))}
            {rows.length > limit ? (
              <Button
                label="Afficher les périodes suivantes"
                variant="tonal"
                onPress={() => setLimit((v) => v + 25)}
              />
            ) : null}
            {!rows.length ? <Note>Aucune activité sur cette période.</Note> : null}
          </>
        ) : null}
      </Panel>
    </>
  );
}
export function TenantLog({ id, users }: { id: number; users: { id: number; email: string }[] }) {
  const [user, setUser] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [action, setAction] = useState(''),
    [page, setPage] = useState(1);
  const settled = useDebounce(action),
    valid = !from || !to || from <= to;
  const query = usePlatformList<TenantActivity>(
    `/superadmin/tenants/${id}/activities`,
    { user_id: user, date_from: from, date_to: to, action: settled, page },
    valid,
  );
  return (
    <Panel title="Journal d’activité">
      <Choice
        label="Utilisateur"
        value={user}
        options={[['', 'Tous'], ...users.map((u) => [String(u.id), u.email] as [string, string])]}
        onChange={(v) => {
          setUser(v);
          setPage(1);
        }}
      />
      <DateInput
        label="Du"
        value={from}
        onChange={(v) => {
          setFrom(v);
          setPage(1);
        }}
      />
      <DateInput
        label="Au"
        value={to}
        onChange={(v) => {
          setTo(v);
          setPage(1);
        }}
      />
      <TextField
        label="Action"
        value={action}
        onChangeText={(v) => {
          setAction(v);
          setPage(1);
        }}
      />
      <View style={sa.row}>
        <Button
          style={sa.grow}
          label="Réinitialiser"
          variant="tonal"
          onPress={() => {
            setUser('');
            setFrom('');
            setTo('');
            setAction('');
            setPage(1);
          }}
        />
        <Button
          style={sa.grow}
          label="Actualiser"
          disabled={!valid || query.isFetching}
          onPress={() => void query.refetch()}
        />
      </View>
      {!valid ? (
        <AppText color="error">Vérifiez les dates de la période.</AppText>
      ) : (
        <QueryState query={query} />
      )}
      {query.data?.data.map((row) => (
        <View key={row.id} style={sa.inset}>
          <AppText variant="labelLg">{activityLabel(row.action)}</AppText>
          <Pair label={row.user_email ?? 'Utilisateur indisponible'} value={date(row.created_at)} />
        </View>
      ))}
      {query.data && !query.data.data.length ? (
        <Note>Aucune activité pour ces filtres.</Note>
      ) : null}
      <Pager result={query.data} setPage={setPage} busy={query.isFetching} />
    </Panel>
  );
}
