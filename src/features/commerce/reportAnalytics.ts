import type { CrmRecord } from '@/features/crm/crmApi';

export function collectionMetrics(summary: CrmRecord) {
  const amount = (value: unknown) =>
    value == null || value === '' || !Number.isFinite(Number(value))
      ? null
      : Math.max(0, Number(value));
  const total = amount(summary.totalAmount);
  const paid = amount(summary.totalPaid);
  const due = amount(summary.totalDue);
  return {
    total,
    paid,
    due,
    rate: total == null || paid == null ? null : total > 0 ? Math.round((paid / total) * 100) : 0,
    paidSlice: paid != null && due != null && paid + due > 0 ? paid / (paid + due) : 0,
  };
}

export function bestSellingProducts(topProducts: CrmRecord[], rows: CrmRecord[]) {
  const global = topProducts.length > 0;
  const values = new Map<string, number>();
  for (const row of global ? topProducts : rows) {
    const label = String(global ? (row.label ?? '') : (row.productName ?? '')).trim();
    const value = Number(global ? row.value : row.items_sold);
    if (label && Number.isFinite(value) && value > 0)
      values.set(label, (values.get(label) ?? 0) + value);
  }
  return {
    global,
    rows: [...values]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
  };
}
