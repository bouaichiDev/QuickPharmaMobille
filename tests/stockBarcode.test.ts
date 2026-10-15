import { barcodePattern, barcodeHtml } from '@/features/catalogue/stockBarcode';
import { productCode } from '@/features/catalogue/stockApi';
it('encodes a valid EAN-13 with guards and quiet zones', () => {
  const result = barcodePattern('4006381333931');
  expect(result.format).toBe('EAN-13');
  expect(result.bars.reduce((n, b) => n + b.width, 0)).toBe(117);
  expect(result.bars[0]).toEqual({ width: 11, isBlack: false });
  expect(result.bars.at(-1)).toEqual({ width: 11, isBlack: false });
});
it('uses Code 128 for non-EAN references and rejects unreadable characters', () => {
  expect(barcodePattern('REF-AROM-0042').format).toBe('CODE 128');
  expect(barcodePattern('REF-AROM-0042').bars.length).toBeGreaterThan(0);
  expect(barcodePattern('漢字').bars).toEqual([]);
});
it('retains explicit leading zeros and never mistakes an internal reference for an assigned barcode', () => {
  expect(productCode({ sku: 'REF-0042', barcode: '0012345678905' })).toBe('0012345678905');
  expect(productCode({ sku: 'REF-0042' })).toBe('');
  expect(productCode({ sku: '4006381333931' })).toBe('4006381333931');
});
it('escapes product names and barcode content in the printable label', () => {
  const html = barcodeHtml('CODE"<1', '<script>unsafe</script>');
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('<rect ');
});

test('keeps long numeric product barcodes without truncating or treating them as absent', () => {
  expect(productCode({ sku: '6180012300683333' })).toBe('6180012300683333');
  expect(barcodePattern('6180012300683333').format).toBe('CODE 128');
});
