import { lazy, Suspense, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { PosButton, PosPage, pos, s } from './SalesDesign';
const Camera = lazy(() => import('./PosScannerCamera'));
const cameraAvailable = Platform.OS !== 'web' && Boolean(requireOptionalNativeModule('ExpoCamera'));
export function PosScanner({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: (code: string) => void;
}) {
  const [manual, setManual] = useState('');
  const read = useRef(false);
  function submit(code: string) {
    if (!read.current && code.trim()) {
      read.current = true;
      onRead(code.trim());
    }
  }
  return (
    <PosPage title="Scanner un produit" onClose={onClose} scroll={false}>
      <View style={[s.root, { padding: 16, gap: 16, backgroundColor: '#0b1c30' }]}>
        <AppText variant="labelLg" style={{ color: '#fff', textAlign: 'center' }}>
          SCANNER LE CODE-BARRES / DATAMATRIX
        </AppText>
        <View style={{ flex: 1, minHeight: 170, borderRadius: 24, overflow: 'hidden' }}>
          {cameraAvailable ? (
            <Suspense
              fallback={<AppText style={{ color: '#fff' }}>Chargement du scanner…</AppText>}
            >
              <Camera onRead={submit} />
            </Suspense>
          ) : (
            <View style={[s.card, { flex: 1, justifyContent: 'center' }]}>
              <AppText>
                La caméra n’est pas disponible ici. Utilisez la saisie manuelle ci-dessous.
              </AppText>
            </View>
          )}
        </View>
        <AppText align="center" style={{ color: '#fff' }}>
          Placez le code-barres du produit dans le cadre.
        </AppText>
        <View style={s.card}>
          <TextField
            appearance="crm"
            label="Saisie manuelle CIP / EAN"
            value={manual}
            onChangeText={setManual}
            placeholder="Ex. : 3400936184512"
            autoCapitalize="none"
          />
          <PosButton
            label="Rechercher le produit"
            icon="arrow-forward"
            disabled={!manual.trim()}
            onPress={() => submit(manual)}
          />
          <AppText variant="bodySm" style={{ color: pos.muted }}>
            EAN-13, EAN-8, Code 128, QR et DataMatrix
          </AppText>
        </View>
      </View>
    </PosPage>
  );
}
