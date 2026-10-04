import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { toNumber } from '@/utils/format';
import { logger } from '@/utils/logger';

export interface Product {
  id: number;
  productName: string;
  sku: string;
  categoryId: number;
  quantity: number | null;
  minQuantity: number | null;
  buyingPrice: number | null;
  sellingPrice: number;
  active: number;
  hasExpiration: number;
}

export interface ProductPage {
  data: Product[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface ProductFilters {
  search?: string;
  categoryId?: number | null;
  active?: '0' | '1' | null;
  expiringSoon?: boolean;
  lowStock?: boolean;
}

export interface ProductCreateInput {
  productName: string;
  sku: string;
  status: string;
  categoryId?: string;
  typeId?: string;
  location_id?: string;
  createdBy?: string;
  includeTaxInPrice?: boolean;
  side_effects?: string;
  date_expiration?: string;
  images?: string;
  files?: ImagePickerAsset[];
  minQuantity: string;
  sellingPrice: string;
  buyingPrice: string;
  hasExpiration: '0' | '1';
  date?: string;
  tax?: string;
  quantity?: string;
  discount?: string;
  description?: string;
  active?: '0' | '1';
  precautions?: string;
  interactions?: string;
  requires_prescription?: '0' | '1';
  profitMargin?: string;
  providerId?: string;
}

export interface ProductCreateResult {
  success: string;
  id: string;
}

function productCreateResultFrom(value: unknown): ProductCreateResult | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const validId =
    (typeof raw.id === 'number' && Number.isSafeInteger(raw.id) && raw.id > 0) ||
    (typeof raw.id === 'string' && raw.id.trim().length > 0);
  if (typeof raw.success !== 'string' || !raw.success.trim() || !validId) {
    return null;
  }
  return { success: raw.success, id: String(raw.id) };
}

export function productCreateFormData(input: ProductCreateInput): FormData {
  const { files = [], images = '', ...fields } = input;
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) body.append(key, String(value));
  }
  body.append('images', images);
  files.forEach((asset, index) => {
    if (Platform.OS === 'web') {
      if (!asset.file) throw new ApiError({ kind: 'unknown', message: 'Missing photo file.' });
      body.append('files[' + index + ']', asset.file);
    } else {
      // React Native accepts local URI descriptors instead of browser File objects.
      body.append('files[' + index + ']', {
        uri: asset.uri,
        name: asset.fileName ?? asset.uri.split('/').pop() ?? 'photo-' + index,
        type: asset.mimeType ?? 'application/octet-stream',
      } as unknown as Blob);
    }
  });
  return body;
}

function productFrom(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = toNumber(raw.id);
  const categoryId = toNumber(raw.categoryId);
  const quantity = raw.quantity == null ? null : toNumber(raw.quantity);
  const minQuantity = raw.minQuantity == null ? null : toNumber(raw.minQuantity);
  const buyingPrice = raw.buyingPrice == null ? null : toNumber(raw.buyingPrice);
  const sellingPrice = toNumber(raw.sellingPrice);
  const active = toNumber(raw.active);
  const hasExpiration = toNumber(raw.hasExpiration);

  if (
    id === null ||
    typeof raw.productName !== 'string' ||
    typeof raw.sku !== 'string' ||
    categoryId === null ||
    sellingPrice === null ||
    active === null ||
    hasExpiration === null
  ) {
    return null;
  }

  return {
    id,
    productName: raw.productName,
    sku: raw.sku,
    categoryId,
    quantity,
    minQuantity,
    buyingPrice,
    sellingPrice,
    active,
    hasExpiration,
  };
}

function productPageFrom(value: unknown): ProductPage | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const meta = raw.meta;
  if (!Array.isArray(raw.data) || !meta || typeof meta !== 'object') return null;

  const pageMeta = meta as Record<string, unknown>;
  const currentPage = toNumber(pageMeta.current_page);
  const lastPage = toNumber(pageMeta.last_page);
  const perPage = toNumber(pageMeta.per_page);
  const total = toNumber(pageMeta.total);
  const products = raw.data.map(productFrom);

  if (
    currentPage === null ||
    lastPage === null ||
    perPage === null ||
    total === null ||
    products.some((product) => product === null)
  ) {
    return null;
  }

  return {
    data: products as Product[],
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
    },
  };
}

export const productsApi = {
  async create(input: ProductCreateInput): Promise<ProductCreateResult> {
    const response = await apiPost<unknown>(
      endpoints.products.create,
      productCreateFormData(input),
    );
    const result = productCreateResultFrom(response);
    if (!result) {
      logger.warn('Unexpected product create payload', {
        type: typeof response,
        keys: response && typeof response === 'object' ? Object.keys(response) : [],
      });
      throw new ApiError({ kind: 'unknown', message: 'Unexpected product create payload.' });
    }
    return result;
  },

  async list(page: number, filters: ProductFilters): Promise<ProductPage> {
    const response = await apiGet<unknown>(endpoints.products.list(page), {
      params: {
        searchValue: filters.search || undefined,
        category_id: filters.categoryId ?? undefined,
        active: filters.active ?? undefined,
        expiring_soon: filters.expiringSoon ? '1' : undefined,
        low_stock: filters.lowStock ? '1' : undefined,
        sortField: 'id',
        sortOrder: 'desc',
      },
    });

    const result = productPageFrom(response);
    if (!result) {
      logger.warn('Unexpected product list payload', {
        type: typeof response,
        keys: response && typeof response === 'object' ? Object.keys(response) : [],
      });
      throw new ApiError({ kind: 'unknown', message: 'Unexpected product list payload.' });
    }

    return result;
  },
};
