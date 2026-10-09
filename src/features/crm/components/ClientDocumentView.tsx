import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDate, formatDateTime } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { CrmAvatar, crmStyles } from './CrmDesign';

/** The same patient, history and prescription sections as the printable document. */
export function ClientDocumentView({
  customer,
  sessions,
}: {
  customer: CrmRecord;
  sessions: CrmRecord[];
}) {
  const { locale } = useTranslation();
  const conditions = Array.isArray(customer.medical_conditions)
    ? customer.medical_conditions.map(String)
    : [];
  const prescriptions = sessions.flatMap((session) =>
    Array.isArray(session.prescription) ? session.prescription.map(record) : [],
  );
  function heading(title: string, icon: 'person-outline' | 'history' | 'receipt-long') {
    return (
      <View style={[crmStyles.row, { marginTop: 8 }]}>
        <Icon name={icon} color="secondary" size={20} />
        <AppText variant="headlineSm" style={crmStyles.grow}>
          {title}
        </AppText>
      </View>
    );
  }
  return (
    <View style={[crmStyles.card, { padding: 14, gap: 18 }]}>
      <View style={crmStyles.inset}>
        <AppText color="primary" variant="headlineSm">
          QuickPharma
        </AppText>
        <AppText variant="labelSm" color="secondary">
          DOSSIER CLIENT · SERVICES CRM
        </AppText>
        <AppText variant="bodySm" color="outline">
          {formatDate(new Date().toISOString(), locale)}
        </AppText>
      </View>
      {heading('Profil & antécédents', 'person-outline')}
      <View style={crmStyles.inset}>
        <View style={crmStyles.row}>
          <CrmAvatar name={itemName(customer)} />
          <View style={crmStyles.grow}>
            <AppText variant="headlineSm">{itemName(customer)}</AppText>
            {customer.Phone ? <AppText variant="bodySm">{String(customer.Phone)}</AppText> : null}
          </View>
        </View>
        <AppText variant="bodySm">
          Naissance :{' '}
          {customer.date_of_birth
            ? formatDate(String(customer.date_of_birth), locale)
            : 'Non renseignée'}
        </AppText>
        <AppText variant="bodySm">CIN : {String(customer.Cin || 'Non renseigné')}</AppText>
        {customer.Email ? <AppText variant="bodySm">{String(customer.Email)}</AppText> : null}
        <AppText variant="labelLg">Antécédents médicaux</AppText>
        {conditions.length ? (
          <View style={[crmStyles.row, { flexWrap: 'wrap' }]}>
            {conditions.map((condition) => (
              <Badge key={condition} label={condition} tone="warning" />
            ))}
          </View>
        ) : (
          <AppText variant="bodySm" color="outline">
            Aucun antécédent renseigné
          </AppText>
        )}
      </View>
      {heading('Historique des prestations', 'history')}
      <AppText variant="bodySm" color="outline">
        {sessions.length} séance{sessions.length > 1 ? 's' : ''}
      </AppText>
      {sessions.map((session, index) => (
        <View key={index} style={crmStyles.inset}>
          <AppText variant="labelLg" color="primary">
            {itemName(record(session.service)) || 'Séance'}
          </AppText>
          {session.session_date ? (
            <AppText variant="bodySm" color="secondary">
              {formatDateTime(String(session.session_date), locale)} ·{' '}
              {String(session.duration_minutes ?? '')} min
            </AppText>
          ) : null}
          {itemName(record(session.employee)) ? (
            <AppText variant="bodySm">Intervenant : {itemName(record(session.employee))}</AppText>
          ) : null}
          {session.observation ? (
            <View style={[crmStyles.card, { padding: 10 }]}>
              <AppText variant="bodySm">{String(session.observation)}</AppText>
            </View>
          ) : null}
          {Array.isArray(session.treatment_zones) && session.treatment_zones.length ? (
            <AppText variant="bodySm">
              Zones : {session.treatment_zones.map(String).join(', ')}
            </AppText>
          ) : null}
        </View>
      ))}
      {!sessions.length ? (
        <AppText variant="bodySm" color="outline">
          Aucune séance à imprimer.
        </AppText>
      ) : null}
      {prescriptions.length ? (
        <>
          {heading('Prescriptions associées', 'receipt-long')}
          {prescriptions.map((medicine, index) => (
            <View key={index} style={crmStyles.inset}>
              <AppText variant="labelLg">{String(medicine.name ?? '')}</AppText>
              <AppText variant="bodySm">
                {[medicine.dosage, medicine.frequency, medicine.duration]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
              {medicine.instructions ? (
                <AppText variant="bodySm">{String(medicine.instructions)}</AppText>
              ) : null}
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}
