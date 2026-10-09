import { statusLabels } from './CrmRecordCard';
import { CrmColorPalette, CrmSessionCounter } from './CrmChoiceControls';
import { Image, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { CrmFilter as Chip } from './StitchChrome';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/theme';
import { formatAmount } from '@/utils/format';
import { useTranslation } from '@/i18n/useTranslation';
import { useCurrency } from '@/features/settings/settingsApi';
import type { CrmField } from '../fields';
import type { CrmRecord } from '../crmApi';
import { ReferencePicker } from '../ReferencePicker';
import { CrmDateField } from './CrmDateField';
import { CareTags } from './CareTags';
import { CrmSection, crmStyles } from './CrmDesign';
import { type IconName } from '@/components/ui/Icon';
import { stitchClinicalImage } from '../stitchAssets';

export const fieldGroups: Record<string, { title: string; icon: IconName; keys: string[] }[]> = {
  clients: [
    {
      title: '1. Identité du patient',
      icon: 'badge',
      keys: ['FirstName', 'LastName', 'date_of_birth', 'Cin'],
    },
    { title: '2. Coordonnées & Contact', icon: 'contact-mail', keys: ['Email', 'Phone'] },
    { title: '3. Santé & Antécédents', icon: 'medical-services', keys: ['medical_conditions'] },
    { title: '4. État du compte', icon: 'toggle-on', keys: ['Active'] },
  ],
  services: [
    { title: '1. Informations générales', icon: 'medical-services', keys: ['name', 'description'] },
    {
      title: '2. Paramètres de séance',
      icon: 'tune',
      keys: ['recommended_sessions', 'default_price', 'duration_minutes'],
    },
    { title: '3. Identité visuelle', icon: 'palette', keys: ['color', 'active'] },
  ],
  'service-packages': [
    { title: '1. Informations du forfait', icon: 'inventory-2', keys: ['name', 'description'] },
    { title: '2. Tarification', icon: 'payments', keys: ['price', 'active'] },
  ],
  packages: [
    { title: '1. Client & programme', icon: 'group', keys: ['customer_id', 'service_package_id'] },
    { title: '2. Règlement', icon: 'payments', keys: ['price_paid', 'amount_paid'] },
    { title: '3. Validité du forfait', icon: 'event', keys: ['expiration_date', 'sessions_total'] },
  ],
  appointments: [
    { title: '1. Client & prestation', icon: 'group', keys: ['customer_id', 'service_id'] },
    { title: '2. Planification', icon: 'event', keys: ['starts_at', 'ends_at', 'status'] },
    { title: '3. Notes du rendez-vous', icon: 'notes', keys: ['notes'] },
  ],
  sessions: [
    {
      title: '1. Identification',
      icon: 'person-outline',
      keys: [
        'customer_id',
        'customer_service_package_id',
        'service_id',
        'employee_id',
        'status_id',
      ],
    },
    { title: '2. Planification', icon: 'event', keys: ['session_date', 'duration_minutes'] },
    {
      title: '3. Tarification & Règlements',
      icon: 'payments',
      keys: ['price', 'discount', 'amount_paid'],
    },
    { title: '4. Notes & Observations', icon: 'notes', keys: ['observation'] },
    { title: '5. Zones traitées', icon: 'accessibility', keys: ['treatment_zones'] },
  ],
};
export function CrmFormFields({
  moduleKey,
  fields,
  values,
  onChange,
  onSelect,
  estimatedBirth = false,
  showMoney = true,
}: {
  moduleKey: string;
  fields: CrmField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSelect?: (key: string, row: CrmRecord) => void;
  estimatedBirth?: boolean;
  showMoney?: boolean;
}) {
  const currency = useCurrency();
  const { locale } = useTranslation();
  const date = values.date_of_birth ? new Date(values.date_of_birth) : null;
  const age =
    date && Number.isFinite(date.getTime())
      ? new Date().getFullYear() -
        date.getFullYear() -
        (new Date().getMonth() < date.getMonth() ||
        (new Date().getMonth() === date.getMonth() && new Date().getDate() < date.getDate())
          ? 1
          : 0)
      : '';
  const number = (key: string) => Number((values[key] || '0').replace(',', '.'));
  const groups = fieldGroups[moduleKey] ?? [
    {
      title: 'Informations',
      icon: 'edit-note' as IconName,
      keys: fields.map((field) => field.key),
    },
  ];
  function render(field: CrmField) {
    if (moduleKey === 'sessions') {
      if (
        field.key === 'customer_service_package_id' &&
        (!values.customer_id || (values.service_id && !values.customer_service_package_id))
      )
        return null;
      if (field.key === 'service_id' && values.customer_service_package_id) return null;
    }
    const value = values[field.key] ?? '';
    const change = (next: string) => onChange(field.key, next);
    if (field.key === 'medical_conditions')
      return <CareTags key={field.key} value={value} onChange={change} />;
    if (['Active', 'active', 'required', 'visible'].includes(field.key))
      return (
        <View key={field.key} style={crmStyles.row}>
          <View style={crmStyles.grow}>
            <AppText variant="labelLg">{field.label}</AppText>
            <AppText variant="bodySm" color="outline">
              {value === '1' ? 'Activé' : 'Désactivé'}
            </AppText>
          </View>
          <Switch
            value={value === '1'}
            onValueChange={(next) => change(next ? '1' : '0')}
            trackColor={{ false: colors.outlineVariant, true: colors.secondary }}
          />
        </View>
      );
    if (field.key === 'color')
      return <CrmColorPalette key={field.key} value={value} onChange={change} />;
    if (['recommended_sessions', 'sessions_total'].includes(field.key))
      return (
        <CrmSessionCounter key={field.key} label={field.label} value={value} onChange={change} />
      );
    if (field.key === 'treatment_zones') {
      const selected = value.split('\n').filter(Boolean);
      return (
        <View key={field.key} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['Visage', 'Pieds', 'Mains', 'Corps entier', 'Dos', 'Jambes', 'Bras'].map((zone) => (
              <Chip
                key={zone}
                label={zone}
                selected={selected.includes(zone)}
                onPress={() =>
                  change(
                    (selected.includes(zone)
                      ? selected.filter((entry) => entry !== zone)
                      : [...selected, zone]
                    ).join('\n'),
                  )
                }
              />
            ))}
          </View>
          <TextField
            appearance="crm"
            label="Toutes les zones (une par ligne)"
            multiline
            value={value}
            onChangeText={change}
          />
        </View>
      );
    }
    if (field.date) {
      const picker = (
        <CrmDateField
          label={`${field.key === 'LastName' ? 'Nom de famille' : field.label}${field.required ? ' *' : ''}`}
          value={value}
          onChange={change}
          time={['session_date', 'starts_at', 'ends_at', 'date'].includes(field.key)}
        />
      );
      return (
        <View key={field.key} style={{ gap: 10 }}>
          {field.key === 'date_of_birth' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={crmStyles.grow}>{picker}</View>
                <View style={crmStyles.grow}>
                  <TextField
                    appearance="crm"
                    label="Âge (estimé)"
                    leadingIcon="schedule"
                    keyboardType="number-pad"
                    value={String(age)}
                    onChangeText={(next) => onChange('age', next)}
                  />
                </View>
              </View>
              {estimatedBirth || !value ? (
                <View style={crmStyles.inset}>
                  <AppText variant="bodySm" color="primary">
                    Date de naissance estimée : calculée automatiquement si seul l’âge est saisi.
                  </AppText>
                </View>
              ) : null}
            </>
          ) : (
            picker
          )}
        </View>
      );
    }
    if (field.reference)
      return (
        <ReferencePicker
          key={field.key}
          field={field}
          value={value}
          params={
            field.key === 'customer_service_package_id'
              ? { customer_id: values.customer_id, status: 'active' }
              : undefined
          }
          onChange={change}
          onSelect={(row) => onSelect?.(field.key, row)}
        />
      );
    if (field.choices)
      return (
        <View key={field.key} style={{ gap: 8 }}>
          <AppText variant="labelLg">{field.label}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {field.choices.map((choice) => (
              <Chip
                key={choice}
                label={
                  statusLabels[choice] ??
                  (
                    {
                      date: 'Date',
                      text: 'Texte court',
                      textarea: 'Texte long',
                      number: 'Nombre',
                      decimal: 'Décimal',
                      checkbox: 'Case à cocher',
                      radio: 'Choix unique',
                      select: 'Liste',
                      multiselect: 'Choix multiples',
                      datetime: 'Date et heure',
                      email: 'E-mail',
                      phone: 'Téléphone',
                      color: 'Couleur',
                      url: 'Lien',
                      json: 'Données JSON',
                    } as Record<string, string>
                  )[choice] ??
                  choice
                }
                selected={value === choice}
                onPress={() => change(choice)}
              />
            ))}
          </View>
        </View>
      );
    return (
      <TextField
        key={field.key}
        appearance="crm"
        label={`${field.key === 'LastName' ? 'Nom de famille' : field.label}${field.required ? ' *' : ''}`}
        value={value}
        leadingIcon={
          (
            {
              FirstName: 'person-outline',
              LastName: 'badge',
              Cin: 'credit-card',
              Email: 'alternate-email',
              Phone: 'call',
            } as Record<string, IconName>
          )[field.key]
        }
        suffix={
          field.key === 'default_price' || field.key === 'price'
            ? (currency ?? undefined)
            : field.key === 'duration_minutes'
              ? 'min'
              : undefined
        }
        onChangeText={change}
        multiline={field.multiline}
        placeholder={
          field.key === 'FirstName'
            ? 'ex. Sofia'
            : field.key === 'name'
              ? moduleKey === 'form-builder'
                ? 'ex. note_du_soin'
                : 'Nom de la prestation'
              : field.key === 'LastName'
                ? 'ex. El Amrani'
                : field.key === 'Cin'
                  ? 'EX. BE89210'
                  : undefined
        }
        keyboardType={
          field.integer
            ? 'number-pad'
            : field.numeric
              ? 'decimal-pad'
              : field.key === 'Email'
                ? 'email-address'
                : field.key === 'Phone'
                  ? 'phone-pad'
                  : 'default'
        }
        autoCapitalize={field.key === 'Email' ? 'none' : 'sentences'}
      />
    );
  }
  return (
    <View style={crmStyles.stack}>
      {groups.map((group) => {
        const matches = group.keys
          .map((key) => fields.find((field) => field.key === key))
          .filter(
            (field): field is CrmField =>
              !!field &&
              (showMoney ||
                !['price', 'discount', 'amount_paid', 'price_paid'].includes(field.key)),
          );
        return matches.length ? (
          <CrmSection key={group.title} title={group.title} icon={group.icon}>
            {matches.map((field) => {
              const pair =
                moduleKey === 'services'
                  ? ['default_price', 'duration_minutes']
                  : moduleKey === 'sessions'
                    ? ['price', 'discount']
                    : [];
              const first = matches.find((entry) => entry.key === pair[0]);
              const second = matches.find((entry) => entry.key === pair[1]);
              if (first && second && field.key === second.key) return null;
              if (first && second && field.key === first.key)
                return (
                  <View key={field.key} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={crmStyles.grow}>{render(first)}</View>
                    <View style={crmStyles.grow}>{render(second)}</View>
                  </View>
                );
              return render(field);
            })}
            {moduleKey === 'services' && group.keys.includes('description') ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: '#eff4ff',
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <Image
                  source={{ uri: stitchClinicalImage }}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText variant="labelMd" color="primary">
                    Prise en charge personnalisée
                  </AppText>
                  <AppText variant="bodySm" color="onSurfaceVariant">
                    Renseignez le protocole de soin pour votre équipe.
                  </AppText>
                </View>
              </View>
            ) : null}
            {moduleKey === 'services' &&
            group.keys.includes('default_price') &&
            fields.some((field) => field.key === 'default_price') ? (
              <View style={crmStyles.inset}>
                <AppText variant="bodySm">Estimation du programme complet</AppText>
                <AppText variant="headlineSm" color="primary">
                  {formatAmount(
                    number('default_price') * number('recommended_sessions'),
                    currency,
                    locale,
                  )}
                </AppText>
              </View>
            ) : null}
            {moduleKey === 'sessions' &&
            group.keys.includes('duration_minutes') &&
            values.session_date &&
            number('duration_minutes') > 0 ? (
              <View style={crmStyles.inset}>
                <AppText variant="bodySm" color="outline">
                  Heure de fin calculée
                </AppText>
                <AppText variant="labelLg">
                  {new Date(
                    new Date(values.session_date.replace(' ', 'T')).getTime() +
                      number('duration_minutes') * 60000,
                  ).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                </AppText>
              </View>
            ) : null}
            {showMoney && moduleKey === 'sessions' && group.keys.includes('price') ? (
              <View style={crmStyles.inset}>
                <AppText variant="bodySm">Reste à payer</AppText>
                <AppText variant="headlineSm" color="secondary">
                  {formatAmount(
                    Math.max(0, number('price') - number('discount') - number('amount_paid')),
                    currency,
                    locale,
                  )}
                </AppText>
              </View>
            ) : null}
          </CrmSection>
        ) : null;
      })}
    </View>
  );
}
