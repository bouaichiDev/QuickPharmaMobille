import { useState } from 'react';
import { PlanImpactReview } from './PlanImpactReview';
import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformAction, usePlatformGet } from './hooks';
import {
  AdminScreen,
  AdminList,
  Panel,
  Pair,
  Tag,
  Note,
  Choice,
  QueryState,
  TextField,
  Button,
  currency,
  date,
  sa,
} from './AdminUI';
import type { SuperAdminPlan } from './types';
import type {
  CatalogResponse,
  PlanVersion,
  PlanTerms,
  QuotaValue,
  PlanImpact,
  CatalogFeature,
  QuotaDefinition,
} from './accessTypes';
import { ActionForm, type FormField } from './ActionForm';
const commercialFields: FormField[] = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'description', label: 'Description', type: 'multiline' },
  { key: 'price', label: 'Prix', required: true, type: 'number' },
  { key: 'duration_in_days', label: 'Durée en jours', type: 'number', required: true },
  { key: 'active', label: 'Actif', type: 'bool' },
];
function TermsFields({
  value,
  onChange,
  features,
  quotas,
}: {
  value: Pick<PlanTerms, 'features' | 'quotas'>;
  onChange: (v: Pick<PlanTerms, 'features' | 'quotas'>) => void;
  features: CatalogFeature[];
  quotas: QuotaDefinition[];
}) {
  const { tDynamic } = useTranslation(),
    [section, setSection] = useState('');
  const setQuota = (key: string, v?: QuotaValue) => {
    const next = { ...value.quotas };
    if (v == null) delete next[key];
    else next[key] = v;
    onChange({ ...value, quotas: next });
  };
  return (
    <>
      <Button
        label={`Fonctionnalités (${value.features.length})`}
        variant="tonal"
        onPress={() => setSection(section === 'features' ? '' : 'features')}
      />
      {section === 'features'
        ? features.map((f) => (
            <Checkbox
              key={f.id}
              checked={value.features.includes(f.key)}
              label={tDynamic(f.label_key, f.key)}
              onChange={(checked) =>
                onChange({
                  ...value,
                  features: checked
                    ? [...new Set([...value.features, f.key])]
                    : value.features.filter((k) => k !== f.key),
                })
              }
            />
          ))
        : null}
      <Button
        label="Quotas et plafonds"
        variant="tonal"
        onPress={() => setSection(section === 'quotas' ? '' : 'quotas')}
      />
      {section === 'quotas'
        ? quotas.map((q) => (
            <Panel key={q.id} title={tDynamic(q.label_key, q.key)}>
              <Choice
                label="Limite"
                value={
                  value.quotas[q.key] == null
                    ? 'absent'
                    : value.quotas[q.key] === 'unlimited'
                      ? 'unlimited'
                      : 'limited'
                }
                options={[
                  ['absent', 'Non configuré (refusé)'],
                  ['limited', 'Limité'],
                  ['unlimited', 'Illimité'],
                ]}
                onChange={(s) =>
                  setQuota(q.key, s === 'absent' ? undefined : s === 'unlimited' ? 'unlimited' : 0)
                }
              />
              {typeof value.quotas[q.key] === 'number' ? (
                <TextField
                  label={`Quantité (${q.unit})`}
                  value={String(value.quotas[q.key])}
                  keyboardType="number-pad"
                  onChangeText={(s) => {
                    if (/^\d+$/.test(s)) setQuota(q.key, Number(s));
                  }}
                />
              ) : null}
            </Panel>
          ))
        : null}
    </>
  );
}
function VersionEditor({ version, onClose }: { version: PlanVersion; onClose: () => void }) {
  const catalog = usePlatformGet<CatalogResponse>('/access-admin/modules'),
    [terms, setTerms] = useState<PlanTerms>(
      version.terms ?? { features: [], quotas: {}, trials: {} },
    ),
    [notes, setNotes] = useState(version.notes ?? ''),
    [newTrial, setNewTrial] = useState(''),
    [review, setReview] = useState(false);
  const action = usePlatformAction(onClose),
    features = catalog.data?.modules.flatMap((m) => m.features) ?? [],
    quotas = catalog.data?.quotas ?? [];
  return (
    <>
      <Panel title={`Brouillon v${version.version}`}>
        <TextField label="Notes de version" value={notes} onChangeText={setNotes} multiline />
        <QueryState query={catalog} />
        {catalog.data ? (
          <TermsFields
            value={terms}
            onChange={(v) => setTerms((t) => ({ ...t, ...v }))}
            features={features}
            quotas={quotas}
          />
        ) : null}
      </Panel>
      <Panel title="Conditions d’essai">
        {Object.entries(terms.trials).map(([key, trial]) => (
          <Panel key={key} title={key}>
            <TextField
              label="Durée en jours"
              value={String(trial.days)}
              keyboardType="number-pad"
              onChangeText={(s) => {
                if (/^\d+$/.test(s))
                  setTerms((t) => ({
                    ...t,
                    trials: { ...t.trials, [key]: { ...trial, days: Number(s) } },
                  }));
              }}
            />
            <Checkbox
              label="Essai actif"
              checked={trial.active !== false}
              onChange={(active) =>
                setTerms((t) => ({ ...t, trials: { ...t.trials, [key]: { ...trial, active } } }))
              }
            />
            <TermsFields
              value={trial}
              onChange={(v) =>
                setTerms((t) => ({ ...t, trials: { ...t.trials, [key]: { ...trial, ...v } } }))
              }
              features={features}
              quotas={quotas}
            />
            <Button
              label="Retirer cet essai du brouillon"
              variant="dangerSoft"
              onPress={() =>
                setTerms((t) => {
                  const next = { ...t.trials };
                  delete next[key];
                  return { ...t, trials: next };
                })
              }
            />
          </Panel>
        ))}
        <TextField label="Clé du nouvel essai" value={newTrial} onChangeText={setNewTrial} />
        <Button
          label="Ajouter un essai"
          variant="tonal"
          disabled={!/^[a-z][a-z0-9_.]*$/.test(newTrial) || newTrial in terms.trials}
          onPress={() => {
            setTerms((t) => ({
              ...t,
              trials: {
                ...t.trials,
                [newTrial]: { days: 14, active: true, features: [], quotas: {} },
              },
            }));
            setNewTrial('');
          }}
        />
      </Panel>
      <View style={sa.row}>
        <Button
          label="Annuler"
          variant="tonal"
          style={sa.grow}
          disabled={action.isPending}
          onPress={onClose}
        />
        <Button
          label="Enregistrer le brouillon"
          style={sa.grow}
          disabled={!catalog.data || Object.values(terms.trials).some((t) => t.days < 1)}
          onPress={() => setReview(true)}
        />
      </View>
      {action.isError ? <Note>{action.error.message}</Note> : null}
      <ConfirmDialog
        visible={review}
        title="Enregistrer les conditions"
        message={`v${version.version} · ${terms.features.length} fonctionnalités · ${Object.keys(terms.quotas).length} quotas · ${Object.keys(terms.trials).length} essais. Les changements concernent uniquement ce brouillon.${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(false);
        }}
        onConfirm={() =>
          void action
            .run({
              method: 'put',
              path: `/access-admin/plan-versions/${version.id}`,
              body: { ...terms, notes, lock_version: version.lock_version },
            })
            .catch(() => undefined)
        }
      />
    </>
  );
}
export function VersionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const query = usePlatformGet<PlanVersion>(`/access-admin/plan-versions/${id}`),
    [edit, setEdit] = useState(false),
    [impactOpen, setImpactOpen] = useState(false),
    [publish, setPublish] = useState(false);
  const impact = usePlatformGet<PlanImpact>(
      `/access-admin/plan-versions/${id}/impact`,
      {},
      impactOpen,
    ),
    v = query.data;
  if (edit && v) return <VersionEditor version={v} onClose={() => setEdit(false)} />;
  return (
    <>
      <Button label="Retour aux versions" variant="ghost" onPress={onClose} />
      <QueryState query={query} />
      {v ? (
        <>
          <Panel title={`Version ${v.version}`}>
            <Tag
              label={
                v.status === 'draft'
                  ? 'Brouillon'
                  : v.status === 'published'
                    ? 'Publiée'
                    : 'Archivée'
              }
            />
            <Pair label="Prise d’effet" value={date(v.effective_from)} />
            <Pair label="Abonnements associés" value={v.subscriptions_count} />
            <Note>{v.notes || 'Aucune note.'}</Note>
            <Pair label="Fonctionnalités" value={v.terms?.features.length} />
            <Pair label="Quotas configurés" value={Object.keys(v.terms?.quotas ?? {}).length} />
            {v.status === 'draft' ? (
              <Button label="Modifier le brouillon" variant="tonal" onPress={() => setEdit(true)} />
            ) : null}
            <Button
              label="Prévisualiser l’impact"
              variant="tonal"
              onPress={() => setImpactOpen(true)}
            />
            {v.status === 'draft' ? (
              <Button label="Publier cette version" onPress={() => setPublish(true)} />
            ) : null}
          </Panel>
          {impactOpen ? (
            <Panel title="Impact sur les abonnements">
              <QueryState query={impact} />
              {impact.data ? (
                <>
                  <Pair label="Abonnements analysés" value={impact.data.subscriptions} />
                  <Pair label="Perte de fonctionnalités" value={impact.data.with_lost_features} />
                  <Pair label="Quotas dépassés" value={impact.data.with_exceeded_quotas} />
                  <Note>
                    La publication s’applique aux nouveaux abonnements et renouvellements. Les
                    abonnements existants conservent leur version.
                  </Note>
                  <PlanImpactReview
                    impact={impact.data}
                    versionId={id}
                    published={v.status === 'published'}
                  />
                </>
              ) : null}
            </Panel>
          ) : null}
          {publish ? (
            <ActionForm
              title="Confirmer la publication"
              path={`/access-admin/plan-versions/${id}/publish`}
              fields={[
                {
                  key: 'effective_from',
                  label: 'Date de prise d’effet (facultative)',
                  type: 'date',
                },
                { key: 'reason', label: 'Motif' },
              ]}
              extra={{ lock_version: v.lock_version }}
              onClose={() => setPublish(false)}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
function PlanVersions({ plan, onClose }: { plan: SuperAdminPlan; onClose: () => void }) {
  const query = usePlatformGet<PlanVersion[]>(`/access-admin/plans/${plan.id}/versions`),
    [selected, setSelected] = useState<number>(),
    [draft, setDraft] = useState(false),
    [commercial, setCommercial] = useState(false);
  const [signup, setSignup] = useState(false);
  const signupAction = usePlatformAction(() => setSignup(false));
  if (selected) return <VersionDetail id={selected} onClose={() => setSelected(undefined)} />;
  return (
    <>
      <Button label="Retour aux plans" variant="ghost" onPress={onClose} />
      <Panel title={plan.name}>
        <Pair label="Prix" value={currency(plan.price)} />
        <Pair label="Durée" value={`${plan.duration_in_days ?? '—'} jours`} />
        <Button
          label="Modifier l’offre commerciale"
          variant="tonal"
          onPress={() => setCommercial(!commercial)}
        />
        <Button label="Nouveau brouillon" icon="add" onPress={() => setDraft(true)} />
        {Number(plan.price) === 0 ? (
          <Button
            label="Utiliser pour les nouvelles inscriptions"
            variant="tonal"
            onPress={() => setSignup(true)}
          />
        ) : null}
      </Panel>
      <ConfirmDialog
        visible={signup}
        title="Plan des nouvelles inscriptions"
        message={`Les nouveaux comptes utiliseront ${plan.name}. Les comptes existants conservent leur abonnement.${signupAction.error ? `\n${signupAction.error.message}` : ''}`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        loading={signupAction.isPending}
        onCancel={() => {
          if (!signupAction.isPending) setSignup(false);
        }}
        onConfirm={() =>
          void signupAction
            .run({ method: 'put', path: `/access-admin/plans/${plan.id}/signup-default`, body: {} })
            .catch(() => undefined)
        }
      />
      {commercial ? (
        <ActionForm
          title="Offre commerciale"
          path={`/plans/${plan.id}`}
          method="put"
          fields={commercialFields}
          initial={{
            name: plan.name,
            description: String(plan.description ?? ''),
            price: String(plan.price),
            duration_in_days: String(plan.duration_in_days ?? ''),
            active: !!plan.active,
          }}
          onClose={() => setCommercial(false)}
        />
      ) : null}
      {draft ? (
        <ActionForm
          title="Créer un brouillon"
          path={`/access-admin/plans/${plan.id}/versions`}
          fields={[
            {
              key: 'copy_from_version_id',
              label: 'Copier une version',
              type: 'number',
              options: [
                ['', 'Brouillon vide'],
                ...(query.data ?? []).map(
                  (v) => [String(v.id), `v${v.version} · ${v.status}`] as [string, string],
                ),
              ],
            },
            { key: 'notes', label: 'Notes', type: 'multiline' },
          ]}
          onClose={() => setDraft(false)}
        />
      ) : null}
      <QueryState query={query} />
      {query.data?.map((v) => (
        <Panel key={v.id} title={`Version ${v.version}`}>
          <Tag label={v.status} />
          <Pair label="Abonnements" value={v.subscriptions_count} />
          <Button label="Consulter la version" variant="tonal" onPress={() => setSelected(v.id)} />
        </Panel>
      ))}
    </>
  );
}
export function Plans() {
  const query = usePlatformGet<SuperAdminPlan[]>('/superadmin/plans'),
    [selected, setSelected] = useState<SuperAdminPlan>(),
    [create, setCreate] = useState(false);
  return (
    <AdminScreen title="Plans & versions" scroll={!!selected || create}>
      {selected ? (
        <PlanVersions plan={selected} onClose={() => setSelected(undefined)} />
      ) : create ? (
        <ActionForm
          title="Créer une offre"
          path="/plans"
          fields={commercialFields}
          initial={{ active: true }}
          validate={(v) =>
            Number(v.price) < 0 || Number(v.duration_in_days) < 1
              ? 'Vérifiez le prix et la durée.'
              : null
          }
          onClose={() => setCreate(false)}
        />
      ) : (
        <AdminList
          data={query.data ?? []}
          header={
            <>
              <Button label="Créer une offre" icon="add" onPress={() => setCreate(true)} />
              <QueryState query={query} />
            </>
          }
          renderItem={({ item }) => (
            <Panel title={item.name}>
              <Pair label="Prix" value={currency(item.price)} />
              <Pair label="Durée" value={`${item.duration_in_days ?? '—'} jours`} />
              <Button
                label="Offre, quotas et versions"
                variant="tonal"
                onPress={() => setSelected(item)}
              />
            </Panel>
          )}
        />
      )}
    </AdminScreen>
  );
}
