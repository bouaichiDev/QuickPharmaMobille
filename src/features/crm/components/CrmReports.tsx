import { ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useCurrency } from '@/features/settings/settingsApi';
import { useTranslation } from '@/i18n/useTranslation';
import { formatAmount } from '@/utils/format';
import { record, type CrmRecord } from '../crmApi';
import { CrmSection, crmStyles } from './CrmDesign';

export function CrmReports({ data }: { data: CrmRecord }) {
  const currency = useCurrency();
  const { locale } = useTranslation();
  const rows = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as unknown[]).map(record) : [];
  const revenue = rows('revenue');
  const total = revenue.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const max = Math.max(1, ...revenue.map((row) => Number(row.revenue ?? 0)));
  const money = (value: unknown) => formatAmount(value, currency, locale);
  const growth = record(data.client_growth);
  const appointments = rows('appointments');
  return (
    <View style={{ gap: 14 }}>
      <View
        style={[crmStyles.card, { backgroundColor: '#00417c', borderColor: '#00417c', gap: 8 }]}
      >
        <AppText variant="labelSm" style={{ color: '#dbeafe' }}>
          RECETTES ENCAISSÉES · PÉRIODE SÉLECTIONNÉE
        </AppText>
        <AppText variant="headlineLg" style={{ color: '#fff' }}>
          {money(total)}
        </AppText>
        <AppText variant="bodySm" style={{ color: '#b5f4eb' }}>
          Règlements des séances et forfaits
        </AppText>
      </View>
      <CrmSection title="Évolution des recettes" icon="bar-chart">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-end', paddingTop: 8 }}>
            {revenue.map((row, index) => (
              <View
                key={index}
                accessibilityLabel={`${row.name} : ${money(row.revenue)}`}
                style={{ width: 48, alignItems: 'center', gap: 6 }}
              >
                <AppText variant="labelSm" color="primary">
                  {Number(row.revenue) || '0'}
                </AppText>
                <View
                  style={{
                    height: 116,
                    justifyContent: 'flex-end',
                    width: 22,
                    backgroundColor: '#eff4ff',
                    borderRadius: 5,
                  }}
                >
                  <View
                    style={{
                      height: Math.max(2, (Number(row.revenue ?? 0) / max) * 116),
                      backgroundColor: '#007d74',
                      borderRadius: 5,
                    }}
                  />
                </View>
                <AppText variant="labelSm" color="outline">
                  {String(row.name ?? '')}
                </AppText>
              </View>
            ))}
          </View>
        </ScrollView>
        {!revenue.length ? (
          <AppText color="outline">Aucune recette sur cette période.</AppText>
        ) : null}
      </CrmSection>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          ['Nouveaux clients', growth.new_clients],
          ['Clients fidèles', growth.returning_clients],
        ].map(([label, value]) => (
          <View key={String(label)} style={[crmStyles.card, { flex: 1, gap: 8 }]}>
            <AppText variant="labelSm" color="outline">
              {String(label)}
            </AppText>
            <AppText variant="headlineLg" color="primary">
              {String(value ?? 0)}
            </AppText>
          </View>
        ))}
      </View>
      {['services', 'employees'].map((key) => (
        <CrmSection
          key={key}
          title={key === 'services' ? 'Performance des prestations' : 'Activité des praticiens'}
          icon={key === 'services' ? 'medical-services' : 'group'}
        >
          {rows(key).map((row, index) => (
            <View key={index} style={{ gap: 8 }}>
              <View style={crmStyles.row}>
                <View style={crmStyles.grow}>
                  <AppText variant="labelLg">{String(row.name || 'Non renseigné')}</AppText>
                  <AppText variant="bodySm" color="outline">
                    {String(row.sessions_count ?? 0)} séances
                  </AppText>
                </View>
                <AppText variant="labelLg" color="primary">
                  {money(row.revenue)}
                </AppText>
              </View>
              <View style={{ height: 5, backgroundColor: '#eff4ff', borderRadius: 5 }}>
                <View
                  style={{
                    width: `${Math.min(100, (Number(row.revenue ?? 0) / Math.max(1, ...rows(key).map((r) => Number(r.revenue ?? 0)))) * 100)}%`,
                    height: 5,
                    backgroundColor: '#007d74',
                    borderRadius: 5,
                  }}
                />
              </View>
            </View>
          ))}
          {!rows(key).length ? (
            <AppText color="outline">Aucune activité sur cette période.</AppText>
          ) : null}
          {key === 'employees' ? (
            <AppText variant="bodySm" color="outline">
              Montants des soins réalisés par praticien.
            </AppText>
          ) : null}
        </CrmSection>
      ))}
      <CrmSection title="Suivi des rendez-vous" icon="event-available">
        {(
          [
            ['Terminés', 'completed'],
            ['Annulés', 'cancelled'],
            ['Absents', 'no_show'],
          ] as [string, string][]
        ).map(([label, key]) => (
          <View key={key} style={crmStyles.row}>
            <AppText style={crmStyles.grow}>{label}</AppText>
            <AppText variant="headlineSm" color="primary">
              {appointments.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)}
            </AppText>
          </View>
        ))}
      </CrmSection>
    </View>
  );
}
