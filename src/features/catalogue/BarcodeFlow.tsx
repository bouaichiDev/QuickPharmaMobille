import { canAssociateBarcode } from './stockApi';
import { useStockApi, StockContext } from './StockContext';
import { lazy, Suspense, useState, useRef, useContext } from 'react';
import { Image, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { barcodePattern, barcodeHtml } from './stockBarcode';
import * as Print from 'expo-print';
import { printCrmDocument } from '@/features/crm/documents';
import { productCode, type StockProduct } from './stockApi';
import { useStockMutation, useStockScope } from './useStock';
import { ProductPhoto } from './ProductPhoto';
import { useStockScannerTranslation } from '@/i18n/useStockScannerTranslation';
import { productInfo } from './stockPresentation';
import {
  SBadge,
  SButton,
  SCard,
  SField,
  SHeading,
  SNote,
  SSearch,
  StockPage,
  st,
  useDebounce,
  money,
  ScannerGuide,
} from './StockDesign';
const Camera = lazy(() => import('./StockScannerCamera'));
const cameraAvailable = Platform.OS !== 'web' && Boolean(requireOptionalNativeModule('ExpoCamera'));
function BarcodeAction({
  label,
  icon,
  onPress,
  busy = false,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]['name'];
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[st.card, st.row, { padding: 12, gap: 12 }]}
    >
      <View style={{ padding: 8, borderRadius: 8, backgroundColor: '#e5eeff' }}>
        <Icon name={icon} color="primary" size={18} />
      </View>
      <View style={st.grow}>
        <AppText variant="labelMd">{busy ? 'Préparation…' : label}</AppText>
        {icon === 'print' ? (
          <AppText variant="labelSm" color="outline">
            Format compact : 50 × 30 mm
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron-right" color="outline" size={18} />
    </Pressable>
  );
}
export function BarcodeBars({
  code,
  large = false,
  height,
  compact = false,
}: {
  code: string;
  large?: boolean;
  height?: number;
  compact?: boolean;
}) {
  const { bars } = barcodePattern(code);
  return (
    <View
      style={{
        backgroundColor: '#fff',
        paddingVertical: compact ? 8 : 18,
        paddingHorizontal: 12,
        gap: compact ? 8 : 12,
        alignItems: 'center',
      }}
    >
      <View
        accessible
        accessibilityLabel={`Code-barres ${code}`}
        style={{ width: '100%', height: height ?? (large ? 180 : 110), flexDirection: 'row' }}
      >
        {bars.map((b, i) => (
          <View key={i} style={{ flex: b.width, backgroundColor: b.isBlack ? '#000' : '#fff' }} />
        ))}
      </View>
      <AppText variant="labelLg" style={{ letterSpacing: 3, textAlign: 'center' }}>
        {code}
      </AppText>
    </View>
  );
}
export function BarcodeDisplay({
  product,
  onClose,
  onEdit,
  editable = true,
}: {
  product: StockProduct;
  onClose: () => void;
  onEdit: () => void;
  editable?: boolean;
}) {
  const [large, setLarge] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<unknown>();
  async function printLabel() {
    setPrinting(true);
    try {
      const html = barcodeHtml(productCode(product), product.productName);
      if (Platform.OS === 'web') await printCrmDocument(html);
      else {
        const file = await Print.printToFileAsync({
          html,
          width: (50 * 72) / 25.4,
          height: (30 * 72) / 25.4,
        });
        await Print.printAsync({ uri: file.uri });
      }
    } catch (e) {
      setError(e);
    } finally {
      setPrinting(false);
    }
  }
  const { width, height } = useWindowDimensions();
  const code = productCode(product);
  return (
    <StockPage
      title="Détail Médicament"
      onClose={onClose}
      footer={<SButton label="Retour au détail produit" icon="arrow-back" onPress={onClose} />}
    >
      <SCard>
        <View style={st.row}>
          <SBadge label="CIP Officine" />
          <SBadge label={`${product.quantity} unités`} tone="teal" />
        </View>
        <View style={st.row}>
          <View style={st.grow}>
            <AppText variant="headlineSm">{product.productName}</AppText>
          </View>
          <AppText variant="labelLg" color="primary">
            {money(productInfo(product).ttc)} DH
          </AppText>
        </View>
        <AppText variant="bodySm" color="outline">
          {product.description || product.sku}
        </AppText>
        <View style={[st.row, { flexWrap: 'wrap' }]}>
          <SBadge label={code} />
          <SBadge label={product.locationName || 'Aucun emplacement'} />
        </View>
      </SCard>
      <SCard>
        <SHeading title={`${barcodePattern(code).format} STANDARD / CIP13`} icon="verified-user" />
        <BarcodeBars code={code} large={large || width >= 700} />
        <SNote>
          Tenez l’écran immobile et orientez-le vers le lecteur. Le code affiché correspond au
          produit sélectionné.
        </SNote>
      </SCard>
      <BarcodeAction
        label={large ? 'Réduire l’affichage' : 'Agrandir en affichage horizontal (Paysage)'}
        icon="fullscreen"
        onPress={() => setLarge((v) => !v)}
      />
      {editable ? (
        <BarcodeAction label="Modifier ou remplacer ce code-barres" icon="edit" onPress={onEdit} />
      ) : null}
      <BarcodeAction
        label="Imprimer l’étiquette thermique"
        icon="print"
        onPress={() => void printLabel()}
        busy={printing}
      />
      {error ? <ErrorState error={error} /> : null}
      {large ? (
        <StockPage
          title="Code-barres en plein écran"
          onClose={() => setLarge(false)}
          footer={
            <SButton
              label="Retour à l’affichage normal"
              icon="fullscreen-exit"
              onPress={() => setLarge(false)}
            />
          }
        >
          <View style={{ height: height - 240, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: Math.max(width, height) - 280,
                transform: height > width ? [{ rotate: '90deg' }] : undefined,
              }}
            >
              <BarcodeBars code={code} large />
            </View>
          </View>
        </StockPage>
      ) : null}
    </StockPage>
  );
}
export function BarcodeFlow({
  target,
  initialCode,
  initialAssociation = false,
  initialSearch = '',
  onClose,
  onLinked,
  canUpdate = true,
  onScanned,
}: {
  target?: StockProduct;
  initialCode?: string;
  initialAssociation?: boolean;
  initialSearch?: string;
  onClose: () => void;
  onLinked: (p: StockProduct) => void;
  canUpdate?: boolean;
  onScanned?: (code: string) => void;
}) {
  const tScan = useStockScannerTranslation();
  const preview = useContext(StockContext);
  const stockApi = useStockApi();
  const scope = useStockScope();
  const [phase, setPhase] = useState<'scan' | 'unknown' | 'associate'>(
    initialAssociation ? 'associate' : initialCode ? (target ? 'associate' : 'unknown') : 'scan',
  );
  const [code, setCode] = useState(initialCode || '');
  const [search, setSearch] = useState(initialSearch);
  const settled = useDebounce(search);
  const [selected, setSelected] = useState<StockProduct | undefined>(target);
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<unknown>();
  const [reading, setReading] = useState(false);
  const [scanAttempt, setScanAttempt] = useState(0);
  const [cameraPaused, setCameraPaused] = useState(false);
  const cameraPausedRef = useRef(false);
  const [duplicateProduct, setDuplicateProduct] = useState<StockProduct>();
  const readLock = useRef(false);
  const query = useQuery({
    queryKey: ['catalogue', scope, 'associate', settled],
    queryFn: ({ signal }) => stockApi.products({ search: settled }, signal),
    enabled: phase === 'associate' && !!settled && !target,
  });
  const link = useStockMutation(async () => {
    if (!selected) throw new Error('Sélectionnez un produit.');
    return stockApi.barcode(selected.id, code, replace);
  });
  async function read(value: string, fromCamera = false) {
    if (readLock.current || (fromCamera && cameraPausedRef.current) || !value.trim()) return;
    readLock.current = true;
    cameraPausedRef.current = true;
    setCameraPaused(true);
    setCode(value.trim());
    setReading(true);
    setError(undefined);
    setDuplicateProduct(undefined);
    try {
      if (onScanned) {
        onScanned(value.trim());
        return;
      }
      const result = await stockApi.lookup(value.trim());
      if (result.product && target && result.product.id === target.id) {
        setPhase('associate');
        return;
      }
      if (result.product && (!target || result.product.id === target.id)) {
        onLinked(result.product);
        return;
      }
      if (result.product) {
        setDuplicateProduct(result.product);
        return;
      }
      setPhase(target ? 'associate' : 'unknown');
    } catch (e) {
      setError(e);
    } finally {
      setReading(false);
      readLock.current = false;
    }
  }
  async function confirm() {
    try {
      await link.mutateAsync(undefined);
      if (selected) onLinked({ ...selected, sku: code, barcode: code });
    } catch (e) {
      setError(e);
    }
  }
  const existing = selected ? productCode(selected) : '';
  return (
    <StockPage
      title={tScan(
        phase === 'associate' ? 'stock_scanner_association_title' : 'stock_scanner_scan_title',
      )}
      onClose={onClose}
      footer={
        phase === 'associate' ? (
          <>
            <SButton
              label="Confirmer l’association du code-barres"
              icon="link"
              onPress={() => void confirm()}
              busy={link.isPending}
              disabled={
                !selected ||
                (!canAssociateBarcode(selected) && selected.id !== target?.id) ||
                (!!existing && existing !== code && !replace) ||
                !canUpdate
              }
            />
            <SButton label="Annuler" secondary onPress={onClose} />
          </>
        ) : undefined
      }
    >
      {phase === 'unknown' ? (
        <View
          style={{
            height: 220,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#213145',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {preview && Platform.OS === 'web' ? (
            <Image
              source={require('../../../assets/images/stitch-scanner-preview.jpg')}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0.6,
              }}
              resizeMode="cover"
            />
          ) : cameraAvailable ? (
            <Suspense fallback={null}>
              <Camera onRead={() => {}} />
            </Suspense>
          ) : (
            <>
              <Icon name="qr-code-scanner" size={80} color="onPrimary" />
              <AppText color="onPrimary" variant="bodySm">
                Scanner en attente d’association
              </AppText>
            </>
          )}
          <ScannerGuide />
          <View style={{ position: 'absolute', top: 12, left: 12, right: 12 }}>
            <SBadge label={preview ? 'APERÇU CAMÉRA' : 'SCANNER EN ATTENTE'} />
          </View>
        </View>
      ) : null}
      {phase === 'scan' ? (
        <>
          <SBadge label={tScan('stock_scanner_scanner_active')} tone="teal" />
          {cameraAvailable ? (
            <Suspense fallback={<AppText>{tScan('stock_scanner_loading_camera')}</AppText>}>
              <Camera key={scanAttempt} paused={cameraPaused} onRead={(v) => void read(v, true)} />
            </Suspense>
          ) : (
            <SNote>Saisissez le code ci-dessous pour rechercher le produit.</SNote>
          )}
          <SField label={tScan('stock_scanner_code_label')} value={code} onChange={setCode} />
          <SButton
            label={tScan('stock_scanner_search')}
            icon="search"
            onPress={() => void read(code)}
            busy={reading}
            disabled={!code.trim()}
          />
          {cameraPaused && !reading ? (
            <SButton
              label={tScan('stock_scanner_rescan')}
              secondary
              icon="qr-code-scanner"
              onPress={() => {
                cameraPausedRef.current = false;
                setCameraPaused(false);
                setScanAttempt((attempt) => attempt + 1);
                setCode('');
                setError(undefined);
                setDuplicateProduct(undefined);
              }}
            />
          ) : null}
          {duplicateProduct ? (
            <View style={{ gap: 10 }}>
              <SNote error>
                {tScan('stock_scanner_duplicate', { product: duplicateProduct.productName })}
              </SNote>
              <SButton
                secondary
                label={tScan('stock_scanner_view_linked')}
                icon="inventory-2"
                onPress={() => onLinked(duplicateProduct)}
              />
            </View>
          ) : null}
        </>
      ) : (
        <>
          {phase === 'associate' ? (
            <View style={st.row}>
              <Icon name="link" color="primary" size={16} />
              <AppText variant="labelSm" color="primary" style={st.grow}>
                ASSOCIATION RAPIDE
              </AppText>
              <SBadge label="Étape 1/2" />
            </View>
          ) : null}
          <SCard tone={phase === 'associate' ? '#006a63' : undefined}>
            <SBadge label={tScan('stock_scanner_scanned_code')} />
            <AppText variant="headlineMd" color={phase === 'associate' ? 'onPrimary' : 'onSurface'}>
              {code}
            </AppText>
            <SBadge
              label={phase === 'unknown' ? 'Inconnu' : 'Association rapide'}
              tone={phase === 'unknown' ? 'red' : 'teal'}
            />
          </SCard>
          {phase === 'associate' ? (
            <SButton
              label={tScan('stock_scanner_rescan')}
              icon="qr-code-scanner"
              secondary
              disabled={link.isPending}
              onPress={() => {
                cameraPausedRef.current = false;
                setCameraPaused(false);
                setCode('');
                setError(undefined);
                setDuplicateProduct(undefined);
                setReplace(false);
                setPhase('scan');
              }}
            />
          ) : null}
          {phase === 'unknown' ? (
            <>
              <AppText variant="headlineMd">Ce code-barres n’est associé à aucun produit</AppText>
              <AppText>Vous pouvez l’associer à un produit existant sans créer de doublon.</AppText>
              <SNote>
                L’association permet de retrouver le produit plus rapidement lors des prochaines
                recherches.
              </SNote>
              <SButton
                label="Rechercher un produit à associer"
                icon="search"
                onPress={() => setPhase('associate')}
                disabled={!canUpdate}
              />
              <SButton
                label={tScan('stock_scanner_rescan')}
                secondary
                icon="qr-code-scanner"
                onPress={() => setPhase('scan')}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Saisir le code manuellement"
                onPress={() => setPhase('scan')}
                style={{ alignItems: 'center', padding: 10 }}
              >
                <AppText variant="labelSm" color="outline">
                  Saisir le code manuellement
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <SHeading
                title="Sélectionner le produit du catalogue"
                icon="medication"
                aside={
                  <AppText variant="labelSm" color="outline">
                    {target ? 1 : query.data?.total || 0} correspondances
                  </AppText>
                }
              />
              {!target ? (
                <SSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Saisir le nom du produit à associer…"
                />
              ) : null}
              {query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} />
              ) : null}
              <ScrollView style={{ maxHeight: 400 }}>
                {(target ? [target] : query.data?.data || [])
                  .filter((p) => canAssociateBarcode(p) || p.id === target?.id)
                  .map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Sélectionner ${p.productName}`}
                      onPress={() => {
                        setSelected(p);
                        setReplace(false);
                      }}
                      style={[
                        st.card,
                        {
                          marginBottom: 8,
                          borderColor: selected?.id === p.id ? '#00417c' : '#e5eeff',
                          backgroundColor: selected?.id === p.id ? '#eff4ff' : '#fff',
                          borderWidth: selected?.id === p.id ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={st.row}>
                        <ProductPhoto product={p} size={48} />
                        <View style={st.grow}>
                          <AppText variant="labelLg">{p.productName}</AppText>
                          <AppText variant="bodySm" color="outline">
                            {p.sku} • {p.quantity} unités
                          </AppText>
                        </View>
                        <Icon
                          name={selected?.id === p.id ? 'check-circle' : 'radio-button-unchecked'}
                          color="primary"
                        />
                      </View>
                      <SBadge
                        label={
                          productCode(p)
                            ? `Code actuel : ${productCode(p)}`
                            : 'Aucun code-barres associé'
                        }
                        tone={productCode(p) ? 'blue' : 'grey'}
                      />
                    </Pressable>
                  ))}
              </ScrollView>
              {!target && settled && query.data?.data.length === 0 ? (
                <SNote>Aucun produit trouvé. Essayez un autre nom.</SNote>
              ) : null}
              {existing && existing !== code ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: replace }}
                  onPress={() => setReplace((v) => !v)}
                  style={st.note}
                >
                  <Icon name={replace ? 'check-box' : 'check-box-outline-blank'} color="primary" />
                  <AppText variant="bodySm" style={st.grow}>
                    Je confirme le remplacement du code {existing} par {code}.
                  </AppText>
                </Pressable>
              ) : null}
              <SNote>{tScan('stock_scanner_updates_sku')}</SNote>
              {selected ? (
                <SCard>
                  <AppText variant="labelSm" color="outline">
                    LIAISON EN COURS
                  </AppText>
                  <View style={st.row}>
                    <AppText variant="labelMd" style={st.grow}>
                      {selected.productName}
                    </AppText>
                    <SBadge label={`…${code.slice(-5)}`} />
                  </View>
                </SCard>
              ) : null}
            </>
          )}
        </>
      )}
      {error ? <ErrorState error={error} /> : null}
    </StockPage>
  );
}
