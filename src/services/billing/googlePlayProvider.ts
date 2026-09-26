import { Platform } from 'react-native';

import { config } from '@/constants/config';
import { logger } from '@/utils/logger';

import type { BillingProvider, PurchaseOptions, StoreProduct, StorePurchase } from './types';
import { BillingUnavailableError, PurchaseCancelledError } from './types';

/**
 * Google Play Billing adapter, on top of `expo-iap` (OpenIAP).
 *
 * Two rules keep the money side honest:
 *  - nothing here decides what a purchase is worth: the token goes to Laravel,
 *    which asks Google (see billingService);
 *  - a purchase is finished on the device only once the server verified it.
 *    An unverified purchase stays in the queue and `restore()` retries it,
 *    rather than being silently consumed.
 *
 * The module is loaded lazily: it needs a development build, and the app must
 * keep working (with billing unavailable) in Expo Go or on iOS.
 */

type IapModule = typeof import('expo-iap');
type NativePurchase = Awaited<ReturnType<IapModule['getAvailablePurchases']>>[number];

const PURCHASE_TIMEOUT_MS = 5 * 60_000;

let module: IapModule | null | undefined;
let connection: Promise<boolean> | null = null;

/** Native purchases kept by token, so `finishPurchase` can finalise them. */
const nativePurchases = new Map<string, NativePurchase>();

/**
 * Required lazily on purpose: the native module only exists in a development
 * build, and the app must keep running (billing unavailable) in Expo Go.
 */
function loadIap(): IapModule | null {
  if (Platform.OS !== 'android') return null;

  if (module === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
      module = require('expo-iap') as IapModule;
    } catch (error) {
      logger.warn('Google Play Billing module unavailable (development build required)', error);
      module = null;
    }
  }

  return module;
}

async function connect(): Promise<IapModule | null> {
  const iap = loadIap();
  if (!iap) return null;

  connection ??= iap
    .initConnection()
    .then(() => true)
    .catch((error: unknown) => {
      logger.warn('Google Play Billing connection failed', error);
      connection = null;
      return false;
    });

  return (await connection) ? iap : null;
}

async function requireIap(): Promise<IapModule> {
  const iap = await connect();
  if (!iap) {
    throw new BillingUnavailableError([
      Platform.OS === 'android' ? 'NATIVE_BILLING_NOT_INSTALLED' : 'PLATFORM_NOT_SUPPORTED',
    ]);
  }
  return iap;
}

function toStorePurchase(purchase: NativePurchase): StorePurchase | null {
  const token = purchase.purchaseToken;
  if (!token) return null;

  const android = purchase as NativePurchase & {
    isAcknowledgedAndroid?: boolean | null;
    packageNameAndroid?: string | null;
    currentPlanId?: string | null;
  };

  nativePurchases.set(token, purchase);

  return {
    productId: purchase.productId,
    purchaseToken: token,
    orderId: purchase.transactionId ?? null,
    packageName: android.packageNameAndroid ?? config.androidPackage,
    purchaseTime: purchase.transactionDate,
    acknowledged: android.isAcknowledgedAndroid ?? false,
    basePlanId: android.currentPlanId ?? null,
    state: purchase.purchaseState,
  };
}

/**
 * The offer token of the base plan being sold. Google requires it for every
 * subscription purchase, and it is only valid for the product it came from.
 */
async function offerTokenFor(iap: IapModule, product: StoreProduct): Promise<string> {
  const products = await iap.fetchProducts({ skus: [product.productId], type: 'subs' });
  const match = (products ?? []).find((entry) => entry?.id === product.productId);
  const offers =
    match && 'subscriptionOffers' in match ? ((match.subscriptionOffers ?? []) as
      { basePlanIdAndroid?: string | null; offerTokenAndroid?: string | null }[]) : [];

  const offer =
    offers.find((entry) => entry.basePlanIdAndroid === product.basePlanId) ?? offers[0];
  const token = product.offerToken ?? offer?.offerTokenAndroid;

  if (!token) {
    // The product exists in QuickPharma but not (or not activated) in Play Console.
    throw new BillingUnavailableError(['PRODUCT_NOT_CONFIGURED']);
  }

  return token;
}

export const googlePlayProvider: BillingProvider = {
  async isSupported() {
    return (await connect()) !== null;
  },

  /**
   * Opens the Google Play sheet and resolves with the purchase. The outcome
   * arrives through the listeners, never as the return value of requestPurchase.
   */
  async purchaseSubscription(product: StoreProduct, options?: PurchaseOptions) {
    const iap = await requireIap();
    const offerToken = await offerTokenFor(iap, product);

    return new Promise<StorePurchase>((resolve, reject) => {
      let settled = false;

      const finish = (outcome: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        updates.remove();
        errors.remove();
        outcome();
      };

      const updates = iap.purchaseUpdatedListener((purchase) => {
        if (purchase.productId !== product.productId) return;
        const mapped = toStorePurchase(purchase);
        finish(() =>
          mapped
            ? resolve(mapped)
            : reject(new BillingUnavailableError(['NATIVE_BILLING_NOT_INSTALLED'])),
        );
      });

      const errors = iap.purchaseErrorListener((error) => {
        finish(() =>
          reject(iap.isUserCancelledError(error) ? new PurchaseCancelledError() : toError(error)),
        );
      });

      // The sheet can stay open; without this the promise would never settle.
      const timer = setTimeout(
        () => finish(() => reject(new PurchaseCancelledError())),
        PURCHASE_TIMEOUT_MS,
      );

      iap
        .requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [product.productId],
              subscriptionOffers: [{ sku: product.productId, offerToken }],
              obfuscatedAccountId: options?.obfuscatedAccountId ?? undefined,
            },
          },
        })
        .catch((error: unknown) => {
          finish(() =>
            reject(
              iap.isUserCancelledError(error) ? new PurchaseCancelledError() : toError(error),
            ),
          );
        });
    });
  },

  async getActivePurchases() {
    const iap = await connect();
    if (!iap) return [];

    const purchases = await iap.getAvailablePurchases();

    return (purchases ?? [])
      .map(toStorePurchase)
      .filter((purchase): purchase is StorePurchase => purchase !== null);
  },

  async finishPurchase(purchase: StorePurchase) {
    const iap = await connect();
    const native = nativePurchases.get(purchase.purchaseToken);
    if (!iap || !native) return;

    try {
      await iap.finishTransaction({ purchase: native, isConsumable: false });
      nativePurchases.delete(purchase.purchaseToken);
    } catch (error) {
      // The server already acknowledged the purchase, so Google will not refund
      // it; the next restore finishes it on the device.
      logger.warn('Google Play purchase could not be finished on the device', error);
    }
  },
};

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Google Play purchase failed.';
  return new Error(message);
}
