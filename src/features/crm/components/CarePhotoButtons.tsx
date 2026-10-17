import { useState } from 'react';
import { Alert, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { pickCarePhoto } from '../crmPhotos';

export function CarePhotoButtons({
  onPhoto,
  disabled,
  loading,
}: {
  onPhoto: (asset: ImagePickerAsset) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [picking, setPicking] = useState(false);
  async function choose(source: 'camera' | 'library') {
    setPicking(true);
    try {
      const asset = await pickCarePhoto(source);
      if (asset) onPhoto(asset);
    } catch (error) {
      Alert.alert(
        'Photo',
        error instanceof Error ? error.message : 'Impossible de sélectionner la photo.',
      );
    } finally {
      setPicking(false);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Button
        label="Choisir dans la galerie"
        icon="photo-library"
        variant="tonal"
        disabled={disabled || picking || loading}
        onPress={() => void choose('library')}
      />
      <Button
        label="Prendre une photo"
        icon="photo-camera"
        variant="tonal"
        disabled={disabled || picking || loading}
        loading={loading}
        onPress={() => void choose('camera')}
      />
    </View>
  );
}
