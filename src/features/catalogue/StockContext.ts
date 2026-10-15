import type { productInventoryApi } from './productInventoryApi';
import { createContext, useContext } from 'react';
import { stockApi } from './stockApi';
import type { EffectiveAccess } from '@/types/access';
/** Development gallery supplies an isolated in-memory API; production always uses HTTP. */
export const StockContext = createContext<{
  api: typeof stockApi;
  inventoryApi?: typeof productInventoryApi;
  scope: string;
  access: EffectiveAccess;
} | null>(null);
export function useStockApi() {
  return useContext(StockContext)?.api || stockApi;
}
