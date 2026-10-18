import { useState } from 'react';
import { View } from 'react-native';
import { STabs, useDebounce } from '@/features/catalogue/StockDesign';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformGet } from './hooks';
import {
  AdminScreen,
  AdminList,
  AppText,
  Panel,
  Pair,
  Tag,
  Button,
  Note,
  QueryState,
  TextField,
  sa,
} from './AdminUI';
import { ActionForm, type FormField } from './ActionForm';
import type {
  CatalogModule,
  CatalogResponse,
  CatalogPermission,
  CatalogFeature,
  QuotaDefinition,
} from './accessTypes';
type Target = {
  path: string;
  method: 'post' | 'put';
  title: string;
  fields: FormField[];
  initial?: Record<string, string | boolean>;
  extra?: Record<string, unknown>;
};
export function AccessCatalog({ quotasOnly = false }: { quotasOnly?: boolean }) {
  const [tab, setTab] = useState('modules'),
    [search, setSearch] = useState(''),
    [edit, setEdit] = useState<Target>();
  const [expanded, setExpanded] = useState<string>();
  const catalog = usePlatformGet<CatalogResponse>('/access-admin/modules', {}, !quotasOnly),
    quotas = usePlatformGet<{ quotas: QuotaDefinition[]; counting_rules: string[] }>(
      '/access-admin/quotas',
      {},
      quotasOnly,
    );
  const { tDynamic } = useTranslation(),
    term = useDebounce(search).toLowerCase();
  const query = quotasOnly ? quotas : catalog;
  const modules = catalog.data?.modules ?? [],
    options = modules.map((m) => [m.key, tDynamic(m.label_key, m.key)] as [string, string]);
  const type = quotasOnly ? 'quotas' : tab;
  const rows = (
    quotasOnly
      ? (quotas.data?.quotas ?? [])
      : tab === 'modules'
        ? modules
        : tab === 'features'
          ? modules.flatMap((m) => m.features.map((f) => ({ ...f, module: m.key })))
          : modules.flatMap((m) => m.permissions.map((p) => ({ ...p, module: m.key })))
  ).filter((r) => `${r.key} ${r.label_key}`.toLowerCase().includes(term));
  function begin(
    row?: CatalogModule | CatalogFeature | CatalogPermission | QuotaDefinition,
    kind?: string,
  ) {
    const formType = kind ?? type;
    const reason: FormField = { key: 'reason', label: 'Motif', type: 'multiline' };
    const lock = row ? { lock_version: row.lock_version } : undefined;
    const fields: FormField[] = row
      ? [{ key: 'active', label: 'Actif', type: 'bool' }]
      : [{ key: 'key', label: 'Clé', required: true }];
    if (formType === 'modules') fields.push({ key: 'sort_order', label: 'Ordre', type: 'number' });
    if (formType === 'features') {
      if (!row) fields.push({ key: 'module_key', label: 'Module', required: true, options });
      else fields.push({ key: 'operational', label: 'Opérationnelle', type: 'bool' });
    }
    if (formType === 'permissions') {
      if (!row)
        fields.push(
          { key: 'module_key', label: 'Module', required: true, options },
          {
            key: 'action',
            label: 'Action',
            required: true,
            options: [
              'view',
              'create',
              'update',
              'delete',
              'manage',
              'export',
              'import',
              'approve',
            ].map((k) => [k, k]),
          },
          {
            key: 'scope',
            label: 'Périmètre',
            required: true,
            options: [
              ['tenant', 'Magasin'],
              ['platform', 'Plateforme'],
            ],
          },
        );
      fields.push(
        { key: 'delegable', label: 'Délégable', type: 'bool' },
        { key: 'available_when_lapsed', label: 'Disponible après expiration', type: 'bool' },
      );
    }
    if (formType === 'quotas') {
      fields.push({ key: 'unit', label: 'Unité', required: true });
      if (!row)
        fields.push(
          {
            key: 'scope',
            label: 'Périmètre',
            required: true,
            options: [
              ['account', 'Compte'],
              ['store', 'Magasin'],
            ],
          },
          {
            key: 'period',
            label: 'Période',
            required: true,
            options: [
              ['none', 'Sans période'],
              ['month', 'Mois'],
            ],
          },
          {
            key: 'counting_rule',
            label: 'Règle de comptage',
            required: true,
            options: (quotas.data?.counting_rules ?? []).map((r) => [r, r]),
          },
        );
    }
    const r = row as unknown as Record<string, unknown> | undefined;
    setEdit({
      title: row ? `Modifier ${tDynamic(row.label_key, row.key)}` : `Créer · ${formType}`,
      path: `/access-admin/${formType}${row ? `/${row.id}` : ''}`,
      method: row ? 'put' : 'post',
      fields: [...fields, reason],
      initial: Object.fromEntries(
        fields.map((f) => [f.key, f.type === 'bool' ? !!r?.[f.key] : String(r?.[f.key] ?? '')]),
      ),
      extra: lock,
    });
  }
  return (
    <AdminScreen
      title={quotasOnly ? 'Définitions des quotas' : 'Modules & permissions'}
      scroll={false}
    >
      <AdminList
        data={edit ? [] : rows}
        header={
          <>
            {quotasOnly ? null : (
              <STabs
                values={[
                  ['modules', 'Modules'],
                  ['features', 'Fonctionnalités'],
                  ['permissions', 'Permissions'],
                ]}
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  setEdit(undefined);
                }}
              />
            )}
            {edit ? (
              <ActionForm key={edit.path} {...edit} onClose={() => setEdit(undefined)} />
            ) : (
              <>
                <TextField label="Rechercher" value={search} onChangeText={setSearch} />
                <Button label="Ajouter" icon="add" onPress={() => begin()} />
                <QueryState query={query} />
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Panel>
            <View style={sa.row}>
              <AppText variant="headlineSm" style={sa.grow}>
                {tDynamic(item.label_key, item.key)}
              </AppText>
              <Tag label={item.active ? 'Actif' : 'Inactif'} />
            </View>
            <AppText variant="bodySm" color="outline">
              {item.key}
            </AppText>
            {'counting_rule' in item ? (
              <>
                <Pair label="Unité" value={item.unit} />
                <Pair label="Périmètre" value={item.scope === 'store' ? 'Magasin' : 'Compte'} />
                <Pair
                  label="Période"
                  value={item.period === 'month' ? 'Mensuelle' : 'Sans période'}
                />
                <Pair label="Règle" value={item.counting_rule} />
              </>
            ) : null}
            {'features' in item ? (
              <>
                <Pair label="Ordre d’affichage" value={item.sort_order} />
                <Button
                  label={`${item.features.length} fonctionnalités · ${item.permissions.length} permissions`}
                  variant="tonal"
                  onPress={() => setExpanded(expanded === item.key ? undefined : item.key)}
                />
                {expanded === item.key ? (
                  <>
                    <AppText variant="labelLg">Fonctionnalités</AppText>
                    {item.features.map((feature) => (
                      <View key={feature.key} style={sa.inset}>
                        <AppText variant="labelMd">
                          {tDynamic(feature.label_key, feature.key)}
                        </AppText>
                        <Pair
                          label="Actif / opérationnel"
                          value={`${feature.active ? 'Oui' : 'Non'} / ${feature.operational ? 'Oui' : 'Non'}`}
                        />
                        <Button
                          label="Modifier la fonctionnalité"
                          variant="ghost"
                          onPress={() => begin(feature, 'features')}
                        />
                      </View>
                    ))}
                    <AppText variant="labelLg">Permissions</AppText>
                    {item.permissions.map((permission) => (
                      <View key={permission.key} style={sa.inset}>
                        <AppText variant="labelMd">
                          {tDynamic(permission.label_key, permission.key)}
                        </AppText>
                        <Pair
                          label="Action / portée"
                          value={`${permission.action} · ${permission.scope === 'platform' ? 'Plateforme' : 'Compte client'}`}
                        />
                        <Pair
                          label="Fonctionnalité requise"
                          value={permission.feature ?? 'Aucune'}
                        />
                        <Pair
                          label="Délégable / après expiration"
                          value={`${permission.delegable ? 'Oui' : 'Non'} / ${permission.available_when_lapsed ? 'Oui' : 'Non'}`}
                        />
                        <Tag label={permission.active ? 'Actif' : 'Inactif'} />
                        <Button
                          label="Modifier la permission"
                          variant="ghost"
                          onPress={() => begin(permission, 'permissions')}
                        />
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : null}
            <Button label="Modifier" variant="tonal" onPress={() => begin(item)} />
          </Panel>
        )}
        empty={query.data && !edit ? <Note>Aucun résultat.</Note> : null}
      />
    </AdminScreen>
  );
}
