import { ApiError } from '@/services/api/apiError';
import { apiGet } from '@/services/api/client';
import { providersApi } from '@/features/stores/providersApi';

jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
}));

const get = apiGet as jest.MockedFunction<typeof apiGet>;

describe('providers API', () => {
  beforeEach(() => get.mockReset());

  it('loads provider ids and names from the Swagger dropdown endpoint', async () => {
    get.mockResolvedValue([{ id: 3, name: 'Fournisseur test' }]);

    await expect(providersApi.dropdown()).resolves.toEqual([{ id: 3, name: 'Fournisseur test' }]);
    expect(get).toHaveBeenCalledWith('/providerDropdown');
  });

  it('rejects dropdown responses that do not match the documented shape', async () => {
    get.mockResolvedValue({ data: [] });

    await expect(providersApi.dropdown()).rejects.toBeInstanceOf(ApiError);
  });
});
