import { exportInventoryReport, inventoryWorkbook } from '@/features/catalogue/stockExports';
import { stockApi } from '@/features/catalogue/stockApi';
import * as Print from 'expo-print';
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///inventory.pdf' }),
  printAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/crm/documents', () => ({
  escapeHtml: (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  printCrmDocument: jest.fn(),
}));
it('exports every page independently of the visible search or filter', async () => {
  const session = jest.fn().mockImplementation(async (_id, { page }) => ({
    session: { name: 'Inventaire <A>' },
    lines: {
      last_page: 2,
      data: [
        {
          productName: `Produit ${page}`,
          sku: `REF${page}`,
          expected: 3,
          counted: page === 1 ? 2 : null,
          reason: '<motif>',
        },
      ],
    },
  }));
  await exportInventoryReport(17, { ...stockApi, session });
  expect(session.mock.calls).toEqual([
    [17, { page: 1, per_page: 500 }],
    [17, { page: 2, per_page: 500 }],
  ]);
  const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
  expect(html).toContain('Produit 1');
  expect(html).toContain('Produit 2');
  expect(html).toContain('Non compté');
  expect(html).toContain('&lt;motif&gt;');
  expect(html).toContain('Inventaire &lt;A&gt;');
  expect(Print.printAsync).toHaveBeenCalledWith({ uri: 'file:///inventory.pdf' });
});
it('keeps spreadsheet references as text and never promotes user input to formulas', () => {
  const xml = inventoryWorkbook(
    [
      {
        id: 1,
        product_id: 1,
        productName: '=HYPERLINK("unsafe")',
        sku: '0012345678905',
        expected: 3,
        counted: 2,
        reason: '<motif>&',
        hasExpiration: 0,
        buyingPrice: 4,
      },
    ],
    'Rayon <A>',
  );
  expect(xml).toContain('<Data ss:Type="String">0012345678905</Data>');
  expect(xml).toContain('<Data ss:Type="Number">-1</Data>');
  expect(xml).toContain('&lt;motif&gt;&amp;');
  expect(xml).not.toContain('ss:Formula');
});
