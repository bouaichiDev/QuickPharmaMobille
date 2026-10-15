import { useContext, useState } from 'react';
import { Image, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useSessionStore } from '@/features/auth/sessionStore';
import { config } from '@/constants/config';
import { StockContext } from './StockContext';
import type { StockProduct } from './stockApi';
export function ProductPhoto({ product, size = 64 }: { product: StockProduct; size?: number }) {
  const preview = useContext(StockContext);
  const token = useSessionStore((s) => s.session?.token);
  const [failedSource, setFailedSource] = useState<string>();
  let filename = '';
  try {
    const parsed = JSON.parse(product.images || '[]');
    filename = typeof parsed[0] === 'string' ? parsed[0] : parsed[0]?.name || '';
  } catch {
    filename = product.images || '';
  }
  const path = filename.startsWith('products/')
    ? filename
    : `products/${product.id}/profile/${filename}`;
  const style = { width: size, height: size, borderRadius: 10, backgroundColor: '#eff4ff' };
  if (preview && product.id === 1)
    return (
      <Image
        source={require('../../../assets/images/stitch-doliprane.jpg')}
        style={style}
        resizeMode="cover"
      />
    );
  const previewPhotos: Record<number, number> = {
    3: require('../../../assets/images/stitch-ravintsara-10.jpg'),
    6: require('../../../assets/images/stitch-ravintsara-30.jpg'),
    7: require('../../../assets/images/stitch-ravintsara-50.jpg'),
  };
  if (preview && previewPhotos[product.id])
    return <Image source={previewPhotos[product.id]} style={style} resizeMode="cover" />;
  if (filename && failedSource !== filename)
    return (
      <Image
        source={{
          uri: config.apiBaseUrl + '/images?filename=' + encodeURIComponent(path),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }}
        style={style}
        resizeMode="contain"
        onError={() => setFailedSource(filename)}
      />
    );
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Icon name="medication" color="primary" size={Math.min(28, size / 2)} />
    </View>
  );
}
