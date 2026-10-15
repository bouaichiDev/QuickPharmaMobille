import { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '@/components/ui/AppText';
import { PosButton, s } from './SalesDesign';
export default function PosScannerCamera({ onRead }: { onRead: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (value) =>
      setActive(value === 'active'),
    );
    return () => subscription.remove();
  }, []);
  if (error)
    return (
      <View style={[s.card, { flex: 1, justifyContent: 'center' }]}>
        <AppText color="error">{error}</AppText>
        <AppText>La saisie manuelle reste disponible.</AppText>
        <PosButton label="Réessayer la caméra" onPress={() => setError('')} />
      </View>
    );
  if (!permission?.granted)
    return (
      <View style={[s.card, { flex: 1, justifyContent: 'center' }]}>
        <AppText variant="headlineSm">Accès à la caméra</AppText>
        <AppText>
          Autorisez la caméra pour scanner les produits. La saisie manuelle reste disponible.
        </AppText>
        <PosButton
          label={
            permission?.canAskAgain === false ? 'Ouvrir les paramètres' : 'Autoriser la caméra'
          }
          onPress={() => {
            if (permission?.canAskAgain === false)
              void Linking.openSettings().catch(() =>
                setError('Impossible d’ouvrir les paramètres de la caméra.'),
              );
            else
              void requestPermission().catch(() =>
                setError('Impossible de demander l’accès à la caméra.'),
              );
          }}
        />
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      {active ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={flash}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'datamatrix'],
          }}
          onMountError={() => setError('La caméra ne peut pas démarrer.')}
          onBarcodeScanned={({ data }) => onRead(data)}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: '25%',
          left: '10%',
          width: '80%',
          height: '50%',
          borderWidth: 2,
          borderColor: '#72f4e7',
          borderRadius: 16,
        }}
      />
      <View style={{ position: 'absolute', top: 12, right: 12 }}>
        <PosButton
          compact
          label={flash ? 'Flash actif' : 'Activer le flash'}
          icon="flash-on"
          secondary
          onPress={() => setFlash(!flash)}
        />
      </View>
    </View>
  );
}
