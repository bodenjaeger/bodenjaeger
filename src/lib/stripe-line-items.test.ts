import { describe, expect, it } from 'vitest';
import type { CartItem } from '@/contexts/CartContext';
import {
  buildLineItemDisplays,
  buildStripePositions,
  formatStripePositionName,
  sanitizeLineItemDisplays,
  type StripePositionsResult,
} from './stripe-line-items';

const TAX = 0.19;

/** Spaltet einen Brutto-Betrag so, wie WooCommerce ihn zurückliefert. */
function wooLine(grossCents: number, quantity: number, productId = 1) {
  const net = Math.round(grossCents / (1 + TAX));
  return {
    name: 'Vinyl Eiche',
    product_id: productId,
    quantity,
    total: (net / 100).toFixed(2),
    total_tax: ((grossCents - net) / 100).toFixed(2),
  };
}

function stripeSum(result: StripePositionsResult): number {
  if (!result.ok) throw new Error('unerwarteter Rückfall');
  return result.lineItems.reduce((sum, p) => sum + p.price * p.quantity, 0) + result.shippingCents;
}

describe('buildStripePositions: Summe entspricht exakt der Bestellsumme', () => {
  const beträge = [
    10000, 132169, 43442, 1, 3, 9, 16, 99, 100, 101, 999, 3333, 6667, 12999, 25001, 49999,
    99999, 100001, 133337, 250003, 499999,
  ];
  const pakete = [1, 2, 3, 6, 7, 9, 11, 13, 17, 19, 23, 29, 31, 37, 41, 97];
  const versand = [0, 499, 2999, 5999];

  it('alle Kombinationen aus Betrag, Paketzahl und Versand', () => {
    let geprüft = 0;
    for (const cents of beträge) {
      for (const qty of pakete) {
        for (const shipping of versand) {
          const net = Math.round(shipping / (1 + TAX));
          const result = buildStripePositions(
            {
              total: ((cents + shipping) / 100).toFixed(2),
              shipping_total: (net / 100).toFixed(2),
              shipping_tax: ((shipping - net) / 100).toFixed(2),
              line_items: [wooLine(cents, qty)],
            },
            []
          );
          expect(stripeSum(result)).toBe(cents + shipping);
          if (result.ok) expect(result.lineItems.every((p) => p.quantity === 1)).toBe(true);
          geprüft += 1;
        }
      }
    }
    expect(geprüft).toBe(beträge.length * pakete.length * versand.length);
  });

  it('mehrere Positionen mit krummen Beträgen', () => {
    for (let seed = 1; seed <= 2000; seed += 1) {
      const a = (seed * 7919) % 300000;
      const b = (seed * 104729) % 90000;
      const c = (seed * 1299709) % 12000;
      const result = buildStripePositions(
        {
          total: ((a + b + c) / 100).toFixed(2),
          line_items: [wooLine(a, (seed % 29) + 1), wooLine(b, (seed % 7) + 1), wooLine(c, (seed % 3) + 1)],
        },
        []
      );
      expect(stripeSum(result)).toBe(a + b + c);
    }
  });

  it('die alte Teilung durch die Paketzahl wäre hier falsch gewesen', () => {
    expect(Math.round(10000 / 3) * 3).toBe(9999);
    const result = buildStripePositions(
      { total: '100.00', line_items: [wooLine(10000, 3)] },
      []
    );
    expect(stripeSum(result)).toBe(10000);
  });

  it('Gratis-Positionen bleiben mit 0 Cent erhalten', () => {
    const result = buildStripePositions(
      { total: '100.00', line_items: [wooLine(10000, 3), wooLine(0, 2, 2)] },
      []
    );
    expect(result.ok && result.lineItems.map((p) => p.price)).toEqual([10000, 0]);
  });
});

