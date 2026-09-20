/**
 * Mobile billing contracts. The purchase flow is:
 * select plan -> Google Play purchase -> purchaseToken -> Laravel verifies it
 * with Google Play -> QuickPharma subscription activated -> access refreshed.
 * The app never validates a purchase itself and never holds a Google key.
 */

export const PURCHASE_STATUSES = [
  'pending',
  'purchased',
  'active',
  'cancelled',
  'expired',
  'grace_period',
  'paused',
  'refunded',
] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export interface StoreProduct {
  /** Google Play subscription product id (plans.provider_product_id). */
  productId: string;
  basePlanId?: string;
  offerToken?: string;
  localizedPrice?: string;
}

/** Result of the native purchase sheet, before any server verification. */
export interface StorePurchase {
  productId: string;
  purchaseToken: string;
  orderId: string | null;
  packageName: string;
  purchaseTime: number;
  acknowledged: boolean;
}

/** Payload for the backend verification endpoint (to be created — see docs). */
export interface VerifyPurchaseRequest {
  platform: 'google_play';
  plan_id: number;
  product_id: string;
  purchase_token: string;
  package_name: string;
  store_id: string;
}

/** Expected backend answer once the subscription is verified. */
export interface VerifiedSubscription {
  subscription_id: string;
  plan_id: number;
  status: PurchaseStatus;
  expires_at: string | null;
  auto_renewing: boolean;
}

export type BillingUnavailableReason =
  | 'NATIVE_BILLING_NOT_INSTALLED'
  | 'PLATFORM_NOT_SUPPORTED'
  | 'PRODUCT_NOT_CONFIGURED'
  | 'BACKEND_VERIFICATION_MISSING';

export interface BillingAvailability {
  available: boolean;
  reasons: BillingUnavailableReason[];
}

/** Native store adapter (Google Play Billing Library via a dev-build module). */
export interface BillingProvider {
  isSupported(): Promise<boolean>;
  purchaseSubscription(product: StoreProduct): Promise<StorePurchase>;
  getActivePurchases(): Promise<StorePurchase[]>;
}

/** Server side of billing: Laravel is the only authority on purchases. */
export interface BillingBackend {
  isAvailable(): boolean;
  verifyPurchase(request: VerifyPurchaseRequest): Promise<VerifiedSubscription>;
  restorePurchases(purchases: StorePurchase[]): Promise<VerifiedSubscription[]>;
}

export class BillingUnavailableError extends Error {
  constructor(readonly reasons: BillingUnavailableReason[]) {
    super(`Billing unavailable: ${reasons.join(', ')}`);
    this.name = 'BillingUnavailableError';
  }
}
