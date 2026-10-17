import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { crmStyles } from './CrmDesign';
import { uploadCarePhoto } from '../crmPhotos';
import { CarePhotoButtons } from './CarePhotoButtons';
export interface DraftPhoto {
  asset: ImagePicker.ImagePickerAsset;
  stage: 'before' | 'after';
  caption: string;
}
export async function uploadSessionPhoto(
  photo: DraftPhoto,
  context: { clientId: string; serviceId: string; sessionId: string; packageId?: string },
) {
  return uploadCarePhoto(photo.asset, { ...context, stage: photo.stage, caption: photo.caption });
}
export function DraftSessionPhotos({
  value,
  onChange,
}: {
  value: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
}) {
  const update = (index: number, next: Partial<DraftPhoto>) =>
    onChange(value.map((photo, i) => (i === index ? { ...photo, ...next } : photo)));
  return (
    <View style={crmStyles.stack}>
      {value.map((photo, index) => (
        <View key={photo.asset.uri} style={crmStyles.inset}>
          <Image
            source={{ uri: photo.asset.uri }}
            accessibilityLabel="Photo du soin à enregistrer"
            style={{ width: '100%', height: 180, borderRadius: 12 }}
            resizeMode="cover"
          />
          <View style={crmStyles.row}>
            <Chip
              label="Avant"
              selected={photo.stage === 'before'}
              onPress={() => update(index, { stage: 'before' })}
            />
            <Chip
              label="Après"
              selected={photo.stage === 'after'}
              onPress={() => update(index, { stage: 'after' })}
            />
          </View>
          <TextField
            appearance="crm"
            label="Légende facultative"
            maxLength={500}
            value={photo.caption}
            onChangeText={(caption) => update(index, { caption })}
          />
          <Button
            label="Retirer la photo"
            variant="dangerSoft"
            compact
            onPress={() => onChange(value.filter((_, i) => i !== index))}
          />
        </View>
      ))}
      <CarePhotoButtons
        onPhoto={(asset) => onChange([...value, { asset, stage: 'before', caption: '' }])}
      />
    </View>
  );
}
