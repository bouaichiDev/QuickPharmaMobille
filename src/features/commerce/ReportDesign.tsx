import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/AppText';
import { currency, date } from '@/features/superadmin/AdminUI';
import { salePeriodDates } from '@/features/sales/salesModel';
import type { ReportFilters } from './reportsApi';
import type { CrmRecord } from '@/features/crm/crmApi';
import { bestSellingProducts, collectionMetrics } from './reportAnalytics';

export function ReportCollection({ summary }: { summary: CrmRecord }) {
  const { total, paid, due, rate, paidSlice } = collectionMetrics(summary);
  const available = total != null && paid != null && due != null;
  return (
    <ReportPanel title="Taux d’encaissement">
      <AppText style={reportStyle.small} color="onSurfaceVariant">
        Sur toute la période filtrée
      </AppText>
      {!available ? (
        <AppText>Données d’encaissement non disponibles.</AppText>
      ) : paid + due === 0 ? (
        <AppText>Aucun montant pour cette période.</AppText>
      ) : (
        <View
          accessibilityRole="image"
          accessibilityLabel={`${rate} % encaissé. Payé : ${currency(paid)}. Dû : ${currency(due)}.`}
          style={{
            width: 190,
            height: 190,
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: 8,
          }}
        >
          {Array.from({ length: 120 }, (_, index) => (
            <View
              key={index}
              accessible={false}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 3.8,
                height: 180,
                top: 5,
                left: 93.1,
                transform: [{ rotate: `${index * 3}deg` }],
              }}
            >
              <View
                style={{
                  height: 23,
                  borderRadius: 1,
                  backgroundColor: index / 120 < paidSlice ? '#5bb58a' : '#89a5d6',
                }}
              />
            </View>
          ))}
          <AppText style={{ fontSize: 28, lineHeight: 36, fontWeight: '700' }}>{rate}%</AppText>
          <AppText style={reportStyle.small} color="onSurfaceVariant">
            ENCAISSÉ
          </AppText>
        </View>
      )}
      <View
        style={[reportStyle.row, { borderTopWidth: 1, borderTopColor: '#edf0f8', paddingTop: 12 }]}
      >
        <View style={reportStyle.grow}>
          <AppText style={reportStyle.small} color="secondary">
            PAYÉ
          </AppText>
          <AppText variant="labelLg">{paid == null ? '—' : currency(paid)}</AppText>
        </View>
        <View style={reportStyle.grow}>
          <AppText style={reportStyle.small} color="primary">
            DÛ
          </AppText>
          <AppText variant="labelLg">{due == null ? '—' : currency(due)}</AppText>
        </View>
      </View>
    </ReportPanel>
  );
}

export function ReportBestSellers({
  topProducts,
  rows,
}: {
  topProducts: CrmRecord[];
  rows: CrmRecord[];
}) {
  const result = bestSellingProducts(topProducts, rows);
  const maximum = Math.max(1, ...result.rows.map((row) => row.value));
  return (
    <ReportPanel title="Meilleures ventes">
      <AppText style={reportStyle.small} color="onSurfaceVariant">
        {result.global ? 'Sur toute la période filtrée' : 'Sur les lignes affichées'}
      </AppText>
      {!result.rows.length ? (
        <AppText style={reportStyle.small}>Aucune vente de produit sur cette période.</AppText>
      ) : (
        result.rows.map((row, index) => (
          <View key={row.label} style={{ gap: 6 }}>
            <View style={reportStyle.row}>
              <ReportTag>{index + 1}</ReportTag>
              <AppText style={[reportStyle.small, reportStyle.grow]}>{row.label}</AppText>
              <AppText variant="labelMd">{row.value} articles vendus</AppText>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={row.label}
              accessibilityValue={{ min: 0, max: maximum, now: row.value }}
              style={{ height: 7, borderRadius: 4, backgroundColor: '#eff4ff', overflow: 'hidden' }}
            >
              <View
                style={{
                  width: `${(row.value / maximum) * 100}%`,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: index === 0 ? '#006a63' : '#435f96',
                }}
              />
            </View>
          </View>
        ))
      )}
    </ReportPanel>
  );
}

export const reportStyle = StyleSheet.create({
  stack: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '700' },
  small: { fontSize: 11, lineHeight: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#edf0f8',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00417c',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, flexBasis: '46%', minWidth: 0 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5eeff',
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eff4ff',
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#00417c' },
  tag: {
    backgroundColor: '#e5f3f1',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  inset: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 9, gap: 5 },
  cta: { backgroundColor: '#00417c', borderRadius: 16, padding: 16, gap: 12 },
});

