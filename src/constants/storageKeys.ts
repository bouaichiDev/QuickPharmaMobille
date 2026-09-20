/** Keys kept in SecureStore (encrypted by the OS keystore). */
export const secureKeys = {
  session: 'qp.session',
} as const;

/** Keys kept in AsyncStorage (non-sensitive preferences and caches). */
export const preferenceKeys = {
  language: 'qp.language',
  onboardingDone: 'qp.onboarding_done',
  translationsCache: 'qp.translations.',
  rememberedEmail: 'qp.remembered_email',
} as const;
