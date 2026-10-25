import { act, renderHook } from '@testing-library/react-native';
import { useI18nStore } from '@/i18n/i18nStore';
import { useStockScannerTranslation } from '@/i18n/useStockScannerTranslation';
import { stockScannerMessages } from '@/i18n/stockScannerMessages';

afterEach(() => useI18nStore.setState({ language: 'fr', remote: null }));

it.each([
  ['fr', 'Ce code-barres'],
  ['en', 'This barcode'],
  ['es', 'Este código'],
  ['ar', 'هذا الرمز'],
] as const)(
  'translates the duplicate warning in %s and keeps the real product name',
  (language, prefix) => {
    useI18nStore.setState({ language, remote: null });
    const { result } = renderHook(() => useStockScannerTranslation());
    const message = result.current('stock_scanner_duplicate', { product: 'FEBREX ADULTE' });
    expect(message).toContain(prefix);
    expect(message).toContain('FEBREX ADULTE');
    expect(message).not.toContain('[product]');
    expect(result.current('stock_scanner_view_linked')).toBe(
      stockScannerMessages.stock_scanner_view_linked[language],
    );
  },
);

it('updates the displayed language and prioritizes API translations over the offline fallback', () => {
  useI18nStore.setState({ language: 'fr', remote: null });
  const { result } = renderHook(() => useStockScannerTranslation());
  expect(result.current('stock_scanner_rescan')).toBe('Scanner un autre code');
  act(() =>
    useI18nStore.setState({
      language: 'en',
      remote: { stock_scanner_rescan: 'Custom scan label' },
    }),
  );
  expect(result.current('stock_scanner_rescan')).toBe('Custom scan label');
  expect(result.current('stock_scanner_paused')).toBe('Scanning paused: the code has been saved.');
});
