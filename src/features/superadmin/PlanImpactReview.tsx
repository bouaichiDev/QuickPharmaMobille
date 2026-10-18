import { useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button, Note, Pair, Panel, TextField } from './AdminUI';
import { usePlatformAction, usePlatformPermission } from './hooks';
import type { PlanImpact } from './accessTypes';

export function PlanImpactReview({
  impact,
  versionId,
  published,
}: {
  impact: PlanImpact;
  versionId: number;
  published: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState(false);
  const [limit, setLimit] = useState(20);
  const canMigrate = usePlatformPermission('platform.subscriptions.manage');
  const action = usePlatformAction(() => {
    setReview(false);
    setSelected([]);
    setReason('');
  });
  return (
    <>
      {impact.rows.slice(0, limit).map((row) => (
        <Panel key={row.subscription_id} title={`Compte ${row.account_id}`}>
          <Pair label="Abonnement" value={row.subscription_id} />
          <Pair
            label="Fonctionnalités ajoutées"
            value={row.features_gained.join(', ') || 'Aucune'}
          />
          <Pair label="Fonctionnalités retirées" value={row.features_lost.join(', ') || 'Aucune'} />
          {row.quotas_exceeded.map((q) => (
            <Pair
              key={`${q.quota}-${q.store_id}`}
              label={q.quota}
              value={`${q.used} / ${q.limit}`}
            />
          ))}
          {published && canMigrate && row.current_plan_version_id !== versionId ? (
            <Checkbox
              label="Sélectionner pour la migration"
              checked={selected.includes(row.subscription_id)}
              onChange={(checked) =>
                setSelected((items) =>
                  checked
                    ? [...items, row.subscription_id]
                    : items.filter((id) => id !== row.subscription_id),
                )
              }
            />
          ) : null}
          {row.current_plan_version_id === versionId ? <Note>Déjà sur cette version.</Note> : null}
        </Panel>
      ))}
      {impact.rows.length > limit ? (
        <Button
          label="Afficher davantage d’abonnements"
          variant="tonal"
          onPress={() => setLimit((n) => n + 20)}
        />
      ) : null}
      {published && canMigrate ? (
        <>
          <TextField
            label="Motif de la migration"
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
          />
          <Button
            label={`Migrer la sélection (${selected.length})`}
            disabled={!selected.length || reason.trim().length < 5 || action.isPending}
            onPress={() => setReview(true)}
          />
          {action.isError ? <Note>{action.error.message}</Note> : null}
          <ConfirmDialog
            visible={review}
            title="Migrer les abonnements"
            message={`${selected.length} abonnement(s) passeront sur cette version. Les fonctionnalités et quotas peuvent changer immédiatement. Motif : ${reason}${action.error ? `\n${action.error.message}` : ''}`}
            confirmLabel="Confirmer la migration"
            cancelLabel="Revoir"
            loading={action.isPending}
            onCancel={() => {
              if (!action.isPending) setReview(false);
            }}
            onConfirm={() =>
              void action
                .run({
                  path: `/access-admin/plan-versions/${versionId}/migrate`,
                  body: { subscription_ids: selected, reason: reason.trim() },
                })
                .catch(() => undefined)
            }
          />
        </>
      ) : null}
    </>
  );
}
