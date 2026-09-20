import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '@/features/auth/sessionStore';
import { apiGet } from '@/services/api/client';
import { endpoints } from '@/services/api/endpoints';
import type { SuccessEnvelope } from '@/types/api';

/** Row of GET /users/show/0 (users.* + roles.code as roleLabel). */
export interface UserProfile {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  active: number;
  roleLabel: string;
}

export const profileApi = {
  /** `0` = the authenticated user (self_param in the route matrix). */
  async getSelf(): Promise<UserProfile | null> {
    const body = await apiGet<SuccessEnvelope<UserProfile[]>>(endpoints.users.showSelf);
    return body.data[0] ?? null;
  },
};

export function useProfile() {
  const storeId = useSessionStore((state) => state.session?.activeStore?.id ?? null);
  return useQuery({
    queryKey: ['profile', 'self', storeId],
    queryFn: profileApi.getSelf,
    staleTime: 5 * 60_000,
  });
}

export function displayName(profile: UserProfile | null | undefined, fallback: string): string {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}
