import { useRef, useState } from 'react';
import { createBarcodeConsensus } from '@/utils/barcodeConsensus';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Linking, Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { SButton, SNote, ScannerGuide } from './StockDesign';
import { Icon } from '@/components/ui/Icon';
import { useStockScannerTranslation } from '@/i18n/useStockScannerTranslation';
export default function StockScannerCamera({
  onRead,
  paused = false,
}: {
  onRead: (value: string) => void;
  paused?: boolean;
}) {
  const tScan = useStockScannerTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const accept = useRef(createBarcodeConsensus());
  async function request() {
    try {
      const result = await requestPermission();
      if (!result.granted) setError(tScan('stock_scanner_permission_denied'));
    } catch {
      setError(tScan('stock_scanner_unavailable'));
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
          autofocus="on"
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
          onBarcodeScanned={
            paused
              ? undefined
              : (event) => {
                  const value = accept.current(event);
                  if (value) onRead(value);
                }
          }
          onMountError={() => setError(tScan('stock_scanner_startup_error'))}
        />
        <ScannerGuide />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tScan(torch ? 'stock_scanner_flash_off' : 'stock_scanner_flash_on')}
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
            {tScan(paused ? 'stock_scanner_paused' : 'stock_scanner_hold')}
          </AppText>
        </View>
      </View>
      {error ? <SNote error>{error}</SNote> : null}
    </View>
  ) : (
    <View style={{ gap: 12 }}>
      <SNote>{tScan('stock_scanner_permission_intro')}</SNote>
      <SButton
        label={tScan(
          permission?.canAskAgain === false ? 'stock_scanner_settings' : 'stock_scanner_allow',
        )}
        icon="camera-alt"
        onPress={() =>
          permission?.canAskAgain === false ? void Linking.openSettings() : void request()
        }
      />
      {error ? <SNote error>{error}</SNote> : null}
    </View>
  );
}
