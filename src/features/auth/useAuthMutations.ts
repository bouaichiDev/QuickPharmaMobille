import { useMutation } from '@tanstack/react-query';

import { preferenceKeys } from '@/constants/storageKeys';
import { preferences } from '@/services/storage/preferences';

import { authApi } from './authApi';
import type { RegisterFormValues } from './schemas';
import { sessionFromLogin } from './sessionService';
import { useSessionStore } from './sessionStore';

interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

async function loginAndStart({ email, password, remember }: LoginInput) {
  const data = await authApi.login(email, password);
  if (remember) {
    await preferences.setString(preferenceKeys.rememberedEmail, email);
  } else {
    await preferences.remove(preferenceKeys.rememberedEmail);
  }
  await useSessionStore.getState().signIn(sessionFromLogin(data, email));
}

export function useLogin() {
  return useMutation({ mutationFn: loginAndStart });
}

export type RegisterOutcome = 'signedIn' | 'loginRequired';

/** POST /register issues no token, so a login follows immediately. */
export function useRegister() {
  return useMutation({
    mutationFn: async (values: RegisterFormValues): Promise<RegisterOutcome> => {
      await authApi.register({
        firstName: values.firstName.trim(),
        email: values.email.trim(),
        password: values.password,
        c_password: values.confirmPassword,
        storeName: values.storeName.trim(),
      });
      try {
        await loginAndStart({ email: values.email.trim(), password: values.password, remember: true });
        return 'signedIn';
      } catch {
        return 'loginRequired';
      }
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email.trim()) });
}

export function useLogout() {
  return useMutation({ mutationFn: () => useSessionStore.getState().signOut() });
}