export function ReportPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={reportStyle.card}>
      {title ? <AppText style={reportStyle.heading}>{title}</AppText> : null}
      {children}
    </View>
  );
}
export function ReportTag({ children }: { children: ReactNode }) {
  return (
    <View style={reportStyle.tag}>
      <AppText style={[reportStyle.small, { color: '#006a63' }]}>{children}</AppText>
    </View>
  );
}
export function ReportMetric({
  label,
  value,
  icon,
  wide,
  note,
  tone = '#00417c',
}: {
  label: string;
  value: string;
  icon?: IconName;
  wide?: boolean;
  note?: string;
  tone?: string;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      testID="report-metric"
      style={[
        reportStyle.card,
        reportStyle.metric,
        wide || fontScale > 1.4 ? { flexBasis: '100%' } : null,
      ]}
    >
      <View style={[reportStyle.accent, { backgroundColor: tone }]} />
      <View style={reportStyle.row}>
        {icon ? <Icon name={icon} size={18} style={{ color: tone }} /> : null}
        <AppText style={[reportStyle.small, reportStyle.grow]}>{label}</AppText>
      </View>
      <AppText
        style={{
          fontSize: wide ? 28 : 21,
          lineHeight: wide ? 36 : 29,
          fontWeight: '700',
          color: '#0b1c30',
        }}
      >
        {value}
      </AppText>
      {note ? (
        <AppText style={reportStyle.small} color="onSurfaceVariant">
          {note}
        </AppText>
      ) : null}
    </View>
  );
}
export function ReportPeriods({
  filters,
  apply,
  onFilters,
}: {
  filters: ReportFilters;
  apply: (value: ReportFilters) => void;
  onFilters: () => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 5 }}
      >
        {(['today', 'week', 'month'] as const).map((period) => {
          const dates = salePeriodDates(period);
          const selected =
            filters.startDate === dates.from_date && filters.endDate === dates.to_date;
          return (
            <Pressable
              key={period}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={
                { today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois' }[period]
              }
              onPress={() =>
                apply({ ...filters, startDate: dates.from_date!, endDate: dates.to_date! })
              }
              style={[reportStyle.chip, selected && reportStyle.selected]}
            >
              <AppText
                style={[
                  reportStyle.small,
                  { color: selected ? '#fff' : '#424751', fontWeight: '600' },
                ]}
              >
                {{ today: 'Aujourd’hui', week: 'Cette semaine', month: 'Ce mois' }[period]}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Période et filtres"
          onPress={onFilters}
          style={reportStyle.chip}
        >
          <AppText style={reportStyle.small}>Personnalisée</AppText>
        </Pressable>
      </ScrollView>
      <View style={reportStyle.card}>
        <View style={reportStyle.row}>
          <Icon name="date-range" size={16} color="secondary" />
          <AppText style={[reportStyle.small, reportStyle.grow]}>
            Du {date(filters.startDate)} au {date(filters.endDate)}
          </AppText>
          <ReportTag>Période active</ReportTag>
        </View>
        <View style={reportStyle.row}>
          <ReportTag>Magasin connecté</ReportTag>
          <Pressable accessibilityRole="button" onPress={onFilters}>
            <AppText style={[reportStyle.small, { color: '#00417c' }]}>Période et filtres</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function ReportEvolution({ series }: { series: { date: unknown; amount: unknown }[] }) {
  const maximum = Math.max(1, ...series.map((p) => Number(p.amount) || 0));
  return (
    <ReportPanel title="Évolution quotidienne">
      <AppText style={reportStyle.small} color="onSurfaceVariant">
        Montants par jour • {series.length} derniers jours de la période
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {series.map((p, i) => (
          <View
            key={i}
            style={{ width: 52, gap: 5, alignItems: 'center' }}
            accessibilityLabel={`${date(p.date)} : ${currency(p.amount)}`}
          >
            <AppText style={{ fontSize: 9, lineHeight: 13 }}>{currency(p.amount)}</AppText>
            <View style={{ height: 100, justifyContent: 'flex-end', width: 20 }}>
              <View
                style={{
                  height: Math.max(2, (Math.max(0, Number(p.amount) || 0) / maximum) * 100),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: '#435f96',
                }}
              />
            </View>
            <AppText style={{ fontSize: 9, lineHeight: 13 }}>{date(p.date)}</AppText>
          </View>
        ))}
      </ScrollView>
      <View style={reportStyle.row}>
        <Icon name="bar-chart" size={15} color="primary" />
        <AppText style={reportStyle.small}>Montants enregistrés</AppText>
      </View>
    </ReportPanel>
  );
}
