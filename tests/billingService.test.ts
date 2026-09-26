import { Platform } from 'react-native';

import { createBillingService } from '@/services/billing/billingService';
import {
  BillingUnavailableError,
  PURCHASE_STATUSES,
  PurchaseCancelledError,
  isPurchaseCancelled,
  type BillingBackend,
  type BillingProvider,
  type StorePurchase,
} from '@/services/billing/types';

const PURCHASE: StorePurchase = {
  productId: 'qp_pro',
  purchaseToken: 'token-from-play',
  orderId: 'GPA.1',
  packageName: 'com.quickpharma.mobile',
  purchaseTime: 1,
  acknowledged: false,
  basePlanId: 'monthly',
  state: 'purchased',
};

function provider(supported: boolean, overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    isSupported: jest.fn(async () => supported),
    purchaseSubscription: jest.fn(async () => PURCHASE),
    getActivePurchases: jest.fn(async () => []),
    finishPurchase: jest.fn(async () => undefined),
    ...overrides,
  };
}

function backend(available: boolean, overrides: Partial<BillingBackend> = {}): BillingBackend {
  return {
    isAvailable: () => available,
    storeProducts: jest.fn(async () => [
      {
        planId: 2,
        planName: 'Pro',
        productId: 'qp_pro',
        basePlanId: 'monthly',
        offerId: null,
        billingPeriod: 'monthly' as const,
        price: 249,
      },
    ]),
    accountToken: jest.fn(async () => 'obfuscated-account-id'),
    verifyPurchase: jest.fn(async () => ({
      subscription_id: 'sub_1',
      plan_id: 2,
      status: 'active' as const,
      expires_at: null,
      auto_renewing: true,
      product_id: 'qp_pro',
    })),
    restorePurchases: jest.fn(async () => []),
    ...overrides,
  };
}

const PLAN = { id: 2, providerProductId: 'qp_pro' };

describe('billing service', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
  });

  it('declares the eight subscription statuses', () => {
    expect(PURCHASE_STATUSES).toEqual([
      'pending',
      'purchased',
      'active',
      'cancelled',
      'expired',
      'grace_period',
      'paused',
      'refunded',
    ]);
  });

  it('refuses to start a purchase while the backend cannot verify it', async () => {
    const store = provider(true);
    const service = createBillingService(store, backend(false));

    await expect(service.subscribe(PLAN, 'enc-store')).rejects.toBeInstanceOf(
      BillingUnavailableError,
    );
    expect(store.purchaseSubscription).not.toHaveBeenCalled();
  });

  it('reports every missing piece', async () => {
    const service = createBillingService(provider(false), backend(false));
    const state = await service.availability({ id: 2, providerProductId: null });
    expect(state.available).toBe(false);
    expect(state.reasons).toEqual([
      'NATIVE_BILLING_NOT_INSTALLED',
      'PRODUCT_NOT_CONFIGURED',
      'BACKEND_VERIFICATION_MISSING',
    ]);
  });

  it('buys the product the server maps to the plan, tied to the account', async () => {
    const store = provider(true);
    const server = backend(true);
    const service = createBillingService(store, server);

    const result = await service.subscribe(PLAN, 'enc-store');

    expect(store.purchaseSubscription).toHaveBeenCalledWith(
      { productId: 'qp_pro', basePlanId: 'monthly' },
      { obfuscatedAccountId: 'obfuscated-account-id' },
    );
    expect(server.verifyPurchase).toHaveBeenCalledWith({
      platform: 'google_play',
      plan_id: 2,
      product_id: 'qp_pro',
      purchase_token: 'token-from-play',
      package_name: 'com.quickpharma.mobile',
      store_id: 'enc-store',
    });
    expect(result.status).toBe('active');
  });

  it('refuses a plan the store does not sell', async () => {
    const store = provider(true);
    const service = createBillingService(
      store,
      backend(true, { storeProducts: jest.fn(async () => []) }),
    );

    await expect(service.subscribe(PLAN, 'enc-store')).rejects.toMatchObject({
      reasons: ['PRODUCT_NOT_CONFIGURED'],
    });
    expect(store.purchaseSubscription).not.toHaveBeenCalled();
  });

  it('finishes the purchase on the device only once the server verified it', async () => {
    const store = provider(true);
    const service = createBillingService(store, backend(true));

    await service.subscribe(PLAN, 'enc-store');

    expect(store.finishPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseToken: 'token-from-play' }),
    );
  });

  it('leaves an unverified purchase in the store queue', async () => {
    const store = provider(true);
    const service = createBillingService(
      store,
      backend(true, {
        verifyPurchase: jest.fn(async () => {
          throw new Error('network down');
        }),
      }),
    );

    await expect(service.subscribe(PLAN, 'enc-store')).rejects.toThrow('network down');
    expect(store.finishPurchase).not.toHaveBeenCalled();
  });

  it('still buys when the account token cannot be read', async () => {
    const store = provider(true);
    const service = createBillingService(
      store,
      backend(true, {
        accountToken: jest.fn(async () => {
          throw new Error('403');
        }),
      }),
    );

    await service.subscribe(PLAN, 'enc-store');

    expect(store.purchaseSubscription).toHaveBeenCalledWith(expect.anything(), {
      obfuscatedAccountId: null,
    });
  });

  it('reports a cancelled purchase as such', async () => {
    const service = createBillingService(
      provider(true, {
        purchaseSubscription: jest.fn(async () => {
          throw new PurchaseCancelledError();
        }),
      }),
      backend(true),
    );

    await expect(service.subscribe(PLAN, 'enc-store')).rejects.toThrow(PurchaseCancelledError);
    expect(isPurchaseCancelled(new PurchaseCancelledError())).toBe(true);
  });

  it('restores the purchases held by the phone and finishes the settled ones', async () => {
    const pending: StorePurchase = { ...PURCHASE, productId: 'qp_basic', purchaseToken: 'token-2' };
    const store = provider(true, {
      getActivePurchases: jest.fn(async () => [PURCHASE, pending]),
    });
    const server = backend(true, {
      restorePurchases: jest.fn(async () => [
        {
          subscription_id: 'sub_1',
          plan_id: 2,
          status: 'active' as const,
          expires_at: null,
          auto_renewing: true,
          product_id: 'qp_pro',
        },
        {
          subscription_id: null,
          plan_id: 3,
          status: 'pending' as const,
          expires_at: null,
          auto_renewing: false,
          product_id: 'qp_basic',
        },
      ]),
    });
    const service = createBillingService(store, server);

    const restored = await service.restore();

    expect(server.restorePurchases).toHaveBeenCalledWith([PURCHASE, pending]);
    expect(restored).toHaveLength(2);
    // The pending one stays in the queue: nothing was paid for yet.
    expect(store.finishPurchase).toHaveBeenCalledTimes(1);
    expect(store.finishPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'qp_pro' }),
    );
  });

  it('does not call the server when the phone holds no purchase', async () => {
    const server = backend(true);
    const service = createBillingService(provider(true), server);

    await expect(service.restore()).resolves.toEqual([]);
    expect(server.restorePurchases).not.toHaveBeenCalled();
  });
});
