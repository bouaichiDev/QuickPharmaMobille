import { useState } from 'react';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { AccessGate, ErrorState, SkeletonCards } from '@/features/commerce/CommerceUI';
import { PharmacyLogo } from '@/features/stores/components/PharmacyLogo';
import { ColorField, isHexColor } from '@/components/ui/ColorField';
import { adminApi, asRows, asRecord, useAdminAction, useAdminQuery, type Row } from './api';
import {
  AdminPage,
  Panel,
  Fold,
  AppText,
  Button,
  TextField,
  Toggle,
  Tabs,
  FormActions,
  Notice,
  ReadOnly,
  useDirtyBack,
  useCommerceAccess,
  design,
} from './AdminDesign';
import { record } from '@/features/crm/crmApi';
const fields = [
  ['Name', 'Nom de l’entreprise *'],
  ['Email', 'E-mail *'],
  ['Phone', 'Téléphone'],
  ['OrgCode', 'Code de l’organisation'],
  ['OrgRegistrationNumber', 'Immatriculation'],
  ['OrgRegistration', 'Informations d’immatriculation'],
  ['cnss', 'CNSS'],
  ['tp', 'TP'],
  ['site_web', 'Site web'],
  ['banque_name', 'Banque'],
  ['rib', 'RIB'],
] as const;
export default function CompanySettingsScreen() {
  return (
    <AccessGate permission="settings.view">
      <CompanySettingsContent />
    </AccessGate>
  );
}
function CompanySettingsContent() {
  const query = useAdminQuery('/company/show/1', {}, 'settings.view');
  return query.isPending ? (
    <AdminPage title="Paramètres de l’entreprise">
      <SkeletonCards count={3} />
    </AdminPage>
  ) : query.isError ? (
    <AdminPage title="Paramètres de l’entreprise">
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    </AdminPage>
  ) : (
    <SettingsEditor
      key={String(asRows(query.data)[0]?.id ?? 'missing')}
      row={asRows(query.data)[0] ?? {}}
    />
  );
}
function configOf(value: unknown): Row {
  if (typeof value === 'string' && value.trim()) {
    try {
      return record(JSON.parse(value));
    } catch {
      throw new Error('Configuration de fidélité invalide.');
    }
  }
  return record(value);
}
function SettingsEditor({ row }: { row: Row }) {
  const { can } = useCommerceAccess(),
    client = useQueryClient();
  const [tab, setTab] = useState('Entreprise'),
    [form, setForm] = useState<Row>({ ...row }),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(''),
    [logo, setLogo] = useState(''),
    [error, setError] = useState('');
  const leave = useDirtyBack(dirty, () => router.back());
  const update = (key: string, value: unknown) => {
    setDirty(true);
    setForm({ ...form, [key]: value });
  };
  const save = useAdminAction(
    'settings.manage',
    async () => {
      if (
        !row.id ||
        !String(form.Name ?? '').trim() ||
        !/^\S+@\S+\.\S+$/.test(String(form.Email ?? ''))
      )
        throw new Error('Renseignez le nom et un e-mail valide.');
      const tax = Number(form.Tva ?? 0),
        days = Number(form.PeriodSendAlert ?? 0);
      if (!Number.isFinite(tax) || tax < 0 || tax > 100 || !Number.isInteger(days) || days < 0)
        throw new Error('Vérifiez la TVA et le délai d’alerte.');
      const data: Row = {
        id: row.id,
        Active: row.Active ?? 1,
        Tva: tax,
        PeriodSendAlert: days,
        Currency: String(form.Currency ?? ''),
      };
      fields.forEach(([key]) => {
        data[key] = form[key] ?? null;
      });
      if (tab === 'Configuration') {
        const config = configOf(form.config),
          loyalty = record(config.loyalty),
          redeem = record(loyalty.redeem);
        if (
          loyalty.enabled &&
          (!Number.isFinite(Number(redeem.points_to_value)) ||
            Number(redeem.points_to_value) <= 0 ||
            !Number.isFinite(Number(redeem.value)) ||
            Number(redeem.value) < 0 ||
            !Number.isFinite(Number(redeem.max_percent)) ||
            Number(redeem.max_percent) < 0 ||
            Number(redeem.max_percent) > 100)
        )
          throw new Error('Vérifiez la conversion des points et la remise maximale.');
        if (
          Array.isArray(loyalty.tiers) &&
          loyalty.tiers.some(
            (t) =>
              !Number.isFinite(Number(record(t).min)) ||
              Number(record(t).min) < 0 ||
              !Number.isInteger(Number(record(t).points)) ||
              Number(record(t).points) < 0,
          )
        )
          throw new Error('Vérifiez les montants et points des paliers.');
      }
      data.config = form.config ?? null;
      if (logo) data.image = logo;
      return adminApi.write('post', '/company/update', data);
    },
    () => {
      setDirty(false);
      setLogo('');
      void client.invalidateQueries({ queryKey: ['settings'] });
      void client.invalidateQueries({ queryKey: ['pharmacy-brand'] });
      void client.invalidateQueries({ queryKey: ['pharmacy-logo'] });
    },
  );
  async function pickLogo() {
    setError('');
    try {
      const Picker = await import('expo-image-picker');
      const result = await Picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.base64) throw new Error('Image non disponible.');
      if ((asset.fileSize ?? asset.base64.length * 0.75) > 2 * 1024 * 1024)
        throw new Error('Choisissez une image de moins de 2 Mo.');
      setLogo(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
      setPreview(asset.uri);
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image indisponible.');
    }
  }
  const input = (key: string, label: string, numeric = false) => (
    <TextField
      key={key}
      label={label}
      value={String(form[key] ?? '')}
      editable={can('settings.manage')}
      keyboardType={numeric ? 'decimal-pad' : 'default'}
      onChangeText={(v) => update(key, v)}
    />
  );
  let config: Row = {},
    configError = '';
  try {
    config = configOf(form.config);
  } catch (e) {
    configError = (e as Error).message;
  }
  const loyalty = record(config.loyalty),
    redeem = record(loyalty.redeem),
    tiers = Array.isArray(loyalty.tiers) ? loyalty.tiers.map(record) : [];
  const loyaltyUpdate = (next: Row) =>
    update(
      'config',
      JSON.stringify({ ...config, loyalty: { type: 'threshold', ...loyalty, ...next } }),
    );
  return (
    <AdminPage
      title="Paramètres de l’entreprise"
      onBack={leave.back}
      footer={
        can('settings.manage') && tab !== 'Style' ? (
          <FormActions
            onCancel={leave.back}
            onSave={() => save.mutate({})}
            busy={save.isPending}
            disabled={!row.id || !dirty}
          />
        ) : undefined
      }
    >
      <AccessGate permission="settings.view">
        <ReadOnly />
        <Tabs
          values={['Entreprise', 'Facture', 'Notifications', 'Style', 'Configuration']}
          value={tab}
          onChange={setTab}
        />
        {!row.id ? (
          <Notice>Les informations de l’entreprise ne sont pas disponibles.</Notice>
        ) : null}
        {tab === 'Entreprise' ? (
          <>
            <Panel title="Logo de l’entreprise">
              <View style={design.row}>
                {preview ? (
                  <Image
                    source={{ uri: preview }}
                    style={{ width: 80, height: 80 }}
                    resizeMode="contain"
                  />
                ) : (
                  <PharmacyLogo />
                )}
                {can('settings.manage') ? (
                  <Button
                    label="Changer le logo"
                    compact
                    fullWidth={false}
                    variant="tonal"
                    onPress={() => void pickLogo()}
                  />
                ) : null}
              </View>
              <AppText variant="bodySm">PNG ou JPEG • 2 Mo maximum</AppText>
            </Panel>
            <Panel>{fields.slice(0, 3).map(([key, label]) => input(key, label))}</Panel>
            <Fold label="Informations légales">
              {fields.slice(3).map(([key, label]) => input(key, label))}
            </Fold>
          </>
        ) : tab === 'Facture' ? (
          <>
            <Panel title="Facture">
              {input('Currency', 'Devise')}
              {input('Tva', 'TVA (%)', true)}
            </Panel>
            <InvoiceSettings />
          </>
        ) : tab === 'Notifications' ? (
          <Panel title="Notifications">
            {input('PeriodSendAlert', 'Délai d’alerte avant expiration (jours)', true)}
            <AppText variant="bodySm">
              Nombre de jours avant l’expiration d’un produit pour recevoir une alerte.
            </AppText>
          </Panel>
        ) : tab === 'Style' ? (
          <StyleSettings />
        ) : (
          <Panel title="Programme de fidélité">
            {configError ? (
              <Notice>{configError}</Notice>
            ) : (
              <>
                <Toggle
                  label="Activer la fidélité"
                  value={!!loyalty.enabled}
                  disabled={!can('settings.manage')}
                  onChange={(v) => loyaltyUpdate({ enabled: v })}
                />
                {tiers.map((tier, i) => (
                  <View key={i} style={design.inset}>
                    <TextField
                      label={`Palier ${i + 1} : montant minimum`}
                      value={String(tier.min ?? 0)}
                      editable={can('settings.manage')}
                      keyboardType="decimal-pad"
                      onChangeText={(v) =>
                        loyaltyUpdate({
                          tiers: tiers.map((t, j) => (j === i ? { ...t, min: Number(v) } : t)),
                        })
                      }
                    />
                    <TextField
                      label="Points attribués"
                      value={String(tier.points ?? 0)}
                      editable={can('settings.manage')}
                      keyboardType="number-pad"
                      onChangeText={(v) =>
                        loyaltyUpdate({
                          tiers: tiers.map((t, j) => (j === i ? { ...t, points: Number(v) } : t)),
                        })
                      }
                    />
                    {can('settings.manage') ? (
                      <Button
                        label="Retirer ce palier"
                        variant="ghost"
                        onPress={() => loyaltyUpdate({ tiers: tiers.filter((_, j) => j !== i) })}
                      />
                    ) : null}
                  </View>
                ))}
                {can('settings.manage') ? (
                  <Button
                    label="Ajouter un palier"
                    variant="tonal"
                    onPress={() => loyaltyUpdate({ tiers: [...tiers, { min: 0, points: 0 }] })}
                  />
                ) : null}
                {[
                  ['points_to_value', 'Nombre de points'],
                  ['value', 'Valeur monétaire'],
                  ['max_percent', 'Remise maximale (%)'],
                ].map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label!}
                    value={String(redeem[key!] ?? 0)}
                    editable={can('settings.manage')}
                    keyboardType="decimal-pad"
                    onChangeText={(v) =>
                      loyaltyUpdate({ redeem: { ...redeem, [key!]: Number(v) } })
                    }
                  />
                ))}
                <Toggle
                  label="Application automatique"
                  value={!!redeem.auto_apply}
                  disabled={!can('settings.manage')}
                  onChange={(v) => loyaltyUpdate({ redeem: { ...redeem, auto_apply: v } })}
                />
                <AppText>
                  {String(redeem.points_to_value ?? 0)} points = {String(redeem.value ?? 0)}{' '}
                  {String(form.Currency ?? 'DH')}
                </AppText>
              </>
            )}
          </Panel>
        )}
        {error ? <Notice>{error}</Notice> : null}
        {save.isError ? (
          <Notice>{save.error.message}</Notice>
        ) : save.isSuccess ? (
          <Notice>Paramètres enregistrés.</Notice>
        ) : null}
        {leave.dialog}
      </AccessGate>
    </AdminPage>
  );
}
export function InvoiceSettings() {
  const { can } = useCommerceAccess();
  const permission = can('invoices.settings.manage') ? 'invoices.settings.manage' : 'invoices.view';
  const query = useAdminQuery('/invoice-settings', {}, permission);
  if (query.isPending) return <AppText>Chargement des règles de facturation…</AppText>;
  if (query.isError) return <Notice>{query.error.message}</Notice>;
  return <InvoiceSettingsEditor row={asRecord(query.data)} />;
}
function InvoiceSettingsEditor({ row }: { row: Row }) {
  const { can } = useCommerceAccess();
  const [form, setForm] = useState(row);
  const save = useAdminAction('invoices.settings.manage', () =>
    adminApi.write('put', '/invoice-settings', form),
  );
  const update = (key: string, value: unknown) => setForm({ ...form, [key]: value });
  return (
    <Panel title="Remises et arrondis">
      {[
        ['allow_line_discount', 'Autoriser les remises par ligne'],
        ['allow_invoice_discount', 'Autoriser les remises globales'],
      ].map(([key, label]) => (
        <Toggle
          key={key}
          label={label!}
          value={!!form[key!]}
          disabled={!can('invoices.settings.manage')}
          onChange={(v) => update(key!, v)}
        />
      ))}
      {[
        ['max_line_discount_percent', 'Remise maximale par ligne (%)'],
        ['max_invoice_discount_percent', 'Remise globale maximale (%)'],
      ].map(([key, label]) => (
        <TextField
          key={key}
          label={label!}
          value={String(form[key!] ?? 0)}
          editable={can('invoices.settings.manage')}
          keyboardType="decimal-pad"
          onChangeText={(v) => update(key!, Number(v))}
        />
      ))}
      <Tabs
        values={['after_lines', 'before_lines']}
        value={String(form.invoice_discount_order)}
        onChange={(v) => update('invoice_discount_order', v)}
      />
      <Tabs
        values={['round', 'floor', 'ceil', 'none']}
        value={String(form.rounding_mode)}
        onChange={(v) => update('rounding_mode', v)}
      />
      {can('invoices.settings.manage') ? (
        <Button
          label="Enregistrer les règles de facturation"
          loading={save.isPending}
          onPress={() => save.mutate({})}
        />
      ) : null}
      {save.isError ? (
        <Notice>{save.error.message}</Notice>
      ) : save.isSuccess ? (
        <Notice>Règles enregistrées.</Notice>
      ) : null}
    </Panel>
  );
}
function StyleSettings() {
  const query = useAdminQuery('/settings/list', {}, 'settings.view'),
    { can } = useCommerceAccess();
  const [values, setValues] = useState<Record<string, string>>({});
  const save = useAdminAction('settings.manage', (data) =>
    adminApi.write('post', '/settings/update', data),
  );
  return (
    <Panel title="Style">
      {query.isPending ? (
        <AppText>Chargement…</AppText>
      ) : query.isError ? (
        <Notice>{query.error.message}</Notice>
      ) : (
        asRows(query.data).map((row) => (
          <View key={String(row.id)} style={design.stack}>
            {/color|colour/i.test(String(row.name)) ? (
              <ColorField
                label={String(row.name)}
                value={values[String(row.id)] ?? String(row.value ?? '')}
                editable={can('settings.manage')}
                onChange={(v) => setValues({ ...values, [String(row.id)]: v })}
              />
            ) : (
              <TextField
                label={String(row.name)}
                value={values[String(row.id)] ?? String(row.value ?? '')}
                editable={can('settings.manage')}
                onChangeText={(v) => setValues({ ...values, [String(row.id)]: v })}
              />
            )}
            {can('settings.manage') ? (
              <Button
                label={`Enregistrer ${row.name}`}
                compact
                variant="tonal"
                loading={save.isPending}
                disabled={
                  /color|colour/i.test(String(row.name)) &&
                  !isHexColor(values[String(row.id)] ?? String(row.value ?? ''))
                }
                onPress={() =>
                  save.mutate({
                    id: row.id,
                    name: row.name,
                    value: values[String(row.id)] ?? row.value,
                    active: 1,
                  })
                }
              />
            ) : null}
          </View>
        ))
      )}
      {save.isError ? (
        <Notice>{save.error.message}</Notice>
      ) : save.isSuccess ? (
        <Notice>Style enregistré.</Notice>
      ) : null}
    </Panel>
  );
}
