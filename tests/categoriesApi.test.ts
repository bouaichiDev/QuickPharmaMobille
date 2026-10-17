import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { categoriesApi } from '@/features/stores/categoriesApi';

jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const get = apiGet as jest.MockedFunction<typeof apiGet>;

describe('categories API', () => {
  beforeEach(() => get.mockReset());

  it('loads the Laravel category paginator with the documented search parameter', async () => {
    const response = {
      current_page: 1,
      data: [
        {
          id: 4,
          store_id: 12,
          code: 'CAT-04',
          description: null,
          name: 'Médicaments',
          user_id: 7,
          active: 1,
          created_at: null,
          updated_at: null,
        },
      ],
      last_page: 2,
      per_page: 20,
      total: 21,
    };
    get.mockResolvedValue(response);

    await expect(categoriesApi.list(1, 'méd')).resolves.toEqual(response);
    expect(get).toHaveBeenCalledWith('/categoryListe', {
      params: {
        page: 1,
        per_page: 20,
        searchValue: 'méd',
        sortField: 'id',
        sortOrder: 'desc',
      },
    });
  });

  it('rejects an unexpected response instead of rendering fabricated data', async () => {
    get.mockResolvedValue({ data: [] });

    await expect(categoriesApi.list(1, '')).rejects.toBeInstanceOf(ApiError);
  });
});
it('creates a category using the Laravel active string contract', async () => {
  const post = apiPost as jest.Mock;
  post.mockResolvedValue({ success: 'ok' });
  await categoriesApi.save({
    name: ' Soins ',
    code: ' S01 ',
    description: ' Description ',
    active: true,
  });
  expect(post).toHaveBeenLastCalledWith('/Addcategory', {
    name: 'Soins',
    code: 'S01',
    description: 'Description',
    active: 'true',
  });
});
it('updates the selected category rather than creating another', async () => {
  await categoriesApi.save(
    { name: 'Soins', code: 'S01', description: 'Description', active: false },
    4,
  );
  expect(apiPost).toHaveBeenLastCalledWith('/category/update', {
    id: 4,
    name: 'Soins',
    code: 'S01',
    description: 'Description',
    active: 'false',
  });
});
