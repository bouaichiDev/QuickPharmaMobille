/** `data` of POST /login (RegisterController::login). */
export interface LoginResponseData {
  token: string;
  /** Encrypted user id. */
  user_id: string;
  /** Role code, e.g. Admin, SuperAdmin, vendeur. */
  role: string;
  /** Web route the role lands on, e.g. /dashboard, /services-crm. */
  default_route: string | null;
  /** Encrypted id of the first store linked to the user (null for SuperAdmin). */
  store_id: string | null;
  store_name: string | null;
  /** Legacy menu tree; access rules come from GET /access/me instead. */
  permissions: unknown;
  subscription?: unknown;
}

/** `data` of GET /auth/check-token: same as login without the token. */
export type CheckTokenData = Omit<LoginResponseData, 'token'>;

/** `data` of POST /register. No token is issued: the client must log in. */
export interface RegisterResponseData {
  name: string;
  user_id: string;
  store_id: string;
  company_id: string;
  email: string;
}

export interface RegisterPayload {
  firstName: string;
  email: string;
  password: string;
  c_password: string;
  storeName: string;
}

export interface SessionStore {
  /** Encrypted id, used as `store_id` in every tenant request. */
  id: string;
  name: string | null;
}

/** What the app persists in SecureStore. */
export interface Session {
  token: string;
  userId: string;
  role: string;
  defaultRoute: string | null;
  email: string;
  /** Store returned by the login (the account default). */
  defaultStore: SessionStore | null;
  /** Store chosen by the user; revalidated at startup. */
  activeStore: SessionStore | null;
}
