import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { useI18nStore } from '@/i18n/i18nStore';
import { SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, shadows, spacing } from '@/theme';

/** Language selector of the Stitch login screen (globe + code). */
export function LanguagePill() {
  const { t, language } = useTranslation();
  const changeLanguage = useI18nStore((state) => state.changeLanguage);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`mobile.languages.${language}`)}
        onPress={() => setOpen(true)}
        style={styles.pill}
      >
        <Icon name="language" size="sm" color="onSurfaceVariant" />
        <AppText variant="labelLg">{language.toUpperCase()}</AppText>
        <Icon name="expand-more" size="sm" color="onSurfaceVariant" />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('mobile.profile.language')}>
        {SUPPORTED_LANGUAGES.map((code) => (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected: code === language }}
            onPress={() => {
              setOpen(false);
              void changeLanguage(code);
            }}
            style={[styles.option, code === language ? styles.selected : null]}
          >
            <AppText variant="labelLg" color={code === language ? 'onPrimary' : 'onSurface'}>
              {t(`mobile.languages.${code}`)}
            </AppText>
          </Pressable>
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    ...shadows.sm,
  },
  option: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  selected: {
    backgroundColor: colors.primary,
  },
});
