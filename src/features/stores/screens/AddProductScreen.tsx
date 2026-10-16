import { useAccess } from '@/features/access/useAccess';
import { can } from '@/features/crm/modules';
import { ProductPhoto } from '@/features/catalogue/ProductPhoto';
import { SNote } from '@/features/catalogue/StockDesign';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '@/features/catalogue/stockApi';
import { useStockScope } from '@/features/catalogue/useStock';
import { httpClient } from '@/services/api/client';
import { productCreateFormData } from '../productsApi';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ErrorState } from '@/components/feedback/ErrorState';
import { AppText, useLatinFonts } from '@/components/ui/AppText';
import { SelectionDialog } from '@/components/ui/SelectionDialog';
import { Button } from '@/components/ui/Button';
import { AlertDialog, type AlertDialogState, type AlertVariant } from '@/components/ui/AlertDialog';
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
import { ProductBarcodeScanner } from '../components/ProductBarcodeScanner';
import type { ProductCreateInput } from '../productsApi';

type Availability = 'inStock' | 'outOfStock';

function existingPhotoNames(images?: string): string[] {
  if (!images) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(images);
  } catch {
    parsed = images;
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  return entries.flatMap((entry: unknown) => {
    const name =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && 'name' in entry
          ? entry.name
          : undefined;
    return typeof name === 'string' && name.trim() ? [name] : [];
  });
}

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
  const returnToProducts = useCallback(() => router.navigate('/stock'), [router]);
  const { id: editingId } = useLocalSearchParams<{ id?: string }>();
  const scope = useStockScope();
  const access = useAccess();
  const showCost = can(access.data, 'products.view_purchase_price');
  const queryClient = useQueryClient();
  const editing = useQuery({
    queryKey: ['stock-product', scope, Number(editingId)],
    queryFn: ({ signal }) => stockApi.detail(Number(editingId), signal),
    enabled: !!editingId && !!scope,
  });
  const updateProduct = useMutation({
    mutationFn: async (input: ProductCreateInput) => {
      if (!editing.data) throw new Error('Le produit doit �tre charg� avant sa modification.');
      const raw = editing.data.product;
      const fields = { ...input };
      delete fields.date_expiration;
      delete fields.date;
      // Purchase prices and margins may be masked by the API for this role.
      if (!showCost) {
        for (const key of [
          'buyingPrice',
          'sellingPrice',
          'profitMargin',
          'tax',
          'includeTaxInPrice',
          'discount',
          'providerId',
          'minQuantity',
          'hasExpiration',
        ] as const) {
          delete fields[key];
        }
      }
      const body = productCreateFormData({
        ...fields,
        description: input.description ?? '',
        precautions: input.precautions ?? '',
        interactions: input.interactions ?? '',
        side_effects: input.side_effects ?? '',
        images: retainedPhotos.join(','),
        status:
          raw.status != null && input.status === (Number(raw.status) === 9 ? '9' : '7')
            ? String(raw.status)
            : input.status,
        quantity: String(raw.originalQuantity ?? raw.quantity ?? 0),
      });
      body.append('id', String(editingId));
      const response = await httpClient.post('/product/update', body);
      if (!response.data?.success)
        throw new Error('La modification du produit n�a pas �t� confirm�e.');
      await Promise.all(
        ['products', 'catalogue', 'stock-product'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      return { id: String(editingId) };
    },
  });
  const { t, tDynamic, locale } = useTranslation();
  const currency = useCurrency();
  const profileQuery = useProfile();
  const currencyLabel = currency ?? t('mobile.products.form.currencyUnavailable');
  const categoriesQuery = useCategories('');
  const providersQuery = useProviders();
  const providers = providersQuery.data ?? [];
  const createProduct = useCreateProduct();
  const categories = categoriesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const [productPhotos, setProductPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [form, setForm] = useState(INITIAL_VALUES);
  const [retainedPhotos, setRetainedPhotos] = useState<string[]>([]);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const initializedKey = useRef<string | null>(null);
  const editKey = editingId ? scope + ':' + editingId : null;
  const [priceChanged, setPriceChanged] = useState(false);
  const [savedSellingPrice, setSavedSellingPrice] = useState(0);
  useEffect(() => {
    if (!editingId) {
      if (initializedKey.current === null) return;
      const frame = requestAnimationFrame(() => {
        setForm({ ...INITIAL_VALUES });
        setRetainedPhotos([]);
        setProductPhotos([]);
        setPriceChanged(false);
        setSavedSellingPrice(0);
        initializedKey.current = null;
        setHydratedKey(null);
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!editing.data || initializedKey.current === editKey) return;
    const frame = requestAnimationFrame(() => {
      const p = editing.data.product;
      const buy = Number(p.buyingPrice || 0),
        sell = Number(p.sellingPrice || 0);
      setForm({
        ...INITIAL_VALUES,
        productName: String(p.productName || ''),
        sku: String(p.sku || ''),
        description: String(p.description || ''),
        categoryId: Number(p.categoryId) || null,
        buyingPrice: String(buy),
        taxRate: String(p.tax || 0),
        taxIncluded: !!Number(p.includeTaxInPrice),
        margin: String(p.profitMargin ?? (buy ? (sell / buy - 1) * 100 : 0)),
        discount: String(p.discount || 0),
        quantity: String(p.quantity || 0),
        providerId: Number(p.providerId) || null,
        minimumStock: String(p.minQuantity || 0),
        availability: Number(p.status) === 9 ? 'outOfStock' : 'inStock',
        expiryRequired: !!Number(p.hasExpiration),
        expiryDate: String(p.date_expiration ?? p.expiry ?? '').slice(0, 10),
        usageInstructions: String(p.precautions || ''),
        interactions: String(p.interactions || ''),
        sideEffects: String(p.side_effects || ''),
        prescriptionRequired: !!Number(p.requires_prescription),
        active: !!Number(p.active),
      });
      setRetainedPhotos(existingPhotoNames(p.images));
      setProductPhotos([]);
      setPriceChanged(false);
      setSavedSellingPrice(sell);
      initializedKey.current = editKey;
      setHydratedKey(editKey);
    });
    return () => cancelAnimationFrame(frame);
  }, [editingId, editing.data, editKey]);
  const {
    hasNextPage: hasMoreCategories,
    isFetchingNextPage: fetchingCategories,
    isError: categoriesFailed,
    fetchNextPage: fetchMoreCategories,
  } = categoriesQuery;
  useEffect(() => {
    if (hasMoreCategories && !fetchingCategories && !categoriesFailed) {
      void fetchMoreCategories();
    }
  }, [hasMoreCategories, fetchingCategories, categoriesFailed, fetchMoreCategories]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [providerSheetOpen, setProviderSheetOpen] = useState(false);
  const [availabilitySheetOpen, setAvailabilitySheetOpen] = useState(false);
  const [photoSourceSheetOpen, setPhotoSourceSheetOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [alert, setAlert] = useState<AlertDialogState | null>(null);
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        returnToProducts();
        return true;
      });
      return () => {
        subscription.remove();
        if (!editingId) setForm({ ...INITIAL_VALUES });
        setProductPhotos([]);
        setSubmitted(false);
        setCategorySheetOpen(false);
        setProviderSheetOpen(false);
        setAvailabilitySheetOpen(false);
        setPhotoSourceSheetOpen(false);
        setScannerOpen(false);
        setAlert(null);
      };
    }, [
      returnToProducts,
      editingId,
      setForm,
      setProductPhotos,
      setSubmitted,
      setCategorySheetOpen,
      setProviderSheetOpen,
      setAvailabilitySheetOpen,
      setPhotoSourceSheetOpen,
      setScannerOpen,
      setAlert,
    ]),
  );
  const selectedCategory = categories.find((category) => category.id === form.categoryId);
  const selectedProvider = providers.find((provider) => provider.id === form.providerId);
  const nameError =
    submitted && !form.productName.trim() ? t('mobile.products.form.nameRequired') : undefined;
  const skuError =
    submitted && !form.sku.trim() ? t('mobile.products.form.skuRequired') : undefined;
  const sellingPrice =
    editingId && !priceChanged
      ? savedSellingPrice
      : calculateSellingPrice(form.buyingPrice, form.margin);

  function updateField<Key extends keyof ProductFormValues>(
    key: Key,
    value: ProductFormValues[Key],
  ) {
    if (key === 'buyingPrice' || key === 'margin') setPriceChanged(true);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function fillTestData() {
    if (!__DEV__ || editingId) return;
    const suffix = Date.now().toString();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const providerId = providers[0]?.id ?? null;
    setForm({
      ...INITIAL_VALUES,
      productName: `QA Test Product ${suffix}`,
      sku: `QA-${suffix}`,
      description: 'Sample product for testing the add product form.',
      categoryId: categories[0]?.id ?? null,
      buyingPrice: '100.50',
      taxRate: '20',
      taxIncluded: true,
      margin: '30',
      discount: '5',
      quantity: providerId === null ? '0' : '24',
      providerId,
      minimumStock: '4',
      availability: 'inStock',
      expiryRequired: true,
      expiryDate: `${expiry.getFullYear()}-${String(expiry.getMonth() + 1).padStart(2, '0')}-${String(expiry.getDate()).padStart(2, '0')}`,
      usageInstructions: 'QA sample instructions — test data only.',
      interactions: 'QA sample interactions — test data only.',
      sideEffects: 'QA sample side effects — test data only.',
      prescriptionRequired: true,
      active: true,
    });
    setSubmitted(false);
  }
  function showAlert(
    title: string,
    message: string,
    buttons?: { text: string; onPress?: () => void }[],
    variant: AlertVariant = 'error',
  ) {
    Keyboard.dismiss();
    setAlert({
      title,
      message,
      variant,
      actionLabel: buttons?.[0]?.text ?? t('mobile.products.form.done'),
      onConfirm: buttons?.[0]?.onPress,
    });
  }

  function closeAlert() {
    const onConfirm = alert?.onConfirm;
    setAlert(null);
    onConfirm?.();
  }
  async function saveProduct() {
    setSubmitted(true);
    if (!form.productName.trim() || !form.sku.trim()) return;
    if (form.availability === null) {
      showAlert(t('mobile.products.form.saveErrorTitle'), t('mobile.products.form.selectStatus'));
      return;
    }
    if (!editingId && Number(decimalValue(form.quantity)) > 0 && form.providerId === null) {
      showAlert(
        t('mobile.products.form.saveErrorTitle'),
        t('mobile.products.form.providerRequired'),
      );
      return;
    }

    try {
      const result = await (editingId ? updateProduct : createProduct).mutateAsync({
        ...productCreateInputFrom(form, sellingPrice),
        files: productPhotos,
        createdBy: profileQuery.data?.id === undefined ? undefined : String(profileQuery.data.id),
      });
      setForm({ ...INITIAL_VALUES });
      setProductPhotos([]);
      setSubmitted(false);
      showAlert(
        t('mobile.products.form.saveSuccessTitle'),
        t('mobile.products.form.saveSuccessMessage', { id: result.id }),
        [{ text: t('mobile.products.form.done'), onPress: returnToProducts }],
        'success',
      );
    } catch (error) {
      showAlert(t('mobile.products.form.saveErrorTitle'), errorMessage(error, { t, tDynamic }));
    }
  }

  async function chooseProductPhoto(source: 'camera' | 'library') {
    setPhotoSourceSheetOpen(false);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showAlert(
            t('mobile.products.form.photoPermissionTitle'),
            t('mobile.products.form.photoPermissionMessage'),
            undefined,
            'warning',
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
        showAlert(
          t('mobile.products.form.photoTooLargeTitle'),
          t('mobile.products.form.photoTooLargeMessage'),
          undefined,
          'warning',
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
      showAlert(
        t('mobile.products.form.photoErrorTitle'),
        t('mobile.products.form.photoErrorMessage'),
      );
    }
  }

  const formattedSellingPrice = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(sellingPrice);

  const editingProduct = editingId && hydratedKey === editKey ? editing.data?.product : undefined;
  if (
    (editingId && (hydratedKey !== editKey || !editingProduct)) ||
    (!editingId && hydratedKey !== null)
  ) {
    return (
      <Screen>
        <Button label={t('mobile.products.form.back')} onPress={returnToProducts} />
        {editing.isError ? (
          <ErrorState error={editing.error} onRetry={() => void editing.refetch()} />
        ) : (
          <ActivityIndicator accessibilityLabel={t('mobile.common.loading')} />
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} keyboard contentStyle={styles.screenContent}>
      {alert ? <AlertDialog alert={alert} onClose={closeAlert} /> : null}
      {scannerOpen ? (
        <ProductBarcodeScanner
          onClose={() => setScannerOpen(false)}
          onScan={(value) => {
            updateField('sku', value);
            setScannerOpen(false);
          }}
        />
      ) : null}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('mobile.products.form.back')}
          onPress={returnToProducts}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size="sm" color="primary" flipInRTL />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="labelSm" color="secondary">
            {t('mobile.products.form.headerLabel')}
          </AppText>
          <AppText variant="headlineSm" accessibilityRole="header">
            {editingId ? 'Modifier le produit' : t('mobile.products.add')}
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

      {__DEV__ && !editingId ? (
        <Button
          label={t('mobile.products.form.fillTestData')}
          variant="tonal"
          onPress={fillTestData}
          disabled={
            createProduct.isPending || categoriesQuery.isLoading || providersQuery.isLoading
          }
        />
      ) : null}
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
            onPress={() => setScannerOpen(true)}
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
              {selectedCategory?.name ??
                (editingId && form.categoryId ? editing.data?.product.categoryName : undefined) ??
                t('mobile.products.form.chooseCategory')}
            </AppText>
            <Icon name="keyboard-arrow-down" size="md" color="onSurfaceVariant" />
          </Pressable>
        </View>
      </FormSection>

      {!editingId || showCost ? (
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
                editable={!editingId}
                keyboardType="numeric"
                helper={
                  editingId
                    ? 'Utilisez l’inventaire pour corriger les unités de stock.'
                    : t('mobile.products.form.initialQuantityHint')
                }
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
          {form.expiryRequired && editingId ? (
            <View style={styles.field}>
              <AppText variant="labelSm">{t('mobile.products.form.expiryDate')}</AppText>
              {[
                ...new Set(
                  [
                    form.expiryDate,
                    ...(editing.data?.lots ?? []).map((lot) => lot.expiry?.slice(0, 10) ?? ''),
                  ].filter(Boolean),
                ),
              ].map((date) => (
                <AppText key={date} variant="bodyMd">
                  {date}
                </AppText>
              ))}
            </View>
          ) : null}
          {form.expiryRequired && !editingId ? (
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
      ) : (
        <SNote>
          Les tarifs existants sont conservés. Votre rôle ne permet pas de consulter les prix
          d’achat.
        </SNote>
      )}

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
          {editingProduct &&
            retainedPhotos.map((name) => (
              <View key={name} style={styles.photoItem}>
                <ProductPhoto
                  product={{ ...editingProduct, images: JSON.stringify([name]) }}
                  size={96}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('mobile.products.form.removePhoto')}
                  onPress={() =>
                    setRetainedPhotos((current) => current.filter((item) => item !== name))
                  }
                  style={styles.removePhoto}
                >
                  <Icon name="close" size="sm" color="onPrimary" />
                </Pressable>
              </View>
            ))}
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
        {productPhotos.length + retainedPhotos.length > 0 ? (
          <AppText variant="bodySm" color="onSurfaceVariant">
            {t('mobile.products.form.photoSelectedCount', {
              count: productPhotos.length + retainedPhotos.length,
            })}
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
          onPress={returnToProducts}
          style={styles.cancelButton}
        />
        <Button
          label={t('mobile.products.form.save')}
          icon="add"
          loading={createProduct.isPending || updateProduct.isPending}
          disabled={!!editingId && !editing.data}
          onPress={() => void saveProduct()}
          style={styles.saveButton}
        />
      </View>

      <SelectionDialog
        visible={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t('mobile.products.chooseCategory')}
      >
        {categoriesQuery.isError ? (
          <ErrorState
            error={categoriesQuery.error}
            onRetry={() => void categoriesQuery.refetch()}
          />
        ) : null}
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
