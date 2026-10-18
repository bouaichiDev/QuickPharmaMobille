import { apiGet } from '@/services/api/client';
import { listPayload } from '@/features/crm/crmApi';
import { stockApi, type Page, type StockProduct } from './stockApi';

/** The web endpoint owns the visible products, their order and pagination.
 * The stock endpoint only supplies mobile counters and available metadata.
 */
export async function loadWebCatalogue(
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Page<StockProduct>> {
  const filter = String(params.filter ?? 'all');
  // These are additional mobile-only stock filters; keep their server-side scope.
  if (params.location_id != null || !['all', 'low', 'expiring'].includes(filter))
    return stockApi.products(params, signal);
  const [body, stock] = await Promise.all([
    apiGet<unknown>('/productList', {
      params: {
        page: params.page ?? 1,
        per_page: 10,
        searchValue: params.search ?? '',
        category_id: params.category_id,
        sortField: 'id',
        sortOrder: 'desc',
        ...(filter === 'low' ? { low_stock: 1 } : {}),
        ...(filter === 'expiring' ? { expiring_soon: 1 } : {}),
      },
      signal,
    }),
    stockApi.products(params, signal).catch(() => undefined),
  ]);
  const page = listPayload(body);
  const metadata = new Map(stock?.data.map((product) => [Number(product.id), product]));
  return {
    current_page: Number(params.page ?? 1),
    last_page: page.lastPage,
    total: page.total,
    counts: stock?.counts
      ? { ...stock.counts, ...(filter === 'all' ? { all: page.total } : {}) }
      : undefined,
    data: page.rows.map((row) => {
      const extra = metadata.get(Number(row.id));
      return {
        ...extra,
        ...row,
        id: Number(row.id),
        productName: String(row.productName ?? ''),
        sku: String(row.sku ?? ''),
        images: Array.isArray(row.images)
          ? JSON.stringify(row.images)
          : typeof row.images === 'string'
            ? row.images
            : extra?.images,
        quantity: Number(row.QteAvailable ?? row.quantity ?? 0),
        minQuantity: Number(row.minQuantity ?? 0),
        buyingPrice: Number(row.buyingPrice ?? 0),
        sellingPrice: Number(row.sellingPrice ?? 0),
        discount: Number(row.discount ?? 0),
        active: Number(row.active ?? 1),
        hasExpiration: Number(row.hasExpiration ?? 0),
        expiry: typeof row.expiredDate === 'string' ? row.expiredDate.slice(0, 10) : undefined,
        stockMetadataLoaded: !!extra,
      };
    }),
  };
}
