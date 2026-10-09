import { CrmPrescription } from './CrmPrescription';
import { ClientServiceCard } from './ClientServiceCard';
import { Icon } from '@/components/ui/Icon';
import { CrmCalendar } from './CrmCalendar';
import { useState } from 'react';
import { Pressable, Linking, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CrmFilter as Chip } from './StitchChrome';
import { ErrorState } from '@/components/feedback/ErrorState';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { useAccess } from '@/features/access/useAccess';
import { useSessionStore } from '@/features/auth/sessionStore';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { apiGet } from '@/services/api/client';
import { formatAmount, formatDate, formatDateTime } from '@/utils/format';
import {
  groupStandaloneServices,
  itemId,
  itemName,
  listPayload,
  record,
  type CrmRecord,
} from '../crmApi';
import { can, crmModules } from '../modules';
import { ClientPhotos } from '../ClientPhotos';
import { CrmAvatar, CrmPage, crmStyles } from './CrmDesign';
import { CrmRecordCard } from './CrmRecordCard';
import { ClientPrintPreview } from './ClientPrintPreview';

const tabs = [
  ['profile', 'Vue d’ensemble', 'services.clients.view'],
  ['sessions', 'Séances', 'services.history.view'],
  ['services', 'Services', 'services.history.view'],
  ['prescriptions', 'Ordonnances', 'services.history.view'],
  ['appointments', 'Rendez-vous', 'services.history.view'],
  ['packages', 'Forfaits', 'services.packages.view'],
  ['payments', 'Paiements', 'services.payments.view'],
  ['timeline', 'Journal d’audit', 'services.audit.view'],
  ['photos', 'Photos', 'services.documents.view'],
] as const;
export function ClientDossier({
  selected,
  profile,
  loading,
  error,
  onRetry,
  onClose,
  onEdit,
}: {
  selected: CrmRecord;
  profile?: CrmRecord;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  onClose: () => void;
  onEdit: () => void;
}) {
  const access = useAccess();
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const { locale } = useTranslation();
  const currency = useCurrency();
  const [tab, setTab] = useState('profile');
  const [page, setPage] = useState(1);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printService, setPrintService] = useState<string | undefined>();
  const customer = { ...selected, ...record(profile?.customer) };
  const id = itemId(selected);
  const allowed = tabs.some(([key, , permission]) => key === tab && can(access.data, permission));
  const query = useQuery({
    queryKey: ['crm', store, 'client-dossier', id, tab, page, appointmentDate],
    enabled: allowed && !['profile', 'photos'].includes(tab),
    queryFn: async () => {
      if (tab === 'appointments') {
        const appointments: CrmRecord[] = [];
        let cursor = 1,
          last = 1;
        do {
          const result = listPayload(
            await apiGet(`/customer-crm/${encodeURIComponent(id)}/appointments`, {
              params: { page: cursor, per_page: 500 },
            }),
          );
          appointments.push(...result.rows);
          last = result.lastPage;
          cursor++;
        } while (cursor <= last);
        const rows = appointments.filter(
          (appointment) =>
            !appointmentDate ||
            String(appointment.starts_at ?? '').slice(0, 10) === appointmentDate,
        );
        return { rows, total: rows.length, lastPage: 1 };
      }
      if (tab === 'services' || tab === 'prescriptions') {
        const sessions: CrmRecord[] = [];
        let cursor = 1,
          last = 1;
        do {
          const result = listPayload(
            await apiGet(`/customer-crm/${encodeURIComponent(id)}/sessions`, {
              params: { page: cursor, per_page: 500 },
            }),
          );
          sessions.push(...result.rows);
          last = result.lastPage;
          cursor++;
        } while (cursor <= last);
        const rows =
          tab === 'prescriptions'
            ? sessions.filter(
                (session) => Array.isArray(session.prescription) && session.prescription.length,
              )
            : groupStandaloneServices(sessions);
        return { rows, total: rows.length, lastPage: 1 };
      }
      const endpoint =
        tab === 'packages'
          ? '/customer-service-packages'
          : tab === 'timeline'
            ? `/crm-timeline/customer/${encodeURIComponent(id)}`
            : `/customer-crm/${encodeURIComponent(id)}/${tab}`;
      return listPayload(
        await apiGet(endpoint, {
          params: { page, per_page: 20, ...(tab === 'packages' ? { customer_id: id } : {}) },
        }),
      );
    },
  });
  const permissions = {
    money: can(access.data, 'services.payments.view'),
    history: can(access.data, 'services.history.view'),
    packages: can(access.data, 'services.packages.view'),
  };
  function navigate(href: string) {
    onClose();
    router.push(href as Href);
  }
  function print(service?: string) {
    setPrintService(service);
    setPrinting(true);
  }
  return (
    <CrmPage visible title="Dossier client CRM" onClose={onClose}>
      <ClientProfileCard
        compact={tab !== 'profile'}
        customer={customer}
        onEdit={can(access.data, 'customers.update') ? onEdit : undefined}
        onPrint={permissions.history ? () => print() : undefined}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {tabs
          .filter(([, , permission]) => can(access.data, permission))
          .map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={tab === key}
              onPress={() => {
                setTab(key);
                setPage(1);
              }}
            />
          ))}
      </ScrollView>
      {tab === 'appointments' ? (
        <>
          <CrmCalendar value={appointmentDate} onChange={setAppointmentDate} />
          {can(access.data, 'services.appointments.create') ? (
            <Button
              label="Nouveau rendez-vous"
              icon="add"
              onPress={() =>
                navigate(`/crm/appointments?action=create&customer=${encodeURIComponent(id)}`)
              }
            />
          ) : null}
        </>
      ) : null}
      {tab === 'payments' &&
      permissions.money &&
      record(profile?.stats).total_spent !== undefined ? (
        <View style={crmStyles.card}>
          <AppText variant="labelSm" color="outline">
            TOTAL ENCAISSÉ POUR CE CLIENT
          </AppText>
          <AppText variant="headlineLg" color="primary">
            {formatAmount(Number(record(profile?.stats).total_spent), currency, locale)}
          </AppText>
          <AppText variant="bodySm" color="outline">
            Séances individuelles et forfaits
          </AppText>
        </View>
      ) : null}
      {loading ? (
        <SkeletonCards count={2} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : tab === 'profile' ? (
        <ClientOverview
          profile={profile ?? {}}
          showMoney={permissions.money}
          showHistory={permissions.history}
          showPackages={permissions.packages}
          onTab={setTab}
        />
      ) : tab === 'photos' ? (
        <View style={crmStyles.card}>
          <ClientPhotos clientId={id} />
        </View>
      ) : query.isLoading ? (
        <SkeletonCards count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          {tab === 'timeline' ? (
            <View style={crmStyles.inset}>
              <AppText variant="bodySm">
                Journal administratif : créations, modifications et suppressions des éléments du
                dossier.
              </AppText>
            </View>
          ) : null}
          {tab === 'services' ? (
            <View style={crmStyles.inset}>
              <AppText variant="bodySm">
                Services suivis dans le dossier client et galeries avant / après.
              </AppText>
            </View>
          ) : null}
          {query.data?.rows.map((row, index) => {
            if (tab === 'prescriptions')
              return (
                <View key={itemId(row) || index} style={crmStyles.card}>
                  <CrmPrescription customer={customer} session={row} />
                </View>
              );
            if (tab === 'services') {
              return (
                <ClientServiceCard
                  key={index}
                  row={row}
                  showMoney={permissions.money}
                  onPrint={permissions.history ? () => print(String(row.service_id)) : undefined}
                >
                  <ClientPhotos clientId={id} serviceId={String(row.service_id)} />
                </ClientServiceCard>
              );
            }
            const module = crmModules.find((module) => module.key === tab)!;
            return (
              <View key={itemId(row) || index} style={{ gap: 10 }}>
                <CrmRecordCard
                  row={row}
                  module={module}
                  showMoney={permissions.money}
                  onPress={() => navigate(`/crm/${tab}?record=${encodeURIComponent(itemId(row))}`)}
                />
                {tab === 'sessions' &&
                Array.isArray(row.prescription) &&
                row.prescription.length ? (
                  <View style={crmStyles.card}>
                    <CrmPrescription customer={customer} session={row} />
                  </View>
                ) : null}
                {tab === 'packages' && can(access.data, 'services.documents.view') ? (
                  <View style={crmStyles.card}>
                    <ClientPhotos
                      collapsible
                      clientId={id}
                      packageId={itemId(row)}
                      defaultServiceId={String(row.service_id ?? '')}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          {!query.data?.rows.length ? (
            <View style={crmStyles.card}>
              <AppText color="outline">Aucun élément dans cette rubrique.</AppText>
            </View>
          ) : null}
          {(query.data?.lastPage ?? 1) > 1 ? (
            <View style={crmStyles.row}>
              <Button
                label="Précédent"
                disabled={page <= 1}
                onPress={() => setPage(page - 1)}
                variant="tonal"
                style={crmStyles.grow}
              />
              <AppText>
                {page} / {query.data?.lastPage}
              </AppText>
              <Button
                label="Suivant"
                disabled={page >= (query.data?.lastPage ?? 1)}
                onPress={() => setPage(page + 1)}
                variant="tonal"
                style={crmStyles.grow}
              />
            </View>
          ) : null}
        </>
      )}
      {permissions.history && can(access.data, 'services.sessions.create') ? (
        <Button
          label="Nouvelle séance"
          icon="add-circle-outline"
          onPress={() => navigate(`/crm/sessions?action=create&customer=${encodeURIComponent(id)}`)}
        />
      ) : null}
      {printing ? (
        <ClientPrintPreview
          customer={customer}
          serviceId={printService}
          onClose={() => setPrinting(false)}
        />
      ) : null}
      <AppText variant="bodySm" color="outline">
        {customer.date_of_birth
          ? `Date de naissance : ${formatDate(String(customer.date_of_birth), locale)}`
          : ''}
      </AppText>
    </CrmPage>
  );
}
export function ClientProfileCard({
  compact = false,
  customer,
  onEdit,
  onPrint,
}: {
  compact?: boolean;
  customer: CrmRecord;
  onEdit?: () => void;
  onPrint?: () => void;
}) {
  const { locale } = useTranslation();
  const name = itemName(customer);
  const phone = String(customer.Phone ?? '');
  const email = String(customer.Email ?? '');
  if (compact)
    return (
      <View
        style={[
          crmStyles.inset,
          { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
        ]}
      >
        <CrmAvatar name={name} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <AppText variant="labelLg" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </AppText>
            <Badge
              label={Number(customer.Active) === 1 ? 'Actif' : 'Inactif'}
              tone={Number(customer.Active) === 1 ? 'success' : 'neutral'}
            />
          </View>
          <AppText variant="bodySm" color="outline" numberOfLines={1} style={{ fontSize: 10 }}>
            {[customer.Cin && `CIN : ${customer.Cin}`, phone].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Appeler le client"
            onPress={() => void Linking.openURL(`tel:${phone}`)}
            style={{ padding: 8, borderRadius: 16, backgroundColor: '#dce9ff' }}
          >
            <Icon name="call" size={18} color="primary" />
          </Pressable>
        ) : null}
      </View>
    );
  return (
    <View style={[crmStyles.card, { padding: 12, gap: 12 }]}>
      <View style={crmStyles.row}>
        <CrmAvatar name={name} large />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <AppText variant="headlineSm">{name}</AppText>
            <Badge
              label={Number(customer.Active) === 1 ? 'Actif' : 'Inactif'}
              tone={Number(customer.Active) === 1 ? 'success' : 'neutral'}
            />
          </View>
          <AppText variant="bodySm" color="outline">
            {[
              customer.date_of_birth
                ? formatDate(String(customer.date_of_birth), locale).split(',')[0]
                : '',
              customer.Cin ? `CIN : ${String(customer.Cin)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
        {onEdit ? (
          <Pressable
            onPress={onEdit}
            accessibilityLabel="Modifier le client"
            accessibilityRole="button"
            style={{ padding: 8, borderRadius: 8, backgroundColor: '#e5eeff' }}
          >
            <Icon name="edit" size={18} color="primary" />
          </Pressable>
        ) : null}
        {onPrint ? (
          <Pressable
            onPress={onPrint}
            accessibilityLabel="Imprimer le dossier"
            accessibilityRole="button"
            style={{ padding: 8, borderRadius: 8, backgroundColor: '#e5eeff' }}
          >
            <Icon name="print" size={18} color="primary" />
          </Pressable>
        ) : null}
      </View>
      <View style={{ gap: 8 }}>
        {phone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Appeler ${name}`}
            onPress={() => void Linking.openURL(`tel:${phone.replace(/[^+0-9]/g, '')}`)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              backgroundColor: '#eff4ff',
              borderRadius: 8,
            }}
          >
            <Icon name="call" size={16} color="primary" />
            <AppText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
              {phone}
            </AppText>
          </Pressable>
        ) : null}
        {email ? (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              padding: 8,
              backgroundColor: '#eff4ff',
              borderRadius: 8,
            }}
          >
            <Icon name="alternate-email" size={16} color="outline" />
            <AppText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
              {email}
            </AppText>
          </View>
        ) : null}
      </View>
      {Array.isArray(customer.medical_conditions) && customer.medical_conditions.length ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="medical-services" size={14} color="secondary" />
            <AppText variant="labelSm" color="secondary">
              Antécédents & alertes
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {customer.medical_conditions.map((label, index) => (
              <Badge key={index} label={String(label)} tone="warning" />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ClientOverview({
  profile,
  showMoney,
  showHistory,
  showPackages,
  onTab,
}: {
  profile: CrmRecord;
  showMoney: boolean;
  showHistory: boolean;
  showPackages: boolean;
  onTab: (tab: string) => void;
}) {
  const { locale } = useTranslation();
  const currency = useCurrency();
  const stats = record(profile.stats);
  const sessions = Array.isArray(profile.recent_sessions)
    ? profile.recent_sessions.map(record)
    : [];
  const packages = Array.isArray(profile.active_packages)
    ? profile.active_packages.map(record)
    : [];
  const appointments = Array.isArray(profile.recent_appointments)
    ? profile.recent_appointments.map(record)
    : [];
  return (
    <View style={crmStyles.stack}>
      {showHistory && appointments.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voir les rendez-vous"
          onPress={() => onTab('appointments')}
          style={{ padding: 14, borderRadius: 12, backgroundColor: '#0a58a3', gap: 9 }}
        >
          <View style={crmStyles.row}>
            <Icon name="event" size={18} color="onPrimary" />
            <AppText variant="labelSm" color="onPrimary" style={{ flex: 1 }}>
              RENDEZ-VOUS
            </AppText>
            <Badge
              label={String(record(appointments[0]?.status).label ?? 'Planifié')}
              tone="success"
            />
          </View>
          <AppText variant="headlineMd" color="onPrimary">
            {formatDateTime(String(appointments[0]?.starts_at ?? ''), locale)}
          </AppText>
          <AppText color="onPrimary">
            {itemName(record(appointments[0]?.service)) ||
              itemName(record(appointments[0]?.service_package))}
          </AppText>
          <View
            style={{
              alignSelf: 'flex-end',
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: '#ffffff28',
              borderRadius: 8,
            }}
          >
            <AppText variant="labelSm" color="onPrimary">
              Voir le planning
            </AppText>
          </View>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {[
          ...(showMoney ? [['Encaissé', stats.total_spent, true]] : []),
          ...(showHistory
            ? [
                ['Séances', stats.sessions, false],
                ['Rendez-vous', stats.appointments, false],
              ]
            : []),
          ...(showPackages ? [['Forfaits', stats.packages, false]] : []),
        ].map(([label, value, money]) => (
          <View
            key={String(label)}
            style={[crmStyles.card, { flexGrow: 1, flexBasis: '45%', gap: 6 }]}
          >
            <AppText variant="labelSm" color="outline">
              {String(label)}
            </AppText>
            <AppText variant="headlineMd" color="primary">
              {value === undefined
                ? '—'
                : money
                  ? formatAmount(value, currency, locale)
                  : String(value)}
            </AppText>
          </View>
        ))}
      </View>
      {showPackages ? (
        <>
          <AppText variant="headlineSm">Forfaits actifs</AppText>
          {packages.length ? (
            packages.map((row) => (
              <CrmRecordCard
                key={itemId(row)}
                row={row}
                module={crmModules.find((module) => module.key === 'packages')!}
                showMoney={showMoney}
                onPress={() => onTab('packages')}
              />
            ))
          ) : (
            <View style={crmStyles.card}>
              <AppText color="outline">Aucun forfait actif.</AppText>
            </View>
          )}
        </>
      ) : null}
      {showHistory ? (
        <>
          <AppText variant="headlineSm">Dernières séances</AppText>
          {sessions.length ? (
            sessions
              .slice(0, 3)
              .map((row) => (
                <CrmRecordCard
                  key={itemId(row)}
                  row={row}
                  module={crmModules.find((module) => module.key === 'sessions')!}
                  showMoney={showMoney}
                  onPress={() => onTab('sessions')}
                />
              ))
          ) : (
            <View style={crmStyles.card}>
              <AppText color="outline">Aucune séance enregistrée.</AppText>
            </View>
          )}
          <Button
            label="Voir toutes les séances"
            variant="tonal"
            onPress={() => onTab('sessions')}
          />
        </>
      ) : null}
    </View>
  );
}
