/**
 * Gutschein MUSTER50 (server-side only): Profi-Verlegeset gratis für
 * Musterbox-Besteller.
 *
 * Regeln (Dominik + Flyer):
 *  - Nur für Kunden mit abgeschlossener Musterbestellung unter derselben
 *    Rechnungs-E-Mail, höchstens `MUSTER50.validDays` Tage seit Status „Abgeschlossen“.
 *    Der Flyer verspricht 14 Tage ab Erhalt — die Technik rechnet großzügiger,
 *    damit sie nie strenger ist als der Flyer.
 *  - Nur zusammen mit einer Bestellung, nicht für das Set allein.
 *  - Einmal pro Kunde (WC `usage_limit_per_user` = 1).
 *
 * WooCommerce-Gutschein (im Backend anzulegen): Code MUSTER50, Prozent-Rabatt
 * 100 %, nur Produkt `MUSTER50.giftProductId`, höchstens 1 Artikel, 1× pro Kunde,
 * Kategorie „Muster“ ausgeschlossen.
 */

import { getCompletedOrdersByEmail } from '@/lib/woocommerce-checkout';

export const MUSTER50 = {
  code: 'MUSTER50',
  /** Profi Verlegeset (SKU 100198000). */
  giftProductId: 1689,
  validDays: 20,
  notEligibleMessage: 'Code nur für Musterbox-Besteller innerhalb von 14 Tagen gültig.',
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Prüft, ob zu der E-Mail eine abgeschlossene Musterbestellung existiert,
 * die höchstens `MUSTER50.validDays` Tage zurückliegt.
 *
 * Muster-Positionen erkennt das Frontend selbst am Meta `_is_sample`
 * (`order-line-items.ts`) — es steht an jeder Position der Kategorie „Muster“.
 * Wirft bei Netz-/Auth-Fehlern.
 */
export async function hasRecentSampleOrder(email: string, now: Date = new Date()): Promise<boolean> {
  const target = email.trim().toLowerCase();
  if (!target) return false;

  const cutoff = now.getTime() - MUSTER50.validDays * DAY_MS;
  const orders = await getCompletedOrdersByEmail(target);

  return orders.some((order) => {
    if ((order.billing?.email || '').trim().toLowerCase() !== target) return false;
    if (!order.date_completed_gmt) return false;
    const completed = new Date(`${order.date_completed_gmt}Z`).getTime();
    if (Number.isNaN(completed) || completed < cutoff) return false;
    return order.line_items.some((item) =>
      item.meta_data.some((meta) => meta.key === '_is_sample' && meta.value === 'true')
    );
  });
}
