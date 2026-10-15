import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { colors, radii, spacing } from '@/theme';

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

// Mount only while scanning so every session gets a fresh camera and scan lock.
export function ProductBarcodeScanner({ onScan, onClose }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [error, setError] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const consumed = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') void getPermission().catch(() => setError(true));
    });
    return () => subscription.remove();
  }, [getPermission]);

  function close() {
    consumed.current = true;
    onClose();
  }

  function scan({ data }: BarcodeScanningResult) {
    if (consumed.current || !active || !focused || !data.trim()) return;
    consumed.current = true;
    onScan(data.trim());
  }

  async function allowCamera() {
    setRequesting(true);
    try {
      if (permission?.canAskAgain === false) await Linking.openSettings();
      else await requestPermission();
    } catch {
      setError(true);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={styles.container}>
        <AppText variant="headlineSm" accessibilityRole="header">
          {t('mobile.products.form.scanTitle')}
        </AppText>
        <AppText variant="bodyMd">{t('mobile.products.form.scanHint')}</AppText>
        {error ? (
          <AppText color="error">{t('mobile.products.form.scanError')}</AppText>
        ) : !permission ? (
          <ActivityIndicator color={colors.primary} />
        ) : !permission.granted ? (
          <View style={styles.message}>
            <AppText>{t('mobile.products.form.scanPermission')}</AppText>
            <Button
              label={t(
                permission.canAskAgain
                  ? 'mobile.products.form.scanAllow'
                  : 'mobile.products.form.scanSettings',
              )}
              onPress={allowCamera}
              loading={requesting}
            />
          </View>
        ) : active && focused ? (
          <View style={styles.preview}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              autofocus="on"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'code93',
                  'itf14',
                  'datamatrix',
                  'pdf417',
                  'qr',
                ],
              }}
              onBarcodeScanned={scan}
              onMountError={() => setError(true)}
            />
          </View>
        ) : null}
        <Button label={t('mobile.products.form.cancel')} variant="outline" onPress={close} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.lg },
  preview: { flex: 1, overflow: 'hidden', borderRadius: radii.lg, backgroundColor: '#000' },
  message: { flex: 1, justifyContent: 'center', gap: spacing.lg },
});
