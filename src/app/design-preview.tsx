import { ClientServiceCard } from '@/features/crm/components/ClientServiceCard';
import { DraftSessionPhotos, type DraftPhoto } from '@/features/crm/components/DraftSessionPhotos';
import { ClientDocumentView } from '@/features/crm/components/ClientDocumentView';
import { CrmDetailContent } from '@/features/crm/components/CrmDetailContent';
import { PageLayersProvider } from '@/features/navigation/PageLayers';
import { AppBottomNavigation } from '@/features/navigation/AppBottomNavigation';
/** Development-only gallery: isolated fictitious data, no authentication or business writes. */
import { useRef, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TextInput, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import {
  CrmFilter as Chip,
  CrmShellHeader,
  CrmListHeading,
  CrmSearch,
  CrmFormHeading,
} from '@/features/crm/components/StitchChrome';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CrmRecordCard } from '@/features/crm/components/CrmRecordCard';
import { CrmFormFields } from '@/features/crm/components/CrmFormFields';
import { CrmPage, CrmSection, crmStyles } from '@/features/crm/components/CrmDesign';
import { ClientProfileCard, ClientOverview } from '@/features/crm/components/ClientDossier';
import { CrmDashboardView } from '@/features/dashboard/components/CrmDashboard';
import { CrmScanner } from '@/features/crm/components/CrmScanner';
import { CrmCalendar } from '@/features/crm/components/CrmCalendar';
import { ServicesMenuContent } from '@/features/navigation/ServicesMenuSheet';
import { crmModules } from '@/features/crm/modules';
import { moduleFields } from '@/features/crm/fields';
import { colors } from '@/theme';
import type { CrmDashboard } from '@/features/dashboard/types';
const client = {
  id: 2,
  FirstName: 'Sofia',
  LastName: 'El Amrani',
  Phone: '+212 6 61 23 45 67',
  Email: 'sofia@example.com',
  Cin: 'BE89210',
  Active: 1,
  date_of_birth: '1994-05-14',
  medical_conditions: ['Allergie cutanée'],
};
const visit = {
  uid: 'demo-session',
  customer: { id: 2, name: 'Sofia El Amrani' },
  service: { uid: 'demo-service', name: 'Soin du visage hydratant' },
  employee: { name: 'Nadia Benali' },
  status: { code: 'completed', label: 'Terminée' },
  session_date: '2025-03-28 14:30',
  prescription: [{ name: 'Crème hydratante', dosage: 'Application locale' }],
  location: 'Cabine 1',
  duration_minutes: 45,
  price: 450,
  amount_paid: 450,
  due: 0,
  customer_service_package: {
    name: 'Programme bien-être',
    sessions_total: 6,
    remaining_sessions: 2,
  },
};
const dashboard: CrmDashboard = {
  period: { from: '2026-10-01', to: '2026-10-31' },
  revenue: 14850,
  sessions_count: 128,
  customers_count: 94,
  unpaid_total: 1420,
  pending_payments_count: 5,
  appointments_today: 11,
  popular_services: [
    { name: 'Soin du visage', count: 45 },
    { name: 'Massage relaxant', count: 30 },
  ],
  revenue_trend: 18.4,
  appointments_trend: null,
  active_clients_trend: null,
  revenue_series: [],
};
export default function DesignPreview() {
  const params = useLocalSearchParams<{ view?: string; tools?: string }>();
  const [query] = useState(() => {
    const cache = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
    cache.setQueryData(['settings', 'general'], { Currency: 'DH' });
    return cache;
  });
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <QueryClientProvider client={query}>
      <Gallery
        key={params.view ?? 'clients'}
        initial={params.view ?? 'clients'}
        tools={params.tools === '1'}
      />
    </QueryClientProvider>
  );
}
function Gallery({ initial, tools = false }: { initial: string; tools?: boolean }) {
  const inputRef = useRef<TextInput>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [view, setView] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(initial === 'appointments' ? '2025-03-28' : '');
  const [filter, setFilter] = useState('');
  const [previewPeriod, setPreviewPeriod] = useState('month');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [values, setValues] = useState<Record<string, string>>({
    FirstName: initial === 'edit-client' ? client.FirstName : '',
    LastName: initial === 'edit-client' ? client.LastName : '',
    Email: initial === 'edit-client' ? client.Email : '',
    Phone: initial === 'edit-client' ? client.Phone : '',
    Cin: initial === 'edit-client' ? client.Cin : '',
    name: initial === 'edit-service' ? 'Soin du visage hydratant' : '',
    Active: '1',
    color: '#1cb5a9',
    recommended_sessions: '6',
    default_price: '450',
    duration_minutes: '45',
    active: '1',
  });
  const [message, setMessage] = useState('');
  const formModule = ['new-client', 'edit-client'].includes(view)
    ? 'clients'
    : ['new-service', 'edit-service'].includes(view)
      ? 'services'
      : view === 'new-session'
        ? 'sessions'
        : '';
  const historyModule =
    view.replace('client-', '') === 'audit' ? 'timeline' : view.replace('client-', '');
  const module =
    crmModules.find((entry) => entry.key === (formModule || historyModule)) ??
    crmModules.find((entry) => entry.key === 'clients')!;
  const serviceFixture = {
    ...visit.service,
    description: 'Soin du visage et protocole hydratant.',
    default_price: 450,
    duration_minutes: 45,
    recommended_sessions: 6,
    active: 1,
    color: '#1cb5a9',
  };
  const packageFixture = {
    uid: 'demo-package',
    customer: client,
    service: serviceFixture,
    service_package: { name: 'Programme bien-être' },
    sessions_total: 6,
    sessions_used: 2,
    price_paid: 2400,
    amount_paid: 1200,
    due: 1200,
  };
  const items = crmModules.map((module) => ({
    label: module.label,
    icon: module.icon,
    href: `/crm/${module.key}`,
  }));
  return (
    <PageLayersProvider
      footer={
        <AppBottomNavigation
          preview
          activePath="/crm/dashboard"
          onMore={() => setMenuOpen(true)}
          onNavigate={(path) =>
            setView(path.startsWith('/crm') || path === '/home' ? 'dashboard' : path.slice(1))
          }
        />
      }
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <CrmShellHeader
          name="Centre de Soins & Officine"
          onSearch={() => inputRef.current?.focus()}
          onScan={() => setScanOpen(true)}
        />
        {tools ? (
          <ScrollView
            horizontal
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 6, padding: 8 }}
          >
            {[
              'clients',
              'services',
              'sessions',
              'dashboard',
              'profile',
              'new-client',
              'edit-client',
              'new-service',
              'edit-service',
              'new-session',
              'client-sessions',
              'client-services',
              'client-appointments',
              'client-packages',
              'client-payments',
              'client-audit',
              'print',
              'detail-session',
              'detail-service',
              'detail-package',
              'detail-catalog-package',
              'menu',
              'appointments',
            ].map((key) => (
              <Chip
                key={key}
                label={key}
                selected={view === key}
                onPress={() => {
                  setView(key);
                  setMessage('');
                }}
              />
            ))}
          </ScrollView>
        ) : null}
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            maxWidth: 560,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          {view === 'dashboard' ? (
            <>
              <View style={crmStyles.row}>
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="labelSm" color="secondary" style={{ fontSize: 10 }}>
                    PRATIQUE OFFICINALE & CABINE
                  </AppText>
                  <AppText variant="headlineMd">Tableau de Bord CRM</AppText>
                </View>
              </View>
              <View style={crmStyles.row}>
                {[
                  ['month', 'Ce mois (Mars 2025)'],
                  ['week', 'Semaine'],
                  ['custom', 'Personnalisé'],
                ].map(([key, label]) => (
                  <Chip
                    key={key}
                    label={label!}
                    selected={previewPeriod === key}
                    onPress={() => setPreviewPeriod(key!)}
                  />
                ))}
              </View>
              <CrmDashboardView
                data={dashboard}
                showMoney
                previewGoal={18000}
                shortcuts={['sessions', 'appointments', 'clients', 'packages']}
                appointments={[{ ...visit, uid: 'demo-rdv', starts_at: '2026-10-08 14:00' }]}
                activities={[
                  {
                    action: 'crm_created_ServiceSession',
                    details: 'Séance ajoutée au dossier client.',
                    created_at: '2026-10-08 14:30:00',
                  },
                ]}
                onOpen={(key, create) =>
                  setView(
                    create
                      ? key === 'clients'
                        ? 'new-client'
                        : key === 'sessions'
                          ? 'new-session'
                          : 'new-service'
                      : key,
                  )
                }
              />
            </>
          ) : view.startsWith('client-') ? (
            <>
              <ClientProfileCard
                compact
                customer={client}
                onEdit={() => setView('edit-client')}
                onPrint={() => setView('print')}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {[
                  'profile',
                  'client-sessions',
                  'client-services',
                  'client-appointments',
                  'client-packages',
                  'client-payments',
                  'client-audit',
                ].map((key) => (
                  <Chip
                    key={key}
                    label={
                      key === 'profile'
                        ? 'Vue d’ensemble'
                        : (crmModules.find((entry) => entry.key === key.replace('client-', ''))
                            ?.label ?? 'Journal d’audit')
                    }
                    selected={key === view}
                    onPress={() => setView(key)}
                  />
                ))}
              </ScrollView>
              {historyModule === 'appointments' ? (
                <CrmCalendar value={date} onChange={setDate} />
              ) : null}
              {historyModule === 'payments' ? (
                <View style={crmStyles.card}>
                  <AppText variant="labelSm" color="outline">
                    TOTAL ENCAISSÉ
                  </AppText>
                  <AppText variant="headlineLg" color="primary">
                    4 200 DH
                  </AppText>
                </View>
              ) : null}
              {historyModule === 'services' ? (
                <ClientServiceCard
                  row={{ service: serviceFixture, sessions_count: 1 }}
                  showMoney
                  onPrint={() => setView('print')}
                >
                  <AppText variant="bodySm" color="outline">
                    Galerie avant / après · Aucune photo de démonstration
                  </AppText>
                </ClientServiceCard>
              ) : (
                <>
                  <CrmRecordCard
                    module={module}
                    showMoney
                    row={
                      historyModule === 'packages'
                        ? packageFixture
                        : historyModule === 'services'
                          ? serviceFixture
                          : historyModule === 'payments'
                            ? {
                                uid: 'demo-payment',
                                payingAmount: 450,
                                receivedAmount: 450,
                                ref: 'REG-0042',
                                status: 'paid',
                              }
                            : historyModule === 'timeline'
                              ? {
                                  uid: 'demo-audit',
                                  action: 'crm_created_ServiceSession',
                                  auditable_type: 'App\\Models\\ServiceSession',
                                  user: { name: 'Nadia Benali' },
                                  details: 'Séance ajoutée au dossier client.',
                                  created_at: '2026-10-08 14:30:00',
                                }
                              : visit
                    }
                    onPress={() =>
                      setView(
                        historyModule === 'packages'
                          ? 'detail-package'
                          : historyModule === 'services'
                            ? 'detail-service'
                            : 'detail-session',
                      )
                    }
                  />
                </>
              )}
            </>
          ) : view === 'profile' ? (
            <>
              <ClientProfileCard
                customer={client}
                onEdit={() => setView('edit-client')}
                onPrint={() => setView('print')}
              />
              <ClientOverview
                profile={{
                  stats: { sessions: 6, total_spent: 4200 },
                  recent_sessions: [visit],
                  active_packages: [],
                }}
                showMoney
                showHistory
                showPackages
                onTab={(key) => setView(`client-${key}`)}
              />
            </>
          ) : !formModule && !view.startsWith('detail-') && !['menu', 'print'].includes(view) ? (
            <>
              <CrmListHeading
                title={
                  view === 'clients'
                    ? 'Clients & Dossiers'
                    : view === 'services'
                      ? 'Catalogue des services'
                      : view === 'appointments'
                        ? 'Rendez-vous & Planning'
                        : 'Séances de soins'
                }
                subtitle={
                  view === 'sessions'
                    ? 'Cabinet & officine esthétique intégrée'
                    : view === 'appointments'
                      ? '8 consultations prévues aujourd’hui'
                      : 'Dossiers patients et prestations'
                }
                count={view === 'sessions' ? '128 ce mois' : undefined}
                action={
                  view === 'clients'
                    ? 'Nouveau client'
                    : view === 'services'
                      ? 'Nouveau service'
                      : view === 'appointments'
                        ? 'Nouveau RDV'
                        : 'Nouvelle séance'
                }
                onCreate={() =>
                  setView(
                    view === 'clients'
                      ? 'new-client'
                      : view === 'sessions'
                        ? 'new-session'
                        : 'new-service',
                  )
                }
              />
              {view !== 'appointments' ? (
                <CrmSearch
                  inputRef={inputRef}
                  value={search}
                  onChange={setSearch}
                  onScan={() => setScanOpen(true)}
                />
              ) : null}
              {view === 'appointments' ? (
                <>
                  <View style={[crmStyles.card, { padding: 10 }]}>
                    <AppText variant="labelMd" color="primary">
                      Tous les praticiens & cabines
                    </AppText>
                  </View>
                  <CrmCalendar
                    value={date}
                    onChange={setDate}
                    markers={{
                      '2025-03-24': 2,
                      '2025-03-25': 1,
                      '2025-03-26': 2,
                      '2025-03-27': 2,
                      '2025-03-28': 3,
                      '2025-03-29': 1,
                    }}
                  />
                </>
              ) : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {(view === 'sessions'
                  ? [
                      ['', 'Toutes', 128],
                      ['in_progress', 'En cours', 2],
                      ['completed', 'Terminées', 118],
                      ['planned', 'Planifiées', 8],
                    ]
                  : view === 'appointments'
                    ? [
                        ['', 'Tous', 8],
                        ['confirmed', 'Confirmés', 5],
                        ['pending', 'En attente', 2],
                        ['cancelled', 'Annulés', 1],
                      ]
                    : [
                        ['', 'Tous', undefined],
                        ['active', 'Actifs', undefined],
                        ['inactive', 'Inactifs', undefined],
                      ]
                ).map(([key, label, count]) => (
                  <Chip
                    key={String(key)}
                    label={String(label)}
                    count={count === undefined ? undefined : Number(count)}
                    selected={filter === key}
                    onPress={() => setFilter(String(key))}
                  />
                ))}
              </ScrollView>
              <CrmRecordCard
                module={module}
                row={
                  view === 'clients'
                    ? client
                    : view === 'services'
                      ? {
                          uid: 'service',
                          name: 'Soin du visage hydratant',
                          description: 'Protocole régénérant et hydratation profonde.',
                          default_price: 450,
                          duration_minutes: 45,
                          recommended_sessions: 6,
                          active: 1,
                          color: '#1cb5a9',
                        }
                      : view === 'appointments'
                        ? {
                            ...visit,
                            starts_at: '2025-03-28 09:30',
                            ends_at: '2025-03-28 10:15',
                            status: { code: 'confirmed', label: 'Confirmé' },
                          }
                        : visit
                }
                showMoney
                onEdit={() =>
                  setView(
                    view === 'services'
                      ? 'edit-service'
                      : view === 'clients'
                        ? 'edit-client'
                        : 'new-session',
                  )
                }
                onConvert={view === 'appointments' ? () => setView('new-session') : undefined}
                onPress={() =>
                  setView(
                    view === 'sessions'
                      ? 'detail-session'
                      : view === 'appointments'
                        ? 'detail-session'
                        : 'profile',
                  )
                }
              />
            </>
          ) : null}
          {message ? <AppText color="secondary">{message}</AppText> : null}
        </ScrollView>
        {formModule ? (
          <CrmPage
            visible
            title={
              view === 'new-client'
                ? 'Nouveau client'
                : view === 'edit-client'
                  ? 'Modifier le client'
                  : view === 'new-service'
                    ? 'Nouveau service'
                    : view === 'edit-service'
                      ? 'Modifier le service'
                      : 'Nouvelle séance'
            }
            onClose={() => setView('clients')}
            footer={
              <>
                <Button
                  label="Annuler"
                  variant="tonal"
                  style={crmStyles.grow}
                  onPress={() => setView('clients')}
                />
                <Button
                  label="Enregistrer"
                  style={crmStyles.grow}
                  onPress={() => {
                    setMessage('Aperçu enregistré localement.');
                    setView('clients');
                  }}
                />
              </>
            }
          >
            <CrmFormHeading
              title={
                view === 'new-client'
                  ? 'Nouveau client'
                  : view === 'edit-client'
                    ? 'Modifier le client'
                    : view === 'new-service'
                      ? 'Nouveau service'
                      : view === 'edit-service'
                        ? 'Modifier le service'
                        : 'Nouvelle séance'
              }
              moduleKey={formModule}
              editing={view.startsWith('edit-')}
            />
            <CrmFormFields
              moduleKey={module.key}
              fields={moduleFields[module.key]!}
              values={values}
              onChange={(key, value) => setValues((old) => ({ ...old, [key]: value }))}
            />
            {formModule === 'sessions' ? (
              <>
                <CrmSection title="6. Prescription" icon="receipt-long">
                  <AppText>Aucune prescription ajoutée.</AppText>
                </CrmSection>
                <CrmSection title="7. Photos avant / après" icon="photo-camera">
                  <DraftSessionPhotos value={photos} onChange={setPhotos} />
                </CrmSection>
              </>
            ) : null}
          </CrmPage>
        ) : null}
        {view === 'print' ? (
          <CrmPage
            visible
            title="Aperçu du dossier à imprimer"
            onClose={() => setView('profile')}
            footer={
              <Button
                label="Fermer"
                variant="tonal"
                onPress={() => setView('profile')}
                style={crmStyles.grow}
              />
            }
          >
            <ClientDocumentView customer={client} sessions={[visit]} />
          </CrmPage>
        ) : null}
        {view.startsWith('detail-') ? (
          <CrmPage
            visible
            title="Fiche détaillée"
            onClose={() => setView('clients')}
            footer={
              <Button
                label="Modifier"
                icon="edit"
                style={crmStyles.grow}
                onPress={() => setView(view === 'detail-service' ? 'edit-service' : 'new-session')}
              />
            }
          >
            <CrmDetailContent
              moduleKey={
                view === 'detail-service'
                  ? 'services'
                  : view === 'detail-package'
                    ? 'packages'
                    : view === 'detail-catalog-package'
                      ? 'service-packages'
                      : 'sessions'
              }
              row={
                view === 'detail-service'
                  ? serviceFixture
                  : view === 'detail-package'
                    ? packageFixture
                    : view === 'detail-catalog-package'
                      ? {
                          name: 'Programme bien-être',
                          price: 2400,
                          sessions_count: 6,
                          description: 'Programme de soins',
                          items: [{ service: serviceFixture, sessions_count: 6 }],
                        }
                      : visit
              }
              showMoney
            />
          </CrmPage>
        ) : null}
        {scanOpen ? (
          <CrmScanner visible onClose={() => setScanOpen(false)} onRead={setSearch} />
        ) : null}
        {view === 'menu' || menuOpen ? (
          <BottomSheet
            visible
            tall
            title="Modules & Services CRM"
            subtitle="Aperçu de développement"
            onClose={() => {
              setMenuOpen(false);
              if (view === 'menu') setView('clients');
            }}
          >
            <ServicesMenuContent
              groups={[
                {
                  title: 'Activité & Soins',
                  items: items.filter((item) =>
                    ['dashboard', 'clients', 'sessions', 'appointments'].some((key) =>
                      item.href.endsWith(key),
                    ),
                  ),
                },
                {
                  title: 'Forfaits & Offres',
                  items: items.filter((item) =>
                    ['services', 'service-packages', 'packages'].some(
                      (key) => item.href === `/crm/${key}`,
                    ),
                  ),
                },
                {
                  title: 'Finance & Suivi',
                  items: items.filter((item) =>
                    ['payments', 'reports', 'timeline'].some((key) => item.href.endsWith(key)),
                  ),
                },
                {
                  title: 'Configuration & Outils',
                  items: items.filter((item) =>
                    ['form-builder', 'care-catalogs'].some((key) => item.href.endsWith(key)),
                  ),
                },
              ]}
              search={search}
              onSearch={setSearch}
              onOpen={(href) => {
                setMenuOpen(false);
                setView(href.split('/').pop()!);
              }}
            />
          </BottomSheet>
        ) : null}
      </View>
    </PageLayersProvider>
  );
}
