import { useContext } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StoreHeader } from '@/features/stores/components/StoreHeader';
import { AppHeader } from '@/components/navigation/AppHeader';
import { StockContext } from './StockContext';

/** Stock shares the same header as other pages; search and scan live in its content. */
export function StockHeader(_props: { onSearch: () => void; onScan: () => void }) {
  const preview = useContext(StockContext);
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#f8f9ff' }}>
      {preview ? (
        <AppHeader
          storeName="Pharmacie"
          storeLabel="Établissement actif"
          canSwitchStore={false}
          userName={null}
        />
      ) : (
        <StoreHeader />
      )}
    </SafeAreaView>
  );
}
