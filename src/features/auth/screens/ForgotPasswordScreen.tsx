import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineNotice } from '@/components/feedback/InlineNotice';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n/useTranslation';
import { normalizeApiError } from '@/services/api/apiError';
import { spacing } from '@/theme';
import { errorMessage } from '@/utils/errorMessage';

import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas';
import { useForgotPassword } from '../useAuthMutations';
import { useFieldError } from '../useFieldError';

export function ForgotPasswordScreen() {
  const translator = useTranslation();
  const { t } = translator;
  const router = useRouter();
  const forgot = useForgotPassword();
  const fieldError = useFieldError();

  const { control, handleSubmit, formState } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) => forgot.mutate(email));

  // The backend answers "unknown email" with a validation error: the same
  // neutral confirmation is shown so the screen does not reveal which accounts exist.
  const apiError = forgot.error ? normalizeApiError(forgot.error) : null;
  const unknownEmail = apiError?.kind === 'validation' && 'email' in apiError.fieldErrors;
  const neutralSuccess = forgot.isSuccess || unknownEmail;
  const realError = forgot.isError && !unknownEmail;

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <Pressable accessibilityRole="link" onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Icon name="arrow-back" size="sm" color="onSurfaceVariant" flipInRTL />
        <AppText variant="labelLg" color="onSurfaceVariant">
          {t('mobile.auth.registerBack')}
        </AppText>
      </Pressable>

      <View style={styles.logo}>
        <Logo width={160} />
      </View>

      <Card>
        <View style={styles.form}>
          <AppText variant="headlineLg" accessibilityRole="header">
            {t('mobile.auth.forgotTitle')}
          </AppText>
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {t('mobile.auth.forgotSubtitle')}
          </AppText>

          {neutralSuccess ? <InlineNotice tone="success" message={t('mobile.auth.forgotSent')} /> : null}
          {realError ? <InlineNotice tone="danger" message={errorMessage(forgot.error, translator)} /> : null}

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
              />
            )}
          />
          <Button
            label={t('mobile.auth.forgotSubmit')}
            onPress={() => void onSubmit()}
            loading={forgot.isPending}
            disabled={neutralSuccess}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  logo: {
    alignItems: 'center',
  },
  form: {
    gap: spacing.lg,
    padding: spacing.sm,
  },
});
