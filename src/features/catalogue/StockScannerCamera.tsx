import { useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { SButton, SNote, ScannerGuide } from './StockDesign';
import { Icon } from '@/components/ui/Icon';
export default function StockScannerCamera({ onRead }: { onRead: (value: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  async function request() {
    try {
      const result = await requestPermission();
      if (!result.granted)
        setError('La caméra n’est pas autorisée. Vous pouvez saisir le code manuellement.');
    } catch {
      setError('La caméra est indisponible. Saisissez le code manuellement.');
    }
  }
  return permission?.granted ? (
    <View style={{ gap: 10 }}>
      <View
        style={{ height: 280, borderRadius: 14, overflow: 'hidden', backgroundColor: '#213145' }}
      >
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'code128',
              'code39',
              'upc_a',
              'upc_e',
              'datamatrix',
              'qr',
            ],
          }}
          onBarcodeScanned={({ data }) => onRead(data)}
          onMountError={() =>
            setError('La caméra ne peut pas démarrer. Utilisez la saisie manuelle.')
          }
        />
        <ScannerGuide />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Éteindre le flash' : 'Allumer le flash'}
          onPress={() => setTorch((v) => !v)}
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#213145cc',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={torch ? 'flash-on' : 'flash-off'} color="onPrimary" size={20} />
        </Pressable>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            padding: 10,
            borderRadius: 10,
            backgroundColor: '#213145cc',
          }}
        >
          <AppText variant="bodySm" color="onPrimary" align="center">
            Alignez le code-barres dans le cadre.
          </AppText>
        </View>
      </View>
      {error ? <SNote error>{error}</SNote> : null}
    </View>
  ) : (
    <View style={{ gap: 12 }}>
      <SNote>
        Autorisez la caméra pour scanner un produit. La saisie manuelle reste disponible.
      </SNote>
      <SButton
        label={
          permission?.canAskAgain === false ? 'Ouvrir les paramètres caméra' : 'Autoriser la caméra'
        }
        icon="camera-alt"
        onPress={() =>
          permission?.canAskAgain === false ? void Linking.openSettings() : void request()
        }
      />
      {error ? <SNote error>{error}</SNote> : null}
    </View>
  );
}
