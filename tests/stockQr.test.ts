import { locationQr } from '../src/features/catalogue/stockQr';

test('creates a QR label with the core library without an optional UTF-8 extension', () => {
  const qr = locationQr('RAY-A-01');
  expect(qr.createDataURL()).toMatch(/^data:image\/gif;base64,/);
  expect(qr.getModuleCount()).toBeGreaterThan(0);
});

test('encodes accented location names as UTF-8', () => {
  expect(() => locationQr('�tag�re �t� � A')).not.toThrow();
});
