/**
 * Stripe-Positionen aus der WooCommerce-Bestellung.
 *
 * Stripe rechnet Stückpreis × Menge, der Stückpreis kennt nur ganze Cent. Unsere
 * Positionsbeträge entstehen aus dem m²-Preis und lassen sich nicht immer
 * glatt durch die Paketzahl teilen (100,00 € / 3 Pakete → Stripe zieht 99,99 €
 * ein). Deshalb geht jede Position mit Menge 1 und ihrem exakten Betrag an
 * Stripe; Paketzahl und Menge stehen im Namen.
 *
 * Die Beträge stammen aus der WooCommerce-Antwort, nicht aus dem Browser:
 * WooCommerce rechnet Brutto → Netto → Brutto und kann dabei um einen Cent
 * abweichen. Maßgeblich ist `order.total`. WooCommerce rundet die Steuer einmal
 * über die ganze Bestellung, die Antwort aber je Position — kleine Differenzen
 * gleicht `buildStripePositions` an der größten Position aus (höchstens 1 Cent
 * je Position plus Versand). Bei größerer Differenz liefert es keinen
 * Positionsvorschlag, der Aufrufer zieht dann `order.total` als eine einzige
 * Position ein.
 */

import type { CartItem } from '@/contexts/CartContext';

// ============================================================================
// Anzeige-Daten aus dem Warenkorb
// ============================================================================

/**
 * Menge für den Positionsnamen. Reine Beschriftung: geht nicht an WooCommerce
 * und beeinflusst keinen Betrag.
 */
export interface LineItemDisplay {
  product_id: number;
  /** Gesamtmenge (m², lfm, kg …) oder `null`, wenn nach Stück verkauft. */
  amount: number | null;
  unit: string | null;
}

const STUECK_UNITS = new Set(['-', 'stück', 'stk', 'stk.']);

/** Baut die Anzeige-Daten in derselben Reihenfolge wie `buildOrderLineItems`. */
export function buildLineItemDisplays(cartItems: CartItem[]): LineItemDisplay[] {
  return cartItems
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const product_id = item.product.id;
      if (item.isSample) return { product_id, amount: null, unit: null };

      const rawUnit = item.product.einheit_short?.trim();
      const isBaseboard = item.setItemType === 'baseboard';
      const amount =
        item.isSetItem && item.actualM2 !== undefined
          ? item.actualM2
          : item.product.paketinhalt
            ? item.product.paketinhalt * item.quantity
            : null;

      if (amount === null || (rawUnit && STUECK_UNITS.has(rawUnit.toLowerCase()))) {
        return { product_id, amount: null, unit: null };
      }
      return { product_id, amount, unit: rawUnit || (isBaseboard ? 'lfm' : 'm²') };
    });
}

/** Prüft die vom Browser gelieferten Anzeige-Daten; Ungültiges fällt weg. */
export function sanitizeLineItemDisplays(raw: unknown): LineItemDisplay[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry ?? {}) as Partial<LineItemDisplay>;
    const validAmount =
      typeof e.amount === 'number' && Number.isFinite(e.amount) && e.amount >= 0;
    const validUnit =
      typeof e.unit === 'string' && e.unit.length > 0 && e.unit.length <= 12 && !/[\x00-\x1f]/.test(e.unit);
    return {
      product_id: typeof e.product_id === 'number' ? e.product_id : 0,
      amount: validAmount && validUnit ? (e.amount as number) : null,
      unit: validAmount && validUnit ? (e.unit as string) : null,
    };
  });
}

// ============================================================================
// Positionsname
// ============================================================================

const decimal = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * „1 × Vinyl Eiche, 7 Pakete (15,54 m²) – 434,42 €“.
 * Ohne Anzeige-Daten fehlt die Klammer; bei `amount: null` heißt es „Stück“.
 */
export function formatStripePositionName(
  name: string,
  quantity: number,
  display: LineItemDisplay | undefined,
  cents: number
): string {
  let menge: string;
  if (display && display.amount === null) {
    menge = `${quantity} Stück`;
  } else {
    const pakete = `${quantity} ${quantity === 1 ? 'Paket' : 'Pakete'}`;
    menge =
      display && display.amount !== null && display.unit
        ? `${pakete} (${decimal.format(display.amount)} ${display.unit})`
        : pakete;
  }
  return `1 × ${name}, ${menge} – ${decimal.format(cents / 100)} €`;
}

// ============================================================================
// Positionen
// ============================================================================

export interface WooOrderForStripe {
  total: string;
  shipping_total?: string;
  shipping_tax?: string;
  line_items?: Array<{
    name: string;
    product_id: number;
    quantity: number;
    total: string;
    total_tax?: string;
  }>;
}

export interface StripePosition {
  name: string;
  quantity: 1;
  /** In Cent. */
  price: number;
}

export type StripePositionsResult =
  | { ok: true; lineItems: StripePosition[]; shippingCents: number; adjustmentCents: number }
  | { ok: false; sumCents: number | null; orderCents: number };

/** Summe zweier Dezimal-Strings in Cent; `null`, wenn ein Wert keine Zahl ist. */
function grossCents(net: string | undefined, tax: string | undefined): number | null {
  const sum = parseFloat(net ?? '') + parseFloat(tax ?? '');
  if (!Number.isFinite(sum) || sum < 0) return null;
  return Math.round(Number((sum * 100).toFixed(6)));
}

/**
 * Baut die Positionen aus der WooCommerce-Bestellung. Bei `ok: true` ergibt die
 * Summe aus Positionen und Versand exakt `order.total`. `ok: false` heißt: Die
 * Differenz ist zu groß zum Ausgleichen, der Aufrufer muss auf eine einzige
 * Position ausweichen.
 */
export function buildStripePositions(
  order: WooOrderForStripe,
  displays: LineItemDisplay[]
): StripePositionsResult {
  const orderCents = Math.round(Number((parseFloat(order.total) * 100).toFixed(6)));
  const items = order.line_items ?? [];
  if (items.length === 0) return { ok: false, sumCents: null, orderCents };

  const positionCents: number[] = [];
  for (const item of items) {
    const cents = grossCents(item.total, item.total_tax);
    if (cents === null) return { ok: false, sumCents: null, orderCents };
    positionCents.push(cents);
  }

  const shippingCents = grossCents(order.shipping_total ?? '0', order.shipping_tax ?? '0');
  if (shippingCents === null) return { ok: false, sumCents: null, orderCents };

  const sumCents = positionCents.reduce((sum, cents) => sum + cents, 0) + shippingCents;
  const adjustmentCents = orderCents - sumCents;
  const maxAdjustment = items.length + (shippingCents > 0 ? 1 : 0);
  if (Math.abs(adjustmentCents) > maxAdjustment) return { ok: false, sumCents, orderCents };

  const largest = positionCents.indexOf(Math.max(...positionCents));
  if (positionCents[largest] + adjustmentCents < 0) return { ok: false, sumCents, orderCents };
  positionCents[largest] += adjustmentCents;

  const lineItems: StripePosition[] = items.map((item, index) => {
    // Anzeige-Daten nur übernehmen, wenn sie sicher zu dieser Position gehören.
    const candidate = displays[index];
    const display = candidate?.product_id === item.product_id ? candidate : undefined;
    return {
      name: formatStripePositionName(item.name, item.quantity, display, positionCents[index]),
      quantity: 1,
      price: positionCents[index],
    };
  });

  return { ok: true, lineItems, shippingCents, adjustmentCents };
}
