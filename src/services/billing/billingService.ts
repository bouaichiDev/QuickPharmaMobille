import { Linking, Platform } from 'react-native';

import { config } from '@/constants/config';
import { logger } from '@/utils/logger';

import { billingBackend } from './billingBackend';
import { googlePlayProvider } from './googlePlayProvider';
import {
  BillingUnavailableError,
  type BillingAvailability,
  type BillingBackend,
  type BillingProvider,
  type BillingUnavailableReason,
  type StoreProductMapping,
  type VerifiedSubscription,
} from './types';

interface PurchasablePlan {
  id: number;
  providerProductId: string | null;
}

export function createBillingService(provider: BillingProvider, backend: BillingBackend) {
  async function availability(plan?: PurchasablePlan): Promise<BillingAvailability> {
    const reasons: BillingUnavailableReason[] = [];
    if (Platform.OS !== 'android') reasons.push('PLATFORM_NOT_SUPPORTED');
    else if (!(await provider.isSupported())) reasons.push('NATIVE_BILLING_NOT_INSTALLED');
    if (plan && !plan.providerProductId) reasons.push('PRODUCT_NOT_CONFIGURED');
    if (!backend.isAvailable()) reasons.push('BACKEND_VERIFICATION_MISSING');
    return { available: reasons.length === 0, reasons };
  }

  /** The Google Play product selling a plan, as the server maps it. */
  async function productFor(planId: number): Promise<StoreProductMapping> {
    const products = await backend.storeProducts();
    const product = products.find((entry) => entry.planId === planId);

    if (!product) throw new BillingUnavailableError(['PRODUCT_NOT_CONFIGURED']);

    return product;
  }

  /**
   * The purchase is only finished on the device once the server verified it:
   * an unfinished purchase is retried by `restore()` instead of being lost.
   */
  async function finish(purchases: { productId: string; purchaseToken: string }[]): Promise<void> {
    if (!provider.finishPurchase) return;

    for (const purchase of purchases) {
      try {
        await provider.finishPurchase({
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          orderId: null,
          packageName: config.androidPackage,
          purchaseTime: 0,
          acknowledged: true,
        });
      } catch (error) {
        logger.warn('Finishing a verified purchase failed', error);
      }
    }
  }

  return {
    availability,

    /**
     * Full flow. Never resolves with an unverified purchase: the subscription
     * returned comes from Laravel after its own Google Play check.
     */
    async subscribe(plan: PurchasablePlan, storeId: string): Promise<VerifiedSubscription> {
      const state = await availability(plan);
      if (!state.available) throw new BillingUnavailableError(state.reasons);

      const product = await productFor(plan.id);

      // Ties the purchase to this account inside Google Play. A missing token
      // must not block the purchase: the server also binds the token itself.
      const obfuscatedAccountId = await backend.accountToken().catch((error: unknown) => {
        logger.warn('Account token unavailable, buying without it', error);
        return null;
      });

      const purchase = await provider.purchaseSubscription(
        { productId: product.productId, basePlanId: product.basePlanId },
        { obfuscatedAccountId },
      );

      const verified = await backend.verifyPurchase({
        platform: 'google_play',
        plan_id: plan.id,
        product_id: purchase.productId,
        purchase_token: purchase.purchaseToken,
        package_name: purchase.packageName,
        store_id: storeId,
      });

      await finish([purchase]);

      return verified;
    },

    /** Re-verifies with the server every purchase the phone still holds. */
    async restore(): Promise<VerifiedSubscription[]> {
      const state = await availability();
      if (!state.available) throw new BillingUnavailableError(state.reasons);

      const purchases = await provider.getActivePurchases();
      if (purchases.length === 0) return [];

      const verified = await backend.restorePurchases(purchases);
      const settled = new Set(
        verified.filter((entry) => entry.status !== 'pending').map((entry) => entry.product_id),
      );

      await finish(purchases.filter((purchase) => settled.has(purchase.productId)));

      return verified;
    },

    /** Opens Google Play's own subscription management page. */
    async openManageSubscriptions(productId?: string | null): Promise<void> {
      // Built by hand: URLSearchParams is only partially implemented in React Native.
      let query = `package=${encodeURIComponent(config.androidPackage)}`;
      if (productId) query += `&sku=${encodeURIComponent(productId)}`;
      await Linking.openURL(`https://play.google.com/store/account/subscriptions?${query}`);
    },
  };
}

export const billingService = createBillingService(googlePlayProvider, billingBackend);
