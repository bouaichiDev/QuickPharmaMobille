import { bestSellingProducts, collectionMetrics } from '@/features/commerce/reportAnalytics';

it('uses the web rounding and global totals for collection rate', () => {
  expect(collectionMetrics({ totalAmount: 8000, totalPaid: 5000, totalDue: 3000 }).rate).toBe(63);
  expect(collectionMetrics({ totalAmount: 0, totalPaid: 0, totalDue: 0 }).rate).toBe(0);
  expect(collectionMetrics({ totalAmount: 100, totalPaid: 100, totalDue: 0 }).paidSlice).toBe(1);
  expect(collectionMetrics({ totalAmount: 100, totalPaid: 0, totalDue: 100 }).paidSlice).toBe(0);
  expect(collectionMetrics({ totalAmount: 'invalid', totalPaid: 20 }).rate).toBeNull();
  expect(collectionMetrics({}).rate).toBeNull();
});
it('ranks the API results before paginated fallback and excludes invalid sales', () => {
  expect(
    bestSellingProducts(
      [{ label: 'Champion', value: 75 }],
      [{ productName: 'Page', items_sold: 1 }],
    ),
  ).toEqual({ global: true, rows: [{ label: 'Champion', value: 75 }] });
  expect(
    bestSellingProducts(
      [],
      [
        { productName: 'B', items_sold: 1 },
        { productName: 'A', items_sold: 10 },
        { productName: 'B', items_sold: 2 },
        { productName: 'Invalid', items_sold: -1 },
      ],
    ),
  ).toEqual({
    global: false,
    rows: [
      { label: 'A', value: 10 },
      { label: 'B', value: 3 },
    ],
  });
});

it.each([
  [1000, 0, 0],
  [1000, 250, 25],
  [1000, 500, 50],
  [1000, 1000, 100],
  [59.06, 59.06, 100],
  [3913.5, 1956.75, 50],
  [3, 1, 33],
  [3, 2, 67],
  [1000, 999.99, 100],
])('matches web percentage rounding for total %s and collected %s', (total, paid, expected) => {
  const result = collectionMetrics({ totalAmount: total, totalPaid: paid, totalDue: total - paid });
  expect(result.rate).toBe(expected);
  expect(result.paidSlice).toBeCloseTo(paid / total, 10);
});
