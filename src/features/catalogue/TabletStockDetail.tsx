import { canAssociateBarcode } from './stockApi';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ProductPhoto } from './ProductPhoto';
import { useStockApi } from './StockContext';
import { useStockScope, useStockMutation } from './useStock';
import { productInfo } from './stockPresentation';
import { productCode, type StockProduct } from './stockApi';
import { BarcodeBars } from './BarcodeFlow';
import {
  SBadge,
  SCard,
  SButton,
  SField,
  SHeading,
  SNote,
  StockPage,
  st,
  money,
  stockDate,
} from './StockDesign';
function QuickAction({
  label,
  icon,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 90,
        borderRadius: 12,
        padding: 10,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: danger ? '#ffdad6' : '#eff4ff',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Icon name={icon} color={danger ? 'error' : 'primary'} size={21} />
      </View>
      <AppText variant="labelSm" color={danger ? 'error' : 'primary'} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}
function ManualWithdrawal({ product, onClose }: { product: StockProduct; onClose: () => void }) {
  const api = useStockApi();
  const [quantity, setQuantity] = useState('1'),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState<unknown>();
  const mutation = useStockMutation(() =>
    api.withdraw(product.id, Number(quantity), reason.trim()),
  );
  async function submit() {
    try {
      await mutation.mutateAsync(undefined);
      onClose();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <StockPage
      title="Sortie manuelle"
      onClose={onClose}
      footer={
        <SButton
          label={confirmed ? 'Confirmer la sortie de stock' : 'Vérifier la sortie'}
          icon="remove-shopping-cart"
          disabled={
            !/^\d+$/.test(quantity) ||
            Number(quantity) < 1 ||
            Number(quantity) > Number(product.quantity) ||
            reason.trim().length < 3
          }
          busy={mutation.isPending}
          onPress={() => (confirmed ? void submit() : setConfirmed(true))}
        />
      }
    >
      <SCard>
        <SHeading title={product.productName} icon="inventory-2" />
        <SBadge label={`${product.quantity} unités disponibles`} />
        <SField
          label="Quantité à retirer"
          numeric
          value={quantity}
          onChange={(v) => {
            setQuantity(v);
            setConfirmed(false);
          }}
        />
        <SField
          label="Motif de la sortie"
          value={reason}
          onChange={(v) => {
            setReason(v);
            setConfirmed(false);
          }}
          multiline
        />
      </SCard>
      <SNote>
        Les unités dont la péremption est la plus proche sont retirées en priorité. La sortie sera
        enregistrée dans l’historique du stock.
      </SNote>
      {confirmed ? (
        <SNote error>
          Confirmez le retrait de {quantity} unités pour appliquer cette sortie de stock.
        </SNote>
      ) : null}
      {error ? <ErrorState error={error} /> : null}
    </StockPage>
  );
}
export function TabletStockDetail({
  id,
  canEdit,
  canPlace,
  canWithdraw,
  onEdit,
  onPlace,
  onBarcode,
}: {
  id: number;
  canEdit: boolean;
  canPlace: boolean;
  canWithdraw: boolean;
  onEdit: (p: StockProduct) => void;
  onPlace: (p: StockProduct) => void;
  onBarcode: (p: StockProduct, edit?: boolean) => void;
}) {
  const api = useStockApi(),
    scope = useStockScope(),
    [withdraw, setWithdraw] = useState(false);
  const query = useQuery({
    queryKey: ['stock-product', scope, id],
    queryFn: ({ signal }) => api.detail(id, signal),
    enabled: !!scope,
    staleTime: 30000,
  });
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <AppText>Chargement de la fiche…</AppText>;
  const { product: p } = query.data,
    info = productInfo(p),
    code = productCode(p),
    low = Number(p.quantity) <= Number(p.minQuantity);
  const lots = [...query.data.lots].sort((a, b) =>
    (a.expiry || '9999').localeCompare(b.expiry || '9999'),
  );
  return (
    <View style={{ gap: 8 }}>
      <View
        style={[st.card, { padding: 12, gap: 16, borderTopWidth: 4, borderTopColor: '#006a63' }]}
      >
        <View style={[st.row, { alignItems: 'flex-start', gap: 10 }]}>
          <ProductPhoto product={p} size={64} />
          <View style={st.grow}>
            <View style={[st.row, { flexWrap: 'wrap', gap: 4 }]}>
              <SBadge
                label={Number(p.active) > 0 ? 'Produit actif' : 'Produit inactif'}
                tone="teal"
              />
              <AppText variant="labelSm">Code CIP : {p.sku}</AppText>
            </View>
            <AppText variant="headlineLg">{p.productName}</AppText>
            <AppText variant="bodyMd" color="primary">
              {info.substance ? info.substance + ' • ' : ''}
              {info.presentation || p.categoryName || 'Présentation non renseignée'}
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: '#eff4ff',
              padding: 10,
              borderRadius: 12,
              alignItems: 'flex-end',
            }}
          >
            <AppText variant="labelSm" color="primary">
              Prix public vente
            </AppText>
            <AppText variant="dataMetric" color="primary">
              {money(info.ttc)}
              <AppText variant="labelMd"> DH</AppText>
            </AppText>
          </View>
        </View>
        <View style={[st.row, { alignItems: 'stretch', gap: 4 }]}>
          {[
            {
              icon: 'inventory-2' as const,
              label: 'Stock direct',
              value: String(p.quantity) + ' unités',
              hint: low ? 'Sous le seuil minimum' : 'Conforme au seuil',
            },
            {
              icon: 'place' as const,
              label: 'Emplacement',
              value: p.locationName?.split(/[—–]/)[0]?.trim() || 'Non affecté',
              hint:
                p.location_hint || p.locationName?.split(/[—–]/)[1]?.trim() || 'Rayon non précisé',
            },
            {
              icon: 'event' as const,
              label: 'DLUO proche',
              value: lots.find((l) => l.expiry)?.expiry
                ? new Date(lots.find((l) => l.expiry)!.expiry!).toLocaleDateString('fr-FR', {
                    month: '2-digit',
                    year: 'numeric',
                  })
                : '—',
              hint: lots[0]?.reference
                ? `Lot #${lots[0].reference}`
                : 'Péremption disponible par lot',
            },
          ].map((m) => (
            <View key={m.label} style={[st.metric, { padding: 10, gap: 4 }]}>
              <View style={st.row}>
                <Icon name={m.icon} color="primary" size={15} />
                <AppText variant="labelSm" color="primary" style={st.grow}>
                  {m.label}
                </AppText>
              </View>
              <AppText variant="headlineMd" numberOfLines={2}>
                {m.value}
              </AppText>
              <AppText variant="labelSm" color="secondary">
                {m.hint}
              </AppText>
            </View>
          ))}
        </View>
        <View style={st.row}>
          <Icon name="qr-code-scanner" size={17} color="secondary" />
          <AppText variant="bodySm" color="primary" style={st.grow}>
            Visuel {code ? 'scannable directement à l’écran' : 'sans code-barres associé'}
          </AppText>
          <SBadge label={code ? 'Prêt douchette laser' : 'À associer'} tone="teal" />
        </View>
        {code ? (
          <View style={{ width: '100%', maxWidth: 360, alignSelf: 'center' }}>
            <BarcodeBars code={code} height={64} compact />
          </View>
        ) : canEdit && canAssociateBarcode(p) ? (
          <SButton
            label="Associer un code-barres"
            teal
            icon="link"
            disabled={!canEdit}
            onPress={() => onBarcode(p, true)}
          />
        ) : null}
      </View>
      <SCard compact>
        <View style={st.row}>
          <AppText variant="headlineSm" color="primary" style={st.grow}>
            Actions rapides & opérations
          </AppText>
        </View>
        <View style={[st.row, { alignItems: 'stretch', gap: 4 }]}>
          <QuickAction
            label="Modifier fiche"
            icon="edit-note"
            disabled={!canEdit}
            onPress={() => onEdit(p)}
          />
          <QuickAction
            label="Changer rayon"
            icon="swap-horiz"
            disabled={!canPlace}
            onPress={() => onPlace(p)}
          />
          {code || (canEdit && canAssociateBarcode(p)) ? (
            <QuickAction
              label={code ? 'Plein écran code' : 'Associer code'}
              icon={code ? 'zoom-in' : 'link'}
              disabled={!code && !canEdit}
              onPress={() => onBarcode(p, !code)}
            />
          ) : null}
          <QuickAction
            label="Sortie manuelle"
            icon="remove-shopping-cart"
            danger
            disabled={!canWithdraw || Number(p.quantity) < 1}
            onPress={() => setWithdraw(true)}
          />
        </View>
      </SCard>
      <SCard compact>
        <SHeading
          title="Lots & traçabilité FIFO"
          icon="rule"
          aside={<SBadge label="Priorité au plus proche" tone="teal" />}
        />
        <View style={[st.row, { gap: 4, padding: 8, backgroundColor: '#e5eeff', borderRadius: 8 }]}>
          {['NUMÉRO DE LOT', 'DATE LIMITE (DLUO)', 'QUANTITÉ', 'RÈGLE FIFO'].map((t, i) => (
            <AppText key={t} variant="labelSm" color="primary" style={{ flex: i === 1 ? 1.3 : 1 }}>
              {t}
            </AppText>
          ))}
        </View>
        {lots.length ? (
          lots.map((lot, i) => (
            <View
              key={i}
              style={[st.row, { padding: 8, gap: 4, borderBottomWidth: 1, borderColor: '#eff4ff' }]}
            >
              <AppText variant="labelSm" color="primary" style={{ flex: 1 }}>
                {lot.reference ? '#' + lot.reference : 'Non renseigné'}
              </AppText>
              <AppText variant="bodySm" style={{ flex: 1.3 }}>
                {lot.expiry ? stockDate(lot.expiry) : 'Sans péremption'}
              </AppText>
              <AppText variant="labelLg" style={{ flex: 1 }}>
                {lot.quantity} unités
              </AppText>
              <View style={{ flex: 1 }}>
                <SBadge
                  label={i === 0 ? '1er à délivrer' : 'En réserve'}
                  tone={i === 0 ? 'teal' : 'blue'}
                />
              </View>
            </View>
          ))
        ) : (
          <AppText variant="bodySm">Aucun lot disponible.</AppText>
        )}
      </SCard>
      {withdraw ? <ManualWithdrawal product={p} onClose={() => setWithdraw(false)} /> : null}
    </View>
  );
}
