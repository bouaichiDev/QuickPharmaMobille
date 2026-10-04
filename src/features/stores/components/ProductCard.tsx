import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { colors, radii, spacing } from '@/theme';
import { formatAmount, formatNumber } from '@/utils/format';

import type { Product } from '../productsApi';

interface ProductCardProps {
  product: Product;
  categoryName: string | undefined;
  currency: string | null;
  locale: string;
  labels: {
    active: string;
    inactive: string;
    expiryRequired: string;
    noExpiry: string;
    purchasePrice: string;
    sellingPrice: string;
    lowStock: string;
    available: string;
    units: string;
  };
}

export function ProductCard({
  product,
  categoryName,
  currency,
  locale,
  labels,
}: ProductCardProps) {
  const quantity = product.quantity ?? 0;
  const minimum = product.minQuantity ?? 0;
  const lowStock = quantity <= minimum;

  return (
    <Card style={[styles.card, lowStock ? styles.lowStockCard : null]}>
      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.productIcon}>
            <Icon name="medication" size="md" color={lowStock ? 'warning' : 'primary'} />
          </View>
          <View style={styles.productInfo}>
            <View style={styles.nameRow}>
              <AppText variant="labelLg" numberOfLines={2} style={styles.name}>
                {product.productName}
              </AppText>
              <Badge
                label={product.active === 1 ? labels.active : labels.inactive}
                tone={product.active === 1 ? 'success' : 'neutral'}
              />
            </View>
            <AppText variant="bodySm" color="outline">
              SKU: {product.sku}
            </AppText>
            <View style={styles.badges}>
              {categoryName ? <Badge label={categoryName} /> : null}
              <Badge
                label={product.hasExpiration === 1 ? labels.expiryRequired : labels.noExpiry}
                tone={product.hasExpiration === 1 ? 'warning' : 'neutral'}
              />
            </View>
          </View>
        </View>

        <View style={styles.metrics}>
          <View style={styles.priceMetric}>
            <AppText variant="bodySm" color="outline">
              {labels.purchasePrice}
            </AppText>
            <AppText variant="labelMd">
              {formatAmount(product.buyingPrice, currency, locale)}
            </AppText>
          </View>
          <View style={styles.priceMetric}>
            <AppText variant="bodySm" color="outline">
              {labels.sellingPrice}
            </AppText>
            <AppText variant="labelMd" color="primary">
              {formatAmount(product.sellingPrice, currency, locale)}
            </AppText>
          </View>
          <View style={styles.stockMetric}>
            <AppText variant="bodySm" color={lowStock ? 'error' : 'success'}>
              {lowStock ? labels.lowStock : labels.available}
            </AppText>
            <AppText variant="headlineSm" color={lowStock ? 'error' : 'success'}>
              {formatNumber(quantity, locale)}
            </AppText>
            <AppText variant="bodySm" color="outline">
              {labels.units} · {formatNumber(minimum, locale)}
            </AppText>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.stockHint}>
            <View style={[styles.dot, { backgroundColor: colors[lowStock ? 'warning' : 'success'] }]} />
            <AppText variant="bodySm" color={lowStock ? 'warning' : 'success'}>
              {lowStock ? labels.lowStock : labels.available}
            </AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  lowStockCard: {
    borderColor: colors.warning,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  productIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  productInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  priceMetric: {
    flex: 1,
    gap: spacing.xs,
  },
  stockMetric: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  footer: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
  },
});