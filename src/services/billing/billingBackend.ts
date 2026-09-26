import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import { toNumber } from '@/utils/format';

import type {
  BillingBackend,
  StoreProductMapping,
  StorePurchase,
  VerifiedSubscription,
  VerifyPurchaseRequest,
} from './types';

/**
 * The Laravel side of Google Play billing: it is the only authority on what a
 * purchase token is worth (docs/access-control/api-contract.md §5).
 *
 * `store_id` and `lang` are added by the HTTP client; `verify` still sends the
 * store explicitly because the server contract requires it in the body.
 */

interface Envelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  code?: string;
  reason?: string | null;
  message_key?: string;
  details?: Record<string, unknown>;
}

interface ApiStoreProduct {
  plan_id: number;
  plan_name: string;
  product_id: string;
  base_plan_id: string;
  offer_id: string | null;
  billing_period: string | null;
  price: number | string;
}

interface RestoreEnvelope extends Envelope<VerifiedSubscription[]> {
  errors?: { index: number; product_id: string; code: string; reason: string | null }[];
}

/**
 * A refusal the server answers with a 2xx status: `PURCHASE_PENDING` is a 202,
 * so axios does not reject it. It still means no access was opened.
 */
function refusal(body: Envelope<unknown>): ApiError {
  return new ApiError({
    kind: 'conflict',
    message: body.message ?? 'The purchase could not be verified.',
    status: 202,
    code: body.code ?? null,
    reason: body.reason ?? null,
    messageKey: body.message_key ?? null,
    details: body.details ?? {},
  });
}

function unwrap<T>(body: Envelope<T>): T {
  if (body.success === false) throw refusal(body);
  if (body.data === undefined || body.data === null) {
    throw new ApiError({ kind: 'server', message: body.message ?? 'Empty billing response.' });
  }
  return body.data;
}

function mapProduct(product: ApiStoreProduct): StoreProductMapping {
  const period = product.billing_period;
  return {
    planId: product.plan_id,
    planName: product.plan_name,
    productId: product.product_id,
    basePlanId: product.base_plan_id,
    offerId: product.offer_id ?? null,
    billingPeriod: period === 'monthly' || period === 'yearly' ? period : null,
    price: toNumber(product.price) ?? 0,
  };
}

export const billingBackend: BillingBackend = {
  isAvailable() {
    return true;
  },

  async storeProducts(): Promise<StoreProductMapping[]> {
    const body = await apiGet<Envelope<ApiStoreProduct[]>>(endpoints.billing.googlePlay.products);
    return unwrap(body).map(mapProduct);
  },

  async accountToken(): Promise<string> {
    const body = await apiGet<Envelope<{ obfuscated_account_id: string }>>(
      endpoints.billing.googlePlay.accountToken,
    );
    return unwrap(body).obfuscated_account_id;
  },

  async verifyPurchase(request: VerifyPurchaseRequest): Promise<VerifiedSubscription> {
    const body = await apiPost<Envelope<VerifiedSubscription>>(
      endpoints.billing.googlePlay.verify,
      request,
    );
    return unwrap(body);
  },

  async restorePurchases(purchases: StorePurchase[]): Promise<VerifiedSubscription[]> {
    const body = await apiPost<RestoreEnvelope>(endpoints.billing.googlePlay.restore, {
      purchases: purchases.map((purchase) => ({
        product_id: purchase.productId,
        purchase_token: purchase.purchaseToken,
      })),
    });
    // Per-purchase refusals travel in `errors`; the call itself succeeded.
    return unwrap(body);
  },
};
