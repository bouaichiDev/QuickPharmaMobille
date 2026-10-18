import { useLocalSearchParams, router, type Href } from 'expo-router';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { platformModules } from './modules';
import { AdminScreen, Panel, QueryState, Button, Note } from './AdminUI';
import { Tenants, TenantDetail } from './Tenants';
import { PlatformHome, PlatformHealthScreen } from './Dashboard';
import { Billings } from './Billings';
import { AccessCatalog } from './AccessCatalog';
import { Roles, Menus } from './PermissionEditor';
import { Plans } from './Plans';
import { Accounts, Simulation, AdminAudit } from './Governance';
import { Users } from './Users';
import { Translations } from './Translations';
import { References } from './References';
import { MenuBuilder, RoleAssignments } from './MenuBuilder';
import { MedicineCatalog } from './MedicineCatalog';
import { AccessWorkspace, accessWorkspaceModules } from './AccessWorkspace';

export function PlatformScreen() {
  const params = useLocalSearchParams<{
    module: string;
    id?: string;
    account?: string;
    name?: string;
    store?: string;
  }>();
  const access = useAccess(),
    role = useSessionStore((s) => s.session?.role);
  const module = String(params.module ?? 'access');
  const spec = platformModules.find((m) => m.key === module);
  const needed =
    module === 'tenant'
      ? 'platform.tenants.manage'
      : module === 'users'
        ? 'platform.permissions.manage'
        : module === 'translations'
          ? 'platform.translations.manage'
          : spec?.permission;
  if (access.isPending)
    return (
      <AdminScreen title="Super Admin">
        <QueryState query={access} />
      </AdminScreen>
    );
  if (access.isError)
    return (
      <AdminScreen title="Super Admin">
        <QueryState query={access} />
      </AdminScreen>
    );
  if (
    role !== 'SuperAdmin' ||
    (needed &&
      !access.data?.permissions.includes(needed) &&
      !(
        module === 'accounts' && access.data?.permissions.includes('platform.subscriptions.manage')
      ))
  )
    return (
      <AdminScreen title="Accès refusé">
        <EmptyState
          icon="lock-outline"
          tone="locked"
          title="Accès non autorisé"
          message="Votre compte ne dispose pas des droits nécessaires."
        />
        <Button
          label="Retour"
          variant="tonal"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
      </AdminScreen>
    );
  if (module === 'dashboard')
    return access.data?.permissions.includes('platform.metrics.view') ? (
      <PlatformHome />
    ) : (
      <AdminScreen title="Tableau de bord">
        <Note>Accès non autorisé.</Note>
      </AdminScreen>
    );
  if (module === 'tenants') return <Tenants />;
  if (module === 'tenant' && /^\d+$/.test(params.id ?? '') && Number(params.id) > 0)
    return <TenantDetail id={Number(params.id)} />;
  if (module === 'billings') return <Billings />;
  if (module === 'health') return <PlatformHealthScreen />;
  if (accessWorkspaceModules.includes(module))
    return (
      <AccessWorkspace
        initial={module}
        account={params.account}
        name={params.name}
        store={params.store}
      />
    );
  if (module === 'catalog') return <AccessCatalog />;
  if (module === 'quotas') return <AccessCatalog quotasOnly />;
  if (module === 'roles') return <Roles />;
  if (module === 'menus') return <Menus />;
  if (module === 'plans') return <Plans />;
  if (module === 'accounts') return <Accounts account={params.account} name={params.name} />;
  if (module === 'simulation') return <Simulation initialStore={params.store} />;
  if (module === 'audit') return <AdminAudit />;
  if (module === 'users') return <Users />;
  if (module === 'translations') return <Translations />;
  if (module === 'references') return <References />;
  if (module === 'medicine-catalog') return <MedicineCatalog />;
  if (module === 'menu-builder') return <MenuBuilder />;
  if (module === 'role-assignments') return <RoleAssignments />;
  return (
    <AdminScreen title="Administration des accès">
      <Panel title="Gouvernance de la plateforme">
        <Note>Modules accessibles selon les droits de votre compte.</Note>
      </Panel>
      <ResponsiveGrid>
        {platformModules
          .filter((m) => access.data?.permissions.includes(m.permission))
          .map((m) => (
            <Panel key={m.key} title={m.title} icon={m.icon}>
              <Button
                label="Ouvrir"
                variant="tonal"
                onPress={() => router.push(`/superadmin/${m.key}` as Href)}
              />
            </Panel>
          ))}
      </ResponsiveGrid>
    </AdminScreen>
  );
}
