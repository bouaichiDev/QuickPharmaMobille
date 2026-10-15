import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PosAvatar, PosBadge, PosButton, PosLine, money, pos, s } from './SalesDesign';
import { saleDate } from './salesModel';
import type { CrmRecord } from '@/features/crm/crmApi';
export interface CreditReceipt {
  name: string;
  debt: number;
  amount: number;
  method: string;
  date: string;
  allocations?: CrmRecord[];
}
export function CreditConfirmation({
  payment,
  reference = '',
  remaining,
  estimated = false,
  busy = false,
  onPrint,
  onShare,
}: {
  payment: CreditReceipt;
  reference?: string;
  remaining: number;
  estimated?: boolean;
  busy?: boolean;
  onPrint: () => void;
  onShare: () => void;
}) {
  return (
    <>
      <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <View style={[s.success, { backgroundColor: pos.teal }]}>
          <Icon name="check-circle" color="onPrimary" size={44} />
        </View>
        <AppText variant="headlineLg" align="center">
          Règlement enregistré avec succès
        </AppText>
        {reference ? <PosBadge label={reference} /> : null}
        <AppText color="outline">{saleDate(payment.date)}</AppText>
      </View>
      <View style={[s.card, { gap: 24 }]}>
        <View style={[s.inset, s.row]}>
          <PosAvatar name={payment.name} />
          <View style={s.grow}>
            <AppText variant="labelSm" color="outline">
              PATIENT / CLIENT
            </AppText>
            <AppText variant="headlineSm">{payment.name}</AppText>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <AppText variant="labelMd" color="outline">
            MONTANT TOTAL ENCAISSÉ
          </AppText>
          <AppText variant="dataMetric" style={{ color: pos.blue, fontSize: 36, lineHeight: 44 }}>
            {money(payment.amount)} <AppText variant="headlineSm">DH</AppText>
          </AppText>
          <PosBadge label={payment.method} tone="teal" icon="payments" />
        </View>
        {payment.allocations?.length ? (
          <View style={s.stack}>
            <AppText variant="labelMd" color="outline">
              IMPUTATION & APUREMENT
            </AppText>
            {payment.allocations.slice(0, 20).map((row, index) => (
              <View key={String(row.sale_id ?? index)} style={[s.inset, s.row]}>
                <View style={s.grow}>
                  <AppText variant="labelLg">{String(row.sale_ref ?? 'Vente')}</AppText>
                  <AppText variant="bodySm" color="outline">
                    {row.payment_type === 'full' ? 'Vente soldée' : 'Règlement partiel'}
                  </AppText>
                </View>
                <AppText variant="labelLg">{money(row.amount_paid)} DH</AppText>
                <PosBadge
                  label={row.payment_type === 'full' ? 'Soldée' : 'Partielle'}
                  tone="teal"
                />
              </View>
            ))}
            {payment.allocations.length > 20 ? (
              <AppText variant="bodySm" color="outline">
                {payment.allocations.length} ventes concernées au total. Le reçu contient le
                règlement complet.
              </AppText>
            ) : null}
          </View>
        ) : null}
        <View style={[s.inset, { backgroundColor: '#dffffb' }]}>
          <PosLine
            label={estimated ? 'Crédit restant estimé' : 'Crédit restant'}
            value={remaining}
            strong
            tone={pos.teal}
          />
          {!estimated && remaining === 0 ? (
            <PosBadge label="Compte équilibré à jour" tone="teal" icon="check-circle-outline" />
          ) : null}
        </View>
      </View>
      <View style={s.row}>
        <View style={s.grow}>
          <PosButton
            label="Reçu PDF"
            icon="picture-as-pdf"
            secondary
            loading={busy}
            onPress={onPrint}
          />
        </View>
        <View style={s.grow}>
          <PosButton label="Partager" icon="share" secondary onPress={onShare} />
        </View>
      </View>
    </>
  );
}
