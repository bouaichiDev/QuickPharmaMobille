import { Platform } from 'react-native';

import { createBillingService } from '@/services/billing/billingService';
import {
  BillingUnavailableError,
  PURCHASE_STATUSES,
  type BillingBackend,
  type BillingProvider,
} from '@/services/billing/types';

function provider(supported: boolean): BillingProvider {
  return {
    isSupported: jest.fn(async () => supported),
    purchaseSubscription: jest.fn(async () => ({
      productId: 'qp_pro',
      purchaseToken: 'token-from-play',
      orderId: 'GPA.1',
      packageName: 'com.quickpharma.mobile',
      purchaseTime: 1,
      acknowledged: false,
    })),
    getActivePurchases: jest.fn(async () => []),
  };
}

function backend(available: boolean): BillingBackend {
  return {
    isAvailable: () => available,
    verifyPurchase: jest.fn(async () => ({
      subscription_id: 'sub_1',
      plan_id: 2,
      status: 'active' as const,
      expires_at: null,
      auto_renewing: true,
    })),
    restorePurchases: jest.fn(async () => []),
  };
}

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

    await expect(service.subscribe({ id: 2, providerProductId: 'qp_pro' }, 'enc-store')).rejects.toBeInstanceOf(
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

  it('sends the purchase token to the backend and returns its verified subscription', async () => {
    const server = backend(true);
    const service = createBillingService(provider(true), server);

    const result = await service.subscribe({ id: 2, providerProductId: 'qp_pro' }, 'enc-store');

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
});
