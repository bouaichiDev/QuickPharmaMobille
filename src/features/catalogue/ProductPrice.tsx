import { View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { productDiscount, productSalePrice } from './productPricing';
export function ProductPrice({
  product,
}: {
  product: { sellingPrice: number; discount?: number | null };
}) {
  const discount = productDiscount(product);
  const money = (value: number) =>
    value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <View style={{ gap: 2 }}>
      {discount > 0 ? (
        <AppText variant="bodySm" color="outline" style={{ textDecorationLine: 'line-through' }}>
          {money(product.sellingPrice)} DH
        </AppText>
      ) : null}
      <AppText variant="labelLg" color={discount > 0 ? 'secondary' : 'primary'}>
        {money(productSalePrice(product))} DH
      </AppText>
      {discount > 0 ? (
        <AppText variant="labelSm" color="secondary">
          Remise : {discount} %
        </AppText>
      ) : null}
    </View>
  );
}
