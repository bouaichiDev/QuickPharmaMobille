import { useState } from 'react';
import { Image, Platform, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { record, itemId } from '@/features/crm/crmApi';
import { adminApi, asRecord, asRows, unwrap, type Row } from '@/features/admin/api';
import { httpClient } from '@/services/api/client';
import { useDirtyBack } from '@/features/admin/AdminDesign';
import { chequeActions, chequePayload, statusLabels } from './model';
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
  ReferenceSelect,
  Pair,
  design,
  date,
  currency,
  FinanceRow,
  Metric,
  QueryState,
  useFinanceList,
  useFinanceQuery,
  useFinanceAction,
  useCommerceAccess,
  go,
  f,
} from './FinanceUI';
export default function ChequesScreen({ view = 'cheques', id }: { view?: string; id?: string }) {
  const [detail, setDetail] = useState(id ?? ''),
    [editing, setEditing] = useState<Row | undefined>(),
    [creating, setCreating] = useState(false);
  if (creating || editing)
    return (
      <ChequeForm
        row={editing}
        onBack={() => {
          setCreating(false);
          setEditing(undefined);
        }}
        onSaved={(value) => {
          setCreating(false);
          setEditing(undefined);
          if (value) setDetail(value);
        }}
      />
    );
  if (detail) return <ChequeDetail id={detail} onBack={() => setDetail('')} onEdit={setEditing} />;
  if (view === 'cheques-dashboard') return <ChequeDashboard onOpen={setDetail} />;
  if (view === 'cheques-alerts') return <ChequeDueAlerts onOpen={setDetail} />;
  return <ChequeList onOpen={setDetail} onCreate={() => setCreating(true)} />;
}
function ChequeList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    [filters, setFilters] = useState<Row>({}),
    [draft, setDraft] = useState<Row>({}),
    [filterOpen, setFilterOpen] = useState(false);
  const term = useDebounce(search),
    query = useFinanceList(
      '/cheques',
      { ...filters, search: term, sort_field: 'created_at', sort_order: 'desc' },
      'payments.view',
    );
  return (
    <AdminPage title="Chèques" scroll={false}>
      <View style={f.row}>
        <View style={design.grow}>
          <TextField
            label="Rechercher"
            value={search}
            onChangeText={setSearch}
            placeholder="Numéro, banque, titulaire…"
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
      <View style={f.row}>
        <Button
          label="Tableau de bord"
          compact
          fullWidth={false}
          variant="tonal"
          onPress={() => go('cheques-dashboard')}
        />
        {can('cheques.manage') ? (
          <Button label="Nouveau" icon="add" compact fullWidth={false} onPress={onCreate} />
        ) : null}
      </View>
      <CommerceList
        header={null}
        query={query}
        renderItem={({ item }) => <ChequeRow row={item} onOpen={onOpen} />}
      />
      <SelectionDialog
        visible={filterOpen}
        title="Filtrer les chèques"
        onClose={() => setFilterOpen(false)}
      >
        <ReferenceSelect
          label="Type"
          path="/types/cheques"
          value={String(draft.type_id ?? '')}
          onChange={(v) => setDraft({ ...draft, type_id: v })}
        />
        <ReferenceSelect
          label="Statut"
          path="/statuses"
          params={{ src: 'cheques' }}
          value={String(draft.status_id ?? '')}
          onChange={(v) => setDraft({ ...draft, status_id: v })}
        />
        <TextField
          label="Banque"
          value={String(draft.bank ?? '')}
          onChangeText={(v) => setDraft({ ...draft, bank: v })}
        />
        <DateInput
          label="Échéance du"
          value={String(draft.due_date_from ?? '')}
          onChange={(v) => setDraft({ ...draft, due_date_from: v })}
        />
        <DateInput
          label="Échéance au"
          value={String(draft.due_date_to ?? '')}
          onChange={(v) => setDraft({ ...draft, due_date_to: v })}
        />
        <Button
          label="Appliquer"
          disabled={
            !!draft.due_date_from &&
            !!draft.due_date_to &&
            String(draft.due_date_from) > String(draft.due_date_to)
          }
          onPress={() => {
            setFilters(draft);
            setFilterOpen(false);
          }}
        />
        <Button label="Réinitialiser" variant="tonal" onPress={() => setDraft({})} />
      </SelectionDialog>
    </AdminPage>
  );
}
function ChequeRow({ row, onOpen }: { row: Row; onOpen: (id: string) => void }) {
  const status = record(row.status),
    type = record(row.type),
    incoming = type.code === 'incoming';
  return (
    <FinanceRow
      title={String(row.cheque_number ?? row.uid)}
      subtitle={`${String(record(row.customer).name ?? record(row.provider).name ?? row.account_holder ?? '')} · ${date(row.due_date)}`}
      value={`${incoming ? '+ ' : type.code === 'outgoing' ? '− ' : ''}${currency(row.amount)}`}
      badge={statusLabels[String(status.code)] ?? String(status.name ?? '')}
      onPress={() => onOpen(itemId(row))}
    />
  );
}
function ChequeDashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const query = useFinanceQuery('/cheques/dashboard', {}, 'payments.view'),
    data = asRecord(query.data),
    types = record(data.type_summary);
  const trend = (Array.isArray(data.monthly_trend) ? data.monthly_trend : []).map(record),
    max = Math.max(1, ...trend.map((r) => Number(r.total_amount ?? 0)));
  return (
    <AdminPage title="Tableau de bord des chèques">
      <Button label="Actualiser" variant="tonal" compact onPress={() => void query.refetch()} />
      <QueryState query={query}>
        <View style={f.grid}>
          <Metric
            label="Chèques entrants"
            value={currency(record(types.incoming).total_amount)}
            tone="green"
          />
          <Metric
            label="Chèques sortants"
            value={currency(record(types.outgoing).total_amount)}
            tone="red"
          />
        </View>
        <Panel title="Par statut">
          {Object.entries(record(data.status_summary)).map(([key, value]) => (
            <Pair
              key={key}
              label={`${statusLabels[key] ?? key} · ${record(value).count ?? 0}`}
              value={currency(record(value).total_amount)}
            />
          ))}
        </Panel>
        <Panel title="Évolution mensuelle">
          {trend.map((row) => (
            <View key={String(row.month)} style={{ gap: 5 }}>
              <Pair label={String(row.month)} value={currency(row.total_amount)} />
              <View style={{ height: 7, backgroundColor: '#eef2fb', borderRadius: 4 }}>
                <View
                  style={{
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: '#01509d',
                    width: `${Math.max(0, (Number(row.total_amount ?? 0) / max) * 100)}%`,
                  }}
                />
              </View>
            </View>
          ))}
        </Panel>
        {['overdue', 'upcoming_due'].map((key) => (
          <Panel key={key} title={key === 'overdue' ? 'Chèques en retard' : 'Prochaines échéances'}>
            {(Array.isArray(data[key]) ? data[key] : []).map(record).map((row) => (
              <ChequeRow key={itemId(row)} row={row} onOpen={onOpen} />
            ))}
          </Panel>
        ))}
        <Button label="Voir la liste des chèques" onPress={() => go('cheques')} />
        <Button label="Voir les échéances" variant="tonal" onPress={() => go('cheques-alerts')} />
      </QueryState>
    </AdminPage>
  );
}
function ChequeDueAlerts({ onOpen }: { onOpen: (id: string) => void }) {
  const query = useFinanceList('/cheques/alerts', {}, 'payments.view');
  return (
    <AdminPage title="Échéances des chèques" scroll={false}>
      <CommerceList
        header={<AppText>Échéances proches, retards et rejets signalés par le serveur.</AppText>}
        query={query}
        renderItem={({ item }) => {
          const cheque = record(item.cheque);
          return (
            <FinanceRow
              title={String(cheque.cheque_number ?? 'Chèque')}
              subtitle={`${date(cheque.due_date)} · ${String(item.message ?? '')}`}
              value={currency(cheque.amount)}
              badge={
                (
                  { due_soon: 'À venir', overdue: 'En retard', rejected: 'Rejeté' } as Record<
                    string,
                    string
                  >
                )[String(item.type)]
              }
              onPress={() => onOpen(String(cheque.uid ?? item.cheque_id))}
            />
          );
        }}
      />
    </AdminPage>
  );
}
function ChequeDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (row: Row) => void;
}) {
  const { can } = useCommerceAccess(),
    session = useSessionStore((s) => s.session);
  const query = useFinanceQuery(`/cheques/${encodeURIComponent(id)}`, {}, 'payments.view'),
    row = asRecord(query.data),
    allowed = chequeActions(row);
  const [pending, setPending] = useState(''),
    [reason, setReason] = useState(''),
    [notes, setNotes] = useState(''),
    [tab, setTab] = useState('Informations'),
    [photo, setPhoto] = useState('');
  const permission = ['deposit', 'clear'].includes(pending) ? 'payments.collect' : 'cheques.manage';
  const action = useFinanceAction(
    permission,
    async () => {
      if (!pending || !allowed[pending as keyof typeof allowed])
        throw new Error('Transition non autorisée.');
      if (pending === 'reject' && !reason.trim()) throw new Error('Indiquez le motif du rejet.');
      return adminApi.write(
        pending === 'delete' ? 'delete' : 'post',
        `/cheques/${encodeURIComponent(id)}${pending === 'delete' ? '' : `/${pending}`}`,
        { notes, rejection_reason: reason },
      );
    },
    () => {
      if (pending === 'delete') onBack();
      setPending('');
      setReason('');
      setNotes('');
    },
  );
  const labels: Record<string, string> = {
    deposit: 'Déposer le chèque',
    clear: 'Encaisser le chèque',
    reject: 'Rejeter le chèque',
    cancel: 'Annuler le chèque',
    delete: 'Supprimer le chèque',
  };
  const source = record(row.source_sale ?? row.source_entree),
    status = record(row.status);
  return (
    <AdminPage title="Détail du chèque" onBack={onBack}>
      <QueryState query={query}>
        <Panel>
          <AppText variant="labelLg">{String(row.cheque_number ?? id)}</AppText>
          <AppText style={f.amount}>{currency(row.amount)}</AppText>
          <AppText>
            {statusLabels[String(status.code)] ?? String(status.name ?? '')} ·{' '}
            {record(row.type).code === 'incoming' ? 'Entrant' : 'Sortant'}
          </AppText>
          <AppText variant="bodySm">Échéance : {date(row.due_date)}</AppText>
        </Panel>
        <Tabs values={['Informations', 'Images', 'Historique']} value={tab} onChange={setTab} />
        {tab === 'Informations' ? (
          <Panel>
            {[
              ['Client / Fournisseur', record(row.customer).name ?? record(row.provider).name],
              ['Banque', row.bank_name],
              ['Titulaire', row.account_holder],
              ['Émission', date(row.issue_date)],
              ['Échéance', date(row.due_date)],
              ['Source', source.ref],
              ['Notes', row.notes],
              ['Motif du rejet', row.rejection_reason],
            ].map(([label, value]) => (
              <Pair key={String(label)} label={String(label)} value={String(value ?? '—')} />
            ))}
            {source.id && row.source_sale && can('sales.view') ? (
              <Button
                label="Voir la vente"
                variant="tonal"
                onPress={() =>
                  router.push({ pathname: '/sales', params: { id: String(source.id) } } as never)
                }
              />
            ) : null}
          </Panel>
        ) : tab === 'Images' ? (
          <Panel title="Images du chèque">
            {['image_front_url', 'image_back_url'].map((key, i) =>
              row[key] ? (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={i ? 'Voir le verso' : 'Voir le recto'}
                  onPress={() => setPhoto(String(row[key]))}
                >
                  <AppText>{i ? 'Verso' : 'Recto'}</AppText>
                  <Image
                    source={{
                      uri: String(row[key]),
                      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
                    }}
                    style={{ width: '100%', height: 170 }}
                    resizeMode="contain"
                  />
                </Pressable>
              ) : (
                <AppText key={key}>{i ? 'Verso' : 'Recto'} : aucune image</AppText>
              ),
            )}
          </Panel>
        ) : (
          <Panel title="Historique">
            {(Array.isArray(row.movements) ? row.movements : []).map(record).map((move) => (
              <FinanceRow
                key={itemId(move)}
                icon="history"
                title={
                  statusLabels[String(move.action)] ??
                  ({ created: 'Enregistré', updated: 'Modifié' } as Record<string, string>)[
                    String(move.action)
                  ] ??
                  String(move.action)
                }
                subtitle={`${date(move.created_at)} · ${record(move.creator).name ?? ''} ${move.notes ?? ''}`}
              />
            ))}
          </Panel>
        )}
        {(['deposit', 'clear', 'reject', 'cancel', 'delete'] as const).map((key) =>
          allowed[key] &&
          can(['deposit', 'clear'].includes(key) ? 'payments.collect' : 'cheques.manage') ? (
            <Button
              key={key}
              label={labels[key]!}
              variant={
                key === 'deposit' || key === 'clear'
                  ? 'primary'
                  : key === 'delete'
                    ? 'danger'
                    : 'tonal'
              }
              onPress={() => setPending(key)}
            />
          ) : null,
        )}
        {allowed.edit && can('cheques.manage') ? (
          <Button label="Modifier le chèque" variant="outline" onPress={() => onEdit(row)} />
        ) : null}
        <SelectionDialog
          visible={!!pending}
          title={labels[pending] ?? ''}
          onClose={() => {
            if (!action.isPending) setPending('');
          }}
        >
          <AppText>
            Confirmer cette action sur {String(row.cheque_number)} ({currency(row.amount)}) ?
          </AppText>
          {pending === 'reject' ? (
            <TextField label="Motif du rejet *" value={reason} onChangeText={setReason} />
          ) : null}
          <TextField label="Note (facultatif)" value={notes} onChangeText={setNotes} multiline />
          {action.isError ? <Notice>{action.error.message}</Notice> : null}
          <Button
            label="Confirmer"
            loading={action.isPending}
            disabled={pending === 'reject' && !reason.trim()}
            onPress={() => action.mutate({})}
          />
        </SelectionDialog>
        <SelectionDialog visible={!!photo} title="Image du chèque" onClose={() => setPhoto('')}>
          <Image
            source={{
              uri: photo,
              headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
            }}
            style={{ width: '100%', height: 350 }}
            resizeMode="contain"
          />
        </SelectionDialog>
      </QueryState>
    </AdminPage>
  );
}
function ChequeForm({
  row,
  onBack,
  onSaved,
}: {
  row?: Row;
  onBack: () => void;
  onSaved: (id?: string) => void;
}) {
  const { can } = useCommerceAccess();
  const [form, setForm] = useState<Row>({
      ...row,
      payment_id: '',
      issue_date: row?.issue_date ?? new Date().toISOString().slice(0, 10),
    }),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState('');
  const [images, setImages] = useState<
    Record<string, { uri: string; mimeType?: string; fileName?: string | null }>
  >({});
  const leave = useDirtyBack(dirty, onBack),
    types = useFinanceQuery('/types/cheques', {}, 'cheques.manage'),
    typeRows = types.data ? asRows(types.data) : [],
    incoming = record(typeRows.find((t) => itemId(t) === String(form.type_id))).code === 'incoming';
  const update = (key: string, value: unknown) => {
    setDirty(true);
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(['type_id', 'customer_id', 'provider_id'].includes(key)
        ? { source_sale_id: '', source_entree_id: '' }
        : {}),
      ...(key === 'type_id' ? { customer_id: '', provider_id: '', payment_id: '' } : {}),
    }));
  };
  const save = useFinanceAction(
    'cheques.manage',
    async () => {
      const data = chequePayload(form);
      const body = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) body.append(key, String(value));
      });
      if (row) body.append('_method', 'PUT');
      for (const [key, asset] of Object.entries(images)) {
        if (Platform.OS === 'web') {
          const blob = await (await fetch(asset.uri)).blob();
          body.append(key, blob, asset.fileName ?? 'cheque.jpg');
        } else
          body.append(key, {
            uri: asset.uri,
            type: asset.mimeType ?? 'image/jpeg',
            name: asset.fileName ?? 'cheque.jpg',
          } as unknown as Blob);
      }
      return unwrap(
        (
          await httpClient.post(
            row ? `/cheques/${encodeURIComponent(itemId(row))}` : '/cheques',
            body,
          )
        ).data,
      );
    },
    (value) => onSaved(itemId(record(value))),
  );
  async function pick(key: string) {
    try {
      const picker = await import('expo-image-picker');
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      const asset = result.assets?.[0];
      if (!asset) return;
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024)
        throw new Error('L’image ne doit pas dépasser 5 Mo.');
      if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType))
        throw new Error('Choisissez une image JPEG, PNG ou WebP.');
      setImages((current) => ({ ...current, [key]: asset }));
      setDirty(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <AdminPage
      title={row ? 'Modifier le chèque' : 'Nouveau chèque'}
      onBack={leave.back}
      footer={
        <Button
          label="Enregistrer le chèque"
          loading={save.isPending}
          onPress={() => save.mutate({})}
        />
      }
    >
      <Panel>
        <ReferenceSelect
          label="Type de chèque *"
          path="/types/cheques"
          value={String(form.type_id ?? '')}
          onChange={(v) => update('type_id', v)}
        />
        <ReferenceSelect
          label={incoming ? 'Client' : 'Fournisseur'}
          path={incoming ? '/customerDropdown' : '/providerDropdown'}
          value={String(form[incoming ? 'customer_id' : 'provider_id'] ?? '')}
          enabled={!!form.type_id}
          onChange={(v) => update(incoming ? 'customer_id' : 'provider_id', v)}
        />
        {can(incoming ? 'sales.view' : 'entries.view') ? (
          <ReferenceSelect
            label={incoming ? 'Vente liée (facultatif)' : 'Entrée liée (facultatif)'}
            path={incoming ? '/listeSales' : '/entrees'}
            params={
              incoming ? { customer_id: form.customer_id } : { provider_id: form.provider_id }
            }
            value={String(form[incoming ? 'source_sale_id' : 'source_entree_id'] ?? '')}
            enabled={!!form.type_id}
            onChange={(id, item) => {
              setDirty(true);
              setForm((current) => ({
                ...current,
                [incoming ? 'source_sale_id' : 'source_entree_id']: id,
                [incoming ? 'customer_id' : 'provider_id']:
                  item[incoming ? 'customer_id' : 'provider_id'] ??
                  current[incoming ? 'customer_id' : 'provider_id'],
                amount: String(item.totalWithTax ?? item.total ?? current.amount ?? ''),
              }));
            }}
          />
        ) : null}
        {['cheque_number', 'bank_name', 'account_holder', 'amount'].map((key, i) => (
          <TextField
            key={key}
            label={['Numéro de chèque *', 'Banque *', 'Titulaire *', 'Montant (DH) *'][i]!}
            keyboardType={key === 'amount' ? 'decimal-pad' : 'default'}
            value={String(form[key] ?? '')}
            onChangeText={(v) => update(key, v)}
          />
        ))}
        <DateInput
          label="Date d’émission *"
          value={String(form.issue_date ?? '')}
          onChange={(v) => update('issue_date', v)}
        />
        <DateInput
          label="Date d’échéance"
          value={String(form.due_date ?? '')}
          onChange={(v) => update('due_date', v)}
        />
        <TextField
          label="Notes"
          multiline
          value={String(form.notes ?? '')}
          onChangeText={(v) => update('notes', v)}
        />
      </Panel>
      <Panel title="Images (facultatif)">
        {['image_front', 'image_back'].map((key, i) => (
          <View key={key} style={design.stack}>
            {images[key] ? (
              <Image
                source={{ uri: images[key].uri }}
                style={{ height: 120, width: '100%' }}
                resizeMode="contain"
              />
            ) : null}
            <Button
              label={`${images[key] ? 'Remplacer' : 'Ajouter'} ${i ? 'le verso' : 'le recto'}`}
              variant="tonal"
              onPress={() => void pick(key)}
            />
            {images[key] ? (
              <Button
                label="Retirer cette image"
                variant="ghost"
                onPress={() =>
                  setImages((current) => {
                    const next = { ...current };
                    delete next[key];
                    return next;
                  })
                }
              />
            ) : null}
          </View>
        ))}
      </Panel>
      {error || save.isError ? <Notice>{error || save.error?.message}</Notice> : null}
      {types.isError ? <Notice>{types.error.message}</Notice> : null}
      {leave.dialog}
    </AdminPage>
  );
}
