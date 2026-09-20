/**
 * Response shapes actually returned by the Laravel API. The backend is not
 * uniform: each endpoint module documents which one it uses.
 */

/** BaseController::sendResponse */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  message: string;
}

/** PlanController, UserController::getUserStores */
export interface StatusEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

/** Laravel LengthAwarePaginator serialised as JSON. */
export interface LaravelPaginator<T> {
  current_page: number;
  data: T[];
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  next_page_url: string | null;
  prev_page_url: string | null;
}

export type LanguageCode = 'fr' | 'ar' | 'en' | 'es';
