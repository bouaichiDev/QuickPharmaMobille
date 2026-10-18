import { apiGet } from '@/services/api/client';
import { stockApi } from '@/features/catalogue/stockApi';
import { loadWebCatalogue } from '@/features/catalogue/webCatalogue';
jest.mock('@/services/api/client', () => ({ apiGet: jest.fn(), httpClient: {} }));
jest.mock('@/features/catalogue/stockApi', () => ({ stockApi: { products: jest.fn() } }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiGet).mockResolvedValue({
    data: [
      {
        id: 99,
        productName: 'QA récent',
        sku: '0099',
        sellingPrice: '100',
        QteAvailable: '12',
        quantity: 80,
        discount: '5',
      },
      { id: 98, productName: 'QA précédent', sku: '0098', sellingPrice: '50', QteAvailable: '3' },
    ],
    meta: { total: 42, last_page: 5, current_page: 1 },
  });
  jest.mocked(stockApi.products).mockResolvedValue({
    data: [
      { id: 1, productName: 'A-GRAM', quantity: 1 },
      { id: 99, locationName: 'Rayon A' },
    ] as never,
    current_page: 1,
    total: 42,
    last_page: 5,
    counts: { all: 42, low: 18 },
  });
});
it('uses the web product list and its order, ignoring the legacy alphabetic stock order', async () => {
  const result = await loadWebCatalogue({ filter: 'all', page: 1, search: '' });
  expect(apiGet).toHaveBeenCalledWith(
    '/productList',
    expect.objectContaining({
      params: expect.objectContaining({
        page: 1,
        per_page: 10,
        searchValue: '',
        sortField: 'id',
        sortOrder: 'desc',
      }),
    }),
  );
  expect(result.data.map((p) => p.id)).toEqual([99, 98]);
  expect(result.data[0]).toMatchObject({ quantity: 12, discount: 5, locationName: 'Rayon A' });
  expect(result).toMatchObject({ total: 42, last_page: 5 });
});
it('uses the web search, category and low-stock filters', async () => {
  await loadWebCatalogue({ filter: 'low', page: 2, search: 'QA', category_id: 7 });
  expect(apiGet).toHaveBeenCalledWith(
    '/productList',
    expect.objectContaining({
      params: expect.objectContaining({ page: 2, searchValue: 'QA', category_id: 7, low_stock: 1 }),
    }),
  );
});
it('still shows the web products if the optional stock metadata request fails', async () => {
  jest.mocked(stockApi.products).mockRejectedValue(new Error('Indisponible'));
  expect((await loadWebCatalogue({ filter: 'all' })).data.map((p) => p.id)).toEqual([99, 98]);
});
it('keeps mobile-specific location filtering on the stock endpoint', async () => {
  await loadWebCatalogue({ filter: 'all', location_id: 8 });
  expect(apiGet).not.toHaveBeenCalled();
  expect(stockApi.products).toHaveBeenCalledWith({ filter: 'all', location_id: 8 }, undefined);
});
