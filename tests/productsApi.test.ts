import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { Platform } from 'react-native';
import { productsApi, productCreateFormData } from '@/features/stores/productsApi';

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
    expect(post).toHaveBeenCalledWith('/products/create', expect.any(FormData));
    const body = post.mock.calls[0]![1] as FormData;
    expect(body.get('productName')).toBe(input.productName);
    expect(body.get('images')).toBe('');
  });

  it('accepts the numeric ID returned by the web create endpoint', async () => {
    post.mockResolvedValue({ success: 'Product has been created successfully.', id: 12813 });
    await expect(
      productsApi.create({
        productName: 'testa001',
        sku: '76223122',
        status: '7',
        minQuantity: '4',
        buyingPrice: '100',
        sellingPrice: '200',
        hasExpiration: '1',
      }),
    ).resolves.toEqual({ success: 'Product has been created successfully.', id: '12813' });
  });

  it('serializes the web fields and native photo descriptors without JSON encoding', () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    try {
      const body = productCreateFormData({
        productName: 'testa001',
        sku: '76223122',
        status: '7',
        minQuantity: '4',
        buyingPrice: '100',
        sellingPrice: '200',
        hasExpiration: '1',
        categoryId: '1060',
        typeId: '6',
        location_id: '1',
        createdBy: '1',
        date: '2026-10-04T01:39:25.830Z',
        date_expiration: '2026-10-13',
        includeTaxInPrice: false,
        side_effects: 'SF1',
        files: [0, 1].map((index) => ({
          uri: 'file:///photo' + index + '.jpg',
          fileName: 'photo' + index + '.jpg',
          mimeType: 'image/jpeg',
          width: 100,
          height: 100,
        })),
      });
      expect(body.get('includeTaxInPrice')).toBe('false');
      expect(body.get('categoryId')).toBe('1060');
      expect(body.get('date')).toBe('2026-10-04T01:39:25.830Z');
      expect(body.get('date_expiration')).toBe('2026-10-13');
      expect(body.get('side_effects')).toBe('SF1');
      expect(body.has('files')).toBe(false);
      expect(append).toHaveBeenCalledWith(
        'files[0]',
        expect.objectContaining({ uri: 'file:///photo0.jpg', type: 'image/jpeg' }),
      );
      expect(append).toHaveBeenCalledWith(
        'files[1]',
        expect.objectContaining({ uri: 'file:///photo1.jpg', type: 'image/jpeg' }),
      );
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: original });
      append.mockRestore();
    }
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
