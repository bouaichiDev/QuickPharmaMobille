import { createBarcodeConsensus, validCameraBarcode } from '@/utils/barcodeConsensus';

it.each([
  ['ean13', '6118000310624', true],
  ['ean13', '6118000310625', false],
  ['ean13', '611800031062', false],
  ['ean13', '0012345678905', true],
  ['ean8', '96385074', true],
  ['ean8', '96385075', false],
  ['upc_a', '036000291452', true],
  ['upc_a', '036000291453', false],
  ['upc_e', '04252614', true],
  ['upc_e', '04252615', false],
  ['code128', '6180012300683333', true],
  ['code39', 'REF-0001', true],
  ['datamatrix', '010340093618451221SERIAL', true],
])('validates %s %s without rewriting the code', (type, data, expected) => {
  expect(validCameraBarcode({ type, data })).toBe(expected);
});

it('discards a transient wrong reading then accepts the stable code from the box once', () => {
  const accept = createBarcodeConsensus();
  expect(accept({ type: 'upc_a', data: '660352321521' }, 0)).toBeNull();
  const correct = { type: 'ean13', data: '6118000310624' };
  expect(accept(correct, 100)).toBeNull();
  expect(accept(correct, 220)).toBeNull();
  expect(accept(correct, 340)).toBe(correct.data);
  expect(accept({ type: 'upc_a', data: '660352321521' }, 500)).toBeNull();
  expect(accept(correct, 700)).toBeNull();
});

it('does not combine changing codes, same-instant callbacks or stale frames', () => {
  const accept = createBarcodeConsensus();
  const a = { type: 'ean13', data: '6118000310624' };
  const b = { type: 'ean13', data: '4006381333931' };
  for (const now of [0, 0, 0, 10, 30]) expect(accept(a, now)).toBeNull();
  expect(accept(b, 120)).toBeNull();
  expect(accept(a, 240)).toBeNull();
  expect(accept(a, 1600)).toBeNull();
  expect(accept(a, 1720)).toBeNull();
  expect(accept(a, 1840)).toBe(a.data);
});

it('rejects invalid retail checksums and retains leading zeros in confirmed output', () => {
  const accept = createBarcodeConsensus();
  for (const now of [0, 120, 240])
    expect(accept({ type: 'ean13', data: '6118000310625' }, now)).toBeNull();
  const valid = { type: 'ean13', data: ' 0012345678905 ' };
  expect(accept(valid, 400)).toBeNull();
  expect(accept(valid, 520)).toBeNull();
  expect(accept(valid, 640)).toBe('0012345678905');
});
