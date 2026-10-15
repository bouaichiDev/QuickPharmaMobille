/** Read-only Stitch review fixtures, mounted only by the development gallery. No sale/payment mutation. */
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageLayersProvider } from '@/features/navigation/PageLayers';
import { AppBottomNavigation } from '@/features/navigation/AppBottomNavigation';
import { useSessionStore } from '@/features/auth/sessionStore';
import { SaleDetail } from './SaleDetail';
import { SaleReceipt } from './SaleReceipt';
import { CreditConfirmation } from './CreditConfirmation';
import { PosBadge, PosButton, PosPage } from './SalesDesign';
import { saleTotals } from './salesApi';
import type { CompletedSale } from './SaleCheckout';
const lines = [
  { id: 1, productName: 'Doliprane 1000mg', price: 18.5, quantity: 2 },
  { id: 2, productName: 'Clamoxyl 500mg', price: 54, quantity: 1 },
  { id: 3, productName: 'Cicalfate+ 40ml', price: 95, quantity: 1 },
].map((row) => ({
  quantity: row.quantity,
  product: {
    id: row.id,
    productName: row.productName,
    sellingPrice: row.price,
    quantity: 42,
    sku: 'DEMO',
    categoryId: 1,
    minQuantity: 0,
    buyingPrice: 0,
    active: 1,
    hasExpiration: 0,
  },
}));
const date = '2025-03-28T14:32:00';
const completed: CompletedSale = {
  id: 'stitch-preview',
  customer: { id: 2, FirstName: 'Sofia', LastName: 'El Amrani' },
  lines,
  totals: saleTotals(lines, 0, 0, 200),
  received: 200,
  paymentMethod: 'Espèces',
  date,
};
const data = {
  sale: {
    ref: '#VNT-2025-0892',
    customer: 'Sofia El Amrani',
    date,
    totalWithTax: 186,
    subTotal: 186,
    tax: 0,
    paid: 186,
    due: 0,
    receivedAmount: 200,
    typePayment: 'cash',
  },
  company: { companyName: 'PHARMACIE CENTRALE QUICKPHARMA', address: 'Casablanca' },
  items: lines.map((row) => ({
    title: row.product.productName,
    price: row.product.sellingPrice,
    qte: row.quantity,
  })),
};
export function SalesVisualPreview({ view }: { view: string }) {
  const store = useSessionStore((state) => state.session?.activeStore?.id);
  const [query] = useState(() => {
    const cache = new QueryClient({
      defaultOptions: { queries: { enabled: false, staleTime: Infinity } },
    });
    cache.setQueryData(['sale', store, completed.id], data);
    return cache;
  });
  const noop = () => {};
  return (
    <QueryClientProvider client={query}>
      <PageLayersProvider
        footer={<AppBottomNavigation preview activePath="/sales" onMore={noop} onNavigate={noop} />}
      >
        {view === 'pos-credit-confirmation' ? (
          <PosPage
            title="Confirmation de règlement"
            onClose={noop}
            footer={<PosButton label="Retour aux ventes" onPress={noop} />}
          >
            <CreditConfirmation
              payment={{
                name: 'Sofia El Amrani',
                debt: 150,
                amount: 150,
                method: 'Espèces',
                date,
                allocations: [
                  {
                    sale_id: 1,
                    sale_ref: '#VNT-2025-0885',
                    amount_paid: 100,
                    payment_type: 'full',
                  },
                  { sale_id: 2, sale_ref: '#VNT-2025-0870', amount_paid: 50, payment_type: 'full' },
                ],
              }}
              remaining={0}
              onPrint={noop}
              onShare={noop}
            />
          </PosPage>
        ) : view === 'pos-receipt' ? (
          <PosPage
            title="Reçu de vente"
            onClose={noop}
            footer={<PosButton label="Imprimer / PDF" onPress={noop} />}
          >
            <PosBadge
              label="Vente enregistrée avec succès"
              tone="teal"
              icon="check-circle-outline"
            />
            <SaleReceipt data={data} />
          </PosPage>
        ) : (
          <SaleDetail
            id={completed.id}
            canView={false}
            completed={completed}
            onClose={noop}
            onNew={noop}
          />
        )}
      </PageLayersProvider>
    </QueryClientProvider>
  );
}
