import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartItem } from '@/contexts/CartContext';
import type { StoreApiProduct } from '@/lib/woocommerce';
import {
  buildOrderLineItems,
  sumLineItemTotals,
  toNetLineItems,
  validateOrderLineItems,
} from '@/lib/order-line-items';

// Vor dem Aktionsstart (12.09.2026) — keine Gratis-Pakete.
const BEFORE_AKTION = new Date('2026-09-01T12:00:00+02:00');
// Während der Aktion „Jedes 7. Paket gratis“.
const DURING_AKTION = new Date('2026-10-01T12:00:00+02:00');

function product(
  id: number,
  name: string,
  price: number,
  paketinhalt: number | null,
  categorySlug: string
): StoreApiProduct {
  return {
    id,
    name,
    price,
    paketinhalt,
    categories: [{ id: id * 10, name: categorySlug, slug: categorySlug }],
  } as unknown as StoreApiProduct;
}

const laminat = product(1, 'Laminat Eiche', 19.99, 2.22, 'laminat');
const vinyl = product(2, 'Klebe-Vinyl Grau', 24.95, 3.34, 'klebe-vinyl');
const daemmung = product(3, 'Dämmung Standard', 2.5, 15, 'daemmung');
const sockelleiste = product(4, 'Sockelleiste Weiß', 3.2, 2.4, 'sockelleisten');
const kleber = product(5, 'Vinylkleber 12 kg', 4.1, 12, 'bauchemie');
const spachtel = product(6, 'Ausgleichsmasse 25 kg', 1.6, 25, 'bauchemie');
const kelle = product(7, 'Zahnspachtel', 6.9, 1, 'zubehoer');
const zubehoer = product(8, 'Übergangsprofil', 12.5, 1, 'zubehoer');
const muster = product(9, 'Muster Laminat Eiche', 1.0, 1, 'laminat');

function expectIntegerQuantities(items: ReturnType<typeof buildOrderLineItems>) {
  for (const item of items) {
    expect(Number.isInteger(item.quantity), `${item.name}: ${item.quantity}`).toBe(true);
    expect(item.quantity).toBeGreaterThanOrEqual(1);
  }
}

