import { ApiError } from '@/services/api/apiError';
import { apiGet, apiPost } from '@/services/api/client';
import { billingBackend } from '@/services/billing/billingBackend';
import type { StorePurchase } from '@/services/billing/types';

jest.mock('@/services/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

const get = apiGet as jest.MockedFunction<typeof apiGet>;
const post = apiPost as jest.MockedFunction<typeof apiPost>;

const PURCHASE: StorePurchase = {
  productId: 'qp_pro',
  purchaseToken: 'token-from-play',
  orderId: 'GPA.1',
  packageName: 'com.quickpharma.mobile',
  purchaseTime: 1,
  acknowledged: false,
};

describe('billing backend', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('maps the store products of the plans sold on Google Play', async () => {
    get.mockResolvedValue({
      success: true,
      data: [
        {
          plan_id: 3,
          plan_name: 'Pro',
          product_id: 'qp_pro',
          base_plan_id: 'monthly',
          offer_id: null,
          billing_period: 'monthly',
          price: '249.00',
        },
        {
          plan_id: 3,
          plan_name: 'Pro',
          product_id: 'qp_pro',
          base_plan_id: 'yearly',
          offer_id: 'intro',
          billing_period: 'unknown',
          price: 2490,
        },
      ],
    });

    const products = await billingBackend.storeProducts();

    expect(get).toHaveBeenCalledWith('/billing/google-play/products');
    expect(products[0]).toEqual({
      planId: 3,
      planName: 'Pro',
      productId: 'qp_pro',
      basePlanId: 'monthly',
      offerId: null,
      billingPeriod: 'monthly',
      price: 249,
    });
    expect(products[1]?.billingPeriod).toBeNull();
    expect(products[1]?.offerId).toBe('intro');
  });

  it('sends the purchase token and returns the verified subscription', async () => {
    post.mockResolvedValue({
      success: true,
      data: {
        subscription_id: 'sub_1',
        plan_id: 3,
        status: 'active',
        expires_at: '2026-10-16T10:00:00+01:00',
        auto_renewing: true,
      },
    });

    const verified = await billingBackend.verifyPurchase({
      platform: 'google_play',
      plan_id: 3,
      product_id: 'qp_pro',
      purchase_token: 'token-from-play',
      package_name: 'com.quickpharma.mobile',
      store_id: 'enc-store',
    });

    expect(post).toHaveBeenCalledWith(
      '/billing/google-play/verify',
      expect.objectContaining({ purchase_token: 'token-from-play', store_id: 'enc-store' }),
    );
    expect(verified.status).toBe('active');
  });

  /**
   * The server answers a pending payment with 202: axios does not reject it,
   * so the envelope has to be read or the app would believe the plan is active.
   */
  it('turns a 202 pending purchase into an error carrying its code', async () => {
    post.mockResolvedValue({
      success: false,
      status: false,
      code: 'PURCHASE_PENDING',
      reason: null,
      message: 'Le paiement est en attente.',
      message_key: 'billing.errors.PURCHASE_PENDING',
      details: {},
      data: {
        subscription_id: null,
        plan_id: 3,
        status: 'pending',
        expires_at: null,
        auto_renewing: false,
      },
    });

    await expect(
      billingBackend.verifyPurchase({
        platform: 'google_play',
        plan_id: 3,
        product_id: 'qp_pro',
        purchase_token: 'token-from-play',
        package_name: 'com.quickpharma.mobile',
        store_id: 'enc-store',
      }),
    ).rejects.toMatchObject({
      code: 'PURCHASE_PENDING',
      messageKey: 'billing.errors.PURCHASE_PENDING',
    });
  });

  it('only sends the product and the token when restoring', async () => {
    post.mockResolvedValue({ success: true, data: [], errors: [] });

    await billingBackend.restorePurchases([PURCHASE]);

    expect(post).toHaveBeenCalledWith('/billing/google-play/restore', {
      purchases: [{ product_id: 'qp_pro', purchase_token: 'token-from-play' }],
    });
  });

  it('reports an empty body instead of pretending the call worked', async () => {
    get.mockResolvedValue({ success: true });

    await expect(billingBackend.accountToken()).rejects.toBeInstanceOf(ApiError);
  });

  it('reads the opaque account id', async () => {
    get.mockResolvedValue({ success: true, data: { obfuscated_account_id: 'a'.repeat(64) } });

    await expect(billingBackend.accountToken()).resolves.toHaveLength(64);
    expect(get).toHaveBeenCalledWith('/billing/google-play/account-token');
  });
});
