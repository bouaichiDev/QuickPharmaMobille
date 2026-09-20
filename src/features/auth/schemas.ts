import { z } from 'zod';

import type { TranslationKey } from '@/i18n/translate';

/**
 * Interface-side validation only (fast feedback). The backend stays the
 * authority: its 422 errors are mapped back onto the same fields.
 * Error messages are translation keys.
 */
const msg = (key: TranslationKey) => ({ message: key });

// Same minimum as RegisterController / resetPassword (min:6).
export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MAX_LENGTH = 255;

const email = z
  .string()
  .trim()
  .min(1, msg('mobile.validation.required'))
  .pipe(z.email(msg('mobile.validation.email')));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, msg('mobile.validation.required')),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    storeName: z
      .string()
      .trim()
      .min(1, msg('mobile.validation.required'))
      .max(NAME_MAX_LENGTH, msg('mobile.validation.maxLength')),
    firstName: z
      .string()
      .trim()
      .min(1, msg('mobile.validation.required'))
      .max(NAME_MAX_LENGTH, msg('mobile.validation.maxLength')),
    email,
    password: z.string().min(PASSWORD_MIN_LENGTH, msg('mobile.validation.passwordMin')),
    confirmPassword: z.string().min(1, msg('mobile.validation.required')),
    acceptTerms: z.boolean().refine((value) => value, msg('mobile.validation.termsRequired')),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mobile.validation.passwordsMismatch' satisfies TranslationKey,
  });

export const forgotPasswordSchema = z.object({ email });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/** Maps backend field names (RegisterController) onto the form fields. */
export const registerFieldMap: Record<string, keyof RegisterFormValues> = {
  firstName: 'firstName',
  email: 'email',
  password: 'password',
  c_password: 'confirmPassword',
  storeName: 'storeName',
};

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/** Visual hint only (4-segment meter of the Stitch sign-up screen). */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.max(1, score) as PasswordStrength;
}
