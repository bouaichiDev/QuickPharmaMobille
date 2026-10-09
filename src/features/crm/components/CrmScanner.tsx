import { lazy, Suspense, useState } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CrmPage } from './CrmDesign';
const ScannerCamera = lazy(() => import('./CrmScannerCamera'));
const cameraAvailable = Platform.OS !== 'web' && Boolean(requireOptionalNativeModule('ExpoCamera'));

export function CrmScanner({
  visible,
  onClose,
  onRead,
}: {
  visible: boolean;
  onClose: () => void;
  onRead: (value: string) => void;
}) {
  const [manual, setManual] = useState('');
  const [read, setRead] = useState(false);
  const submit = (value: string) => {
    if (read || !value.trim()) return;
    setRead(true);
    onRead(value.trim());
    onClose();
  };
  return (
    <CrmPage visible={visible} title="Scanner un badge client" onClose={onClose}>
      {cameraAvailable ? (
        <Suspense fallback={<AppText>Chargement du scanner…</AppText>}>
          <ScannerCamera onRead={submit} />
        </Suspense>
      ) : (
        <AppText color="outline">
          {Platform.OS === 'web'
            ? 'Sur cet aperçu web, saisissez le code ci-dessous.'
            : 'Le scanner caméra sera disponible après la reconstruction de l’application. Vous pouvez saisir le code ci-dessous.'}
        </AppText>
      )}
      <TextField
        appearance="crm"
        label="Code ou référence"
        value={manual}
        onChangeText={setManual}
      />
      <Button label="Rechercher" disabled={!manual.trim()} onPress={() => submit(manual)} />
    </CrmPage>
  );
}
