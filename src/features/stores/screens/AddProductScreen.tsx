import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ReactNode } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText, useLatinFonts } from '@/components/ui/AppText';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { useProfile } from '@/features/profile/profileApi';
import { useCurrency } from '@/features/settings/settingsApi';
import { useCategories } from '@/features/stores/useCategories';
import { useProviders } from '@/features/stores/useProviders';
import { useCreateProduct } from '@/features/stores/useProducts';
import { useTranslation } from '@/i18n/useTranslation';
import { errorMessage } from '@/utils/errorMessage';
import { colors, fontFamilies, fontForScript, radii, spacing } from '@/theme';

import { ExpirationDateField } from '../components/ExpirationDateField';
import type { ProductCreateInput } from '../productsApi';

type Availability = 'inStock' | 'outOfStock';

const MAX_PRODUCT_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

interface ProductFormValues {
  productName: string;
  sku: string;
  description: string;
  categoryId: number | null;
  buyingPrice: string;
  taxRate: string;
  taxIncluded: boolean;
  margin: string;
  discount: string;
  quantity: string;
  providerId: number | null;
  minimumStock: string;
  availability: Availability | null;
  expiryRequired: boolean;
  expiryDate: string;
  usageInstructions: string;
  interactions: string;
  sideEffects: string;
  prescriptionRequired: boolean;
  active: boolean;
}

const INITIAL_VALUES: ProductFormValues = {
  productName: '',
  sku: '',
  description: '',
  categoryId: null,
  buyingPrice: '0.00',
  taxRate: '0',
  taxIncluded: false,
  margin: '0',
  discount: '0',
  quantity: '0',
  providerId: null,
  minimumStock: '0',
  availability: null,
  expiryRequired: true,
  expiryDate: '',
  usageInstructions: '',
  interactions: '',
  sideEffects: '',
  prescriptionRequired: false,
  active: true,
};

function calculateSellingPrice(buyingPrice: string, margin: string): number {
  const cost = Number(buyingPrice.replace(',', '.'));
  const percentage = Number(margin.replace(',', '.'));
  if (!Number.isFinite(cost) || !Number.isFinite(percentage)) return 0;
  return Math.max(0, cost * (1 + percentage / 100));
}

