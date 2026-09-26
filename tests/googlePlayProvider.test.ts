import { Platform } from 'react-native';

import type { BillingProvider } from '@/services/billing/types';

/**
 * The native Google Play adapter, with `expo-iap` replaced by an in-memory
 * store: purchases arrive through the listeners, exactly as on a device.
 */

const NATIVE_PURCHASE = {
  id: 'GPA.1',
  productId: 'qp_pro',
  purchaseToken: 'token-from-play',
  transactionId: 'GPA.1',
  transactionDate: 1_700_000_000_000,
  purchaseState: 'purchased' as const,
  isAutoRenewing: true,
  quantity: 1,
  store: 'play-store',
  isAcknowledgedAndroid: false,
  packageNameAndroid: 'com.quickpharma.mobile',
  currentPlanId: 'monthly',
};

const SUBSCRIPTION_PRODUCT = {
  id: 'qp_pro',
  type: 'subs' as const,
  subscriptionOffers: [
    { basePlanIdAndroid: 'yearly', offerTokenAndroid: 'offer-yearly' },
    { basePlanIdAndroid: 'monthly', offerTokenAndroid: 'offer-monthly' },
  ],
};

interface MockIap {
  initConnection: jest.Mock;
  fetchProducts: jest.Mock;
  requestPurchase: jest.Mock;
  getAvailablePurchases: jest.Mock;
  finishTransaction: jest.Mock;
  purchaseUpdatedListener: jest.Mock;
  purchaseErrorListener: jest.Mock;
  isUserCancelledError: jest.Mock;
}

let mockIap: MockIap;

function buildIap(overrides: Partial<MockIap> = {}): MockIap {
  const listeners: { purchase: ((p: unknown) => void)[]; error: ((e: unknown) => void)[] } = {
    purchase: [],
    error: [],
  };

  const module: MockIap = {
    initConnection: jest.fn(async () => true),
    fetchProducts: jest.fn(async () => [SUBSCRIPTION_PRODUCT]),
    // The purchase is delivered by the listener, never by the return value.
    requestPurchase: jest.fn(async () => {
      setImmediate(() => listeners.purchase.forEach((listener) => listener(NATIVE_PURCHASE)));
      return null;
    }),
    getAvailablePurchases: jest.fn(async () => [NATIVE_PURCHASE]),
    finishTransaction: jest.fn(async () => undefined),
    purchaseUpdatedListener: jest.fn((listener: (p: unknown) => void) => {
      listeners.purchase.push(listener);
      return { remove: () => listeners.purchase.splice(listeners.purchase.indexOf(listener), 1) };
    }),
    purchaseErrorListener: jest.fn((listener: (e: unknown) => void) => {
      listeners.error.push(listener);
      return { remove: () => listeners.error.splice(listeners.error.indexOf(listener), 1) };
    }),
    isUserCancelledError: jest.fn((error: unknown) => (error as { code?: string })?.code === 'user-cancelled'),
    ...overrides,
  };

  return module;
}

function loadProvider(): BillingProvider {
  let provider: BillingProvider;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    provider = require('@/services/billing/googlePlayProvider').googlePlayProvider;
  });
  return provider!;
}

// Delegates to the current mock: the factory itself is only evaluated once.
jest.mock(
  'expo-iap',
  () => ({
    initConnection: (...args: unknown[]) => mockIap.initConnection(...args),
    fetchProducts: (...args: unknown[]) => mockIap.fetchProducts(...args),
    requestPurchase: (...args: unknown[]) => mockIap.requestPurchase(...args),
    getAvailablePurchases: (...args: unknown[]) => mockIap.getAvailablePurchases(...args),
    finishTransaction: (...args: unknown[]) => mockIap.finishTransaction(...args),
    purchaseUpdatedListener: (...args: unknown[]) => mockIap.purchaseUpdatedListener(...args),
    purchaseErrorListener: (...args: unknown[]) => mockIap.purchaseErrorListener(...args),
    isUserCancelledError: (...args: unknown[]) => mockIap.isUserCancelledError(...args),
  }),
  { virtual: true },
);

