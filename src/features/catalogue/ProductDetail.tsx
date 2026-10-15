import { canAssociateBarcode } from './stockApi';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useStockApi } from './StockContext';
import { productCode, type StockProduct } from './stockApi';
import { productInfo } from './stockPresentation';
import { useStockScope } from './useStock';
import { ProductPhoto } from './ProductPhoto';
import ProductSalesHistory from './ProductSalesHistory';
import { barcodePattern } from './stockBarcode';
import { SBadge, SButton, SCard, SHeading, StockPage, money, st, stockDate } from './StockDesign';
export { ProductPhoto } from './ProductPhoto';
function Fold({
  title,
  icon,
  children,
  initialOpen = false,
  aside,
}: {
  title: string;
  icon: Parameters<typeof Icon>[0]['name'];
  children: React.ReactNode;
  initialOpen?: boolean;
  aside?: React.ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <SCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
      >
        <SHeading
          title={title}
          icon={icon}
          aside={
            <View style={st.row}>
              {aside}
              <Icon name={open ? 'expand-less' : 'expand-more'} color="outline" size={20} />
            </View>
          }
        />
      </Pressable>
      {open ? children : null}
    </SCard>
  );
}
export function ProductDetailContent({
  id,
  canEdit,
  canPlace,
  canCost,
  onBarcode,
  onPlace,
}: {
  id: number;
  canEdit: boolean;
  canPlace: boolean;
  canCost: boolean;
  onBarcode: (p: StockProduct, edit?: boolean) => void;
  onPlace: (p: StockProduct) => void;
  onEdit: (p: StockProduct) => void;
}) {
  const api = useStockApi(),
    scope = useStockScope();
  const [photo, setPhoto] = useState(false);
  const [sales, setSales] = useState(false);
  const q = useQuery({
    queryKey: ['stock-product', scope, id],
    queryFn: ({ signal }) => api.detail(id, signal),
    enabled: !!scope,
    staleTime: 30000,
  });
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (!q.data) return <AppText>Chargement du produit…</AppText>;
  const { product: p, movements } = q.data;
  const info = productInfo(p),
    code = productCode(p),
    low = Number(p.quantity) <= Number(p.minQuantity);
  const lots = [...q.data.lots].sort((a, b) =>
    (a.expiry || '9999').localeCompare(b.expiry || '9999'),
  );
  const max = p.maxQuantity && p.maxQuantity > 0 ? p.maxQuantity : undefined;
  return (
    <View style={{ gap: 16 }}>
      <SCard>
        <View style={[st.row, { alignItems: 'flex-start', gap: 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agrandir la photo du produit"
            onPress={() => setPhoto(true)}
          >
            <ProductPhoto product={p} />
            <View
              style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                padding: 3,
                borderRadius: 6,
                backgroundColor: '#ffffffdd',
              }}
            >
              <Icon name="zoom-in" color="primary" size={15} />
            </View>
          </Pressable>
          <View style={[st.grow, { gap: 3 }]}>
            <View style={[st.row, { flexWrap: 'wrap', gap: 4 }]}>
              <SBadge
                label={p.requires_prescription ? 'Sur ordonnance' : 'En vente libre'}
                tone="teal"
              />
              <SBadge
                label={low ? 'Stock faible' : 'Stock suffisant'}
                tone={low ? 'red' : 'blue'}
              />
            </View>
            <AppText variant="headlineSm">{p.productName}</AppText>
            <AppText variant="bodySm" color="outline">
              {info.manufacturer || p.categoryName || 'Fabricant non renseigné'}
            </AppText>
            <AppText variant="bodySm" color="primary">
              {info.presentation || 'Présentation non renseignée'}
            </AppText>
          </View>
        </View>
        <View style={[st.row, { backgroundColor: '#eff4ff', borderRadius: 8, padding: 10 }]}>
          <View style={st.grow}>
            <AppText variant="labelSm" color="outline">
              Référence CIP
            </AppText>
            <AppText variant="labelMd">{p.sku}</AppText>
          </View>
          <View style={st.grow}>
            <AppText variant="labelSm" color="outline">
              DCI
            </AppText>
            <View style={st.row}>
              <Icon name="medication" color="primary" size={16} />
              <AppText variant="labelMd" style={st.grow}>
                {info.substance || 'Non renseignée'}
              </AppText>
            </View>
          </View>
        </View>
      </SCard>
      <SCard>
        <SHeading
          title="Tarifs & Rentabilité"
          icon="payments"
          aside={canCost ? <SBadge label="Vue Pharmacien" /> : undefined}
        />
        <View style={[st.row, { alignItems: 'stretch' }]}>
          <View style={st.metric}>
            <AppText variant="bodySm" color="outline">
              Prix de vente TTC
            </AppText>
            <AppText variant="dataMetric" color="primary">
              {money(info.ttc)} <AppText variant="labelLg">DH</AppText>
            </AppText>
            <AppText variant="labelSm" color="outline">
              TVA applicable : {info.tax}%
            </AppText>
          </View>
          {canCost ? (
            <View style={st.metric}>
              <AppText variant="bodySm" color="outline">
                Prix d’achat HT
              </AppText>
              <AppText variant="headlineMd">
                {money(p.buyingPrice)} <AppText variant="labelLg">DH</AppText>
              </AppText>
              {p.profitMargin !== undefined ? (
                <View style={[st.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
                  <AppText variant="labelSm" color="secondary">
                    Marge : {money(info.margin)}%
                  </AppText>
                  <SBadge
                    label={`${info.gain >= 0 ? '+' : ''}${money(info.gain)} DH`}
                    tone="teal"
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </SCard>
      <SCard>
        <SHeading
          title="Stock en temps réel"
          icon="inventory-2"
          aside={
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="labelSm" color="outline">
                Valeur stock rayon
              </AppText>
              <AppText variant="labelMd" color="secondary">
                {money(info.ttc * Number(p.quantity))} DH
              </AppText>
            </View>
          }
        />
        <View style={st.row}>
          <AppText variant="dataMetric" color={low ? 'error' : 'primary'}>
            {p.quantity}
          </AppText>
          <AppText variant="bodySm" style={st.grow} color="outline">
            unités disponibles
          </AppText>
          <SBadge label={low ? 'Stock faible' : 'Niveau optimal'} tone={low ? 'red' : 'teal'} />
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#e5eeff' }}>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              width: `${max ? Math.min(100, (Number(p.quantity) * 100) / max) : Number(p.quantity) > 0 ? 100 : 0}%`,
              backgroundColor: low ? '#ba1a1a' : '#006a63',
            }}
          />
        </View>
        <View style={[st.row, { justifyContent: 'space-between' }]}>
          <AppText variant="labelSm" color="outline">
            Mini : {p.minQuantity || 0}
          </AppText>
          <AppText variant="labelSm" color="secondary">
            Actuel : {p.quantity}
          </AppText>
          <AppText variant="labelSm" color="outline">
            Max : {max ?? '—'}
          </AppText>
        </View>
        <View style={st.divider} />
        <View style={st.row}>
          <Icon name="view-module" color="primary" />
          <View style={st.grow}>
            <AppText variant="labelSm" color="outline">
              Emplacement pharmacie
            </AppText>
            <AppText variant="labelMd">
              {p.locationName || 'Aucun emplacement'}
              {p.location_hint ? ` • ${p.location_hint}` : ''}
              {Number(p.locationCount) > 1 ? ` + ${Number(p.locationCount) - 1} autres` : ''}
            </AppText>
          </View>
          {canPlace ? (
            <SButton
              label="Modifier"
              icon="edit-location-alt"
              secondary
              compact
              onPress={() => onPlace(p)}
            />
          ) : null}
        </View>
      </SCard>
      <SCard>
        <SHeading
          title="Code-barres & EAN"
          icon="qr-code-scanner"
          aside={
            <SBadge
              label={code ? 'Lié au catalogue' : 'Sans code-barres'}
              tone={code ? 'teal' : 'grey'}
            />
          }
        />
        <View style={[st.row, { backgroundColor: '#eff4ff', padding: 10, borderRadius: 8 }]}>
          <Icon name="qr-code-2" color="primary" size={32} />
          <View style={st.grow}>
            <AppText variant="labelSm" color="outline">
              {code ? `Code ${barcodePattern(code).format}` : 'Code non associé'}
            </AppText>
            <AppText variant="labelLg">{code || p.sku}</AppText>
          </View>
        </View>
        <View style={st.row}>
          <View style={st.grow}>
            {code || (canEdit && canAssociateBarcode(p)) ? (
              <SButton
                label={code ? 'Afficher le code' : 'Associer un code-barres'}
                secondary={!!code}
                teal={!code}
                compact
                icon={code ? 'visibility' : 'link'}
                disabled={!code && !canEdit}
                onPress={() => onBarcode(p, !code)}
              />
            ) : null}
          </View>
          {code && canEdit && canAssociateBarcode(p) ? (
            <View style={st.grow}>
              <SButton
                label="Remplacer code"
                secondary
                compact
                icon="qr-code-scanner"
                onPress={() => onBarcode(p, true)}
              />
            </View>
          ) : null}
        </View>
      </SCard>
      <Fold
        title="Lots & Péremptions (DLUO)"
        icon="fact-check"
        initialOpen
        aside={<SBadge label={`${lots.length} lots`} />}
      >
        <View style={{ gap: 12 }}>
          {lots.length ? (
            lots.map((l, i) => {
              const expired = !!l.expiry && new Date(l.expiry) < new Date();
              return (
                <View
                  key={`${l.expiry}-${l.location_id}-${i}`}
                  style={[
                    st.metric,
                    {
                      borderLeftWidth: 3,
                      borderLeftColor: expired ? '#ba1a1a' : i === 0 ? '#b78600' : '#006a63',
                      gap: 8,
                    },
                  ]}
                >
                  <View style={st.row}>
                    <Icon name="label-outline" color="primary" size={16} />
                    <View style={st.grow}>
                      <AppText variant="labelMd">
                        {l.reference ? `Lot #${l.reference}` : l.location || 'Lot disponible'}
                      </AppText>
                      <AppText variant="bodySm" color="outline">
                        {l.quantity} unités en stock
                      </AppText>
                    </View>
                    <SBadge
                      label={expired ? 'Périmé' : i === 0 ? 'Premier à sortir (FIFO)' : 'Conforme'}
                      tone={expired ? 'red' : i === 0 ? 'amber' : 'teal'}
                    />
                  </View>
                  <View style={st.divider} />
                  <View style={st.row}>
                    <Icon
                      name="event-available"
                      color={expired ? 'error' : 'secondary'}
                      size={16}
                    />
                    <AppText
                      variant="labelSm"
                      style={st.grow}
                      color={expired ? 'error' : 'secondary'}
                    >
                      DLUO : {l.expiry ? stockDate(l.expiry) : 'Sans péremption'}
                    </AppText>
                    <AppText variant="labelSm" color="outline">
                      {i === 0 ? 'Priorité de délivrance' : 'Stock disponible'}
                    </AppText>
                  </View>
                </View>
              );
            })
          ) : (
            <AppText variant="bodySm">Aucune unité disponible.</AppText>
          )}
        </View>
      </Fold>
      <Fold title="Historique mouvements de stock" icon="history">
        {movements.length ? (
          movements.map((m) => {
            const out = m.type === 'out',
              incoming = m.type === 'in';
            return (
              <View
                key={m.id}
                style={[
                  st.row,
                  { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#e5eeff' },
                ]}
              >
                <Icon
                  name={out ? 'point-of-sale' : incoming ? 'local-shipping' : 'fact-check'}
                  color="primary"
                  size={18}
                />
                <View style={st.grow}>
                  <AppText variant="labelMd">
                    {out
                      ? 'Vente / sortie'
                      : incoming
                        ? 'Réception de stock'
                        : m.type === 'transfer'
                          ? 'Transfert d’emplacement'
                          : 'Ajustement de stock'}
                  </AppText>
                  <AppText variant="bodySm" color="outline">
                    {stockDate(m.created_at)}
                    {m.notes
                      ? ` • ${m.notes
                          .replace(/\(provider: \d+\)/g, '')
                          .replace(/Stock entry/g, 'Réception')
                          .replace(/Stock out for/g, 'Sortie pour')}`
                      : ''}
                  </AppText>
                </View>
                <SBadge
                  label={`${out ? '−' : incoming ? '+' : ''}${m.quantity} unités`}
                  tone={out ? 'red' : 'teal'}
                />
              </View>
            );
          })
        ) : (
          <AppText variant="bodySm">Aucun mouvement enregistré.</AppText>
        )}
      </Fold>
      <Fold title="Caractéristiques réglementaires" icon="verified-user">
        <View style={{ gap: 10 }}>
          <AppText variant="bodySm">
            Délivrance :{' '}
            <AppText variant="labelMd">
              {p.requires_prescription ? 'Sur ordonnance' : 'Vente libre'}
            </AppText>
          </AppText>
          <AppText variant="bodySm">
            Précautions : <AppText variant="labelMd">{p.precautions || 'Non renseignées'}</AppText>
          </AppText>
          <AppText variant="bodySm">
            Interactions :{' '}
            <AppText variant="labelMd">{p.interactions || 'Non renseignées'}</AppText>
          </AppText>
        </View>
      </Fold>
      <SButton
        label="Historique des ventes de ce produit"
        icon="query-stats"
        secondary
        compact
        onPress={() => setSales(true)}
      />
      {sales ? <ProductSalesHistory product={p} onClose={() => setSales(false)} /> : null}
      {photo ? (
        <StockPage title="Photo du produit" onClose={() => setPhoto(false)}>
          <View style={{ alignItems: 'center', padding: 8 }}>
            <ProductPhoto product={p} size={280} />
            <AppText variant="headlineSm">{p.productName}</AppText>
          </View>
        </StockPage>
      ) : null}
    </View>
  );
}
export function ProductDetailActions({
  id,
  canEdit,
  canPlace,
  onPlace,
  onEdit,
}: {
  id: number;
  canEdit: boolean;
  canPlace: boolean;
  onPlace: (p: StockProduct) => void;
  onEdit: (p: StockProduct) => void;
}) {
  const api = useStockApi(),
    scope = useStockScope();
  const query = useQuery({
    queryKey: ['stock-product', scope, id],
    queryFn: ({ signal }) => api.detail(id, signal),
    enabled: !!scope,
    staleTime: 30000,
  });
  const p = query.data?.product;
  return (
    <View style={st.row}>
      {canPlace ? (
        <View style={st.grow}>
          <SButton
            label="Gérer l’emplacement"
            secondary
            icon="swap-horiz"
            disabled={!p}
            onPress={() => p && onPlace(p)}
          />
        </View>
      ) : null}
      {canEdit ? (
        <View style={st.grow}>
          <SButton
            label="Modifier la fiche"
            icon="edit"
            disabled={!p}
            onPress={() => p && onEdit(p)}
          />
        </View>
      ) : null}
    </View>
  );
}
