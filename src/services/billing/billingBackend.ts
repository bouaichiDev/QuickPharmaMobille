import type { BillingBackend, VerifiedSubscription } from './types';
import { BillingUnavailableError } from './types';

/**
 * No Laravel endpoint verifies Google Play purchases yet. This backend reports
 * itself unavailable instead of pretending: nothing is ever activated client-side.
 * Expected routes are specified in docs/mobile-api-gaps.md.
 */
export const billingBackend: BillingBackend = {
  isAvailable() {
    return false;
  },

  async verifyPurchase(): Promise<VerifiedSubscription> {
    throw new BillingUnavailableError(['BACKEND_VERIFICATION_MISSING']);
  },

  async restorePurchases(): Promise<VerifiedSubscription[]> {
    throw new BillingUnavailableError(['BACKEND_VERIFICATION_MISSING']);
  },
};
