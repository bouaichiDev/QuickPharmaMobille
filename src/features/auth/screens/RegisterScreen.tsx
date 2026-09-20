import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n/useTranslation';
import { spacing } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { applyServerFieldErrors } from '../authErrors';
import { AuthFooter } from '../components/AuthFooter';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import {
  passwordStrength,
  registerFieldMap,
  registerSchema,
  type RegisterFormValues,
} from '../schemas';
import { useRegister } from '../useAuthMutations';
import { useFieldError } from '../useFieldError';

export function RegisterScreen() {
  const translator = useTranslation();
  const { t } = translator;
  const router = useRouter();
  const register = useRegister();
  const fieldError = useFieldError();

  const { control, handleSubmit, setError, formState } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      storeName: '',
      firstName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });
  const password = useWatch({ control, name: 'password' });
  const strength = passwordStrength(password);
  const strengthLabel =
    strength >= 4 ? t('mobile.auth.strengthStrong') : strength >= 2 ? t('mobile.auth.strengthMedium') : t('mobile.auth.strengthWeak');

  const onSubmit = handleSubmit((values) => {
    register.mutate(values, {
      onSuccess: (outcome) => router.replace(outcome === 'signedIn' ? '/' : '/login'),
      onError: (error) => {
        applyServerFieldErrors(error, setError, registerFieldMap);
      },
    });
  });

  const errors = formState.errors;
  const showGlobalError =
    register.isError && Object.keys(errors).every((key) => errors[key as keyof RegisterFormValues]?.type !== 'server');

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="link" onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Icon name="arrow-back" size="sm" color="onSurfaceVariant" flipInRTL />
          <AppText variant="labelLg" color="onSurfaceVariant">
            {t('mobile.auth.registerBack')}
          </AppText>
        </Pressable>
        <Badge tone="secondary" label={t('mobile.auth.registerBadge')} />
      </View>

      <View style={styles.logo}>
        <Logo width={160} />
      </View>

      <Card>
        <View style={styles.form}>
          <View style={styles.heading}>
            <AppText variant="headlineLg" accessibilityRole="header">
              {t('mobile.auth.registerTitle')}
            </AppText>
            <AppText variant="bodyMd" color="onSurfaceVariant">
              {t('mobile.auth.registerSubtitle')}
            </AppText>
          </View>

          {showGlobalError ? <InlineNotice tone="danger" message={errorMessage(register.error, translator)} /> : null}

          <Controller
            control={control}
            name="storeName"
            render={({ field }) => (
              <TextField
                label={t('mobile.auth.storeName')}
                labelHint={t('mobile.auth.storeNameHint')}
                placeholder={t('mobile.auth.storeNamePlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(errors.storeName?.message)}
                maxLength={255}
              />
            )}
          />
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <TextField
                label={t('mobile.auth.firstName')}
                placeholder={t('mobile.auth.firstNamePlaceholder')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(errors.firstName?.message)}
                autoComplete="name"
                maxLength={255}
              />
            )}
          />
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
                error={fieldError(errors.email?.message)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                label={t('mobile.auth.password')}
                labelAccessory={
                  password ? (
                    <AppText variant="labelMd" color="secondary">
                      {strengthLabel}
                    </AppText>
                  ) : null
                }
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(errors.password?.message)}
                secureToggle
                showPasswordLabel={t('mobile.auth.showPassword')}
                hidePasswordLabel={t('mobile.auth.hidePassword')}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                footer={<PasswordStrengthMeter strength={strength} />}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <TextField
                label={t('mobile.auth.confirmPassword')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldError(errors.confirmPassword?.message)}
                secureToggle
                showPasswordLabel={t('mobile.auth.showPassword')}
                hidePasswordLabel={t('mobile.auth.hidePassword')}
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                label={t('mobile.auth.acceptTerms')}
                error={fieldError(errors.acceptTerms?.message)}
              />
            )}
          />

          <Button
            label={t('mobile.auth.submitRegister')}
            trailingIcon="arrow-forward"
            onPress={() => void onSubmit()}
            loading={register.isPending}
          />

          <View style={styles.signin}>
            <AppText variant="bodyMd" color="onSurfaceVariant">
              {t('mobile.auth.haveAccount')}
            </AppText>
            <Link href="/login">
              <AppText variant="labelLg" color="secondary">
                {t('mobile.auth.signIn')}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo: {
    alignItems: 'center',
  },
  form: {
    gap: spacing.lg,
    padding: spacing.sm,
  },
  heading: {
    gap: spacing.xs,
  },
  signin: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
});
