/**
 * Warenkorb → WooCommerce-Line-Items.
 *
 * EINZIGE Stelle, an der aus dem Warenkorb die Bestellpositionen entstehen —
 * genutzt vom normalen Checkout (`/checkout`) und von PayPal Express. Vorher
 * hatte Express eine eigene Abbildung, die m² bzw. kg als Menge schickte;
 * WooCommerce akzeptiert als `quantity` aber nur ganze Zahlen und lehnte die
 * Bestellung ab — nachdem PayPal schon eingezogen hatte.
 *
 * ── Regeln ──────────────────────────────────────────────────────────────────
 * - `quantity` ist IMMER die Anzahl Pakete/Rollen/Stück (`item.quantity`).
 *   m², lfm und kg stehen nur in den Meta-Daten (`_actual_m2`).
 * - Positionen mit 0 Paketen fallen weg (Sparpaket-Gebinde mit 0 Stück).
 * - `subtotal`/`total` sind BRUTTO, so wie im Warenkorb angezeigt. Die
 *   Umrechnung auf Netto für die WooCommerce-API macht der Server
 *   (`toNetLineItems`).
 * - Paket-Aktion: `subtotal` bleibt der volle Betrag, `total` sinkt um den
 *   Wert der Gratis-Pakete.
 */

import type { CartItem } from '@/contexts/CartContext';
import { PAKET_AKTION, getFreePackages, getLineDiscount } from '@/lib/promo';

export interface OrderLineItemMeta {
  key: string;
  value: string;
}

export interface OrderLineItem {
  product_id: number;
  /** Pakete/Rollen/Stück — immer ganzzahlig. */
  quantity: number;
  /** Brutto vor Aktionsrabatt, 2 Nachkommastellen. */
  subtotal: string;
  /** Brutto nach Aktionsrabatt, 2 Nachkommastellen. */
  total: string;
  name: string;
  meta_data: OrderLineItemMeta[];
}

/** Mehrwertsteuersatz, mit dem Brutto in Netto umgerechnet wird. */
export const TAX_RATE = 1.19;

/**
 * Baut die Bestellpositionen aus dem Warenkorb.
 *
 * `now` ist injizierbar, damit Aktions-Rabatte in Tests deterministisch sind.
 */
export function buildOrderLineItems(
  cartItems: CartItem[],
  now: Date = new Date()
): OrderLineItem[] {
  // Line Items aus Cart erstellen (Items mit quantity 0 ausfiltern).
  // Muster sind immer kostenlos – der Fracht-Aufschlag für Muster 4+
  // wird in calculateShippingCost auf die Versandkosten aufgeschlagen.
  return cartItems.filter((item) => item.quantity > 0).map((item) => {
    let totalPrice: number;

    if (item.isSample) {
      totalPrice = 0;
    } else if (item.isSetItem && item.setPricePerUnit !== undefined && item.actualM2 !== undefined) {
      // Set-Angebot Item: Verwende Set-Preis, NICHT regulären Preis!
      // setPricePerUnit ist bereits der korrekte Preis (0 für kostenlos, verrechnung für Premium)
      totalPrice = item.setPricePerUnit * item.actualM2;
    } else {
      // Reguläres Item
      const paketinhalt = item.product.paketinhalt || 1;
      // Paketpreis = Einzelpreis × Paketinhalt (gilt für ALLE Einheiten: m², lfm, kg, Liter etc.)
      totalPrice = item.product.price * paketinhalt * item.quantity;
    }

    // Metadata für Set-Angebot Items (umfassend für Rechnungen/Refunds)
    const metadata: OrderLineItemMeta[] = [];
    if (item.isSetItem) {
      metadata.push(
        { key: '_set_angebot', value: 'true' },
        { key: '_set_id', value: item.setId || '' },
        { key: '_set_item_type', value: item.setItemType || '' },
        { key: '_set_price_per_unit', value: item.setPricePerUnit?.toString() || '0' },
        { key: '_regular_price_per_unit', value: item.regularPricePerUnit?.toString() || '0' },
        { key: '_actual_m2', value: item.actualM2?.toString() || '0' },
        { key: '_savings', value: ((item.regularPricePerUnit || 0) * (item.actualM2 || 0) - totalPrice).toFixed(2) }
      );
    }

    if (item.isSample) {
      metadata.push({ key: '_is_sample', value: 'true' });
    }

    // Paket-Aktion: `subtotal` bleibt der volle Betrag, `total` sinkt um
    // den Wert der Gratis-Pakete. WooCommerce weist die Differenz dadurch
    // als Rabatt an der Position aus, statt den Preis stillschweigend zu
    // drücken.
    const aktionDiscount = getLineDiscount(item, now);
    const lineTotal = Math.max(0, totalPrice - aktionDiscount);

    if (aktionDiscount > 0) {
      metadata.push(
        { key: '_aktion', value: PAKET_AKTION.id },
        { key: '_aktion_gratis_pakete', value: getFreePackages(item, now).toString() },
        { key: '_aktion_rabatt', value: aktionDiscount.toFixed(2) }
      );
    }

    return {
      product_id: item.product.id,
      quantity: item.quantity,
      subtotal: totalPrice.toFixed(2),
      total: lineTotal.toFixed(2),
      name: item.product.name,
      meta_data: metadata,
    };
  });
}

/** Summe der Brutto-`total` aller Positionen, auf Cent gerundet. */
export function sumLineItemTotals(items: Array<{ total?: string }>): number {
  const sum = items.reduce((acc, item) => acc + parseFloat(item.total || '0'), 0);
  return Math.round((sum + Number.EPSILON) * 100) / 100;
}

/**
 * Brutto → Netto für die WooCommerce REST API.
 *
 * WooCommerce interpretiert line_items.subtotal/total IMMER als Netto (ex-Tax)
 * — unabhängig von der "Preise inkl. Steuern eingeben"-Einstellung im Admin.
 */
export function toNetLineItems<T extends { subtotal?: string; total?: string }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    ...(item.subtotal !== undefined
      ? { subtotal: (parseFloat(item.subtotal) / TAX_RATE).toFixed(2) }
      : {}),
    ...(item.total !== undefined
      ? { total: (parseFloat(item.total) / TAX_RATE).toFixed(2) }
      : {}),
  }));
}

/**
 * Prüft Positionen, die vom Browser kommen, bevor Geld bewegt wird.
 * Liefert eine Fehlermeldung oder `null`.
 */
export function validateOrderLineItems(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return 'Keine Artikel im Warenkorb';

  for (const [idx, raw] of items.entries()) {
    const item = raw as Partial<OrderLineItem> | null;
    const label = `Artikel ${idx + 1}`;
    if (!item || typeof item !== 'object') return `${label}: ungültig`;
    if (typeof item.product_id !== 'number' || !Number.isInteger(item.product_id) || item.product_id <= 0) {
      return `${label}: product_id fehlt oder ungültig`;
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return `${label}: Menge muss eine ganze Zahl ≥ 1 sein`;
    }
    for (const field of ['subtotal', 'total'] as const) {
      const value = item[field];
      if (typeof value !== 'string' || !Number.isFinite(parseFloat(value)) || parseFloat(value) < 0) {
        return `${label}: ${field} ungültig`;
      }
    }
    if (item.meta_data !== undefined && !Array.isArray(item.meta_data)) {
      return `${label}: meta_data ungültig`;
    }
  }
  return null;
}
