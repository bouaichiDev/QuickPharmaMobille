import { lazy, memo, Suspense, useState } from 'react';
import { Linking, Pressable, Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { CrmAvatar } from '@/features/crm/components/CrmDesign';
import { CareTags } from '@/features/crm/components/CareTags';
import { DateInput, currency, date } from '@/features/superadmin/AdminUI';
import { record, itemId } from '@/features/crm/crmApi';
import { commerceApi, customerName, fieldError, type Row } from './api';
import type { CompletedSale } from '@/features/sales/SaleCheckout';
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
const SaleDetail = lazy(() =>
  import('@/features/sales/SaleDetail').then((m) => ({ default: m.SaleDetail })),
);
const SaleCheckout = lazy(() =>
  import('@/features/sales/SaleCheckout').then((m) => ({ default: m.SaleCheckout })),
);
function clientAge(value: unknown) {
  if (!value) return undefined;
  const birth = new Date(String(value).slice(0, 10)),
    today = new Date();
  if (!Number.isFinite(birth.getTime())) return undefined;
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age >= 0 && age <= 125 ? age : undefined;
}
const ClientCard = memo(function ClientCard({
  row,
  onOpen,
}: {
  row: Row;
  onOpen: (id: string) => void;
}) {
  const active = Number(row.Active ?? row.active) === 1;
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(itemId(row))}>
      <Card>
        <View style={ui.row}>
          <CrmAvatar name={customerName(row)} />
          <View style={ui.grow}>
            <AppText variant="headlineSm">{customerName(row)}</AppText>
            {row.Cin ? (
              <AppText variant="bodySm" color="outline">
                CIN : {String(row.Cin)}
              </AppText>
            ) : null}
          </View>
          <Badge danger={!active}>{active ? 'Actif' : 'Inactif'}</Badge>
        </View>
        <View style={ui.inset}>
          <AppText variant="labelLg" color="primary">
            {String(row.Phone || 'Téléphone non renseigné')}
          </AppText>
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {String(row.Email || 'E-mail non renseigné')}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
});
export default function CustomersScreen() {
  const { can } = useCommerceAccess();
  const [search, setSearch] = useState(''),
    term = useDebounce(search),
    [filters, setFilters] = useState({ name: '', cin: '', phone: '', email: '' }),
    [draft, setDraft] = useState(filters),
    [filterOpen, setFilterOpen] = useState(false);
  const [id, setId] = useState<string>(),
    [edit, setEdit] = useState<Row | null>();
  const query = useCommerceList('/customerliste', { search: term, ...filters }, 'customers.view');
  if (edit !== undefined)
    return (
      <CustomerForm
        row={edit}
        onClose={() => setEdit(undefined)}
        onSaved={() => {
          setEdit(undefined);
          void query.refetch();
        }}
      />
    );
  if (id) return <CustomerDetail id={id} onBack={() => setId(undefined)} onEdit={setEdit} />;
  const count = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CommerceScreen title="Clients" scroll={false}>
        <AccessGate permission="customers.view">
          <CommerceList
            query={query}
            renderItem={({ item }) => <ClientCard row={item} onOpen={setId} />}
            header={
              <>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <AppText variant="headlineMd">Clients</AppText>
                    <AppText variant="bodySm" color="outline">
                      Clients commerciaux & ventes comptoir
                    </AppText>
                  </View>
                  {can('customers.create') ? (
                    <Button
                      label="Nouveau"
                      icon="person-add-alt"
                      compact
                      fullWidth={false}
                      onPress={() => setEdit(null)}
                    />
                  ) : null}
                </View>
                <View style={ui.row}>
                  <View style={ui.grow}>
                    <TextField
                      label="Rechercher un client"
                      placeholder="Nom, CIN, téléphone…"
                      value={search}
                      onChangeText={setSearch}
                    />
                  </View>
                  <Button
                    label={`Filtres${count ? ` (${count})` : ''}`}
                    icon="tune"
                    compact
                    fullWidth={false}
                    variant="tonal"
                    onPress={() => {
                      setDraft(filters);
                      setFilterOpen(true);
                    }}
                  />
                </View>
                {count ? (
                  <View style={ui.row}>
                    {Object.entries(filters)
                      .filter(([, v]) => v)
                      .map(([key, v]) => (
                        <Pressable
                          key={key}
                          accessibilityLabel={`Retirer le filtre ${key}`}
                          onPress={() => setFilters({ ...filters, [key]: '' })}
                        >
                          <Badge>{v} ×</Badge>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </>
            }
          />
        </AccessGate>
      </CommerceScreen>
      <SelectionDialog
        visible={filterOpen}
        title="Filtres des clients"
        onClose={() => setFilterOpen(false)}
      >
        {(
          [
            ['name', 'Nom'],
            ['cin', 'CIN'],
            ['phone', 'Téléphone'],
            ['email', 'E-mail'],
          ] as const
        ).map(([key, label]) => (
          <TextField
            key={key}
            label={label}
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
          variant="ghost"
          onPress={() => {
            setFilters({ name: '', cin: '', phone: '', email: '' });
            setFilterOpen(false);
          }}
        />
      </SelectionDialog>
    </>
  );
}
function CustomerDetail({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (row: Row) => void;
}) {
  const { store, can, access } = useCommerceAccess(),
    qc = useQueryClient();
  const [health, setHealth] = useState(false),
    [confirm, setConfirm] = useState(false),
    [sale, setSale] = useState<string>(),
    [creatingSale, setCreatingSale] = useState(false),
    [completedSale, setCompletedSale] = useState<CompletedSale>();
  const query = useQuery({
    queryKey: ['commerce', store, 'customer', id],
    queryFn: ({ signal }) => commerceApi.get(`/customer/show/${encodeURIComponent(id)}`, signal),
    enabled: can('customers.view'),
    retry: false,
  });
  const body = query.data,
    row = record(Array.isArray(body?.Customer) ? body.Customer[0] : body?.Customer);
  const sales = useCommerceList(
    `/customerlisteSales/${encodeURIComponent(id)}`,
    {},
    'customers.history.view',
  );
  const remove = useMutation({
    mutationFn: async () => {
      if (!can('customers.archive')) throw new Error('Action non autorisée.');
      await commerceApi.archiveCustomer(id);
    },
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      onBack();
    },
    retry: false,
  });
  if (sale)
    return (
      <Suspense fallback={<SkeletonCards count={2} />}>
        <SaleDetail
          id={sale}
          completed={completedSale}
          onClose={() => {
            setSale(undefined);
            setCompletedSale(undefined);
          }}
          canView={can('sales.view')}
        />
      </Suspense>
    );
  if (creatingSale)
    return (
      <Suspense fallback={<SkeletonCards count={2} />}>
        <SaleCheckout
          access={access.data}
          initialCustomer={row}
          onClose={() => setCreatingSale(false)}
          onCreated={(result) => {
            setCompletedSale(result);
            setSale(result.id);
            setCreatingSale(false);
            void sales.refetch();
            void query.refetch();
          }}
        />
      </Suspense>
    );
  return (
    <CommerceScreen title="Fiche client" onBack={onBack}>
      <AccessGate permission="customers.view">
        {query.isPending ? (
          <SkeletonCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : itemId(row) ? (
          <>
            <View style={ui.row}>
              <CrmAvatar name={customerName(row)} />
              <View style={ui.grow}>
                <AppText variant="headlineSm">{customerName(row)}</AppText>
                <Badge danger={Number(row.Active) !== 1}>
                  {Number(row.Active) === 1 ? 'Actif' : 'Inactif'}
                </Badge>
              </View>
              {can('customers.update') ? (
                <Button
                  label="Modifier"
                  icon="edit"
                  compact
                  fullWidth={false}
                  variant="tonal"
                  onPress={() => onEdit(row)}
                />
              ) : null}
            </View>
            <ResponsiveGrid maxColumns={2}>
              <Card title="Informations personnelles" icon="person-outline">
                <Pair label="Prénom" value={row.FirstName} />
                <Pair label="Nom" value={row.LastName} />
                <Pair label="Téléphone" value={row.Phone} />
                {row.Phone ? (
                  <Button
                    label="Appeler"
                    icon="call"
                    variant="tonal"
                    onPress={() =>
                      void Linking.openURL(`tel:${String(row.Phone).replace(/[^+\d]/g, '')}`)
                    }
                  />
                ) : null}
                <Pair label="E-mail" value={row.Email} />
                <Pair label="CIN" value={row.Cin} />
                <Pair
                  label="Naissance"
                  value={row.date_of_birth ? date(row.date_of_birth) : undefined}
                />
                <Pair
                  label="Âge"
                  value={
                    clientAge(row.date_of_birth) === undefined
                      ? undefined
                      : `${clientAge(row.date_of_birth)} ans`
                  }
                />
                {row.birth_date_estimated ? <Badge>Date de naissance estimée</Badge> : null}
              </Card>
              <Card title="Informations commerciales" icon="loyalty">
                <Pair label="Points de fidélité" value={row.LoyaltyPoint ?? 0} />
                <Pair label="Code organisme" value={row.OrgCode} />
                <Pair label="Immatriculation / ICE" value={row.OrgRegistrationNumber} />
              </Card>
            </ResponsiveGrid>
            <Card>
              <Button
                label={`Affections & antécédents (${Array.isArray(row.medical_conditions) ? row.medical_conditions.length : 0})`}
                variant="ghost"
                icon="medical-services"
                trailingIcon={health ? 'expand-less' : 'expand-more'}
                onPress={() => setHealth(!health)}
              />
              {health ? (
                <Notice>
                  {Array.isArray(row.medical_conditions) && row.medical_conditions.length
                    ? row.medical_conditions.join(' · ')
                    : 'Aucun antécédent renseigné.'}
                </Notice>
              ) : null}
            </Card>
            {can('customers.history.view') ? (
              <Card title="Ventes & historique" icon="receipt-long">
                <ResponsiveGrid maxColumns={2}>
                  <View style={ui.inset}>
                    <AppText variant="labelSm">Ventes terminées</AppText>
                    <AppText variant="headlineSm" color="primary">
                      {currency(body?.totalSalesComplete)}
                    </AppText>
                  </View>
                  <View style={ui.inset}>
                    <AppText variant="labelSm">Total des ventes impayées</AppText>
                    <AppText variant="headlineSm" color="error">
                      {currency(body?.totalSalesUnpaid)}
                    </AppText>
                  </View>
                </ResponsiveGrid>
                <AppText variant="bodySm" color="outline">
                  Le total des ventes impayées est distinct du reste dû.
                </AppText>
                {sales.isPending ? (
                  <SkeletonCards count={1} />
                ) : sales.isError ? (
                  <ErrorState error={sales.error} onRetry={() => void sales.refetch()} />
                ) : (
                  <>
                    {(sales.data?.pages.flatMap((p) => p.rows) ?? []).map((r) => (
                      <Pressable
                        key={itemId(r)}
                        disabled={!can('sales.view')}
                        onPress={() => setSale(itemId(r))}
                      >
                        <View style={ui.inset}>
                          <View style={ui.row}>
                            <AppText variant="labelLg" style={ui.grow}>
                              {String(r.ref ?? `Vente ${itemId(r)}`)}
                            </AppText>
                            <AppText variant="labelLg" color="primary">
                              {currency(r.total)}
                            </AppText>
                          </View>
                          <Pair label={date(r.date)} value={r.paymentStatusLabel} />
                          <Pair label="Reste dû" value={currency(r.due)} />
                        </View>
                      </Pressable>
                    ))}
                    {!sales.data?.pages[0]?.rows.length ? (
                      <Notice>Aucune vente pour ce client.</Notice>
                    ) : null}
                    {sales.hasNextPage ? (
                      <Button
                        label="Voir les ventes suivantes"
                        variant="tonal"
                        loading={sales.isFetchingNextPage}
                        onPress={() => void sales.fetchNextPage()}
                      />
                    ) : null}
                  </>
                )}
              </Card>
            ) : null}
            {can('sales.create') ? (
              <Button
                label="Nouvelle vente pour ce client"
                icon="point-of-sale"
                onPress={() => setCreatingSale(true)}
              />
            ) : null}
            {can('customers.archive') ? (
              <Button
                label="Supprimer le client"
                icon="delete-outline"
                variant="dangerSoft"
                onPress={() => setConfirm(true)}
              />
            ) : null}
            {remove.isError ? <ErrorState error={remove.error} /> : null}
          </>
        ) : (
          <Notice>Client introuvable.</Notice>
        )}
      </AccessGate>
      <ConfirmDialog
        visible={confirm}
        title="Supprimer le client ?"
        message={customerName(row)}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </CommerceScreen>
  );
}
function CustomerForm({
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
    FirstName: String(row?.FirstName ?? ''),
    LastName: String(row?.LastName ?? ''),
    Email: String(row?.Email ?? ''),
    Phone: String(row?.Phone ?? ''),
    Cin: String(row?.Cin ?? ''),
    OrgCode: String(row?.OrgCode ?? ''),
    OrgRegistrationNumber: String(row?.OrgRegistrationNumber ?? ''),
    date_of_birth: String(row?.date_of_birth ?? '').slice(0, 10),
  });
  const [active, setActive] = useState(Number(row?.Active ?? row?.active ?? 1) === 1),
    [estimated, setEstimated] = useState(!!row?.birth_date_estimated),
    [age, setAge] = useState(() => String(clientAge(row?.date_of_birth) ?? '')),
    [commercial, setCommercial] = useState(false),
    [conditions, setConditions] = useState(
      Array.isArray(row?.medical_conditions) ? row.medical_conditions.join('\n') : '',
    ),
    [dirty, setDirty] = useState(false),
    [leave, setLeave] = useState(false);
  const update = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
    setDirty(true);
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!can(row ? 'customers.update' : 'customers.create'))
        throw new Error('Action non autorisée.');
      if (!form.FirstName.trim()) throw new Error('Le prénom est obligatoire.');
      if (!form.Email.trim() || !/^\S+@\S+\.\S+$/.test(form.Email))
        throw new Error('Une adresse e-mail valide est requise par le serveur.');
      let birth = form.date_of_birth;
      if (estimated && age) {
        const n = Number(age);
        if (!Number.isInteger(n) || n < 0 || n > 125)
          throw new Error('L’âge doit être compris entre 0 et 125 ans.');
        birth = `${new Date().getFullYear() - n}-01-01`;
      }
      if (birth && (birth > new Date().toISOString().slice(0, 10) || birth < '1900-01-01'))
        throw new Error('Date de naissance invalide.');
      const data = {
        ...form,
        date_of_birth: birth || null,
        birth_date_estimated: estimated,
        Active: active ? 1 : 0,
        medical_conditions: conditions.split('\n').filter(Boolean),
        Cnss: row?.Cnss ?? null,
        CreditCeiling: row?.CreditCeiling ?? null,
        DefaultDiscount: row?.DefaultDiscount ?? null,
        OrgRegistration: row?.OrgRegistration ?? null,
        ...(row ? { id: itemId(row) } : {}),
      };
      return commerceApi.write('post', row ? '/customer/update' : '/customer', data);
    },
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ['commerce'] });
      void qc.invalidateQueries({ queryKey: ['crm'] });
      onSaved();
    },
    retry: false,
  });
  const back = () => !save.isPending && (dirty ? setLeave(true) : onClose());
  return (
    <CommerceScreen title={row ? 'Modifier le client' : 'Nouveau client'} onBack={back}>
      <AccessGate permission={row ? 'customers.update' : 'customers.create'}>
        <ResponsiveGrid maxColumns={2}>
          <Card title="Identité civile" icon="badge">
            {(
              [
                ['FirstName', 'Prénom *'],
                ['LastName', 'Nom de famille'],
                ['Phone', 'Téléphone'],
                ['Email', 'Adresse e-mail *'],
                ['Cin', 'CIN'],
              ] as const
            ).map(([key, label]) => (
              <TextField
                key={key}
                label={label}
                value={form[key]}
                error={fieldError(save.error, key)}
                onChangeText={(v) => update(key, v)}
                keyboardType={
                  key === 'Phone' ? 'phone-pad' : key === 'Email' ? 'email-address' : 'default'
                }
                autoCapitalize={key === 'Email' ? 'none' : 'words'}
                maxLength={255}
              />
            ))}
            <View style={ui.inset}>
              <View style={ui.row}>
                <AppText variant="labelLg" style={ui.grow}>
                  Saisie par âge estimé
                </AppText>
                <Switch
                  value={estimated}
                  onValueChange={(v) => {
                    setEstimated(v);
                    setDirty(true);
                  }}
                />
              </View>
              {estimated ? (
                <TextField
                  label="Âge (0–125 ans)"
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={(v) => {
                    setAge(v);
                    setDirty(true);
                  }}
                />
              ) : (
                <>
                  <DateInput
                    label="Date de naissance"
                    value={form.date_of_birth}
                    onChange={(v) => update('date_of_birth', v)}
                  />
                  <Pair
                    label="Âge calculé"
                    value={
                      clientAge(form.date_of_birth) === undefined
                        ? undefined
                        : `${clientAge(form.date_of_birth)} ans`
                    }
                  />
                </>
              )}
            </View>
          </Card>
          <View style={ui.stack}>
            <Card>
              <Button
                label="Informations commerciales"
                icon="storefront"
                variant="ghost"
                trailingIcon={commercial ? 'expand-less' : 'expand-more'}
                onPress={() => setCommercial(!commercial)}
              />
              {commercial ? (
                <>
                  <Pair label="Points de fidélité" value={row?.LoyaltyPoint ?? 0} />
                  <Notice>Les points de fidélité sont calculés par le système.</Notice>
                  <TextField
                    label="Code organisme / mutuelle"
                    value={form.OrgCode}
                    onChangeText={(v) => update('OrgCode', v)}
                  />
                  <TextField
                    label="Immatriculation / ICE"
                    value={form.OrgRegistrationNumber}
                    onChangeText={(v) => update('OrgRegistrationNumber', v)}
                  />
                </>
              ) : null}
            </Card>
            <Card title="Profil thérapeutique" icon="medical-services">
              <CareTags
                value={conditions}
                onChange={(v) => {
                  setConditions(v);
                  setDirty(true);
                }}
              />
            </Card>
            <Card>
              <View style={ui.row}>
                <View style={ui.grow}>
                  <AppText variant="labelLg">Client actif</AppText>
                  <AppText variant="bodySm" color="outline">
                    Disponible dans les opérations du magasin.
                  </AppText>
                </View>
                <Switch
                  value={active}
                  onValueChange={(v) => {
                    setActive(v);
                    setDirty(true);
                  }}
                />
              </View>
            </Card>
          </View>
        </ResponsiveGrid>
        {save.isError ? <ErrorState error={save.error} /> : null}
        <Button
          label={row ? 'Enregistrer' : 'Créer le client'}
          loading={save.isPending}
          icon="check-circle-outline"
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
