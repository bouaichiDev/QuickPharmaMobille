import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchFilterRow } from '@/components/ui/SearchFilterRow';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { itemId, record } from '@/features/crm/crmApi';
import { currency, date } from '@/features/superadmin/AdminUI';
import { commerceApi, fieldError, number, type Row } from './api';
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
import { EntryDetail } from './EntriesScreen';
import { supplierPayload } from './supplierModel';

export default function SuppliersScreen() {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search);
  const [filters, setFilters] = useState({ code: '', phone: '', email: '' });
  const [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string>(),
    [edit, setEdit] = useState<Row | null>();
  const query = useCommerceList(
    '/providerliste',
    { searchValue: term, ...filters },
    'suppliers.view',
  );
  const refresh = () => {
    setEdit(undefined);
    void query.refetch();
  };
  if (edit !== undefined)
    return <SupplierForm row={edit} onClose={() => setEdit(undefined)} onSaved={refresh} />;
  if (selected)
    return <SupplierDetail id={selected} onBack={() => setSelected(undefined)} onEdit={setEdit} />;
  const count = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title="Fournisseurs" scroll={false}>
        <AccessGate permission="suppliers.view">
          <CommerceList
            query={query}
            header={
              <>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <AppText variant="headlineSm">Fournisseurs</AppText>
                    <AppText variant="bodySm" color="outline">
                      {query.data?.pages[0]?.total ?? '—'} partenaires
                    </AppText>
                  </View>
                  {can('suppliers.manage') ? (
                    <Button
                      label="Ajouter"
                      compact
                      icon="add"
                      fullWidth={false}
                      onPress={() => setEdit(null)}
                    />
                  ) : null}
                </View>
                <SearchFilterRow
                  label="Rechercher un fournisseur"
                  placeholder="Nom, code, téléphone, e-mail…"
                  value={search}
                  onChangeText={setSearch}
                  filterLabel={`Filtres${count ? ` (${count})` : ''}`}
                  onFilterPress={() => {
                    setDraft(filters);
                    setFilterOpen(true);
                  }}
                />
                {count ? (
                  <Button
                    label="Réinitialiser les filtres"
                    variant="ghost"
                    onPress={() => setFilters({ code: '', phone: '', email: '' })}
                  />
                ) : null}
              </>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Fournisseur ${item.name}`}
                onPress={() => setSelected(itemId(item))}
              >
                <Card>
                  <View style={ui.row}>
                    <AppText variant="headlineSm" style={ui.grow}>
                      {String(item.name ?? 'Fournisseur')}
                    </AppText>
                    <Badge>{number(item.active) === 1 ? 'Actif' : 'Inactif'}</Badge>
                  </View>
                  <AppText variant="bodySm" color="outline">
                    Code : {String(item.code ?? '—')}
                  </AppText>
                  <AppText>{String(item.phone ?? item.Phone ?? 'Téléphone non renseigné')}</AppText>
                  <AppText>{String(item.email ?? item.Email ?? 'E-mail non renseigné')}</AppText>
                </Card>
              </Pressable>
            )}
          />
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Filtres fournisseurs"
        onClose={() => setFilterOpen(false)}
      >
        {(['code', 'phone', 'email'] as const).map((key) => (
          <TextField
            key={key}
            label={{ code: 'Code', phone: 'Téléphone', email: 'E-mail' }[key]}
            value={draft[key]}
            onChangeText={(value) => setDraft({ ...draft, [key]: value })}
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
          onPress={() => setDraft({ code: '', phone: '', email: '' })}
        />
      </SelectionDialog>
    </>
  );
}
function SupplierDetail({
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
  const [tab, setTab] = useState<'info' | 'entries'>('info'),
    [entry, setEntry] = useState<string>(),
    [confirm, setConfirm] = useState(false),
    [contactError, setContactError] = useState('');
  const query = useQuery({
    queryKey: ['commerce', store, 'supplier', id],
    queryFn: ({ signal }) => commerceApi.get(`/provider/show/${id}`, signal),
    enabled: can('suppliers.view'),
    retry: false,
  });
  const entries = useCommerceList(
    `/providerlisteEntree/${id}`,
    { ProvidersId: id },
    tab === 'entries' ? 'entries.view' : 'disabled',
  );
  const body = query.data ?? {},
    row = record(Array.isArray(body.Provider) ? body.Provider[0] : body.Provider);
  const remove = useMutation({
    mutationFn: async () => {
      if (!can('suppliers.manage')) throw new Error('Action non autorisée.');
      return commerceApi.archiveSupplier(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      void qc.invalidateQueries({ queryKey: ['provider-options'] });
      onBack();
    },
    retry: false,
  });
  async function contact(kind: 'tel' | 'mailto') {
    setContactError('');
    try {
      await Linking.openURL(
        `${kind}:${String(kind === 'tel' ? (row.phone ?? row.Phone ?? '') : (row.email ?? row.Email ?? ''))}`,
      );
    } catch {
      setContactError('Impossible d’ouvrir cette application.');
    }
  }
  if (entry) return <EntryDetail id={entry} onBack={() => setEntry(undefined)} />;
  return (
    <CommerceScreen title="Fiche fournisseur" onBack={onBack} scroll={tab !== 'entries'}>
      <AccessGate permission="suppliers.view">
        {query.isPending ? (
          <SkeletonCards count={2} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <>
            <View style={tab === 'entries' ? { padding: 16, gap: 12 } : { gap: 12 }}>
              <Card title={String(row.name ?? 'Fournisseur')}>
                <View style={ui.row}>
                  <Badge>{number(row.active) === 1 ? 'Actif' : 'Inactif'}</Badge>
                  <AppText>Code : {String(row.code ?? '—')}</AppText>
                </View>
                <AppText>{String(row.address ?? 'Adresse non renseignée')}</AppText>
                <ResponsiveGrid maxColumns={2}>
                  <Button
                    label="Appeler"
                    icon="call"
                    variant="tonal"
                    disabled={!(row.phone ?? row.Phone)}
                    onPress={() => void contact('tel')}
                  />
                  <Button
                    label="E-mail"
                    icon="mail-outline"
                    variant="tonal"
                    disabled={!(row.email ?? row.Email)}
                    onPress={() => void contact('mailto')}
                  />
                </ResponsiveGrid>
                {contactError ? <Notice>{contactError}</Notice> : null}
                {can('suppliers.manage') ? (
                  <Button
                    label="Modifier"
                    icon="edit"
                    variant="outline"
                    onPress={() => onEdit(row)}
                  />
                ) : null}
              </Card>
              <View style={ui.row}>
                <Button
                  label="Informations"
                  compact
                  fullWidth={false}
                  variant={tab === 'info' ? 'primary' : 'tonal'}
                  onPress={() => setTab('info')}
                />
                {can('entries.view') ? (
                  <Button
                    label="Entrées de stock"
                    compact
                    fullWidth={false}
                    variant={tab === 'entries' ? 'primary' : 'tonal'}
                    onPress={() => setTab('entries')}
                  />
                ) : null}
              </View>
            </View>
            {tab === 'info' ? (
              <>
                <Card title="Coordonnées & informations">
                  <Pair label="Téléphone" value={row.phone ?? row.Phone} />
                  <Pair label="E-mail" value={row.email ?? row.Email} />
                  <Pair label="Ville" value={row.city} />
                  <Pair
                    label="Plafond de crédit"
                    value={row.CreditCeiling == null ? null : currency(row.CreditCeiling)}
                  />
                  <Pair
                    label="Remise par défaut"
                    value={row.DefaultDiscount == null ? null : `${row.DefaultDiscount} %`}
                  />
                  <Pair label="Code organisation" value={row.OrgCode} />
                  <Pair label="N° d’enregistrement" value={row.OrgRegistrationNumber} />
                </Card>
                {can('entries.view') ? (
                  <Card title="Historique des achats">
                    <Pair
                      label="Entrées réglées (total)"
                      value={
                        body.totalentreesComplete == null
                          ? null
                          : currency(body.totalentreesComplete)
                      }
                    />
                    <Pair
                      label="Entrées impayées (total)"
                      value={
                        body.totalentreesUnpaid == null ? null : currency(body.totalentreesUnpaid)
                      }
                    />
                  </Card>
                ) : null}
                {can('suppliers.manage') ? (
                  <Button
                    label="Archiver le fournisseur"
                    variant="dangerSoft"
                    disabled={remove.isPending}
                    onPress={() => setConfirm(true)}
                  />
                ) : null}
                {readOnly ? <Notice>Assistance en lecture seule.</Notice> : null}
              </>
            ) : (
              <CommerceList
                query={entries}
                header={<AppText variant="headlineSm">Entrées liées</AppText>}
                renderItem={({ item }) => (
                  <Pressable onPress={() => setEntry(itemId(item))} accessibilityRole="button">
                    <Card>
                      <AppText variant="labelLg">#{String(item.ref)}</AppText>
                      <AppText>{date(item.date)}</AppText>
                      <Pair label="Total" value={currency(item.totalWithTax ?? item.total)} />
                    </Card>
                  </Pressable>
                )}
              />
            )}
          </>
        )}
        {remove.isError ? <Notice>{remove.error.message}</Notice> : null}
        <ConfirmDialog
          visible={confirm}
          title="Archiver le fournisseur ?"
          message="Il ne sera plus proposé pour les nouvelles opérations. Les documents existants restent conservés."
          confirmLabel="Archiver"
          cancelLabel="Annuler"
          loading={remove.isPending}
          onConfirm={() => {
            setConfirm(false);
            remove.mutate();
          }}
          onCancel={() => setConfirm(false)}
        />
      </AccessGate>
    </CommerceScreen>
  );
}
function SupplierForm({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can, store } = useCommerceAccess(),
    qc = useQueryClient();
  const [form, setForm] = useState<Row>(() => ({
    name: row?.name ?? '',
    code: row?.code ?? '',
    email: row?.email ?? row?.Email ?? '',
    phone: row?.phone ?? row?.Phone ?? '',
    active: number(row?.active ?? 1),
    CreditCeiling: row?.CreditCeiling ?? '0',
    DefaultDiscount: row?.DefaultDiscount ?? '0',
    OrgCode: row?.OrgCode ?? '',
    OrgRegistrationNumber: row?.OrgRegistrationNumber ?? '',
    OrgRegistration: row?.OrgRegistration ?? '',
  }));
  const [dirty, setDirty] = useState(false),
    [leave, setLeave] = useState(false),
    [advanced, setAdvanced] = useState(false);
  const mutation = useMutation({
    mutationFn: () => {
      if (!can('suppliers.manage')) throw new Error('Action non autorisée.');
      return commerceApi.write(
        'post',
        row ? '/provider/update' : '/provider',
        supplierPayload(form, row ? itemId(row) : undefined),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', store] });
      void qc.invalidateQueries({ queryKey: ['provider-options'] });
      onSaved();
    },
    retry: false,
  });
  const back = () => !mutation.isPending && (dirty ? setLeave(true) : onClose());
  const update = (key: string, value: unknown) => {
    setDirty(true);
    setForm({ ...form, [key]: value });
  };
  return (
    <CommerceScreen
      title={row ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
      onBack={back}
      footer={
        can('suppliers.manage') ? (
          <View style={ui.row}>
            <Button
              label="Annuler"
              fullWidth={false}
              style={ui.grow}
              variant="tonal"
              disabled={mutation.isPending}
              onPress={back}
            />
            <Button
              label="Enregistrer"
              fullWidth={false}
              style={ui.grow}
              loading={mutation.isPending}
              onPress={() => mutation.mutate()}
            />
          </View>
        ) : undefined
      }
    >
      <AccessGate permission="suppliers.manage">
        <Card title="Informations générales" icon="business">
          {[
            ['name', 'Nom du fournisseur *'],
            ['code', 'Code fournisseur *'],
          ].map(([key, label]) => (
            <TextField
              key={key}
              label={label!}
              value={String(form[key!])}
              error={fieldError(mutation.error, key!)}
              onChangeText={(v) => update(key!, v)}
            />
          ))}
        </Card>
        <Card title="Coordonnées & contact" icon="contacts">
          <TextField
            label="Téléphone *"
            keyboardType="phone-pad"
            value={String(form.phone)}
            onChangeText={(v) => update('phone', v)}
          />
          <TextField
            label="E-mail *"
            autoCapitalize="none"
            keyboardType="email-address"
            value={String(form.email)}
            error={fieldError(mutation.error, 'email')}
            onChangeText={(v) => update('email', v)}
          />
        </Card>
        <Card title="Statut & paramètres">
          <Button
            label={number(form.active) === 1 ? 'Fournisseur actif' : 'Fournisseur inactif'}
            variant="tonal"
            onPress={() => update('active', number(form.active) === 1 ? 0 : 1)}
          />
          <Button
            label="Paramètres commerciaux et légaux"
            variant="ghost"
            trailingIcon={advanced ? 'expand-less' : 'expand-more'}
            onPress={() => setAdvanced(!advanced)}
          />
          {advanced
            ? [
                ['CreditCeiling', 'Plafond de crédit (DH)'],
                ['DefaultDiscount', 'Remise par défaut (%)'],
                ['OrgCode', 'Code organisation / ICE'],
                ['OrgRegistrationNumber', 'N° d’enregistrement'],
                ['OrgRegistration', 'Registre'],
              ].map(([key, label]) => (
                <TextField
                  key={key}
                  label={label!}
                  value={String(form[key!] ?? '')}
                  onChangeText={(v) => update(key!, v)}
                />
              ))
            : null}
        </Card>
        {mutation.isError ? <Notice>{mutation.error.message}</Notice> : null}
        <ConfirmDialog
          visible={leave}
          title="Quitter sans enregistrer ?"
          message="Les modifications seront perdues."
          confirmLabel="Quitter"
          cancelLabel="Rester"
          onConfirm={onClose}
          onCancel={() => setLeave(false)}
        />
      </AccessGate>
    </CommerceScreen>
  );
}
