import { useTranslation } from './useTranslation';
import { stockScannerMessages } from './stockScannerMessages';
import type { TranslationParams } from './translate';

export function useStockScannerTranslation() {
  const { language, tDynamic } = useTranslation();
  return (key: keyof typeof stockScannerMessages, params?: TranslationParams) =>
    tDynamic(key, stockScannerMessages[key][language], params);
}
