import { CrmPrescription } from './CrmPrescription';
import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount, formatDateTime } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { CrmAvatar, CrmSection, crmStyles } from './CrmDesign';
import { statusLabels, statusTone } from './CrmRecordCard';

export function CrmDetailContent({
  row,
  moduleKey,
  showMoney,
}: {
  row: CrmRecord;
  moduleKey: string;
  showMoney: boolean;
}) {
  const currency = useCurrency();
  const { locale } = useTranslation();
  const customer = record(row.customer);
  const service = record(row.service);
  const bundle = record(row.service_package ?? row.servicePackage);
  const status = record(row.status);
  const statusCode = String(status.code ?? (typeof row.status === 'string' ? row.status : ''));
  const isCatalog = ['services', 'service-packages'].includes(moduleKey);
  const title = isCatalog ? itemName(row) : itemName(customer) || itemName(row);
  const amount = (value: unknown) => formatAmount(Number(value ?? 0), currency, locale);
  const metric = (label: string, value: unknown, money = false) =>
    value === undefined || value === null ? null : (
      <View key={label} style={[crmStyles.inset, { flex: 1, minWidth: 90 }]}>
        <AppText variant="labelSm" color="outline" style={{ fontSize: 11, lineHeight: 16 }}>
          {label}
        </AppText>
        <AppText
          style={money ? { fontSize: 18 } : undefined}
          variant="headlineSm"
          color={money ? 'primary' : 'onSurface'}
        >
          {money ? amount(value) : String(value)}
        </AppText>
      </View>
    );
  const line = (label: string, value: unknown) =>
    value === undefined || value === null || value === '' ? null : (
      <View key={label} style={{ gap: 5 }}>
        <AppText variant="labelSm" color="outline">
          {label}
        </AppText>
        <AppText>{String(value)}</AppText>
      </View>
    );
  const composition = (
    Array.isArray(row.service_items)
      ? row.service_items
      : Array.isArray(row.items)
        ? row.items
        : Array.isArray(row.services)
          ? row.services
          : []
  ).map(record);
  const prescription = Array.isArray(row.prescription) ? row.prescription.map(record) : [];
  const zones = Array.isArray(row.treatment_zones) ? row.treatment_zones.map(String) : [];
  return (
    <View style={crmStyles.stack}>
      <View style={crmStyles.card}>
        <View style={crmStyles.row}>
          {isCatalog ? (
            <View style={[crmStyles.inset, { backgroundColor: String(row.color ?? '#dfeaff') }]}>
              <Icon
                name={moduleKey === 'services' ? 'medical-services' : 'inventory-2'}
                color="primary"
              />
            </View>
          ) : (
            <CrmAvatar name={title} large />
          )}
          <View style={crmStyles.grow}>
            <AppText variant="labelSm" color="secondary">
              {isCatalog ? 'CATALOGUE DES PRESTATIONS' : 'DOSSIER DE SOINS'}
            </AppText>
            <AppText variant="headlineMd">{title}</AppText>
            {!isCatalog && itemName(service) ? (
              <AppText color="outline">{itemName(service)}</AppText>
            ) : null}
          </View>
        </View>
        {statusCode ? (
          <Badge
            label={String(status.label ?? statusLabels[statusCode] ?? statusCode)}
            tone={statusTone(statusCode)}
          />
        ) : null}
        {line('Description', row.description)}
      </View>
      {['sessions', 'appointments'].includes(moduleKey) ? (
        <CrmSection title="Planification" icon="event">
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {metric(
              'Date du soin',
              row.session_date || row.starts_at
                ? formatDateTime(String(row.session_date ?? row.starts_at), locale)
                : undefined,
            )}
            {metric(
              'Durée',
              row.duration_minutes !== undefined ? `${row.duration_minutes} min` : undefined,
            )}
          </View>
          {line('Intervenant', itemName(record(row.employee)))}
          {line(
            'Forfait associé',
            itemName(bundle) || itemName(record(row.customer_service_package)),
          )}
          {line(
            'Fin du rendez-vous',
            row.ends_at ? formatDateTime(String(row.ends_at), locale) : undefined,
          )}
        </CrmSection>
      ) : null}
      {isCatalog ? (
        <CrmSection title="Paramètres de la prestation" icon="tune">
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {metric('Prix', row.default_price ?? row.price, true)}
            {metric(
              'Durée',
              row.duration_minutes !== undefined ? `${row.duration_minutes} min` : undefined,
            )}
            {metric('Séances recommandées', row.recommended_sessions)}
            {metric('Séances incluses', row.sessions_count)}
          </View>
          {line('Service associé', itemName(service))}
          {composition.map((entry, index) => (
            <View key={index} style={crmStyles.inset}>
              <AppText variant="labelLg">
                {itemName(record(entry.service)) || itemName(entry)}
              </AppText>
              {line(
                'Nombre de séances',
                entry.sessions_count ?? record(entry.pivot).sessions_count,
              )}
            </View>
          ))}
        </CrmSection>
      ) : null}
      {moduleKey === 'packages' ? (
        <CrmSection title="Avancement du forfait" icon="inventory-2">
          <AppText variant="headlineSm">{itemName(bundle) || 'Forfait client'}</AppText>
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {metric('Incluses', row.sessions_total)}
            {metric('Utilisées', row.sessions_used)}
            {metric(
              'Restantes',
              row.sessions_remaining ??
                (row.sessions_total !== undefined && row.sessions_used !== undefined
                  ? Math.max(0, Number(row.sessions_total) - Number(row.sessions_used))
                  : undefined),
            )}
          </View>
          {row.sessions_total ? (
            <View
              style={{ height: 7, borderRadius: 4, backgroundColor: '#e3ebfa', overflow: 'hidden' }}
            >
              <View
                style={{
                  height: 7,
                  width: `${Math.min(100, (Number(row.sessions_used ?? 0) / Number(row.sessions_total)) * 100)}%`,
                  backgroundColor: '#00897b',
                }}
              />
            </View>
          ) : null}
          {line('Service associé', itemName(service))}
          {composition.map((entry, index) => (
            <View key={index} style={crmStyles.inset}>
              <AppText variant="labelLg">
                {itemName(record(entry.service)) || itemName(entry) || itemName(service)}
              </AppText>
              {line('Séances incluses', entry.sessions_count)}
              {line('Séances utilisées', record(row.service_usage)[String(entry.service_id)])}
            </View>
          ))}
          {line('Expiration', row.expiration_date)}
        </CrmSection>
      ) : null}
      {showMoney && !isCatalog && ['sessions', 'packages', 'payments'].includes(moduleKey) ? (
        <CrmSection title="Règlements" icon="payments">
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {metric('Montant', row.price_paid ?? row.price ?? row.payingAmount, true)}
            {metric('Remise', row.discount, true)}
            {metric('Payé', row.amount_paid ?? row.receivedAmount, true)}
            {metric('Reste à payer', row.due, true)}
          </View>
          {line('Référence', row.ref)}
          {line('Mode de paiement', itemName(record(row.type)))}
        </CrmSection>
      ) : null}
      {row.observation || row.notes || row.note || zones.length ? (
        <CrmSection title="Observations & zones traitées" icon="notes">
          {row.observation || row.notes || row.note ? (
            <AppText>{String(row.observation ?? row.notes ?? row.note)}</AppText>
          ) : null}
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {zones.map((zone) => (
              <Badge key={zone} label={zone} tone="primary" />
            ))}
          </View>
        </CrmSection>
      ) : null}
      {Array.isArray(row.values) && row.values.length ? (
        <CrmSection title="Diagnostic du soin" icon="tune">
          {row.values.map((entry) => {
            const value = record(entry);
            const field = record(value.field);
            let display = value.value;
            if (field.type === 'multiselect' && typeof display === 'string') {
              try {
                display = JSON.parse(display);
              } catch {
                /* legacy value */
              }
            }
            return (
              <View key={String(value.service_field_id)}>
                {line(
                  String(field.label || field.name || 'Champ supplémentaire'),
                  Array.isArray(display) ? display.join(', ') : display,
                )}
              </View>
            );
          })}
        </CrmSection>
      ) : null}
      {prescription.length ? (
        <View style={crmStyles.card}>
          <CrmPrescription customer={customer} session={row} />
        </View>
      ) : null}
      {row.created_at ? (
        <AppText variant="bodySm" color="outline">
          Créé le {formatDateTime(String(row.created_at), locale)}
        </AppText>
      ) : null}
    </View>
  );
}