describe('buildStripePositions: Ausgleich an der größten Position', () => {
  it('gleicht in beide Richtungen aus, die Summe bleibt exakt, der Name zeigt den Betrag', () => {
    for (const [total, expected] of [['100.01', 10001], ['99.99', 9999]] as const) {
      const result = buildStripePositions(
        { total, line_items: [wooLine(10000, 3)] },
        []
      );
      expect(stripeSum(result)).toBe(expected);
      expect(result.ok && result.lineItems[0].price).toBe(expected);
      expect(result.ok && result.lineItems[0].name).toContain(
        `${(expected / 100).toFixed(2).replace('.', ',')} €`
      );
    }
  });

  it('trifft nur die größte Position, Versand bleibt unverändert', () => {
    const result = buildStripePositions(
      {
        total: '165.02',
        shipping_total: '4.19',
        shipping_tax: '0.80',
        line_items: [wooLine(5000, 2, 1), wooLine(11000, 3, 2), wooLine(1, 1, 3)],
      },
      []
    );
    expect(result.ok && result.lineItems.map((p) => p.price)).toEqual([5000, 11002, 1]);
    expect(result.ok && result.shippingCents).toBe(499);
    expect(result.ok && result.adjustmentCents).toBe(2);
  });

  it('Grenze: 1 Cent je Position plus Versand', () => {
    const order = (total: string) => ({
      total,
      shipping_total: '4.19',
      shipping_tax: '0.80',
      line_items: [wooLine(5000, 2, 1), wooLine(11000, 3, 2)],
    });
    // Summe 164,99 €: 2 Positionen + Versand erlauben 3 Cent.
    expect(buildStripePositions(order('165.02'), []).ok).toBe(true);
    expect(buildStripePositions(order('164.96'), []).ok).toBe(true);
    expect(buildStripePositions(order('165.03'), [])).toEqual({ ok: false, sumCents: 16499, orderCents: 16503 });
    expect(buildStripePositions(order('164.95'), []).ok).toBe(false);
  });

  it('ohne Versand zählt nur die Position', () => {
    expect(buildStripePositions({ total: '100.01', line_items: [wooLine(10000, 3)] }, []).ok).toBe(true);
    expect(buildStripePositions({ total: '100.02', line_items: [wooLine(10000, 3)] }, []).ok).toBe(false);
  });

  it('kein negativer Betrag: lieber Rückfall', () => {
    expect(buildStripePositions({ total: '0.00', shipping_total: '0.01', line_items: [wooLine(0, 1)] }, []).ok).toBe(false);
  });

  it('jede erlaubte Differenz ergibt exakt die Bestellsumme', () => {
    for (let seed = 1; seed <= 3000; seed += 1) {
      const a = (seed * 7919) % 300000;
      const b = (seed * 104729) % 90000;
      const diff = (seed % 5) - 2;
      const total = a + b + diff;
      if (total < 0 || a + diff < 0) continue;
      const result = buildStripePositions(
        { total: (total / 100).toFixed(2), line_items: [wooLine(a, 3), wooLine(b, 7, 2)] },
        []
      );
      if (result.ok) expect(stripeSum(result)).toBe(total);
    }
  });
});

describe('buildStripePositions: Rückfall', () => {
  it('meldet die Differenz, wenn sie zu groß ist', () => {
    const result = buildStripePositions(
      { total: '100.02', line_items: [wooLine(10000, 3)] },
      []
    );
    expect(result).toEqual({ ok: false, sumCents: 10000, orderCents: 10002 });
  });

  it('ohne Steuerfeld oder ohne Positionen kein Vorschlag', () => {
    expect(
      buildStripePositions(
        { total: '10.00', line_items: [{ name: 'x', product_id: 1, quantity: 1, total: '10.00' }] },
        []
      ).ok
    ).toBe(false);
    expect(buildStripePositions({ total: '10.00' }, []).ok).toBe(false);
  });
});