describe('buildOrderLineItems', () => {
  beforeEach(() => {
    // Vorschau-Modus aus, damit nur das Datum über die Aktion entscheidet.
    vi.stubEnv('NEXT_PUBLIC_AKTION_FORCE', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
    vi.stubEnv('VERCEL_ENV', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Boden einzeln: Menge = Pakete, Preis = Einzelpreis × Paketinhalt × Pakete', () => {
    const cart: CartItem[] = [{ id: 1, product: laminat, quantity: 7 }];
    const [item] = buildOrderLineItems(cart, BEFORE_AKTION);

    expect(item.quantity).toBe(7);
    expect(item.subtotal).toBe((19.99 * 2.22 * 7).toFixed(2)); // 310.64
    expect(item.total).toBe(item.subtotal);
    expect(item.meta_data).toEqual([]);
  });

  it('Set-Angebot (Boden + Dämmung + Sockelleiste): Mengen = Pakete/Rollen/Stück, m²/lfm nur als Meta', () => {
    const cart: CartItem[] = [
      {
        id: 1, product: laminat, quantity: 7, isSetItem: true, setId: 'set-1', setItemType: 'floor',
        setPricePerUnit: 21.49, regularPricePerUnit: 26.99, actualM2: 15.54,
      },
      {
        id: 3, product: daemmung, quantity: 2, isSetItem: true, setId: 'set-1', setItemType: 'insulation',
        setPricePerUnit: 0, regularPricePerUnit: 2.5, actualM2: 30,
      },
      {
        id: 4, product: sockelleiste, quantity: 7, isSetItem: true, setId: 'set-1', setItemType: 'baseboard',
        setPricePerUnit: 0.5, regularPricePerUnit: 3.2, actualM2: 16.8,
      },
    ];
    const items = buildOrderLineItems(cart, BEFORE_AKTION);

    expectIntegerQuantities(items);
    expect(items.map((i) => i.quantity)).toEqual([7, 2, 7]);
    expect(items.map((i) => i.total)).toEqual([
      (21.49 * 15.54).toFixed(2), // 333.95
      '0.00',
      (0.5 * 16.8).toFixed(2), // 8.40
    ]);
    const floorMeta = Object.fromEntries(items[0].meta_data.map((m) => [m.key, m.value]));
    expect(floorMeta).toMatchObject({
      _set_angebot: 'true',
      _set_id: 'set-1',
      _set_item_type: 'floor',
      _actual_m2: '15.54',
    });
    const baseboardMeta = Object.fromEntries(items[2].meta_data.map((m) => [m.key, m.value]));
    expect(baseboardMeta._actual_m2).toBe('16.8');
  });

  it('Sockelleiste einzeln (lfm): Menge = Stück, nicht Stück × lfm', () => {
    const cart: CartItem[] = [{ id: 4, product: sockelleiste, quantity: 11 }];
    const [item] = buildOrderLineItems(cart, BEFORE_AKTION);

    expect(item.quantity).toBe(11);
    expect(item.total).toBe((3.2 * 2.4 * 11).toFixed(2)); // 84.48
  });

  it('Klebe-Vinyl-Sparpaket (kg): Menge = Gebinde, Gebinde mit 0 Stück fallen weg', () => {
    const cart: CartItem[] = [
      {
        id: 2, product: vinyl, quantity: 5, isSetItem: true, setId: 'set-2', setItemType: 'floor',
        setPricePerUnit: 24.95, regularPricePerUnit: 29.95, actualM2: 16.7,
      },
      {
        id: 5, product: kleber, quantity: 2, isSetItem: true, setId: 'set-2', setItemType: 'adhesive',
        setPricePerUnit: 0, regularPricePerUnit: 4.1, actualM2: 24,
      },
      {
        id: 6, product: spachtel, quantity: 0, isSetItem: true, setId: 'set-2', setItemType: 'leveler',
        setPricePerUnit: 0, regularPricePerUnit: 1.6, actualM2: 0,
      },
      {
        id: 7, product: kelle, quantity: 1, isSetItem: true, setId: 'set-2', setItemType: 'trowel',
        setPricePerUnit: 0, regularPricePerUnit: 6.9, actualM2: 1,
      },
    ];
    const items = buildOrderLineItems(cart, BEFORE_AKTION);

    expectIntegerQuantities(items);
    expect(items.map((i) => i.product_id)).toEqual([2, 5, 7]); // Spachtel (0 Gebinde) fehlt
    expect(items.map((i) => i.quantity)).toEqual([5, 2, 1]);
    expect(items[1].total).toBe('0.00');
    expect(items[1].meta_data.find((m) => m.key === '_actual_m2')?.value).toBe('24'); // kg als Meta
  });

  it('Zubehör: Menge = Stück', () => {
    const cart: CartItem[] = [{ id: 8, product: zubehoer, quantity: 3 }];
    const [item] = buildOrderLineItems(cart, BEFORE_AKTION);

    expect(item.quantity).toBe(3);
    expect(item.total).toBe('37.50');
  });

  it('Muster: Menge = Anzahl, Preis 0, als Muster markiert', () => {
    const cart: CartItem[] = [{ id: 9, product: muster, quantity: 2, isSample: true }];
    const [item] = buildOrderLineItems(cart, BEFORE_AKTION);

    expect(item.quantity).toBe(2);
    expect(item.subtotal).toBe('0.00');
    expect(item.total).toBe('0.00');
    expect(item.meta_data).toContainEqual({ key: '_is_sample', value: 'true' });
  });

  it('Gemischter Warenkorb: alle Mengen ganzzahlig, Summe = Warenkorbsumme', () => {
    const cart: CartItem[] = [
      { id: 1, product: laminat, quantity: 7 },
      { id: 4, product: sockelleiste, quantity: 11 },
      { id: 8, product: zubehoer, quantity: 3 },
      { id: 9, product: muster, quantity: 2, isSample: true },
    ];
    const items = buildOrderLineItems(cart, BEFORE_AKTION);

    expectIntegerQuantities(items);
    // 310.64 + 84.48 + 37.50 + 0
    expect(sumLineItemTotals(items)).toBe(432.62);
  });

  it('Aktion „Jedes 7. Paket gratis“: total sinkt um ein Paket, subtotal bleibt', () => {
    const cart: CartItem[] = [{ id: 1, product: laminat, quantity: 7 }];
    const [item] = buildOrderLineItems(cart, DURING_AKTION);

    const paket = 19.99 * 2.22;
    expect(item.quantity).toBe(7);
    expect(item.subtotal).toBe((paket * 7).toFixed(2));
    expect(item.total).toBe((paket * 7 - Math.round(paket * 100) / 100).toFixed(2));
    expect(item.meta_data).toContainEqual({ key: '_aktion_gratis_pakete', value: '1' });
  });
});

describe('toNetLineItems', () => {
  it('rechnet subtotal und total von brutto auf netto um, Menge bleibt', () => {
    const [net] = toNetLineItems([{ product_id: 1, quantity: 7, subtotal: '119.00', total: '100.00' }]);
    expect(net).toEqual({ product_id: 1, quantity: 7, subtotal: '100.00', total: '84.03' });
  });
});

describe('validateOrderLineItems', () => {
  const valid = { product_id: 1, quantity: 7, subtotal: '10.00', total: '10.00', name: 'X', meta_data: [] };

  it('akzeptiert gültige Positionen', () => {
    expect(validateOrderLineItems([valid])).toBeNull();
  });

  it('lehnt Kommazahlen als Menge ab (der ursprüngliche Fehler)', () => {
    expect(validateOrderLineItems([{ ...valid, quantity: 15.54 }])).toMatch(/ganze Zahl/);
  });

  it('lehnt leere Warenkörbe, fehlende IDs und kaputte Beträge ab', () => {
    expect(validateOrderLineItems([])).not.toBeNull();
    expect(validateOrderLineItems([{ ...valid, product_id: 0 }])).not.toBeNull();
    expect(validateOrderLineItems([{ ...valid, total: 'abc' }])).not.toBeNull();
    expect(validateOrderLineItems([{ ...valid, quantity: 0 }])).not.toBeNull();
  });
});
