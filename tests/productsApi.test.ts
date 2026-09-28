import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { productsApi } from '@/features/stores/productsApi';

jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const get = apiGet as jest.MockedFunction<typeof apiGet>;
const post = apiPost as jest.MockedFunction<typeof apiPost>;

describe('products API', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('creates a product using the Swagger endpoint and validates the response', async () => {
    const input = {
      productName: 'Produit test',
      sku: 'SKU-05',
      status: '1' as const,
      minQuantity: '5',
      sellingPrice: '15.00',
      buyingPrice: '10.00',
      hasExpiration: '1' as const,
      quantity: '3',
      active: '1' as const,
    };
    const response = { success: 'Product has been created successfully.', id: '5' };
    post.mockResolvedValue(response);

    await expect(productsApi.create(input)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith('/products/create', input);
  });

  it('rejects a product create response that does not match Swagger', async () => {
    post.mockResolvedValue({ success: true, id: 5 });

    await expect(
      productsApi.create({
        productName: 'Produit test',
        sku: 'SKU-05',
        status: '1',
        minQuantity: '5',
        sellingPrice: '15.00',
        buyingPrice: '10.00',
        hasExpiration: '1',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('requests a product page with supported search and inventory filters', async () => {
    const response = {
      data: [
        {
          id: 5,
          productName: 'Produit test',
          sku: 'SKU-05',
          categoryId: 2,
          quantity: '3',
          minQuantity: '5',
          buyingPrice: '10.00',
          sellingPrice: '15.00',
          active: 1,
          hasExpiration: 1,
          requires_prescription: 0,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
    };
    get.mockResolvedValue(response);

    await expect(
      productsApi.list(1, {
        search: 'test',
        categoryId: 2,
        active: '1',
        expiringSoon: true,
        lowStock: true,
      }),
    ).resolves.toMatchObject({
      ...response,
      data: [
        {
          id: 5,
          productName: 'Produit test',
          sku: 'SKU-05',
          categoryId: 2,
          quantity: 3,
          minQuantity: 5,
          buyingPrice: 10,
          sellingPrice: 15,
          active: 1,
          hasExpiration: 1,
        },
      ],
    });
    expect(get).toHaveBeenCalledWith('/productList/1', {
      params: {
        searchValue: 'test',
        category_id: 2,
        active: '1',
        expiring_soon: '1',
        low_stock: '1',
        sortField: 'id',
        sortOrder: 'desc',
      },
    });
  });

  it('rejects data that does not match the expected product paginator', async () => {
    get.mockResolvedValue({ data: [], meta: {} });

    await expect(productsApi.list(1, {})).rejects.toBeInstanceOf(ApiError);
  });
});
