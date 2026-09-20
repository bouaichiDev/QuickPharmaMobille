import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';

import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { preferenceKeys } from '@/constants/storageKeys';
import { useTranslation } from '@/i18n/useTranslation';
import { preferences } from '@/services/storage/preferences';
import { colors, spacing } from '@/theme';

import { AuthFooter } from '../components/AuthFooter';
import { LanguagePill } from '../components/LanguagePill';
import { loginErrorMessage } from '../authErrors';
import { loginSchema, type LoginFormValues } from '../schemas';
import { useSessionStore } from '../sessionStore';
import { useLogin } from '../useAuthMutations';
import { useFieldError } from '../useFieldError';

export function LoginScreen() {
  const translator = useTranslation();
  const { t } = translator;
  const router = useRouter();
  const login = useLogin();
  const fieldError = useFieldError();
  const passwordRef = useRef<TextInput>(null);
  const notice = useSessionStore((state) => state.notice);
  const clearNotice = useSessionStore((state) => state.clearNotice);

  const { control, handleSubmit, setValue, formState } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  useEffect(() => {
    void preferences.getString(preferenceKeys.rememberedEmail).then((email) => {
      if (email) setValue('email', email);
    });
  }, [setValue]);

  const onSubmit = handleSubmit((values) => {
    clearNotice();
    login.mutate(values, { onSuccess: () => router.replace('/') });
  });

  return (
    <Screen keyboard edges={['top', 'bottom']} contentStyle={styles.content}>
      <LanguagePill />

      <View style={styles.brand}>
        <Logo width={200} />
        <AppText variant="bodyMd" color="onSurfaceVariant" align="center">
          {t('mobile.auth.brandSubtitle')}
        </AppText>
      </View>

      {notice === 'sessionExpired' ? (
        <InlineNotice tone="warning" message={t('mobile.auth.sessionExpired')} onDismiss={clearNotice} />
      ) : null}

      <Card style={styles.card}>
        <View style={styles.form}>
          <View style={styles.heading}>
            <AppText variant="headlineLg" accessibilityRole="header">
              {t('mobile.auth.loginTitle')}
            </AppText>
            <AppText variant="bodyMd" color="onSurfaceVariant">
              {t('mobile.auth.loginSubtitle')}
            </AppText>
          </View>

          {login.isError ? (
            <InlineNotice tone="danger" message={loginErrorMessage(login.error, translator)} />
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={t('mobile.auth.email')}
                placeholder={t('mobile.auth.emailPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(formState.errors.email?.message)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                testID="login-email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                ref={passwordRef}
                label={t('mobile.auth.password')}
                labelAccessory={
                  <Link href="/forgot-password" style={styles.link}>
                    <AppText variant="labelMd" color="secondary">
                      {t('mobile.auth.forgotPassword')}
                    </AppText>
                  </Link>
                }
                placeholder={t('mobile.auth.passwordPlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(formState.errors.password?.message)}
                secureToggle
                showPasswordLabel={t('mobile.auth.showPassword')}
                hidePasswordLabel={t('mobile.auth.hidePassword')}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
                testID="login-password"
              />
            )}
          />

          <Controller
            control={control}
            name="remember"
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={field.onChange} label={t('mobile.auth.rememberMe')} />
            )}
          />

          <Button
            label={t('mobile.auth.submitLogin')}
            onPress={() => void onSubmit()}
            loading={login.isPending}
            testID="login-submit"
          />

          <View style={styles.separator} />
          <View style={styles.signup}>
            <AppText variant="bodyMd" color="onSurfaceVariant">
              {t('mobile.auth.noAccount')}
            </AppText>
            <Link href="/register">
              <AppText variant="labelLg" color="secondary">
                {t('mobile.auth.signUp')}
              </AppText>
            </Link>
          </View>
        </View>
      </Card>

      <AuthFooter />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    width: '100%',
  },
  form: {
    gap: spacing.lg,
    padding: spacing.sm,
  },
  heading: {
    gap: spacing.xs,
  },
  link: {
    paddingVertical: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  signup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
