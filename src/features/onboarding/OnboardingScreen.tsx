import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { preferenceKeys } from '@/constants/storageKeys';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/translate';
import { preferences } from '@/services/storage/preferences';
import { colors, radii, spacing } from '@/theme';

const SLIDES: { icon: IconName; title: TranslationKey; body: TranslationKey }[] = [
  { icon: 'insights', title: 'mobile.onboarding.slide1Title', body: 'mobile.onboarding.slide1Body' },
  { icon: 'notifications-active', title: 'mobile.onboarding.slide2Title', body: 'mobile.onboarding.slide2Body' },
  { icon: 'devices', title: 'mobile.onboarding.slide3Title', body: 'mobile.onboarding.slide3Body' },
];

export async function markOnboardingDone(): Promise<void> {
  await preferences.setString(preferenceKeys.onboardingDone, '1');
}

export function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  async function finish() {
    await markOnboardingDone();
    router.replace('/login');
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']} contentStyle={styles.content}>
      <View style={styles.top}>
        <Logo width={150} />
        {!last ? (
          <Pressable accessibilityRole="button" onPress={() => void finish()} hitSlop={8}>
            <AppText variant="labelLg" color="onSurfaceVariant">
              {t('mobile.onboarding.skip')}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <View style={styles.illustration}>
          <Icon name={slide.icon} size={72} color="primary" />
        </View>
        <AppText variant="headlineLg" align="center" accessibilityRole="header">
          {t(slide.title)}
        </AppText>
        <AppText variant="bodyLg" color="onSurfaceVariant" align="center">
          {t(slide.body)}
        </AppText>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, dotIndex) => (
            <View key={dotIndex} style={[styles.dot, dotIndex === index ? styles.dotActive : null]} />
          ))}
        </View>
        <Button
          label={last ? t('mobile.onboarding.start') : t('mobile.onboarding.next')}
          trailingIcon="arrow-forward"
          onPress={() => (last ? void finish() : setIndex(index + 1))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  illustration: {
    width: 160,
    height: 160,
    borderRadius: radii.full,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  bottom: {
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.outlineVariant,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
});
