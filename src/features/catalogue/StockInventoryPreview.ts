import type { stockApi, ProductDetail } from './stockApi';
import type { productInventoryApi, StockUnit, InventoryMovement } from './productInventoryApi';
/** Isolated in-memory stock for the development gallery: never writes to an API. */
export function createStockInventoryPreview(base: typeof stockApi) {
  const states = new Map<number, Promise<StockUnit[]>>();
  const history = new Map<number, InventoryMovement[]>();
  const confirmations = new Map<
    string,
    {
      body: string;
      result: { action: import('./productInventoryApi').StockUnitAction; changed: number };
    }
  >();
  let nextId = 1000;
  async function units(id: number): Promise<StockUnit[]> {
    if (!states.has(id))
      states.set(
        id,
        base
          .detail(id)
          .then((d) =>
            Array.from({ length: Number(d.product.quantity) }, (_, i) => ({
              id: ++nextId,
              product_id: id,
              provider_id: 1,
              provider: 'Fournisseur Démo',
              location_id: 1,
              location: 'Rayon A3 — Étagère 2',
              expiry: Number(d.product.hasExpiration)
                ? i % 2
                  ? '2028-10-01'
                  : '2027-05-01'
                : null,
              received_at: '2026-10-01',
            })),
          ),
      );
    return states.get(id)!;
  }
  function page<T>(rows: T[], number: number) {
    return {
      data: rows.slice((number - 1) * 25, number * 25),
      current_page: number,
      last_page: Math.max(1, Math.ceil(rows.length / 25)),
      per_page: 25,
      total: rows.length,
    };
  }
  const inventory: typeof productInventoryApi = {
    units: async (id, params) => {
      let rows = await units(id);
      if (params.expiry === 'none') rows = rows.filter((u) => !u.expiry);
      if (params.expiry === 'expired')
        rows = rows.filter((u) => u.expiry && u.expiry < new Date().toISOString().slice(0, 10));
      if (params.search)
        rows = rows.filter((u) =>
          (u.provider + ' ' + u.location)
            .toLowerCase()
            .includes(String(params.search).toLowerCase()),
        );
      return page(rows, Number(params.page) || 1);
    },
    movements: async (id, p) => page(history.get(id) || [], p),
    options: async () => ({
      providers: [{ id: 1, name: 'Fournisseur Démo' }],
      locations: [
        { id: 1, name: 'Rayon A3 — Étagère 2' },
        { id: 2, name: 'Réserve' },
      ],
      stores: [{ id: 2, name: 'Officine Démo 2' }],
      destination_products: [
        {
          id: 501,
          productName: 'Doliprane 1000mg — Destination',
          sku: 'DEST-01',
          hasExpiration: 1,
        },
      ],
    }),
    change: async (id, input) => {
      const existing = confirmations.get(input.request_id);
      if (existing) {
        if (existing.body !== JSON.stringify(input)) throw new Error('Confirmation déjà utilisée.');
        return existing.result;
      }
      const rows = await units(id);
      const selected = rows.filter((u) => input.ids?.includes(u.id));
      if (input.action !== 'add' && selected.length !== input.ids?.length)
        throw new Error('La sélection a changé.');
      const changed = input.action === 'add' ? input.quantity! : selected.length;
      if (input.action === 'add')
        for (let i = 0; i < changed; i++)
          rows.push({
            id: ++nextId,
            product_id: id,
            expiry: input.expiry || null,
            received_at: input.received_at!,
            provider_id: input.provider_id || null,
            provider: input.provider_id ? 'Fournisseur Démo' : null,
            location_id: input.location_id || null,
            location:
              input.location_id === 1
                ? 'Rayon A3 — Étagère 2'
                : input.location_id === 2
                  ? 'Réserve'
                  : null,
          });
      else if (input.action === 'edit')
        for (const u of selected)
          Object.assign(u, {
            expiry: input.expiry || null,
            received_at: input.received_at,
            provider_id: input.provider_id || null,
            provider: input.provider_id ? 'Fournisseur Démo' : null,
            location_id: input.location_id || null,
            location:
              input.location_id === 1
                ? 'Rayon A3 — Étagère 2'
                : input.location_id === 2
                  ? 'Réserve'
                  : null,
          });
      else states.set(id, Promise.resolve(rows.filter((u) => !input.ids?.includes(u.id))));
      const movement: InventoryMovement = {
        id: ++nextId,
        type:
          input.action === 'add'
            ? 'in'
            : input.action === 'edit' || input.action === 'trash'
              ? 'adjustment'
              : 'out',
        source: input.action,
        quantity: changed,
        notes: input.reason || 'Opération de démonstration',
        created_at: new Date().toISOString(),
        creator: 'Démo',
        from_location: null,
        to_location: null,
      };
      history.set(id, [movement, ...(history.get(id) || [])]);
      const result = { action: input.action, changed };
      confirmations.set(input.request_id, { body: JSON.stringify(input), result });
      return result;
    },
  };
  const stock: typeof stockApi = {
    ...base,
    detail: async (id, signal) => {
      const data = await base.detail(id, signal);
      const rows = await units(id);
      const groups = new Map<string, ProductDetail['lots'][number]>();
      for (const u of rows) {
        const key = u.expiry + '-' + u.location_id;
        const group = groups.get(key) || {
          quantity: 0,
          expiry: u.expiry || undefined,
          location: u.location || undefined,
          location_id: u.location_id || undefined,
        };
        group.quantity++;
        groups.set(key, group);
      }
      return {
        ...data,
        product: { ...data.product, quantity: rows.length },
        lots: [...groups.values()],
        movements: history.get(id) || [],
      };
    },
  };
  return { stock, inventory };
}
