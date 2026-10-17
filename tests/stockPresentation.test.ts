import { locationInfo, readMetadata, productInfo } from '@/features/catalogue/stockPresentation';
import type { StockProduct } from '@/features/catalogue/stockApi';
it('does not invent occupancy without a configured capacity', () => {
  expect(
    locationInfo({ id: 1, name: 'Frigo', quantity: 12, products: 2 }).occupancy,
  ).toBeUndefined();
  expect(
    locationInfo({
      id: 1,
      name: 'Rayon',
      quantity: 12,
      products: 2,
      metadata: '{"capacity":60,"zone":"otc"}',
    }).occupancy,
  ).toBe(20);
  expect(readMetadata('not json')).toEqual({});
  expect(readMetadata('[]')).toEqual({});
});
it('uses medicine metadata and the existing tax inclusion setting', () => {
  const product = {
    sellingPrice: 100,
    buyingPrice: 60,
    tax: 7,
    includeTaxInPrice: 0,
    medicine_catalog_metadata: '{"active_substance":"Paracétamol","epi":"Laboratoire"}',
  } as StockProduct;
  expect(productInfo(product)).toMatchObject({
    ttc: 107,
    substance: 'Paracétamol',
    manufacturer: 'Laboratoire',
    margin: 40,
    gain: 40,
  });
  expect(productInfo({ ...product, includeTaxInPrice: 1 }).ttc).toBe(100);
});
