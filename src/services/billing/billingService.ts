import { Linking, Platform } from 'react-native';

import { config } from '@/constants/config';

import { billingBackend } from './billingBackend';
import { googlePlayProvider } from './googlePlayProvider';
import {
  BillingUnavailableError,
  type BillingAvailability,
  type BillingBackend,
  type BillingProvider,
  type BillingUnavailableReason,
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

  return {
    availability,

    /**
     * Full flow. Never resolves with an unverified purchase: the subscription
     * returned comes from Laravel after its own Google Play check.
     */
    async subscribe(plan: PurchasablePlan, storeId: string): Promise<VerifiedSubscription> {
      const state = await availability(plan);
      if (!state.available || !plan.providerProductId) {
        throw new BillingUnavailableError(state.reasons);
      }
      const purchase = await provider.purchaseSubscription({ productId: plan.providerProductId });
      return backend.verifyPurchase({
        platform: 'google_play',
        plan_id: plan.id,
        product_id: purchase.productId,
        purchase_token: purchase.purchaseToken,
        package_name: purchase.packageName,
        store_id: storeId,
      });
    },

    async restore(): Promise<VerifiedSubscription[]> {
      const state = await availability();
      if (!state.available) throw new BillingUnavailableError(state.reasons);
      const purchases = await provider.getActivePurchases();
      return backend.restorePurchases(purchases);
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
