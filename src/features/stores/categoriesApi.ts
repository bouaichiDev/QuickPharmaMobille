import { ApiError } from '@/services/api/apiError';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { logger } from '@/utils/logger';

export const CATEGORY_PAGE_SIZE = 20;

export interface Category {
  id: number;
  store_id: number | null;
  code: string | null;
  description: string | null;
  name: string | null;
  user_id: number;
  active: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryPage {
  current_page: number;
  data: Category[];
  last_page: number;
  per_page: number;
  total: number;
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== 'object') return false;
  const category = value as Partial<Category>;
  return (
    typeof category.id === 'number' &&
    (typeof category.store_id === 'number' || category.store_id === null) &&
    (typeof category.name === 'string' || category.name === null) &&
    (typeof category.code === 'string' || category.code === null) &&
    (typeof category.description === 'string' || category.description === null) &&
    typeof category.user_id === 'number' &&
    (typeof category.active === 'number' || category.active === null) &&
    (typeof category.created_at === 'string' || category.created_at === null) &&
    (typeof category.updated_at === 'string' || category.updated_at === null)
  );
}

function isCategoryPage(value: unknown): value is CategoryPage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<CategoryPage>;
  return (
    typeof page.current_page === 'number' &&
    typeof page.last_page === 'number' &&
    typeof page.per_page === 'number' &&
    typeof page.total === 'number' &&
    Array.isArray(page.data) &&
    page.data.every(isCategory)
  );
}

export const categoriesApi = {
  async list(page: number, searchValue: string): Promise<CategoryPage> {
    const body = await apiGet<unknown>(endpoints.categories.list, {
      params: {
        page,
        per_page: CATEGORY_PAGE_SIZE,
        searchValue: searchValue || undefined,
        sortField: 'id',
        sortOrder: 'desc',
      },
    });

    if (!isCategoryPage(body)) {
      logger.warn('Unexpected /categoryListe payload', {
        type: typeof body,
        keys: body && typeof body === 'object' ? Object.keys(body) : [],
      });
      throw new ApiError({ kind: 'unknown', message: 'Unexpected categories payload.' });
    }

    return body;
  },
};