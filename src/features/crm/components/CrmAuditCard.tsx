import { useCrmRecordContext } from '../useCrmRecordContext';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDateTime } from '@/utils/format';
import { itemName, record, type CrmRecord } from '../crmApi';
import { CrmAvatar, crmStyles } from './CrmDesign';

export function CrmAuditCard({ row, onPress }: { row: CrmRecord; onPress?: () => void }) {
  const { locale } = useTranslation();
  const context = useCrmRecordContext(row);
  const snapshot = context.snapshot;
  const summary = [
    itemName(context.customer),
    itemName(context.service),
    snapshot.name,
    snapshot.session_date || snapshot.starts_at
      ? formatDateTime(String(snapshot.session_date || snapshot.starts_at), locale)
      : '',
  ]
    .filter(Boolean)
    .map(String)
    .join(' · ');
  const labels: Record<string, string> = {
    price: 'Prix',
    amount_paid: 'Montant payé',
    duration_minutes: 'Durée',
    observation: 'Observations',
    notes: 'Notes',
    name: 'Nom',
    description: 'Description',
    default_price: 'Tarif',
    recommended_sessions: 'Séances recommandées',
  };
  const changes = Object.entries(record(row.after))
    .filter(([key, value]) => labels[key] && value !== null && typeof value !== 'object')
    .map(([key, value]) => `${labels[key]} : ${String(value)}`)
    .join(' · ');
  const action = String(row.action ?? '');
  const verb = action.includes('created')
    ? 'Création'
    : action.includes('updated')
      ? 'Modification'
      : action.includes('deleted')
        ? 'Suppression'
        : 'Opération';
  const entity =
    String(row.auditable_type ?? '')
      .split('\\')
      .at(-1) ?? '';
  const subject: Record<string, string> = {
    ServiceSession: 'Séance',
    Service: 'Service',
    CustomerServicePackage: 'Forfait client',
    ServicePackage: 'Forfait',
    Payment: 'Paiement',
    Customer: 'Client',
    ServiceAppointment: 'Rendez-vous',
  };
  const actor = itemName(record(row.user));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${verb} · ${subject[entity] ?? 'Dossier'}`}
      onPress={onPress}
      style={crmStyles.card}
    >
      <View style={crmStyles.row}>
        <View style={crmStyles.inset}>
          <Icon
            name={
              verb === 'Suppression'
                ? 'delete-outline'
                : verb === 'Modification'
                  ? 'edit'
                  : 'add-circle-outline'
            }
            color={verb === 'Suppression' ? 'error' : 'primary'}
            size={22}
          />
        </View>
        <View style={crmStyles.grow}>
          <AppText variant="labelLg">
            {verb} · {subject[entity] ?? 'Dossier'}
          </AppText>
          {row.created_at ? (
            <AppText variant="bodySm" color="outline">
              {formatDateTime(String(row.created_at), locale)}
            </AppText>
          ) : null}
        </View>
        <Badge
          label={verb}
          tone={verb === 'Suppression' ? 'danger' : verb === 'Modification' ? 'warning' : 'success'}
        />
      </View>
      {summary || changes ? (
        <View style={crmStyles.inset}>
          <AppText variant="bodySm">{summary || changes}</AppText>
        </View>
      ) : null}
      {actor ? (
        <View style={crmStyles.row}>
          <CrmAvatar name={actor} />
          <AppText variant="bodySm" color="outline">
            Effectué par {actor}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
