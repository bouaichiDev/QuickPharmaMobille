import { Platform } from 'react-native';

import type { BillingProvider, StorePurchase } from './types';
import { BillingUnavailableError } from './types';

/**
 * Placeholder for the Google Play Billing adapter.
 *
 * The native module (e.g. expo-iap / react-native-iap) requires a development
 * build and is intentionally not installed yet: without the Laravel
 * verification endpoint a purchase could not be activated safely. Replace the
 * bodies below when the backend part exists (docs/mobile-api-gaps.md).
 */
export const googlePlayProvider: BillingProvider = {
  async isSupported() {
    return false;
  },

  async purchaseSubscription(): Promise<StorePurchase> {
    throw new BillingUnavailableError(
      Platform.OS === 'android' ? ['NATIVE_BILLING_NOT_INSTALLED'] : ['PLATFORM_NOT_SUPPORTED'],
    );
  },

  async getActivePurchases(): Promise<StorePurchase[]> {
    throw new BillingUnavailableError(['NATIVE_BILLING_NOT_INSTALLED']);
  },
};
