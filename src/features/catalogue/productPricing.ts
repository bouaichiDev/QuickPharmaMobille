export function productDiscount(product: { discount?: number | null }) {
  const value = Number(product.discount ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}
export function productSalePrice(product: { sellingPrice: number; discount?: number | null }) {
  return (
    Math.round(
      (product.sellingPrice * (1 - productDiscount(product) / 100) + Number.EPSILON) * 100,
    ) / 100
  );
}
