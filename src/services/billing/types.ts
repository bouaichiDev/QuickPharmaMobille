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
  /** Google Play subscription product id (store_products.product_id). */
  productId: string;
  /** Base plan sold (monthly, yearly): picks the offer inside the product. */
  basePlanId?: string;
  offerToken?: string;
  localizedPrice?: string;
}

/** Extra data attached to the purchase when the sheet opens. */
export interface PurchaseOptions {
  /** Opaque account id from the backend, tying the purchase to the account. */
  obfuscatedAccountId?: string | null;
}

/** Result of the native purchase sheet, before any server verification. */
export interface StorePurchase {
  productId: string;
  purchaseToken: string;
  orderId: string | null;
  packageName: string;
  purchaseTime: number;
  acknowledged: boolean;
  /** Base plan actually bought, as reported by Google Play. */
  basePlanId?: string | null;
  /** `pending` = payment not completed yet; no access is opened. */
  state?: 'pending' | 'purchased' | 'unknown';
}

/** A plan sold on Google Play, as GET /billing/google-play/products returns it. */
export interface StoreProductMapping {
  planId: number;
  planName: string;
  productId: string;
  basePlanId: string;
  offerId: string | null;
  billingPeriod: 'monthly' | 'yearly' | null;
  price: number;
}

/** Payload for the backend verification endpoint. */
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
  subscription_id: string | null;
  plan_id: number | null;
  status: PurchaseStatus;
  expires_at: string | null;
  auto_renewing: boolean;
  product_id?: string;
  base_plan_id?: string | null;
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
  purchaseSubscription(product: StoreProduct, options?: PurchaseOptions): Promise<StorePurchase>;
  getActivePurchases(): Promise<StorePurchase[]>;
  /**
   * Finalises a purchase on the device, only ever after the server verified it:
   * Google refunds a purchase left unfinished for three days.
   */
  finishPurchase?(purchase: StorePurchase): Promise<void>;
}

/** Server side of billing: Laravel is the only authority on purchases. */
export interface BillingBackend {
  isAvailable(): boolean;
  /** Plans sold on Google Play, with their product and base plan ids. */
  storeProducts(): Promise<StoreProductMapping[]>;
  /** Opaque account id to hand to Google Play at purchase time. */
  accountToken(): Promise<string>;
  verifyPurchase(request: VerifyPurchaseRequest): Promise<VerifiedSubscription>;
  restorePurchases(purchases: StorePurchase[]): Promise<VerifiedSubscription[]>;
}

export class BillingUnavailableError extends Error {
  constructor(readonly reasons: BillingUnavailableReason[]) {
    super(`Billing unavailable: ${reasons.join(', ')}`);
    this.name = 'BillingUnavailableError';
  }
}

/** The buyer closed the Google Play sheet: nothing to report as a failure. */
export class PurchaseCancelledError extends Error {
  constructor() {
    super('The purchase was cancelled.');
    this.name = 'PurchaseCancelledError';
  }
}

export function isPurchaseCancelled(error: unknown): boolean {
  return error instanceof PurchaseCancelledError;
}
