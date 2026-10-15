import { useRef } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SaleReceipt } from './SaleReceipt';
import type { ReceiptData } from './SaleDocuments';

/** Mounted only while exporting: capture the paper, independently of screen/scroll position. */
export function ReceiptImageExport({
  data,
  onDone,
}: {
  data: ReceiptData;
  onDone: (error?: unknown) => void;
}) {
  const paper = useRef<View>(null);
  const started = useRef(false);
  async function exportImage() {
    if (started.current) return;
    started.current = true;
    try {
      if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        throw new Error(
          'Le partage du reçu en image nécessite l’application mobile et une application de partage compatible.',
        );
      }
      // onLayout guarantees measured content; a frame also allows native text to paint.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const uri = await captureRef(paper, { format: 'png', result: 'tmpfile' });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Partager le reçu de vente',
      });
      // Keep the temporary cache file alive for the receiving application's URI grant.
      onDone();
    } catch (error) {
      onDone(error);
    }
  }
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: -10000, top: 0, width: 320 }}
    >
      <View
        ref={paper}
        collapsable={false}
        onLayout={() => void exportImage()}
        style={{ width: 320, backgroundColor: '#fff' }}
      >
        <SaleReceipt data={data} complete />
      </View>
    </View>
  );
}
