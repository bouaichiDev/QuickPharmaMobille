import { useState } from 'react';
import { router, type Href } from 'expo-router';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePlatformAction, usePlatformGet, usePlatformPermission } from './hooks';
import {
  Panel,
  Note,
  Pair,
  TextField,
  Button,
  QueryState,
  Choice,
  DateInput,
  currency,
  date,
} from './AdminUI';
import type { TenantDetail, SuperAdminPlan, ImpersonationTicket } from './types';
import { useSessionStore } from '@/features/auth/sessionStore';
import { platformApi } from './api';
import { useMutation } from '@tanstack/react-query';

function SupportAction({ tenant }: { tenant: TenantDetail }) {
  const [confirm, setConfirm] = useState(false);
  const enter = useSessionStore((s) => s.enterSupport);
  const action = useMutation({
    mutationFn: async () => {
      const ticket = await platformApi.write<ImpersonationTicket>(
        'post',
        `/superadmin/tenants/${tenant.store_id}/impersonate`,
      );
      if (!ticket.store_id || !ticket.support_access?.expires_at)
        throw new Error('Le serveur n’a pas fourni d’accès assistance temporaire.');
      await enter(
        { id: ticket.store_id, name: ticket.store_name },
        {
          tenantId: tenant.store_id,
          storeName: ticket.store_name,
          expiresAt: ticket.support_access.expires_at,
        },
      );
      router.replace('/home');
    },
    retry: false,
  });
  return (
    <Panel title="Assistance temporaire">
      <Note>
        Vous restez connecté avec votre identité Super Admin. Le serveur accorde un accès limité
        dans le temps et journalise cette opération.
      </Note>
      <Button
        label="Prendre la main en assistance"
        icon="support-agent"
        loading={action.isPending}
        onPress={() => setConfirm(true)}
      />
      <ConfirmDialog
        visible={confirm}
        title="Ouvrir l’assistance"
        message={`${tenant.name}${action.error ? `\n${action.error.message}` : ''}`}
        confirmLabel="Ouvrir"
        cancelLabel="Annuler"
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setConfirm(false);
        }}
        onConfirm={() => {
          if (!action.isPending) action.mutate();
        }}
      />
    </Panel>
  );
}
export function TenantActions({ tenant: t }: { tenant: TenantDetail }) {
  const [reason, setReason] = useState(''),
    [plan, setPlan] = useState(''),
    [days, setDays] = useState(''),
    [end, setEnd] = useState(''),
    [confirm, setConfirm] = useState<'suspend' | 'restore' | 'activate' | 'cancel' | null>(null);
  const canSubscribe = usePlatformPermission('platform.subscriptions.manage'),
    canManage = usePlatformPermission('platform.tenants.manage'),
    canPlans = usePlatformPermission('platform.plans.manage'),
    canMetrics = usePlatformPermission('platform.metrics.view');
  const canOverrides = usePlatformPermission('platform.overrides.manage'),
    canSimulate = usePlatformPermission('platform.access.simulate');
  const canSupport = usePlatformPermission('platform.tenants.support_access');
  const plans = usePlatformGet<SuperAdminPlan[]>(
    '/superadmin/plans',
    {},
    canSubscribe && (canPlans || canMetrics),
  );
  const action = usePlatformAction(() => setConfirm(null)),
    base = `/superadmin/tenants/${t.store_id}`;
  const current = plans.data?.find((p) => String(p.id) === plan);
  const submit = async () => {
    if (!confirm) return;
    const path =
      confirm === 'activate'
        ? `${base}/subscription/activate`
        : confirm === 'cancel'
          ? `${base}/subscription/cancel`
          : `${base}/${confirm}`;
    try {
      await action.run({
        path,
        body:
          confirm === 'suspend'
            ? { reason: reason.trim() }
            : confirm === 'activate'
              ? {
                  plan_id: Number(plan),
                  ...(end ? { end_date: end } : days ? { duration_in_days: Number(days) } : {}),
                }
              : {},
      });
    } catch {
      /* The mutation error remains visible; keep the form. */
    }
  };
  return (
    <>
      <Panel title="Gestion du magasin">
        {t.state.suspended ? (
          <Note>
            Suspendu depuis le {date(t.state.suspended_at)}. {t.state.suspension_reason}
          </Note>
        ) : null}
        {canManage ? (
          t.state.suspended ? (
            <Button label="Réactiver le magasin" onPress={() => setConfirm('restore')} />
          ) : (
            <>
              <TextField
                label="Motif de suspension"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <Button
                label="Suspendre le magasin"
                variant="dangerSoft"
                disabled={!reason.trim() || action.isPending}
                onPress={() => setConfirm('suspend')}
              />
            </>
          )
        ) : null}
        {t.owner && canOverrides ? (
          <Button
            label="Essais et exceptions du compte"
            variant="tonal"
            onPress={() =>
              router.push(
                `/superadmin/accounts?account=${t.owner!.id}&name=${encodeURIComponent(t.owner!.name)}` as Href,
              )
            }
          />
        ) : null}
        {canSimulate ? (
          <Button
            label="Simuler les droits"
            variant="tonal"
            onPress={() => router.push(`/superadmin/simulation?store=${t.store_id}` as Href)}
          />
        ) : null}
      </Panel>
      {canSupport ? <SupportAction tenant={t} /> : null}
      {canSubscribe ? (
        <Panel title="Abonnement">
          <Pair label="Plan actuel" value={t.subscription?.plan_name ?? 'Sans abonnement actif'} />
          <Pair label="Expiration" value={date(t.subscription?.end_date)} />
          <QueryState query={plans} />
          <Choice
            label="Plan à activer"
            value={plan}
            options={(plans.data ?? []).map((p) => [
              String(p.id),
              `${p.name} · ${currency(p.price)}`,
            ])}
            onChange={setPlan}
          />
          <TextField
            label="Durée en jours (facultative)"
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            editable={!end}
          />
          <DateInput label="Date de fin (prioritaire sur la durée)" value={end} onChange={setEnd} />
          <Button
            label="Activer / prolonger"
            disabled={
              !current ||
              (!!days && !end && (!/^\d+$/.test(days) || Number(days) < 1)) ||
              action.isPending
            }
            onPress={() => setConfirm('activate')}
          />
          {t.subscription ? (
            <Button
              label="Annuler l’abonnement"
              variant="dangerSoft"
              disabled={action.isPending}
              onPress={() => setConfirm('cancel')}
            />
          ) : null}
        </Panel>
      ) : null}
      {action.isError ? <Note>{action.error.message}</Note> : null}
      <ConfirmDialog
        visible={!!confirm}
        title={
          confirm === 'activate'
            ? 'Activer l’abonnement'
            : confirm === 'cancel'
              ? 'Annuler l’abonnement'
              : confirm === 'restore'
                ? 'Réactiver le magasin'
                : 'Suspendre le magasin'
        }
        message={`${t.name}${confirm === 'activate' ? ` · ${current?.name ?? ''} · ${end ? `jusqu’au ${date(end)}` : days ? `${days} jours` : 'durée du plan'}` : confirm === 'suspend' ? ` · ${reason}` : ''}`}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
        destructive={confirm === 'suspend' || confirm === 'cancel'}
        loading={action.isPending}
        onCancel={() => {
          if (!action.isPending) setConfirm(null);
        }}
        onConfirm={() => void submit()}
      />
    </>
  );
}
