import { canAssociateBarcode } from './stockApi';
import { ProductPrice } from './ProductPrice';
import { ProductPhoto } from './ProductPhoto';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { type StockProduct, productCode } from './stockApi';
import { SBadge, SButton, st } from './StockDesign';
export function StockProductCard({
  product: p,
  onDetail,
  onBarcode,
  onAssociate,
  onOrder,
  onInventory,
  selected = false,
}: {
  product: StockProduct;
  onDetail: () => void;
  onBarcode: () => void;
  onAssociate?: () => void;
  onOrder?: () => void;
  onInventory?: () => void;
  selected?: boolean;
}) {
  const code = productCode(p),
    low = Number(p.quantity) <= Number(p.minQuantity);
  return (
    <View style={[st.card, selected && { borderColor: '#00417c', borderWidth: 2 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Détail du produit ${p.productName}`}
        onPress={onDetail}
        style={st.row}
      >
        {p.images && p.images !== '[]' ? (
          <ProductPhoto product={p} size={56} />
        ) : (
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 10,
              backgroundColor: '#eff4ff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="medication" color="primary" size={26} />
          </View>
        )}
        <View style={[st.grow, { gap: 3 }]}>
          <View style={[st.row, { flexWrap: 'wrap', gap: 4 }]}>
            <SBadge label={p.categoryName || 'Catalogue'} />
            {p.requires_prescription ? <SBadge label="Ordonnance" tone="red" /> : null}
            <AppText variant="labelSm" color="outline" numberOfLines={1}>
              {/^\d+$/.test(p.sku) ? 'CIP: ' : ''}
              {p.sku}
            </AppText>
          </View>
          <AppText variant="headlineSm" numberOfLines={2}>
            {p.productName}
          </AppText>
          <AppText variant="bodySm" color="onSurfaceVariant" numberOfLines={2}>
            {p.description || 'Présentation non renseignée'}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Inventaire de ${p.productName}`}
          accessibilityState={{ disabled: !onInventory }}
          disabled={!onInventory}
          onPress={(event) => {
            event.stopPropagation();
            onInventory?.();
          }}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: onInventory ? 1 : 0.4,
          }}
        >
          <Icon name="inventory-2" color="primary" size={22} />
        </Pressable>
        <Icon name="chevron-right" color="outline" size={18} />
      </Pressable>
      {!code ? (
        <View style={[st.row, { backgroundColor: '#e5eeff', borderRadius: 8, padding: 8 }]}>
          <Icon name="link-off" color="outline" size={16} />
          <AppText variant="labelSm" style={st.grow} color="onSurfaceVariant">
            Sans code-barres
          </AppText>
          {onAssociate && canAssociateBarcode(p) ? (
            <SButton label="Associer code" teal compact icon="link" onPress={onAssociate} />
          ) : null}
        </View>
      ) : low ? (
        <View style={{ backgroundColor: '#ffdad6', padding: 8, borderRadius: 8, gap: 4 }}>
          <View style={st.row}>
            <Icon name="warning-amber" color="error" size={16} />
            <View style={st.grow}>
              <AppText variant="labelSm" color="error">
                Stock critique : {p.quantity} unités
              </AppText>
              <AppText variant="labelSm" color="error">
                Sous le seuil minimum : {p.minQuantity}
              </AppText>
            </View>
          </View>
          <SButton
            label="Commander"
            icon="shopping-cart"
            compact
            secondary
            disabled={!onOrder}
            onPress={() => onOrder?.()}
          />
        </View>
      ) : null}
      <View style={st.row}>
        <View style={st.grow}>
          <AppText variant="labelSm" color="outline">
            Prix public unitaire
          </AppText>
          <ProductPrice product={p} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="labelSm" color="outline">
            Disponibilité
          </AppText>
          <View style={[st.row, { gap: 4 }]}>
            <Icon name="circle" color={low ? 'error' : 'secondary'} size={7} />
            <AppText variant="labelLg" color={low ? 'error' : 'secondary'}>
              {p.quantity} unités
            </AppText>
          </View>
        </View>
      </View>
      <View style={[st.row, { backgroundColor: '#eff4ff', padding: 8, borderRadius: 8 }]}>
        <Icon name="view-module" color="outline" size={14} />
        <AppText variant="labelSm" style={st.grow} numberOfLines={1}>
          {p.locationName ||
            (p.stockMetadataLoaded === false ? 'Consulter les emplacements' : 'Aucun emplacement')}
          {p.location_hint ? ` • ${p.location_hint}` : ''}
        </AppText>
        {code ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Afficher le code-barres de ${p.productName}`}
            onPress={onBarcode}
            style={[st.row, { gap: 3 }]}
          >
            <Icon name="link" color="secondary" size={14} />
            <AppText variant="labelSm" color="secondary">
              {p.barcode || /^\d+$/.test(p.sku) ? 'EAN lié' : 'Code lié'}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="labelSm" color="outline">
            Non apparié
          </AppText>
        )}
      </View>
    </View>
  );
}
