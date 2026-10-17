import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STabs } from '@/features/catalogue/StockDesign';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import { useAccess } from '@/features/access/useAccess';
import { AccessWorkspaceContext } from './AccessWorkspaceContext';
import { AdminHeader, AdminScreen, Panel, Button, Note } from './AdminUI';
import { AccessCatalog } from './AccessCatalog';
import { Roles, Menus } from './PermissionEditor';
import { Accounts, Simulation, AdminAudit } from './Governance';
import { PlanMatrix } from './PlanMatrix';
const sections = [
  ['catalog', 'Modules et permissions', ['platform.permissions.manage']],
  ['plans', 'Matrice des plans', ['platform.plans.manage']],
  ['quotas', 'Définitions des quotas', ['platform.plans.manage']],
  ['roles', 'Rôles et permissions', ['platform.permissions.manage']],
  ['menus', 'Règles des menus', ['platform.menus.manage']],
  [
    'accounts',
    'Essais et dérogations',
    ['platform.overrides.manage', 'platform.subscriptions.manage'],
  ],
  ['simulation', 'Simulation des accès', ['platform.access.simulate']],
  ['audit', 'Historique administratif', ['platform.audit.view']],
] as const;
export const accessWorkspaceModules: string[] = [
  'access',
  'plan-matrix',
  ...sections.map(([key]) => key).filter((key) => key !== 'plans'),
];
export function AccessWorkspace({
  initial = 'access',
  account,
  name,
  store,
}: {
  initial?: string;
  account?: string;
  name?: string;
  store?: string;
}) {
  const access = useAccess();
  const [section, setSection] = useState(initial === 'plan-matrix' ? 'plans' : initial);
  const allowed = sections.filter(([, , permissions]) =>
    permissions.some((p) => access.data?.permissions.includes(p)),
  );
  const visible = section === 'access' || allowed.some(([key]) => key === section);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <AdminHeader title="Accès et abonnements" />
      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <STabs
          value={section}
          onChange={setSection}
          values={[
            ['access', 'Vue d’ensemble'],
            ...allowed.map(([key, title]) => [key, title] as [string, string]),
          ]}
        />
      </View>
      <AccessWorkspaceContext.Provider value>
        {!visible ? (
          <AdminScreen title="Accès refusé">
            <Note>Vous ne disposez pas des droits nécessaires.</Note>
            <Button label="Vue d’ensemble" onPress={() => setSection('access')} />
          </AdminScreen>
        ) : section === 'catalog' ? (
          <AccessCatalog />
        ) : section === 'plans' ? (
          <PlanMatrix />
        ) : section === 'quotas' ? (
          <AccessCatalog quotasOnly />
        ) : section === 'roles' ? (
          <Roles />
        ) : section === 'menus' ? (
          <Menus />
        ) : section === 'accounts' ? (
          <Accounts account={account} name={name} />
        ) : section === 'simulation' ? (
          <Simulation initialStore={store} />
        ) : section === 'audit' ? (
          <AdminAudit />
        ) : (
          <AdminScreen title="Vue d’ensemble">
            <Note>
              Gérez les modules, les conditions des plans et les droits des comptes. Les versions
              publiées restent figées ; préparez les changements dans un brouillon.
            </Note>
            <ResponsiveGrid>
              {allowed.map(([key, title]) => (
                <Panel key={key} title={title}>
                  <Button label="Ouvrir" variant="tonal" onPress={() => setSection(key)} />
                </Panel>
              ))}
            </ResponsiveGrid>
          </AdminScreen>
        )}
      </AccessWorkspaceContext.Provider>
    </SafeAreaView>
  );
}
