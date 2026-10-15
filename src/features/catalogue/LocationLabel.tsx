import { useMemo, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { locationQr } from './stockQr';
import * as Print from 'expo-print';
import { escapeHtml, printCrmDocument } from '@/features/crm/documents';
import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText } from '@/components/ui/AppText';
import type { StockLocation } from './stockApi';
import { locationInfo } from './stockPresentation';
import { StockPage, SCard, SButton, SHeading, st } from './StockDesign';
export default function LocationLabel({
  location,
  onClose,
}: {
  location: StockLocation;
  onClose: () => void;
}) {
  const code = locationInfo(location).code || '';
  const qr = useMemo(() => (code ? locationQr(code) : null), [code]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  async function print() {
    if (!qr) return;
    setBusy(true);
    try {
      const html = `<html><head><style>@page{size:60mm 40mm;margin:2mm}body{margin:0;text-align:center;font:10px Arial}h1{font-size:12px;margin:0 0 1mm}svg{height:27mm;width:27mm}p{margin:0}</style></head><body><h1>${escapeHtml(location.name)}</h1>${qr.createSvgTag({ scalable: true })}<p>${escapeHtml(code)}</p></body></html>`;
      if (Platform.OS === 'web') await printCrmDocument(html);
      else {
        const pdf = await Print.printToFileAsync({
          html,
          width: (60 * 72) / 25.4,
          height: (40 * 72) / 25.4,
        });
        await Print.printAsync({ uri: pdf.uri });
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <StockPage
      title="Impression étiquette Rayon"
      onClose={onClose}
      footer={
        <View style={st.row}>
          <View style={st.grow}>
            <SButton label="Fermer" secondary onPress={onClose} />
          </View>
          <View style={st.grow}>
            <SButton
              label="Lancer (1 ex)"
              icon="print"
              busy={busy}
              disabled={!qr}
              onPress={() => void print()}
            />
          </View>
        </View>
      }
    >
      <SCard>
        <SHeading title={location.name} icon="qr-code-2" />
        <View style={{ alignItems: 'center', gap: 12 }}>
          {qr ? (
            <Image
              source={{ uri: qr.createDataURL(5, 20) }}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
            />
          ) : null}
          <AppText variant="headlineSm">{code || 'Code non renseigné'}</AppText>
        </View>
        <AppText variant="bodySm" color="outline">
          Format étiquette 60 × 40 mm. Choisissez votre imprimante dans la fenêtre d’impression.
        </AppText>
      </SCard>
      {error ? <ErrorState error={error} /> : null}
    </StockPage>
  );
}
