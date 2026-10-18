import { useContext, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { STabs } from '@/features/catalogue/StockDesign';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTranslation } from '@/i18n/useTranslation';
import { usePlatformAction, usePlatformGet } from './hooks';
import { platformApi } from './api';
import { PlatformContext } from './PlatformContext';
import { AdminScreen, AppText, Button, Choice, Note, QueryState, currency, sa } from './AdminUI';
import { VersionDetail } from './Plans';
import type { SuperAdminPlan } from './types';
import type { CatalogResponse, PlanTerms, PlanVersion } from './accessTypes';

/** One scroll surface keeps plan headings and comparison cells aligned on phones. */
export function PlanMatrix() {
  const preview = useContext(PlatformContext);
  const api = preview?.api ?? platformApi;
  const { tDynamic } = useTranslation();
  const plans = usePlatformGet<SuperAdminPlan[]>('/superadmin/plans');
  const catalog = usePlatformGet<CatalogResponse>('/access-admin/modules');
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [drafts, setDrafts] = useState<Record<number, PlanTerms>>({});
  const [section, setSection] = useState('features');
  const [manage, setManage] = useState<number>();
  const [review, setReview] = useState<PlanVersion>();
  const [limit, setLimit] = useState(40);
  const planRows = plans.data ?? [];
  const versions = useQueries({
    queries: planRows.map((p) => ({
      queryKey: [
        'platform',
        preview?.scope ?? 'authenticated',
        `/access-admin/plans/${p.id}/versions`,
        {},
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.get<PlanVersion[]>(`/access-admin/plans/${p.id}/versions`, {}, signal),
      staleTime: 120000,
      refetchOnWindowFocus: false,
    })),
  });
  const chosen = planRows.map(
    (p, i) =>
      versions[i]?.data?.find((v) => v.id === selection[p.id]) ??
      [...(versions[i]?.data ?? [])].sort((a, b) => b.version - a.version)[0],
  );
  const details = useQueries({
    queries: chosen.map((v) => ({
      queryKey: [
        'platform',
        preview?.scope ?? 'authenticated',
        `/access-admin/plan-versions/${v?.id}`,
        {},
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.get<PlanVersion>(`/access-admin/plan-versions/${v!.id}`, {}, signal),
      enabled: !!v,
      staleTime: 120000,
      refetchOnWindowFocus: false,
    })),
  });
  const action = usePlatformAction(() => {
    if (review)
      setDrafts((current) => {
        const next = { ...current };
        delete next[review.id];
        return next;
      });
    setReview(undefined);
  });
  const rows =
    section === 'features'
      ? (catalog.data?.modules ?? []).flatMap((m) =>
          m.features.map((f) => ({
            key: f.key,
            label: tDynamic(f.label_key, f.key),
            group: tDynamic(m.label_key, m.key),
          })),
        )
      : section === 'quotas'
        ? (catalog.data?.quotas ?? []).map((q) => ({
            key: q.key,
            label: tDynamic(q.label_key, q.key),
            group: q.scope === 'store' ? 'Magasin' : 'Compte',
          }))
        : [...new Set(details.flatMap((q) => Object.keys(q.data?.terms?.trials ?? {})))].map(
            (key) => ({ key, label: key, group: 'Essais' }),
          );
  if (manage)
    return (
      <AdminScreen title="Version du plan">
        <VersionDetail id={manage} onClose={() => setManage(undefined)} />
      </AdminScreen>
    );
  return (
    <AdminScreen title="Matrice des plans">
      <AppText variant="headlineSm">Matrice des plans</AppText>
      <Note>
        Comparez les versions des plans. Modifiez un brouillon puis enregistrez. Les versions
        publiées restent figées ; les abonnements existants conservent leur version.
      </Note>
      <QueryState query={plans} />
      <QueryState query={catalog} />
      <STabs
        value={section}
        onChange={(key) => {
          setSection(key);
          setLimit(40);
        }}
        values={[
          ['features', 'Fonctionnalités'],
          ['quotas', 'Quotas'],
          ['trials', 'Essais'],
        ]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ gap: 8 }}>
          <View style={[sa.row, { alignItems: 'stretch' }]}>
            <View style={{ width: 180, justifyContent: 'flex-end', padding: 12 }}>
              <AppText variant="labelLg">
                {section === 'features'
                  ? 'Fonctionnalité'
                  : section === 'quotas'
                    ? 'Quota'
                    : 'Essai'}
              </AppText>
            </View>
            {planRows.map((p, i) => {
              const v = details[i]?.data;
              return (
                <View key={p.id} style={[sa.card, { width: 220 }]}>
                  <AppText variant="labelLg">{p.name}</AppText>
                  <AppText variant="bodySm">
                    {currency(p.price)} · {p.duration_in_days ?? '—'} jours
                  </AppText>
                  <Choice
                    label="Version"
                    value={String(chosen[i]?.id ?? '')}
                    options={(versions[i]?.data ?? []).map((item) => [
                      String(item.id),
                      `v${item.version} · ${item.status === 'draft' ? 'Brouillon' : item.status === 'published' ? 'Publiée' : 'Archivée'}`,
                    ])}
                    onChange={(key) => setSelection((s) => ({ ...s, [p.id]: Number(key) }))}
                  />
                  <QueryState query={versions[i]!} />
                  {chosen[i] ? (
                    <QueryState query={details[i]!} />
                  ) : (
                    <Note>Aucune version configurée.</Note>
                  )}
                  {v ? (
                    <>
                      <AppText variant="bodySm">{v.subscriptions_count} abonnements</AppText>
                      <Button
                        label="Gérer la version"
                        variant="tonal"
                        disabled={!!drafts[v.id] || action.isPending}
                        onPress={() => setManage(v.id)}
                      />
                      {drafts[v.id] ? (
                        <>
                          <Button
                            label="Enregistrer le brouillon"
                            onPress={() => setReview(v)}
                            disabled={action.isPending}
                          />
                          <Button
                            label="Annuler les modifications"
                            variant="ghost"
                            disabled={action.isPending}
                            onPress={() =>
                              setDrafts((s) => {
                                const next = { ...s };
                                delete next[v.id];
                                return next;
                              })
                            }
                          />
                        </>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
          {rows.slice(0, limit).map((row) => (
            <View
              key={row.key}
              style={[
                sa.row,
                {
                  alignItems: 'stretch',
                  backgroundColor: '#fff',
                  minHeight: 70,
                  borderBottomWidth: 1,
                  borderColor: '#edf0f8',
                },
              ]}
            >
              <View style={{ width: 180, padding: 12, gap: 4 }}>
                <AppText variant="labelSm" color="secondary">
                  {row.group}
                </AppText>
                <AppText variant="labelMd">{row.label}</AppText>
                <AppText variant="bodySm" color="outline">
                  {row.key}
                </AppText>
              </View>
              {planRows.map((p, i) => {
                const v = details[i]?.data,
                  terms = v ? (drafts[v.id] ?? v.terms) : undefined;
                return (
                  <View key={p.id} style={{ width: 220, padding: 12, justifyContent: 'center' }}>
                    {!terms ? (
                      <AppText>—</AppText>
                    ) : section === 'features' ? (
                      v?.status === 'draft' ? (
                        <Checkbox
                          label={`${p.name} · ${row.label}`}
                          checked={terms.features.includes(row.key)}
                          onChange={(checked) => {
                            if (action.isPending) return;
                            setDrafts((s) => ({
                              ...s,
                              [v.id]: {
                                ...terms,
                                features: checked
                                  ? [...new Set([...terms.features, row.key])]
                                  : terms.features.filter((key) => key !== row.key),
                              },
                            }));
                          }}
                        />
                      ) : (
                        <AppText
                          accessibilityLabel={`${p.name} · ${row.label} : ${terms.features.includes(row.key) ? 'Inclus' : 'Non inclus'}`}
                        >
                          {terms.features.includes(row.key) ? '✓ Inclus' : '— Non inclus'}
                        </AppText>
                      )
                    ) : section === 'quotas' ? (
                      <AppText>
                        {terms.quotas[row.key] === 'unlimited'
                          ? 'Illimité'
                          : terms.quotas[row.key] == null
                            ? 'Non configuré'
                            : String(terms.quotas[row.key])}
                      </AppText>
                    ) : (
                      <AppText>
                        {terms.trials[row.key]
                          ? `${terms.trials[row.key]?.days} jours · ${terms.trials[row.key]?.active === false ? 'Inactif' : 'Actif'}`
                          : 'Non configuré'}
                      </AppText>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      {rows.length > limit ? (
        <Button
          label="Afficher davantage"
          variant="tonal"
          onPress={() => setLimit((n) => n + 40)}
        />
      ) : null}
      <Note>
        Pour modifier les quotas et essais, créer un brouillon, publier ou examiner l’impact : «
        Gérer la version » dans la colonne du plan.
      </Note>
      {action.isError ? <Note>{action.error.message}</Note> : null}
      <ConfirmDialog
        visible={!!review}
        title="Enregistrer le brouillon"
        message={`Confirmer les fonctionnalités de la version ${review?.version ?? ''} ? Les quotas et essais seront conservés.${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Enregistrer"
        cancelLabel="Revoir"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setReview(undefined);
        }}
        onConfirm={() => {
          if (review)
            void action
              .run({
                method: 'put',
                path: `/access-admin/plan-versions/${review.id}`,
                body: {
                  ...drafts[review.id],
                  notes: review.notes,
                  lock_version: review.lock_version,
                },
              })
              .catch(() => undefined);
        }}
      />
    </AdminScreen>
  );
}