describe('google play provider', () => {
  beforeAll(() => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
  });

  beforeEach(() => {
    mockIap = buildIap();
  });

  it('buys the offer of the requested base plan, tied to the account', async () => {
    const provider = loadProvider();

    const purchase = await provider.purchaseSubscription(
      { productId: 'qp_pro', basePlanId: 'monthly' },
      { obfuscatedAccountId: 'account-token' },
    );

    expect(mockIap.fetchProducts).toHaveBeenCalledWith({ skus: ['qp_pro'], type: 'subs' });
    expect(mockIap.requestPurchase).toHaveBeenCalledWith({
      type: 'subs',
      request: {
        google: {
          skus: ['qp_pro'],
          subscriptionOffers: [{ sku: 'qp_pro', offerToken: 'offer-monthly' }],
          obfuscatedAccountId: 'account-token',
        },
      },
    });
    expect(purchase).toEqual({
      productId: 'qp_pro',
      purchaseToken: 'token-from-play',
      orderId: 'GPA.1',
      packageName: 'com.quickpharma.mobile',
      purchaseTime: 1_700_000_000_000,
      acknowledged: false,
      basePlanId: 'monthly',
      state: 'purchased',
    });
  });

  it('refuses a product without any offer in Play Console', async () => {
    mockIap = buildIap({ fetchProducts: jest.fn(async () => []) });
    const provider = loadProvider();

    await expect(
      provider.purchaseSubscription({ productId: 'qp_pro', basePlanId: 'monthly' }),
    ).rejects.toMatchObject({ reasons: ['PRODUCT_NOT_CONFIGURED'] });
    expect(mockIap.requestPurchase).not.toHaveBeenCalled();
  });

  it('reports a cancelled sheet as a cancellation, not a failure', async () => {
    mockIap = buildIap({
      requestPurchase: jest.fn(async () => {
        throw { code: 'user-cancelled', message: 'cancelled' };
      }),
    });
    const provider = loadProvider();

    await expect(
      provider.purchaseSubscription({ productId: 'qp_pro', basePlanId: 'monthly' }),
    ).rejects.toMatchObject({ name: 'PurchaseCancelledError' });
  });

  it('is unavailable when the billing connection cannot be opened', async () => {
    mockIap = buildIap({
      initConnection: jest.fn(async () => {
        throw new Error('no billing service');
      }),
    });
    const provider = loadProvider();

    await expect(provider.isSupported()).resolves.toBe(false);
    await expect(
      provider.purchaseSubscription({ productId: 'qp_pro' }),
    ).rejects.toMatchObject({ reasons: ['NATIVE_BILLING_NOT_INSTALLED'] });
  });

  it('lists the purchases the phone still holds and ignores those without a token', async () => {
    mockIap = buildIap({
      getAvailablePurchases: jest.fn(async () => [
        NATIVE_PURCHASE,
        { ...NATIVE_PURCHASE, productId: 'qp_basic', purchaseToken: null },
      ]),
    });
    const provider = loadProvider();

    const purchases = await provider.getActivePurchases();

    expect(purchases).toHaveLength(1);
    expect(purchases[0]?.productId).toBe('qp_pro');
  });

  it('finishes a purchase with the native transaction, never consuming it', async () => {
    const provider = loadProvider();
    const [purchase] = await provider.getActivePurchases();

    await provider.finishPurchase?.(purchase!);

    expect(mockIap.finishTransaction).toHaveBeenCalledWith({
      purchase: NATIVE_PURCHASE,
      isConsumable: false,
    });
  });

  it('never finishes a purchase it did not see', async () => {
    const provider = loadProvider();

    await provider.finishPurchase?.({
      productId: 'qp_pro',
      purchaseToken: 'unknown-token',
      orderId: null,
      packageName: 'com.quickpharma.mobile',
      purchaseTime: 0,
      acknowledged: true,
    });

    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
  });
});