describe('formatStripePositionName', () => {
  const m2 = { product_id: 1, amount: 15.54, unit: 'm²' };

  it('Format aus dem Auftrag', () => {
    expect(formatStripePositionName('Vinyl Eiche', 7, m2, 43442)).toBe(
      '1 × Vinyl Eiche, 7 Pakete (15,54 m²) – 434,42 €'
    );
  });

  it('Singular, Tausenderpunkt, lfm, Stück, Gratis', () => {
    expect(formatStripePositionName('Laminat', 1, { ...m2, amount: 2.22 }, 132169)).toBe(
      '1 × Laminat, 1 Paket (2,22 m²) – 1.321,69 €'
    );
    expect(formatStripePositionName('Sockelleiste', 2, { product_id: 1, amount: 5, unit: 'lfm' }, 3998)).toBe(
      '1 × Sockelleiste, 2 Pakete (5,00 lfm) – 39,98 €'
    );
    expect(formatStripePositionName('Spachtel', 1, { product_id: 1, amount: null, unit: null }, 1250)).toBe(
      '1 × Spachtel, 1 Stück – 12,50 €'
    );
    expect(formatStripePositionName('Muster', 3, { product_id: 1, amount: null, unit: null }, 0)).toBe(
      '1 × Muster, 3 Stück – 0,00 €'
    );
  });

  it('ohne Anzeige-Daten nur die Paketzahl', () => {
    expect(formatStripePositionName('Vinyl', 3, undefined, 10000)).toBe('1 × Vinyl, 3 Pakete – 100,00 €');
  });

  it('Anzeige-Daten einer anderen Position werden nicht übernommen', () => {
    const result = buildStripePositions(
      { total: '100.00', line_items: [wooLine(10000, 3, 1)] },
      [{ product_id: 99, amount: 7, unit: 'm²' }]
    );
    expect(result.ok && result.lineItems[0].name).toBe('1 × Vinyl Eiche, 3 Pakete – 100,00 €');
  });
});

describe('buildLineItemDisplays', () => {
  const item = (over: Record<string, unknown>, product: Record<string, unknown> = {}) =>
    ({
      quantity: 7,
      product: { id: 1, paketinhalt: 2.22, einheit_short: 'm²', ...product },
      ...over,
    }) as unknown as CartItem;

  it('reguläre Position: Paketinhalt × Pakete', () => {
    const [d] = buildLineItemDisplays([item({})]);
    expect(d.unit).toBe('m²');
    expect(d.amount).toBeCloseTo(15.54);
  });

  it('Set-Position nutzt die gerundete Menge, Sockelleiste fällt auf lfm zurück', () => {
    const [d] = buildLineItemDisplays([
      item({ isSetItem: true, actualM2: 16, setItemType: 'baseboard' }, { einheit_short: '' }),
    ]);
    expect(d).toEqual({ product_id: 1, amount: 16, unit: 'lfm' });
  });

  it('Stück-Artikel, Muster und fehlender Paketinhalt ohne Klammer', () => {
    const leer = { product_id: 1, amount: null, unit: null };
    expect(buildLineItemDisplays([item({}, { einheit_short: '-' })])[0]).toEqual(leer);
    expect(buildLineItemDisplays([item({}, { einheit_short: 'Stück' })])[0]).toEqual(leer);
    expect(buildLineItemDisplays([item({ isSample: true })])[0]).toEqual(leer);
    expect(buildLineItemDisplays([item({}, { paketinhalt: null })])[0]).toEqual(leer);
  });

  it('Positionen mit 0 Paketen fallen wie in buildOrderLineItems weg', () => {
    expect(buildLineItemDisplays([item({ quantity: 0 }), item({})])).toHaveLength(1);
  });
});

describe('sanitizeLineItemDisplays', () => {
  it('verwirft ungültige Werte aus dem Browser', () => {
    expect(sanitizeLineItemDisplays('kaputt')).toEqual([]);
    expect(
      sanitizeLineItemDisplays([
        { product_id: 1, amount: 5, unit: 'x'.repeat(13) },
        { product_id: 2, amount: -1, unit: 'm²' },
        { product_id: 3, amount: 5, unit: 'm²' },
        null,
      ])
    ).toEqual([
      { product_id: 1, amount: null, unit: null },
      { product_id: 2, amount: null, unit: null },
      { product_id: 3, amount: 5, unit: 'm²' },
      { product_id: 0, amount: null, unit: null },
    ]);
  });
});
