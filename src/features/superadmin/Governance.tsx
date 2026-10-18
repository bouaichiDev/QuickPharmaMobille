import { useState } from 'react';
import { activityLabel } from './activityLabel';
import { View } from 'react-native';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { useDebounce } from '@/features/catalogue/StockDesign';
import { record } from '@/features/crm/crmApi';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformGet, usePlatformList, usePlatformPermission } from './hooks';
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
  DateInput,
  date,
  sa,
} from './AdminUI';
import type { Params } from './api';
import type { TenantRow } from './types';
import type {
  AccountOverride,
  AuditEntry,
  CatalogResponse,
  SimulationResult,
  TrialState,
} from './accessTypes';
import { ActionForm, type FormField } from './ActionForm';
export function TenantPicker({
  onSelect,
  title = 'Choisir un magasin',
}: {
  onSelect: (t: TenantRow) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    term = useDebounce(search);
  const canTenants = usePlatformPermission('platform.tenants.manage');
  const query = usePlatformList<TenantRow>(
    '/superadmin/tenants',
    { search: term, page, per_page: 10 },
    open && canTenants,
  );
  return (
    <>
      <Button
        label={title}
        variant="tonal"
        icon="storefront"
        disabled={!canTenants}
        onPress={() => setOpen(true)}
      />
      <SelectionDialog visible={open} title={title} onClose={() => setOpen(false)}>
        <TextField
          label="Nom, propriétaire ou e-mail"
          value={search}
          onChangeText={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <QueryState query={query} />
        {query.data?.data.map((t) => (
          <Button
            key={t.store_id}
            label={`${t.name} · ${t.owner?.email ?? 'Sans propriétaire'}`}
            variant="ghost"
            onPress={() => {
              onSelect(t);
              setOpen(false);
            }}
          />
        ))}
        <Pager result={query.data} setPage={setPage} busy={query.isFetching} />
      </SelectionDialog>
    </>
  );
}
export function Accounts({ account, name }: { account?: string; name?: string }) {
  const [target, setTarget] = useState(account ?? ''),
    [label, setLabel] = useState(name ?? ''),
    [state, setState] = useState(''),
    [page, setPage] = useState(1),
    [create, setCreate] = useState(false),
    [type, setType] = useState('feature'),
    [revoke, setRevoke] = useState<AccountOverride>();
  const canOverride = usePlatformPermission('platform.overrides.manage'),
    canCatalog = usePlatformPermission('platform.permissions.manage');
  const query = usePlatformList<AccountOverride>(
    `/access-admin/accounts/${target}/overrides`,
    { state, page },
    !!target && canOverride,
  );
  const trials = usePlatformGet<{ trials: Record<string, TrialState> }>(
    `/access-admin/accounts/${target}/trials`,
    {},
    !!target,
  );
  const catalog = usePlatformGet<CatalogResponse>(
    '/access-admin/modules',
    {},
    create && canCatalog,
  );
  const { tDynamic } = useTranslation();
  const fields: FormField[] =
    type === 'feature'
      ? [
          {
            key: 'feature_key',
            label: 'Fonctionnalité',
            required: true,
            options: (catalog.data?.modules.flatMap((m) => m.features) ?? []).map((f) => [
              f.key,
              tDynamic(f.label_key, f.key),
            ]),
          },
          { key: 'enabled', label: 'Accordée', type: 'bool' },
        ]
      : [
          {
            key: 'quota_key',
            label: 'Quota',
            required: true,
            options: (catalog.data?.quotas ?? []).map((q) => [q.key, tDynamic(q.label_key, q.key)]),
          },
          { key: 'is_unlimited', label: 'Illimité', type: 'bool' },
          { key: 'limit_value', label: 'Limite', type: 'number' },
        ];
  return (
    <AdminScreen title="Essais & exceptions" scroll={false}>
      <AdminList
        data={query.data?.data ?? []}
        header={
          <>
            <TenantPicker
              title={label || 'Choisir le compte via un magasin'}
              onSelect={(t) => {
                setTarget(String(t.owner?.id ?? ''));
                setLabel(t.owner?.name || t.name);
                setCreate(false);
                setPage(1);
              }}
            />
            {target ? (
              <>
                <Panel title={`Essais du compte · ${label}`}>
                  <QueryState query={trials} />
                  {trials.data
                    ? Object.entries(trials.data.trials).map(([key, trial]) => (
                        <View key={key} style={sa.inset}>
                          <AppText variant="labelMd">
                            {tDynamic(`access.trial.${key}`, key)}
                          </AppText>
                          {Object.entries(record(trial))
                            .filter(([k]) =>
                              [
                                'status',
                                'started_at',
                                'ends_at',
                                'available',
                                'active',
                                'days',
                              ].includes(k),
                            )
                            .map(([k, v]) => (
                              <Pair
                                key={k}
                                label={k}
                                value={typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v}
                              />
                            ))}
                        </View>
                      ))
                    : null}
                  {trials.data && !Object.keys(trials.data.trials).length ? (
                    <Note>Aucun essai configuré.</Note>
                  ) : null}
                </Panel>
                {canOverride ? (
                  <>
                    <Choice
                      label="État des exceptions"
                      value={state}
                      options={[
                        ['', 'Toutes'],
                        ['active', 'Actives'],
                        ['scheduled', 'Programmées'],
                        ['expired', 'Expirées'],
                        ['revoked', 'Révoquées'],
                      ]}
                      onChange={(v) => {
                        setState(v);
                        setPage(1);
                      }}
                    />
                    <Button
                      label="Ajouter une exception"
                      icon="add"
                      onPress={() => setCreate(!create)}
                    />
                    <QueryState query={query} />
                  </>
                ) : null}
                {create ? (
                  <>
                    <Choice
                      label="Type"
                      value={type}
                      options={[
                        ['feature', 'Fonctionnalité'],
                        ['quota', 'Quota'],
                      ]}
                      onChange={setType}
                    />
                    <QueryState query={catalog} />
                    <ActionForm
                      key={`${target}-${type}`}
                      title="Exception datée"
                      path={`/access-admin/accounts/${target}/overrides`}
                      fields={[
                        ...fields,
                        { key: 'starts_at', label: 'Date de début (facultative)', type: 'date' },
                        { key: 'ends_at', label: 'Date de fin', type: 'date', required: true },
                        {
                          key: 'reason',
                          label: 'Motif (5 caractères minimum)',
                          required: true,
                          type: 'multiline',
                        },
                      ]}
                      initial={{ enabled: true, limit_value: '0' }}
                      extra={{ type }}
                      validate={(v) =>
                        String(v.reason ?? '').trim().length < 5
                          ? 'Le motif est obligatoire (5 caractères minimum).'
                          : null
                      }
                      onClose={() => setCreate(false)}
                    />
                  </>
                ) : null}
                {revoke ? (
                  <ActionForm
                    key={revoke.id}
                    title="Révoquer cette exception"
                    path={`/access-admin/overrides/${revoke.id}/revoke`}
                    fields={[{ key: 'reason', label: 'Motif', required: true, type: 'multiline' }]}
                    extra={{ lock_version: revoke.lock_version }}
                    validate={(v) =>
                      String(v.reason ?? '').trim().length < 5 ? 'Précisez le motif.' : null
                    }
                    onClose={() => setRevoke(undefined)}
                  />
                ) : null}
              </>
            ) : (
              <Note>Choisissez un magasin pour retrouver son compte propriétaire.</Note>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Panel title={item.feature?.key ?? item.quota?.key ?? item.type}>
            <Tag label={item.revoked_at ? 'Révoquée' : 'Exception'} />
            <Pair label="Du / au" value={`${date(item.starts_at)} / ${date(item.ends_at)}`} />
            <Pair
              label="Valeur"
              value={
                item.type === 'feature'
                  ? item.enabled
                    ? 'Accordée'
                    : 'Retirée'
                  : item.is_unlimited
                    ? 'Illimité'
                    : item.limit_value
              }
            />
            <Note>{item.reason}</Note>
            {!item.revoked_at ? (
              <Button label="Révoquer" variant="dangerSoft" onPress={() => setRevoke(item)} />
            ) : null}
          </Panel>
        )}
        footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
      />
    </AdminScreen>
  );
}
export function Simulation({ initialStore }: { initialStore?: string }) {
  const [store, setStore] = useState(initialStore ?? ''),
    [name, setName] = useState(''),
    [user, setUser] = useState(''),
    [permission, setPermission] = useState(''),
    [params, setParams] = useState<Params>();
  const tenant = usePlatformGet<{
    users: { id: number; firstName?: string; lastName?: string; email: string }[];
  }>(`/superadmin/tenants/${store}`, {}, !!store);
  const result = usePlatformGet<SimulationResult>('/access-admin/simulate', params ?? {}, !!params);
  return (
    <AdminScreen title="Simulation des droits">
      <Note>
        Évaluation par le serveur : aucune opération n’est exécutée au nom de cet utilisateur.
      </Note>
      <TenantPicker
        title={name || 'Choisir un magasin'}
        onSelect={(t) => {
          setStore(String(t.store_id));
          setName(t.name);
          setUser('');
          setParams(undefined);
        }}
      />
      <QueryState query={tenant} />
      <Choice
        label="Utilisateur"
        value={user}
        options={(tenant.data?.users ?? []).map((u) => [
          String(u.id),
          [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
        ])}
        onChange={setUser}
      />
      <TextField
        label="Permission à vérifier (facultative)"
        placeholder="Exemple : sales.create"
        value={permission}
        onChangeText={setPermission}
      />
      <Button
        label="Simuler les accès"
        disabled={!store || !user || result.isFetching}
        onPress={() =>
          setParams({
            user_id: Number(user),
            target_store_id: Number(store),
            ...(permission.trim() ? { permissions: [permission.trim()] } : {}),
          })
        }
      />
      {params ? <QueryState query={result} /> : null}
      {result.data ? (
        <>
          <Panel title="Accès effectifs">
            <Pair label="Rôle" value={result.data.effective_access.role.code} />
            <Pair label="Permissions" value={result.data.effective_access.permissions.length} />
            <Pair label="Abonnement" value={result.data.effective_access.subscription?.plan_name} />
            {Object.entries(result.data.decisions).map(([key, d]) => (
              <View key={key} style={sa.inset}>
                <AppText variant="labelMd">{key}</AppText>
                <Tag label={d.allowed ? 'Autorisé' : 'Refusé'} danger={!d.allowed} />
                <Pair label="Raison" value={d.reason ?? d.code ?? 'Droit accordé'} />
              </View>
            ))}
          </Panel>
          <Panel title="Permissions accordées">
            {result.data.effective_access.permissions.slice(0, 100).map((p) => (
              <AppText key={p} variant="bodySm">
                {p}
              </AppText>
            ))}
          </Panel>
        </>
      ) : null}
    </AdminScreen>
  );
}
export function AdminAudit() {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [action, setAction] = useState(''),
    [store, setStore] = useState(''),
    [name, setName] = useState(''),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState<number>();
  const term = useDebounce(action),
    valid = !from || !to || from <= to;
  const query = usePlatformList<AuditEntry>(
    '/access-admin/audit',
    { from, to, action: term, audit_store_id: store, page },
    valid,
  );
  return (
    <AdminScreen title="Historique administratif" scroll={false}>
      <AdminList
        data={query.data?.data ?? []}
        header={
          <>
            <Panel>
              <Note>
                Historique des changements de droits et d’abonnements. Le journal opérationnel est
                accessible dans la fiche du magasin.
              </Note>
              <TenantPicker
                title={name || 'Filtrer par magasin'}
                onSelect={(t) => {
                  setStore(String(t.store_id));
                  setName(t.name);
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
              <Button
                label="Réinitialiser"
                variant="ghost"
                onPress={() => {
                  setStore('');
                  setName('');
                  setFrom('');
                  setTo('');
                  setAction('');
                  setPage(1);
                }}
              />
            </Panel>
            {valid ? <QueryState query={query} /> : <Note>Vérifiez les dates.</Note>}
          </>
        }
        renderItem={({ item }) => (
          <Panel title={activityLabel(item.action)}>
            <Pair
              label="Effectué par"
              value={
                item.user
                  ? `${item.user.firstName} ${item.user.lastName}`
                  : 'Utilisateur indisponible'
              }
            />
            <Pair label="Date" value={date(item.created_at)} />
            {item.reason ? <Note>{item.reason}</Note> : null}
            <Button
              label={detail === item.id ? 'Masquer les changements' : 'Voir les changements'}
              variant="tonal"
              onPress={() => setDetail(detail === item.id ? undefined : item.id)}
            />
            {detail === item.id ? (
              <>
                <Changes title="Avant" value={item.before} />
                <Changes title="Après" value={item.after} />
              </>
            ) : null}
          </Panel>
        )}
        footer={<Pager result={query.data} setPage={setPage} busy={query.isFetching} />}
        empty={query.data ? <Note>Aucun événement pour ces filtres.</Note> : null}
      />
    </AdminScreen>
  );
}
function Changes({ title, value }: { title: string; value: unknown }) {
  return (
    <View style={sa.inset}>
      <AppText variant="labelLg">{title}</AppText>
      {Object.entries(record(value))
        .slice(0, 30)
        .map(([k, v]) => (
          <Pair
            key={k}
            label={k.replace(/_/g, ' ')}
            value={
              Array.isArray(v)
                ? v.map((x) => (typeof x === 'object' ? 'Détail modifié' : String(x))).join(', ')
                : typeof v === 'object'
                  ? Object.keys(record(v)).join(', ')
                  : v
            }
          />
        ))}
      {!Object.keys(record(value)).length ? (
        <AppText variant="bodySm">Aucun détail disponible.</AppText>
      ) : null}
    </View>
  );
}