function decimalValue(value: string): string {
  return value.trim().replace(',', '.');
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function productCreateInputFrom(form: ProductFormValues, sellingPrice: number): ProductCreateInput {
  return {
    productName: form.productName.trim(),
    sku: form.sku.trim(),
    // Web status IDs: Disponible = 7, Indisponible = 9.
    status: form.availability === null ? '' : form.availability === 'inStock' ? '7' : '9',
    minQuantity: decimalValue(form.minimumStock),
    sellingPrice: sellingPrice.toFixed(2),
    buyingPrice: decimalValue(form.buyingPrice),
    hasExpiration: form.expiryRequired ? '1' : '0',
    date: new Date().toISOString(),
    date_expiration: form.expiryRequired ? optionalValue(form.expiryDate) : undefined,
    categoryId: form.categoryId === null ? undefined : String(form.categoryId),
    includeTaxInPrice: form.taxIncluded,
    side_effects: optionalValue(form.sideEffects),
    tax: decimalValue(form.taxRate),
    quantity: decimalValue(form.quantity),
    discount: decimalValue(form.discount),
    description: optionalValue(form.description),
    active: form.active ? '1' : '0',
    precautions: optionalValue(form.usageInstructions),
    interactions: optionalValue(form.interactions),
    requires_prescription: form.prescriptionRequired ? '1' : '0',
    profitMargin: decimalValue(form.margin),
    providerId: form.providerId === null ? undefined : String(form.providerId),
  };
}

interface FormSectionProps {
  number: string;
  title: string;
  children: ReactNode;
  tag?: string;
}

function FormSection({ number, title, children, tag }: FormSectionProps) {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionNumber}>
          <AppText variant="labelMd" color="primary">
            {number}
          </AppText>
        </View>
        <AppText variant="labelLg" style={styles.sectionTitle}>
          {title}
        </AppText>
        {tag ? (
          <AppText variant="labelSm" color="onSecondaryContainer" style={styles.sectionTag}>
            {tag}
          </AppText>
        ) : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

interface FormFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad' | 'numeric';
  multiline?: boolean;
  helper?: string;
  error?: string;
  suffix?: string;
  editable?: boolean;
}

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  helper,
  error,
  suffix,
  editable = true,
}: FormFieldProps) {
  const latin = useLatinFonts();
  const inputFont = fontForScript(fontFamilies.body, latin);
  return (
    <View style={styles.field}>
      <AppText variant="labelSm">{label}</AppText>
      <View
        style={[
          styles.inputShell,
          multiline ? styles.multilineShell : null,
          !editable ? styles.readOnlyShell : null,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, inputFont, multiline ? styles.multilineInput : null]}
        />
        {suffix ? (
          <AppText variant="labelSm" color="outline">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {helper ? (
        <AppText variant="bodySm" color="onSurfaceVariant">
          {helper}
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="bodySm" color="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function AddProductScreen() {
  const router = useRouter();
  const { t, tDynamic, locale } = useTranslation();
  const currency = useCurrency();
  const profileQuery = useProfile();
  const currencyLabel = currency ?? t('mobile.products.form.currencyUnavailable');
  const categoriesQuery = useCategories('');
  const providersQuery = useProviders();
  const providers = providersQuery.data ?? [];
  const createProduct = useCreateProduct();
  const categories = categoriesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const [form, setForm] = useState(INITIAL_VALUES);
  const [productPhotos, setProductPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [providerSheetOpen, setProviderSheetOpen] = useState(false);
  const [availabilitySheetOpen, setAvailabilitySheetOpen] = useState(false);
  const [photoSourceSheetOpen, setPhotoSourceSheetOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const selectedCategory = categories.find((category) => category.id === form.categoryId);
  const selectedProvider = providers.find((provider) => provider.id === form.providerId);
  const nameError =
    submitted && !form.productName.trim() ? t('mobile.products.form.nameRequired') : undefined;
  const skuError =
    submitted && !form.sku.trim() ? t('mobile.products.form.skuRequired') : undefined;
  const sellingPrice = calculateSellingPrice(form.buyingPrice, form.margin);

  function updateField<Key extends keyof ProductFormValues>(
    key: Key,
    value: ProductFormValues[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProduct() {
    setSubmitted(true);
    if (!form.productName.trim() || !form.sku.trim()) return;
    if (form.availability === null) {
      Alert.alert(t('mobile.products.form.saveErrorTitle'), t('mobile.products.form.selectStatus'));
      return;
    }
    if (Number(decimalValue(form.quantity)) > 0 && form.providerId === null) {
      Alert.alert(
        t('mobile.products.form.saveErrorTitle'),
        t('mobile.products.form.providerRequired'),
      );
      return;
    }

    try {
      const result = await createProduct.mutateAsync({
        ...productCreateInputFrom(form, sellingPrice),
        files: productPhotos,
        createdBy: profileQuery.data?.id === undefined ? undefined : String(profileQuery.data.id),
      });
      setForm({ ...INITIAL_VALUES });
      setProductPhotos([]);
      setSubmitted(false);
      Alert.alert(
        t('mobile.products.form.saveSuccessTitle'),
        t('mobile.products.form.saveSuccessMessage', { id: result.id }),
        [{ text: t('mobile.products.form.done'), onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(t('mobile.products.form.saveErrorTitle'), errorMessage(error, { t, tDynamic }));
    }
  }

  function showFeatureUnavailable() {
    Alert.alert(
      t('mobile.products.form.featureUnavailableTitle'),
      t('mobile.products.form.featureUnavailableMessage'),
    );
  }

  async function chooseProductPhoto(source: 'camera' | 'library') {
    setPhotoSourceSheetOpen(false);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            t('mobile.products.form.photoPermissionTitle'),
            t('mobile.products.form.photoPermissionMessage'),
          );
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.8,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              ...options,
              allowsEditing: true,
              aspect: [4, 3],
            })
          : await ImagePicker.launchImageLibraryAsync({
              ...options,
              allowsMultipleSelection: true,
            });
      const selectedAssets = result.canceled ? [] : result.assets;
      if (selectedAssets.length === 0) return;

      const acceptedAssets = selectedAssets.filter(
        (asset) => !asset.fileSize || asset.fileSize <= MAX_PRODUCT_PHOTO_SIZE_BYTES,
      );
      if (acceptedAssets.length < selectedAssets.length) {
        Alert.alert(
          t('mobile.products.form.photoTooLargeTitle'),
          t('mobile.products.form.photoTooLargeMessage'),
        );
      }
      if (acceptedAssets.length > 0) {
        setProductPhotos((current) => {
          const existingUris = new Set(current.map((asset) => asset.uri));
          const newAssets = acceptedAssets.filter((asset) => !existingUris.has(asset.uri));
          return [...current, ...newAssets];
        });
      }
    } catch {
      Alert.alert(
        t('mobile.products.form.photoErrorTitle'),
        t('mobile.products.form.photoErrorMessage'),
      );
    }
  }

  const formattedSellingPrice = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sellingPrice);

  return (
    <Screen edges={['top']} keyboard contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.products.form.back')}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size="sm" color="primary" flipInRTL />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="labelSm" color="secondary">
            {t('mobile.products.form.headerLabel')}
          </AppText>
          <AppText variant="headlineSm" accessibilityRole="header">
            {t('mobile.products.add')}
          </AppText>
        </View>
      </View>

      <View style={styles.statusLine}>
        <View style={styles.statusDot} />
        <AppText variant="bodySm" color="onSurfaceVariant">
          {t('mobile.products.form.draft')}
        </AppText>
        <AppText variant="bodySm" color="onSurfaceVariant" style={styles.currencyLabel}>
          {t('mobile.products.form.currency', { currency: currencyLabel })}
        </AppText>
      </View>

      <FormSection number="1" title={t('mobile.products.form.general')}>
        <FormField
          label={t('mobile.products.form.name')}
          value={form.productName}
          placeholder={t('mobile.products.form.namePlaceholder')}
          onChangeText={(value) => updateField('productName', value)}
          error={nameError}
        />
        <View style={styles.inlineInput}>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.sku')}
              value={form.sku}
              placeholder={t('mobile.products.form.skuPlaceholder')}
              onChangeText={(value) => updateField('sku', value)}
              error={skuError}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={showFeatureUnavailable}
            style={styles.scanButton}
          >
            <Icon name="qr-code-scanner" size="sm" color="primary" />
            <AppText variant="labelSm" color="primary">
              {t('mobile.products.form.scan')}
            </AppText>
          </Pressable>
        </View>
        <FormField
          label={t('mobile.products.form.description')}
          value={form.description}
          placeholder={t('mobile.products.form.descriptionPlaceholder')}
          onChangeText={(value) => updateField('description', value)}
          multiline
        />
        <View style={styles.field}>
          <View style={styles.labelActionRow}>
            <AppText variant="labelSm">{t('mobile.products.form.category')}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/categories')}
              style={styles.textAction}
            >
              <Icon name="add" size="sm" color="secondary" />
              <AppText variant="labelSm" color="secondary">
                {t('mobile.products.form.addCategory')}
              </AppText>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setCategorySheetOpen(true)}
            style={styles.selectField}
          >
            <AppText
              variant="bodyMd"
              color={selectedCategory ? 'onSurface' : 'outline'}
              numberOfLines={1}
              style={styles.selectText}
            >
              {selectedCategory?.name ?? t('mobile.products.form.chooseCategory')}
            </AppText>
            <Icon name="keyboard-arrow-down" size="md" color="onSurfaceVariant" />
          </Pressable>
        </View>
      </FormSection>

      <FormSection number="2" title={t('mobile.products.form.pricing')}>
        <View style={styles.fieldRow}>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.buyingPrice')}
              value={form.buyingPrice}
              onChangeText={(value) => updateField('buyingPrice', value)}
              keyboardType="decimal-pad"
              suffix={currency ?? undefined}
            />
          </View>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.taxRate')}
              value={form.taxRate}
              onChangeText={(value) => updateField('taxRate', value)}
              keyboardType="decimal-pad"
              suffix="%"
            />
          </View>
        </View>
        <View style={styles.checkboxPanel}>
          <Checkbox
            checked={form.taxIncluded}
            onChange={(value) => updateField('taxIncluded', value)}
            label={t('mobile.products.form.taxIncluded')}
          />
        </View>
        <View style={styles.fieldRow}>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.margin')}
              value={form.margin}
              onChangeText={(value) => updateField('margin', value)}
              keyboardType="decimal-pad"
              suffix="%"
            />
          </View>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.sellingPrice')}
              value={formattedSellingPrice}
              onChangeText={() => undefined}
              editable={false}
              suffix={currency ?? undefined}
              helper={t('mobile.products.form.calculated')}
            />
          </View>
        </View>
        <FormField
          label={t('mobile.products.form.discount')}
          value={form.discount}
          onChangeText={(value) => updateField('discount', value)}
          keyboardType="decimal-pad"
          suffix="%"
        />
        <View style={styles.fieldRow}>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.quantity')}
              value={form.quantity}
              onChangeText={(value) => updateField('quantity', value)}
              keyboardType="numeric"
              helper={t('mobile.products.form.initialQuantityHint')}
            />
          </View>
          <View style={styles.flexField}>
            <View style={styles.field}>
              <AppText variant="labelSm">{t('mobile.products.form.supplier')}</AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProviderSheetOpen(true)}
                style={styles.selectField}
              >
                <AppText
                  variant="bodyMd"
                  color={selectedProvider ? 'onSurface' : 'outline'}
                  numberOfLines={1}
                  style={styles.selectText}
                >
                  {selectedProvider?.name ?? t('mobile.products.form.chooseSupplier')}
                </AppText>
                <Icon name="keyboard-arrow-down" size="md" color="onSurfaceVariant" />
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.fieldRow}>
          <View style={styles.flexField}>
            <FormField
              label={t('mobile.products.form.minimumStock')}
              value={form.minimumStock}
              onChangeText={(value) => updateField('minimumStock', value)}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flexField}>
            <View style={styles.field}>
              <AppText variant="labelSm">{t('mobile.products.form.availability')}</AppText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAvailabilitySheetOpen(true)}
                style={styles.selectField}
              >
                <AppText variant="bodyMd" style={styles.selectText}>
                  {form.availability === null
                    ? t('mobile.products.form.selectStatus')
                    : t(`mobile.products.form.${form.availability}`)}
                </AppText>
                <Icon name="keyboard-arrow-down" size="md" color="onSurfaceVariant" />
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.checkboxPanel}>
          <View style={styles.checkboxCopy}>
            <Checkbox
              checked={form.expiryRequired}
              onChange={(value) => updateField('expiryRequired', value)}
              label={t('mobile.products.form.expiryRequired')}
            />
            <AppText variant="bodySm" color="onSurfaceVariant">
              {t('mobile.products.form.expiryHint')}
            </AppText>
          </View>
        </View>
        {form.expiryRequired ? (
          <ExpirationDateField
            label={t('mobile.products.form.expiryDate')}
            locale={locale}
            doneLabel={t('mobile.products.form.done')}
            value={form.expiryDate}
            onChange={(value) => updateField('expiryDate', value)}
            placeholder={t('mobile.products.form.datePlaceholder')}
          />
        ) : null}
      </FormSection>

      <FormSection
        number="+"
        title={t('mobile.products.form.medical')}
        tag={t('mobile.products.form.pharmaTag')}
      >
        <FormField
          label={t('mobile.products.form.instructions')}
          value={form.usageInstructions}
          onChangeText={(value) => updateField('usageInstructions', value)}
          placeholder={t('mobile.products.form.instructionsPlaceholder')}
          multiline
        />
        <FormField
          label={t('mobile.products.form.interactions')}
          value={form.interactions}
          onChangeText={(value) => updateField('interactions', value)}
          placeholder={t('mobile.products.form.interactionsPlaceholder')}
          multiline
        />
        <FormField
          label={t('mobile.products.form.sideEffects')}
          value={form.sideEffects}
          onChangeText={(value) => updateField('sideEffects', value)}
          placeholder={t('mobile.products.form.sideEffectsPlaceholder')}
          multiline
        />
        <View style={styles.prescriptionPanel}>
          <View style={styles.checkboxCopy}>
            <Checkbox
              checked={form.prescriptionRequired}
              onChange={(value) => updateField('prescriptionRequired', value)}
              label={t('mobile.products.form.prescription')}
            />
            <AppText variant="bodySm" color="onSurfaceVariant">
              {t('mobile.products.form.prescriptionHint')}
            </AppText>
          </View>
        </View>
      </FormSection>

      <FormSection number="4" title={t('mobile.products.form.visibility')}>
        <AppText variant="labelSm">{t('mobile.products.form.photo')}</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoRow}
        >
          {productPhotos.map((photo) => (
            <View key={photo.uri} style={styles.photoItem}>
              <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.photoPreview} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('mobile.products.form.removePhoto')}
                onPress={() =>
                  setProductPhotos((current) => current.filter((item) => item.uri !== photo.uri))
                }
                style={styles.removePhoto}
              >
                <Icon name="close" size="sm" color="onPrimary" />
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.products.form.photoHint')}
            onPress={() => setPhotoSourceSheetOpen(true)}
            style={styles.photoAddTile}
          >
            <View style={styles.photoIcon}>
              <Icon name="add-a-photo" size="md" color="secondary" />
            </View>
            <AppText variant="labelSm" align="center">
              {t('mobile.products.form.photoAddMore')}
            </AppText>
          </Pressable>
        </ScrollView>
        {productPhotos.length > 0 ? (
          <AppText variant="bodySm" color="onSurfaceVariant">
            {t('mobile.products.form.photoSelectedCount', { count: productPhotos.length })}
          </AppText>
        ) : null}
        <AppText variant="bodySm" color="onSurfaceVariant">
          {t('mobile.products.form.photoFormats')}
        </AppText>
        <View style={styles.checkboxPanel}>
          <View style={styles.checkboxCopy}>
            <Checkbox
              checked={form.active}
              onChange={(value) => updateField('active', value)}
              label={t('mobile.products.form.active')}
            />
            <AppText variant="bodySm" color="onSurfaceVariant">
              {t('mobile.products.form.activeHint')}
            </AppText>
          </View>
        </View>
      </FormSection>

      <View style={styles.actions}>
        <Button
          label={t('mobile.products.form.cancel')}
          variant="outline"
          onPress={() => router.back()}
          style={styles.cancelButton}
        />
        <Button
          label={t('mobile.products.form.save')}
          icon="add"
          loading={createProduct.isPending}
          onPress={() => void saveProduct()}
          style={styles.saveButton}
        />
      </View>

      <SelectionDialog
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t('mobile.products.chooseCategory')}
      >
        {categoriesQuery.isLoading ? (
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {t('mobile.products.form.loadingCategories')}
          </AppText>
        ) : null}
        {categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            onPress={() => {
              updateField('categoryId', category.id);
              setCategorySheetOpen(false);
            }}
            style={styles.sheetOption}
          >
            <AppText variant="labelMd">
              {category.name ?? t('mobile.products.unnamedCategory')}
            </AppText>
            {form.categoryId === category.id ? (
              <Icon name="check" size="sm" color="secondary" />
            ) : null}
          </Pressable>
        ))}
        {!categoriesQuery.isLoading && categories.length === 0 ? (
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {t('mobile.products.form.noCategories')}
          </AppText>
        ) : null}
      </SelectionDialog>

      <SelectionDialog
        visible={availabilitySheetOpen}
        onClose={() => setAvailabilitySheetOpen(false)}
        title={t('mobile.products.form.availability')}
      >
        {(['outOfStock', 'inStock'] as const).map((availability) => (
          <Pressable
            key={availability}
            accessibilityRole="button"
            onPress={() => {
              updateField('availability', availability);
              setAvailabilitySheetOpen(false);
            }}
            style={styles.sheetOption}
          >
            <AppText variant="labelMd">{t(`mobile.products.form.${availability}`)}</AppText>
            {form.availability === availability ? (
              <Icon name="check" size="sm" color="secondary" />
            ) : null}
          </Pressable>
        ))}
      </SelectionDialog>

      <SelectionDialog
        visible={providerSheetOpen}
        onClose={() => setProviderSheetOpen(false)}
        title={t('mobile.products.form.supplier')}
      >
        {providersQuery.isLoading ? (
          <AppText variant="bodyMd" color="onSurfaceVariant">
            {t('mobile.products.form.loadingSuppliers')}
          </AppText>
        ) : providersQuery.isError ? (
          <ErrorState error={providersQuery.error} onRetry={() => void providersQuery.refetch()} />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                updateField('providerId', null);
                setProviderSheetOpen(false);
              }}
              style={styles.sheetOption}
            >
              <AppText variant="labelMd">{t('mobile.products.form.noSupplier')}</AppText>
              {form.providerId === null ? <Icon name="check" size="sm" color="secondary" /> : null}
            </Pressable>
            {providers.map((provider) => (
              <Pressable
                key={provider.id}
                accessibilityRole="button"
                onPress={() => {
                  updateField('providerId', provider.id);
                  setProviderSheetOpen(false);
                }}
                style={styles.sheetOption}
              >
                <AppText variant="labelMd">{provider.name}</AppText>
                {form.providerId === provider.id ? (
                  <Icon name="check" size="sm" color="secondary" />
                ) : null}
              </Pressable>
            ))}
            {providers.length === 0 ? (
              <AppText variant="bodyMd" color="onSurfaceVariant">
                {t('mobile.products.form.noSuppliers')}
              </AppText>
            ) : null}
          </>
        )}
      </SelectionDialog>

      <SelectionDialog
        visible={photoSourceSheetOpen}
        onClose={() => setPhotoSourceSheetOpen(false)}
        title={t('mobile.products.form.photo')}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => void chooseProductPhoto('camera')}
          style={styles.sheetOption}
        >
          <AppText variant="labelMd">{t('mobile.products.form.takePhoto')}</AppText>
          <Icon name="photo-camera" size="sm" color="primary" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void chooseProductPhoto('library')}
          style={styles.sheetOption}
        >
          <AppText variant="labelMd">{t('mobile.products.form.choosePhoto')}</AppText>
          <Icon name="photo-library" size="sm" color="primary" />
        </Pressable>
      </SelectionDialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.md, paddingTop: spacing.sm },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  headerCopy: { flex: 1, gap: 2 },
  statusLine: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineSoft,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  statusDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.brandTeal },
  currencyLabel: { marginStart: 'auto' },
  sectionCard: { borderColor: colors.outlineSoft, elevation: 0, shadowOpacity: 0 },
  sectionHeading: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineSoft,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  sectionTitle: { flex: 1, textTransform: 'uppercase' },
  sectionTag: {
    maxWidth: 96,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.secondaryFixed,
  },
  sectionBody: { gap: spacing.md, paddingTop: spacing.md },
  field: { flex: 1, gap: spacing.xs },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  flexField: { flex: 1, minWidth: 0 },
  inputShell: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  multilineShell: { minHeight: 76, alignItems: 'flex-start', paddingVertical: spacing.sm },
  readOnlyShell: { backgroundColor: colors.surfaceContainerLow },
  inputError: { borderColor: colors.error },
  input: {
    flex: 1,
    minHeight: 42,
    padding: 0,
    color: colors.onSurface,
    fontSize: 14,
    textAlign: 'auto',
  },
  multilineInput: { minHeight: 60, paddingTop: spacing.xs },
  inlineInput: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  scanButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  labelActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  selectField: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  selectText: { flex: 1 },
  checkboxPanel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  checkboxCopy: { gap: spacing.xs },
  prescriptionPanel: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.md,
    backgroundColor: colors.warningContainer,
  },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoItem: {
    width: 96,
    height: 96,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  photoAddTile: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  photoPreview: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: spacing.xs,
    end: spacing.xs,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.scrim,
  },
  photoIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg },
  cancelButton: { flex: 0.8 },
  saveButton: { flex: 1.5 },
  sheetOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineSoft,
  },
});
