import { apiGet, apiPost } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { SuccessEnvelope } from '@/types/api';

import type {
  CheckTokenData,
  LoginResponseData,
  RegisterPayload,
  RegisterResponseData,
} from './types';

const publicRequest = { skipAuth: true, skipStoreContext: true } as const;

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponseData> {
    const body = await apiPost<SuccessEnvelope<LoginResponseData>>(
      endpoints.auth.login,
      { email, password },
      publicRequest,
    );
    return body.data;
  },

  async register(payload: RegisterPayload): Promise<RegisterResponseData> {
    const body = await apiPost<SuccessEnvelope<RegisterResponseData>>(
      endpoints.auth.register,
      payload,
      publicRequest,
    );
    return body.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiPost<SuccessEnvelope<[]>>(endpoints.auth.forgotPassword, { email }, publicRequest);
  },

  /** Validates the stored token. Uses an explicit token: the store is not hydrated yet. */
  async checkToken(token: string): Promise<CheckTokenData> {
    const body = await apiGet<SuccessEnvelope<CheckTokenData>>(endpoints.auth.checkToken, {
      skipAuth: true,
      skipStoreContext: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    return body.data;
  },

  async logout(): Promise<void> {
    await apiPost<SuccessEnvelope<[]>>(endpoints.auth.logout, {}, { skipStoreContext: true });
  },
};
