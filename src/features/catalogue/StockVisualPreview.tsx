import { createStockInventoryPreview } from './StockInventoryPreview';
import { ProductInventory } from './ProductInventory';
/** Isolated Stitch fixtures. No authentication, HTTP requests, or business writes. */
import { useState } from 'react';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLayersProvider } from '@/features/navigation/PageLayers';
import { AppBottomNavigation } from '@/features/navigation/AppBottomNavigation';
import type { EffectiveAccess } from '@/types/access';
import { StockContext } from './StockContext';
import {
  stockApi,
  productCode,
  type StockProduct,
  type CountLine,
  type StockLocation,
} from './stockApi';
import { ProductCatalogue } from './ProductCatalogue';
import { ProductDetailContent, ProductDetailActions } from './ProductDetail';
import { BarcodeDisplay, BarcodeFlow } from './BarcodeFlow';
import { LocationsView, LocationSelector } from './LocationsView';
import { InventoryView, InventoryCount } from './InventoryView';
import { StockPage } from './StockDesign';
const products: StockProduct[] = [
  {
    id: 1,
    productName: 'Doliprane 1000mg',
    sku: '3400936184512',
    categoryName: 'Antalgiques',
    quantity: 42,
    minQuantity: 10,
    buyingPrice: 13.2,
    sellingPrice: 18.5,
    active: 1,
    hasExpiration: 1,
    description: 'Boîte de 8 comprimés effervescents • Sanofi',
    locationName: 'Rayon A3 — Étagère 2',
    manufacturer: 'Sanofi Aventis',
    active_substance: 'Paracétamol',
    tax: 7,
    includeTaxInPrice: 1,
    profitMargin: 28.6,
    maxQuantity: 60,
  },
  {
    id: 2,
    productName: 'Sérum Physio. Gilbert 5ml',
    sku: '3400937892140',
    categoryName: 'Soins & Hygiène',
    quantity: 4,
    minQuantity: 10,
    buyingPrice: 20,
    sellingPrice: 32,
    active: 1,
    hasExpiration: 1,
    description: 'Boîte de 20 unidoses stériles',
    locationName: 'Rayon B1 — Bac 4',
  },
  {
    id: 3,
    productName: 'H.E. Ravintsara Bio 10ml',
    sku: 'AMMPS-0042',
    categoryName: 'Aromathérapie',
    quantity: 12,
    minQuantity: 5,
    buyingPrice: 40,
    sellingPrice: 65,
    active: 1,
    hasExpiration: 0,
    description: 'Flacon compte-gouttes (Herboristerie)',
    locationName: 'Comptoir Nature — Tiroir 1',
  },
  {
    id: 4,
    productName: 'Amoxicilline Biogaran 500mg',
    sku: '3400938123845',
    categoryName: 'Antibiotiques',
    quantity: 15,
    minQuantity: 10,
    buyingPrice: 35,
    sellingPrice: 54,
    active: 1,
    hasExpiration: 1,
    requires_prescription: 1,
    description: 'Gélules • Boîte de 12',
    locationName: 'Rayon B2 — Bac 4',
  },
  {
    id: 5,
    productName: 'Crème Hydratante Magistrale',
    sku: 'REF-PREP-0014',
    categoryName: 'Préparation officinale',
    quantity: 7,
    minQuantity: 3,
    buyingPrice: 45,
    sellingPrice: 80,
    active: 1,
    hasExpiration: 0,
    description: 'Préparation maison (sous contrôle)',
    locationName: 'Réserve Labo — Étagère F',
  },
];
const places: StockLocation[] = [
  {
    id: 1,
    name: 'Rayon A — Antalgiques & douleur',
    description: 'Zone vente libre • Étagères A1 à A4',
    products: 142,
    quantity: 420,
    metadata: { zone: 'otc', code: 'RAY-A-01', shelves: 'Étagères 1 à 4', capacity: 512 },
    stock_value: 4820,
  },
  {
    id: 2,
    name: 'Rayon B — Antibiotiques & ORL',
    description: 'Zone ordonnance comptoir • Bacs B1 à B6',
    products: 88,
    quantity: 250,
    metadata: { zone: 'prescription', code: 'RAY-B-ORL', shelves: 'Bacs B1 à B6', capacity: 266 },
    stock_value: 6100,
  },
  {
    id: 3,
    name: 'Frigo médicaments 01',
    description: 'Zone chaîne du froid • 2 °C à 8 °C',
    products: 24,
    quantity: 64,
    metadata: {
      zone: 'cold',
      code: 'FRG-01',
      shelves: '2 °C à 8 °C',
      capacity: 110,
      temperature: 4.2,
      temperature_at: '28/03/2025',
    },
    stock_value: 1720,
  },
  {
    id: 4,
    name: 'Comptoir Nature & herboristerie',
    description: 'Tiroirs T1 à T6',
    products: 89,
    quantity: 150,
    metadata: { zone: 'natural', code: 'CPT-NAT-01', shelves: 'Tiroirs T1-T4', capacity: 250 },
    stock_value: 3200,
  },
  {
    id: 5,
    name: 'Armoire stupéfiants sécurisée',
    description: 'Zone sous clé réglementée',
    products: 18,
    quantity: 42,
    metadata: { zone: 'secure', code: 'SEC-STUP-01', shelves: 'Zone sécurisée', capacity: 93 },
    stock_value: 820,
  },
  {
    id: 6,
    name: 'Réserve centrale & stock masse',
    description: 'Palettes P1 à P6',
    products: 420,
    quantity: 1200,
    metadata: { zone: 'reserve', code: 'RES-MASSE-A', shelves: 'Palettes P1-P8', capacity: 1579 },
    stock_value: 12300,
  },
];
function apiFixture(mode: string): typeof stockApi {
  const rows = products.map((p) => ({ ...p }));
  if (mode === 'stock-associate')
    rows.push(
      {
        ...products[2]!,
        id: 6,
        productName: 'Huile Ess. Ravintsara Bio 30ml',
        sku: 'AMMPS-0043',
        quantity: 5,
      },
      {
        ...products[2]!,
        id: 7,
        productName: 'Ravintsara Complexe Diffusion',
        sku: 'REF-DIFF-0051',
        quantity: 9,
      },
    );
  const lines: CountLine[] = rows.slice(0, 3).map((p, i) => ({
    id: i + 1,
    product_id: p.id,
    productName: p.productName,
    sku: p.sku,
    expected: p.quantity,
    counted: i === 0 ? 40 : i === 1 ? 6 : null,
    reason: i < 2 ? 'Écart du comptage physique' : '',
    hasExpiration: p.hasExpiration,
    buyingPrice: p.buyingPrice,
    description: p.description,
  }));
  if (mode === 'stock-summary') {
    lines[2] = {
      ...lines[2]!,
      productName: 'Cicalfate+ Crème 40ml',
      sku: 'REF-DERMO-0040',
      description: 'Dermo-cosmétique réparatrice • Étagère Dermo',
      expected: 6,
      counted: 4,
      buyingPrice: 89,
      reason: 'Vol suspecté / Démarque',
    };
    lines[0]!.reason = 'Casse / Périmé non tracé';
    lines[1]!.expected = 84;
    lines[1]!.counted = 86;
    lines[1]!.buyingPrice = 32;
    lines[1]!.reason = 'Erreur de comptage précédent';
  }
  let done = false;
  const summary = () => ({
    total: lines.length,
    counted: lines.filter((l) => l.counted !== null).length,
    differences: lines.filter((l) => l.counted !== null && l.counted !== l.expected).length,
    delta: lines.reduce((n, l) => n + (l.counted ?? l.expected) - l.expected, 0),
    impact: lines.reduce((n, l) => n + ((l.counted ?? l.expected) - l.expected) * l.buyingPrice, 0),
    losses: lines.reduce(
      (n, l) => n + Math.min(0, (l.counted ?? l.expected) - l.expected) * l.buyingPrice,
      0,
    ),
    surplus: lines.reduce(
      (n, l) => n + Math.max(0, (l.counted ?? l.expected) - l.expected) * l.buyingPrice,
      0,
    ),
  });
  const page = <T,>(data: T[]) => ({ data, current_page: 1, last_page: 1, total: data.length });
  const sessions = () => [
    {
      id: 1,
      name: 'Inventaire tournant — Rayon A & Frigo',
      status: done ? 'validated' : 'in_progress',
      created_at: '2025-03-28',
      location_name: 'Rayon A, Chambre froide',
      creator_name: 'Dr. Martin (Resp.)',
      summary: summary(),
    },
    {
      id: 2,
      name: 'Inventaire global officine Mars 2025',
      status: 'draft',
      created_at: '2025-03-30',
      location_name: 'Zone globale officine',
      creator_name: 'Équipe de comptage',
      summary: { total: 124, counted: 0, differences: 0, delta: 0 },
    },
    {
      id: 3,
      name: 'Inventaire spécifique — Parapharmacie & Soins',
      status: 'validated',
      created_at: '2025-03-15',
      location_name: 'Parapharmacie',
      creator_name: 'Préparatrice Sophie',
      summary: { total: 312, counted: 312, differences: 4, delta: -4 },
    },
    {
      id: 4,
      name: 'Inventaire trimestriel — Réserve',
      status: 'validated',
      created_at: '2025-02-28',
      location_name: 'Réserve centrale',
      creator_name: 'Titulaire pharmacie',
      summary: { total: 48, counted: 48, differences: 0, delta: 0 },
    },
  ];
  return {
    withdraw: async (id, quantity) => {
      const p = rows.find((p) => p.id === id)!;
      p.quantity -= quantity;
      return { withdrawn: quantity };
    },
    sales: async () => ({
      rows: [
        {
          id: 1,
          ref: 'VNT-0892',
          customer: 'Sofia El Amrani',
          date: '2025-03-28',
          quantity: 2,
          itemPrice: 18.5,
          paymentStatusLabel: 'Réglée',
        },
      ],
      lastPage: 1,
      total: 1,
    }),
    products: async (params) => ({
      ...page(
        rows.filter(
          (p) =>
            (!params.search ||
              (p.productName + ' ' + p.sku + ' ' + p.barcode)
                .toLowerCase()
                .includes(String(params.search).toLowerCase())) &&
            (params.filter !== 'missing' || !productCode(p)) &&
            (params.filter !== 'low' || p.quantity <= p.minQuantity),
        ),
      ),
      counts: {
        all: rows.length,
        available: rows.filter((p) => p.quantity > 0).length,
        low: rows.filter((p) => p.quantity <= p.minQuantity).length,
        missing: rows.filter((p) => !productCode(p)).length,
      },
    }),
    detail: async (id) => ({
      product: rows.find((p) => p.id === id)!,
      lots: [
        {
          quantity: 16,
          expiry: '2027-05-01',
          location: 'Rayon A3 — Étagère 2',
          reference: '23K112',
        },
        {
          quantity: 26,
          expiry: '2028-10-01',
          location: 'Rayon A3 — Étagère 2',
          reference: '24F089',
        },
      ],
      movements: [
        {
          id: 1,
          type: 'adjustment',
          quantity: 2,
          notes: 'Comptage du rayon — correction enregistrée',
          created_at: '2025-03-28',
        },
      ],
    }),
    lookup: async (code) => ({
      product: rows.find((p) => productCode(p) === code || p.sku === code) || null,
    }),
    barcode: async (id, code) => {
      const p = rows.find((p) => p.id === id)!;
      p.barcode = code;
      return p;
    },
    locations: async () => places,
    assignLocation: async () => ({ updated: 42 }),
    createLocation: async () => ({ id: 7 }),
    sessions: async (_page, status) => ({
      ...page(sessions().filter((s) => !status || status === 'all' || s.status === status)),
      counts: { all: 4, in_progress: done ? 0 : 1, draft: 1, validated: done ? 3 : 2 },
      stats: { conformity: 98.4 },
    }),
    createSession: async () => ({ id: 1 }),
    renameSession: async (id) => ({ id }),
    session: async (id, params) => ({
      session: {
        id,
        name: 'Rayon A & frigo',
        status: id >= 3 ? 'validated' : id === 2 ? 'draft' : done ? 'validated' : 'in_progress',
        created_at: '2025-03-28',
        summary: summary(),
      },
      summary: summary(),
      lines: page(
        lines.filter(
          (l) =>
            (!params.search ||
              l.productName.toLowerCase().includes(String(params.search).toLowerCase()) ||
              l.sku === params.search) &&
            (params.filter !== 'differences' || (l.counted !== null && l.counted !== l.expected)) &&
            (params.filter !== 'pending' || l.counted === null) &&
            (params.filter !== 'surplus' || (l.counted !== null && l.counted > l.expected)) &&
            (params.filter !== 'missing' || (l.counted !== null && l.counted < l.expected)),
        ),
      ),
    }),
    count: async (_id, pid, counted, reason, expiry) => {
      Object.assign(
        lines.find((l) => l.product_id === pid)!,
        { counted, reason, expiry },
      );
      return { saved: true };
    },
    validate: async () => {
      done = true;
      return { validated: true };
    },
  };
}
export function StockVisualPreview({ view }: { view: string }) {
  const [inventoryPreview] = useState(() => createStockInventoryPreview(apiFixture(view)));
  const api = inventoryPreview.stock;
  const [query] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
  );
  const [screen, setScreen] = useState(view);
  const noop = () => {};
  const access = {
    permissions: [
      'products.view',
      'products.create',
      'products.update',
      'products.view_purchase_price',
      'products.view_margin',
      'stock.view',
      'stock.adjust',
      'stock.transfer',
      'stock.locations.manage',
    ],
  } as EffectiveAccess;
  const p = products[0]!;
  return (
    <QueryClientProvider client={query}>
      <StockContext.Provider
        value={{ inventoryApi: inventoryPreview.inventory, api, scope: 'stitch-preview', access }}
      >
        <PageLayersProvider
          footer={
            <AppBottomNavigation preview activePath="/stock" onMore={noop} onNavigate={noop} />
          }
        >
          <View style={{ flex: 1, backgroundColor: '#f8f9ff' }}>
            {screen === 'stock-product-inventory' ? (
              <ProductInventory
                product={p}
                onClose={() => setScreen('stock-catalogue')}
                onDetail={() => setScreen('stock-detail')}
                onPlace={() => setScreen('stock-selector')}
              />
            ) : screen === 'stock-detail' ? (
              <StockPage
                title="Détail Médicament"
                onClose={() => setScreen('stock-catalogue')}
                footer={
                  <ProductDetailActions
                    id={1}
                    canEdit
                    canPlace
                    onPlace={() => setScreen('stock-selector')}
                    onEdit={noop}
                  />
                }
              >
                <ProductDetailContent
                  id={1}
                  canEdit
                  canPlace
                  canCost
                  onBarcode={(_, edit) => setScreen(edit ? 'stock-associate' : 'stock-barcode')}
                  onPlace={() => setScreen('stock-selector')}
                  onEdit={noop}
                />
              </StockPage>
            ) : screen === 'stock-barcode' ? (
              <BarcodeDisplay
                product={p}
                onClose={() => setScreen('stock-detail')}
                onEdit={() => setScreen('stock-associate')}
              />
            ) : screen === 'stock-associate' ? (
              <BarcodeFlow
                initialCode="6111245890124"
                initialAssociation
                initialSearch="Ravintsara"
                onClose={() => setScreen('stock-catalogue')}
                onLinked={() => setScreen('stock-detail')}
              />
            ) : screen === 'stock-unknown' ? (
              <BarcodeFlow
                initialCode="6111245890124"
                onClose={() => setScreen('stock-catalogue')}
                onLinked={() => setScreen('stock-detail')}
              />
            ) : screen === 'stock-selector' ? (
              <LocationSelector
                product={p}
                onClose={() => setScreen('stock-detail')}
                onSaved={() => setScreen('stock-detail')}
              />
            ) : screen === 'stock-locations' ? (
              <LocationsView
                onClose={() => setScreen('stock-catalogue')}
                canManage
                canCount
                canEditBarcode
                onProduct={() => setScreen('stock-detail')}
                onInventory={() => setScreen('stock-inventory')}
              />
            ) : screen === 'stock-count' || screen === 'stock-summary' ? (
              <InventoryCount
                id={1}
                initialSummary={screen === 'stock-summary'}
                initialLine={
                  screen === 'stock-count'
                    ? {
                        id: 1,
                        product_id: 1,
                        productName: p.productName,
                        sku: p.sku,
                        expected: 42,
                        counted: 40,
                        reason: 'Manquant au comptage',
                        hasExpiration: 1,
                        buyingPrice: 13.2,
                      }
                    : undefined
                }
                canAdjust
                onClose={() => setScreen('stock-inventory')}
              />
            ) : screen === 'stock-inventory' ? (
              <InventoryView canAdjust onClose={() => setScreen('stock-catalogue')} />
            ) : (
              <ProductCatalogue />
            )}
          </View>
        </PageLayersProvider>
      </StockContext.Provider>
    </QueryClientProvider>
  );
}
