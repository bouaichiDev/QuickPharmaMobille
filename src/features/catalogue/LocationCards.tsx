import { canAssociateBarcode } from './stockApi';
import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { type StockLocation, type StockProduct, productCode } from './stockApi';
import { locationInfo } from './stockPresentation';
import { SBadge, st } from './StockDesign';
export function LocationCard({
  location: l,
  onPress,
}: {
  location: StockLocation;
  onPress: () => void;
}) {
  const info = locationInfo(l),
    red = info.zone === 'secure',
    teal = info.zone === 'cold' || info.zone === 'natural';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${l.name}`} onPress={onPress}>
      <View
        style={[
          st.card,
          {
            gap: 8,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: red ? '#ba1a1a' : teal ? '#006a63' : '#00417c',
          },
        ]}
      >
        <View style={st.row}>
          <View
            style={{
              padding: 10,
              borderRadius: 8,
              backgroundColor: red ? '#ffdad6' : teal ? '#d7faf2' : '#e5eeff',
            }}
          >
            <Icon name={info.icon} color={red ? 'error' : teal ? 'secondary' : 'primary'} />
          </View>
          <View style={st.grow}>
            <AppText variant="labelSm" color={teal ? 'secondary' : 'primary'}>
              {info.label}
            </AppText>
            <AppText variant="labelSm" color="outline">
              {info.shelves || l.description || 'Détails non renseignés'}
            </AppText>
          </View>
        </View>
        <View style={st.row}>
          <AppText variant="headlineSm" style={st.grow}>
            {l.name}
          </AppText>
          <Icon name="chevron-right" color="outline" size={20} />
        </View>
        <View style={st.row}>
          <AppText variant="bodySm" color="primary" style={st.grow}>
            {l.products} produits référencés
          </AppText>
          <AppText
            variant="labelSm"
            color={info.occupancy !== undefined && info.occupancy >= 90 ? 'error' : 'primary'}
          >
            {info.occupancy === undefined
              ? 'Capacité non renseignée'
              : `${info.occupancy}% d’occupation`}
          </AppText>
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: '#e5eeff' }}>
          <View
            style={{
              height: 5,
              borderRadius: 3,
              width: `${Math.min(100, info.occupancy || 0)}%`,
              backgroundColor:
                info.occupancy !== undefined && info.occupancy >= 90 ? '#ba1a1a' : '#006a63',
            }}
          />
        </View>
        <View style={st.row}>
          <View style={[st.row, st.grow, { gap: 4 }]}>
            <Icon
              name={
                info.occupancy !== undefined && info.occupancy >= 90
                  ? 'warning-amber'
                  : info.zone === 'cold'
                    ? 'ac-unit'
                    : 'inventory-2'
              }
              color={info.occupancy !== undefined && info.occupancy >= 90 ? 'error' : 'secondary'}
              size={14}
            />
            <AppText variant="labelSm" color="outline">
              {info.occupancy !== undefined && info.occupancy >= 90
                ? 'Forte saturation'
                : `${l.quantity} unités en stock`}
            </AppText>
          </View>
          <AppText variant="labelSm" color="outline">
            Code : {info.code || '—'}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}
export function LocationProductCard({
  product: p,
  onPress,
  onAssociate,
}: {
  product: StockProduct;
  onPress: () => void;
  onAssociate?: () => void;
}) {
  const low = Number(p.quantity) <= Number(p.minQuantity),
    code = productCode(p);
  return (
    <View style={[st.card, low && { borderLeftWidth: 3, borderLeftColor: '#ba1a1a' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Détail ${p.productName}`}
        onPress={onPress}
        style={st.row}
      >
        <View style={st.grow}>
          <AppText variant="headlineSm">{p.productName}</AppText>
          <AppText variant="bodySm" color="outline">
            {p.description || p.categoryName || 'Produit du catalogue'}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="dataMetric" color={low ? 'error' : 'primary'}>
            {p.quantity}
          </AppText>
          <AppText variant="labelSm" color="outline">
            {low ? 'restantes' : 'unités'}
          </AppText>
        </View>
      </Pressable>
      <View style={st.row}>
        <View style={[st.row, st.grow]}>
          <Icon
            name={low ? 'warning-amber' : !code ? 'link-off' : 'check-circle'}
            color={low ? 'error' : !code ? 'outline' : 'secondary'}
            size={15}
          />
          <AppText variant="labelSm" color={low ? 'error' : 'outline'}>
            {low ? `Seuil min (${p.minQuantity})` : code ? 'Stock régulier' : 'Sans code-barres'}
          </AppText>
        </View>
        <AppText variant="labelSm" color="outline">
          {p.sku}
        </AppText>
      </View>
      <View style={[st.row, { padding: 8, borderRadius: 6, backgroundColor: '#eff4ff' }]}>
        <Icon name="view-module" color="primary" size={15} />
        <AppText variant="labelSm" style={st.grow}>
          {p.location_hint || p.locationName || 'Niveau non renseigné'}
        </AppText>
        {code ? (
          <SBadge label="EAN lié" tone="teal" />
        ) : onAssociate && canAssociateBarcode(p) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Associer un code à ${p.productName}`}
            onPress={onAssociate}
          >
            <SBadge label="Associer Code" />
          </Pressable>
        ) : (
          <SBadge label="Non apparié" tone="grey" />
        )}
      </View>
    </View>
  );
}
