import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { View } from 'react-native';
export default function CrmScannerCamera({ onRead }: { onRead: (value: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  return permission?.granted ? (
    <CameraView
      style={{ height: 320, borderRadius: 12 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'ean8'] }}
      onBarcodeScanned={({ data }) => onRead(data)}
    />
  ) : (
    <View style={{ gap: 12 }}>
      <AppText>Scannez un code pour rechercher le dossier correspondant.</AppText>
      <Button label="Autoriser la caméra" onPress={() => void requestPermission()} />
    </View>
  );
}
