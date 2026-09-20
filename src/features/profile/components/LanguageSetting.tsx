import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { useI18nStore } from '@/i18n/i18nStore';
import { isRTLLanguage, SUPPORTED_LANGUAGES } from '@/i18n/languages';
import { useTranslation } from '@/i18n/useTranslation';
import type { LanguageCode } from '@/types/api';
import { colors, radii, spacing } from '@/theme';

export function LanguageSetting() {
  const { t, language } = useTranslation();
  const changeLanguage = useI18nStore((state) => state.changeLanguage);
  const [open, setOpen] = useState(false);

  async function select(next: LanguageCode) {
    setOpen(false);
    await changeLanguage(next);
  }

  return (
    <>
      <ListRow
        icon="translate"
        title={t('mobile.profile.language')}
        subtitle={t('mobile.profile.languageHint')}
        onPress={() => setOpen(true)}
        right={
          <AppText variant="labelLg" color="primary">
            {t(`mobile.languages.${language}`)}
          </AppText>
        }
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('mobile.profile.language')}>
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = code === language;
          const needsRestart = isRTLLanguage(code) !== isRTLLanguage(language);
          return (
            <Pressable
              key={code}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => void select(code)}
              style={[styles.option, selected ? styles.selected : null]}
            >
              <AppText variant="labelLg" color={selected ? 'onPrimary' : 'onSurface'} style={styles.label}>
                {t(`mobile.languages.${code}`)}
              </AppText>
              {needsRestart && !selected ? (
                <AppText variant="bodySm" color="onSurfaceVariant">
                  RTL ↔ LTR
                </AppText>
              ) : null}
              {selected ? <Icon name="check" size="sm" color="onPrimary" /> : null}
            </Pressable>
          );
        })}
        <AppText variant="bodySm" color="onSurfaceVariant">
          {t('mobile.profile.languageRestart')}
        </AppText>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  selected: {
    backgroundColor: colors.primary,
  },
  label: {
    flex: 1,
  },
});
