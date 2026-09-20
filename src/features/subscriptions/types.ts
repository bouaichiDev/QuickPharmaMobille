/** Row of GET /plans (App\Models\Plan, casts applied). */
export interface ApiPlan {
  id: number;
  name: string;
  description: string | null;
  price: number | string;
  duration_in_days: number | null;
  max_users: number | null;
  max_stores: number | null;
  /** Commercial feature list (JSON, free-form in the admin). */
  features: unknown;
  /** Commercial limits (JSON). The enforced terms live in plan versions. */
  limits: unknown;
  active: boolean | number;
  /** Store product id (future Google Play product / base plan id). */
  provider_product_id: string | null;
  signup_default?: boolean | number;
}

/** Plan normalised for display. */
export interface PlanView {
  id: number;
  name: string;
  description: string | null;
  price: number;
  isFree: boolean;
  durationDays: number | null;
  /** null = no limit configured on the commercial plan. */
  maxUsers: number | null;
  maxStores: number | null;
  features: string[];
  providerProductId: string | null;
  isCurrent: boolean;
}
