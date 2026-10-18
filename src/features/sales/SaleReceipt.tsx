import { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import {
  receiptCustomer,
  receiptItemTotal,
  receiptSummary,
  type ReceiptData,
} from './SaleDocuments';
import { receiptBarcode } from './receiptBarcode';
import { PosButton, money } from './SalesDesign';
import { saleDate } from './salesModel';
const text = {
  color: '#000',
  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  fontSize: 12,
  lineHeight: 18,
};
const divider = {
  borderTopWidth: 1,
  borderColor: '#000',
  borderStyle: 'dashed' as const,
  marginVertical: 8,
};
export function SaleReceipt({ data, complete = false }: { data: ReceiptData; complete?: boolean }) {
  const [visible, setVisible] = useState(20);
  const t = receiptSummary(data);
  const bars = receiptBarcode(String(data.sale.ref ?? ''));
  const line = (label: string, amount: unknown, strong = false) => (
    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 3 }}>
      <AppText style={[text, { flex: 1 }, strong && { fontWeight: 'bold', fontSize: 15 }]}>
        {label}
      </AppText>
      <AppText style={[text, strong && { fontWeight: 'bold', fontSize: 15 }]}>
        {money(amount)}
      </AppText>
    </View>
  );
  return (
    <View
      style={{
        width: 320,
        maxWidth: '100%',
        alignSelf: 'center',
        backgroundColor: '#fff',
        padding: 16,
        gap: 6,
      }}
    >
      <AppText align="center" style={[text, { fontSize: 17, fontWeight: 'bold', lineHeight: 24 }]}>
        {t.name.toUpperCase()}
      </AppText>
      {t.address ? (
        <AppText align="center" style={text}>
          {t.address}
        </AppText>
      ) : null}
      {t.phone ? (
        <AppText align="center" style={text}>
          {t.phone}
        </AppText>
      ) : null}
      <View style={divider} />
      <AppText align="center" style={[text, { fontWeight: 'bold', fontSize: 15 }]}>
        REÇU DE VENTE
      </AppText>
      <View style={divider} />
      <AppText style={text}>Client : {receiptCustomer(data.sale)}</AppText>
      <AppText style={text}>Date : {saleDate(data.sale.date)}</AppText>
      <AppText style={text}>Référence : {String(data.sale.ref ?? '')}</AppText>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        <AppText style={[text, { flex: 6, fontWeight: 'bold' }]}>Description</AppText>
        <AppText align="center" style={[text, { flex: 1.5, fontWeight: 'bold' }]}>
          Qté
        </AppText>
        <AppText align="right" style={[text, { flex: 2.5, fontWeight: 'bold' }]}>
          Prix
        </AppText>
      </View>
      {(complete ? data.items : data.items.slice(0, visible)).map((row, index) => (
        <View
          key={String(row.id ?? index)}
          style={{
            flexDirection: 'row',
            gap: 4,
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderColor: '#aaa',
            borderStyle: 'dashed',
          }}
        >
          <AppText style={[text, { flex: 6 }]}>
            {String(row.title ?? row.productName ?? row.product_name ?? 'Produit')}
          </AppText>
          <AppText align="center" style={[text, { flex: 1.5 }]}>
            {String(row.qte ?? 0)}
          </AppText>
          <AppText align="right" style={[text, { flex: 2.5 }]}>
            {money(receiptItemTotal(row))}
          </AppText>
        </View>
      ))}
      {!complete && data.items.length > visible ? (
        <PosButton
          label="Afficher la suite des articles"
          secondary
          compact
          onPress={() => setVisible(visible + 20)}
        />
      ) : null}
      <View style={divider} />
      {line('Sous-total', t.subtotal)}
      {t.tax > 0 ? line('TVA', t.tax) : null}
      {t.discount > 0 ? line('Remise', -t.discount) : null}
      {line('TOTAL (DH)', t.total, true)}
      <View style={divider} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <AppText style={[text, { flex: 1 }]}>Mode de paiement</AppText>
        <AppText style={[text, { flex: 1 }]} align="right">
          {t.method}
        </AppText>
      </View>
      {line('Montant payé', t.paid)}
      {data.sale.receivedAmount !== undefined ? line('Montant reçu', t.received) : null}
      {t.change > 0 ? line('Monnaie rendue', t.change) : line('Reste dû', t.due)}
      {data.sale.approvalCode ? (
        <AppText style={text}>Code d’approbation : {String(data.sale.approvalCode)}</AppText>
      ) : null}
      <View style={divider} />
      <AppText align="center" style={[text, { fontWeight: 'bold' }]}>
        MERCI DE VOTRE VISITE !
      </AppText>
      {bars.length ? (
        <View
          accessible
          accessibilityLabel={`Code-barres ${String(data.sale.ref ?? '')}`}
          style={{
            flexDirection: 'row',
            height: 50,
            width: 220,
            maxWidth: '100%',
            alignSelf: 'center',
            marginTop: 8,
          }}
        >
          {bars.map((bar, index) => (
            <View
              key={index}
              style={{ flex: bar.width, backgroundColor: bar.isBlack ? '#000' : '#fff' }}
            />
          ))}
        </View>
      ) : null}
      {bars.length ? (
        <AppText align="center" style={text}>
          {String(data.sale.ref ?? '')}
        </AppText>
      ) : null}
    </View>
  );
}
