/**
 * Zeitgesteuerte Verkaufsaktionen — aktuell „Jedes 7. Paket gratis".
 *
 * EINZIGE Quelle für Laufzeit und Rabattregel. Warenkorb, Checkout-Summe und
 * die an WooCommerce gesendeten Line-Items lesen alle hier — damit kann die
 * Anzeige nicht von dem abweichen, was tatsächlich berechnet wird.
 *
 * ── Zählweise ───────────────────────────────────────────────────────────────
 * Pro Warenkorb-Position, nicht über den ganzen Korb: 7 Pakete desselben
 * Bodens → 1 gratis, 14 → 2 usw. (`Math.floor`). 4 Pakete Laminat + 3 Pakete
 * Vinyl ergeben KEIN Gratis-Paket.
 *
 * ── Geltungsbereich ─────────────────────────────────────────────────────────
 * Nur Bodenprodukte (`AKTION_CATEGORY_SLUGS`) — auch dann, wenn sie als
 * Boden-Position in einem Set-Angebot liegen. Dämmung und Sockelleisten sind
 * im Set ohnehin kostenlos, Zubehör und Muster sind ausgenommen.
 *
 * ── Testen vor dem Start ────────────────────────────────────────────────────
 * `NEXT_PUBLIC_AKTION_FORCE=1` schaltet die Aktion unabhängig vom Datum
 * dauerhaft ein. Gedacht für ein Vercel-Preview-Deployment, auf dem der Kunde
 * schon vor dem Starttermin testet. In Produktion NICHT setzen — dort
 * aktiviert sich die Aktion allein über `startsAt`.
 */

import type { CartItem } from '@/contexts/CartContext';
import type { StoreApiProduct } from '@/lib/woocommerce';

// ============================================================================
// Konfiguration
// ============================================================================

export interface PaketAktion {
  /** Interner Schlüssel, u.a. als Meta-Feld an der WooCommerce-Order. */
  id: string;
  /** Kundensichtbarer Name, erscheint auf der Rabattzeile. */
  label: string;
  /** Jedes n-te Paket ist gratis. */
  everyNth: number;
  /**
   * Startzeitpunkt inkl. Zeitzonen-Offset. `+02:00` = Sommerzeit (CEST);
   * bei einem Termin nach dem 25.10. wäre `+01:00` korrekt.
   */
  startsAt: string;
  /** Ende der Aktion (letzter gültiger Moment) oder `null` = unbefristet. */
  endsAt: string | null;
}

export const PAKET_AKTION: PaketAktion = {
  id: 'jedes-7-paket-gratis',
  label: 'Jedes 7. Paket gratis',
  everyNth: 7,
  startsAt: '2026-09-12T00:00:00+02:00',
  // TODO Kunde: Enddatum festlegen, sonst läuft die Aktion unbefristet weiter.
  endsAt: null,
};

/**
 * Kategorie-Slugs, für die die Aktion gilt. Enthält bewusst auch die
 * Marken-Kategorien — ein Produkt, das nur unter `coretec` hängt und nicht
 * zusätzlich unter `vinylboden`, wäre sonst außen vor.
 */
export const AKTION_CATEGORY_SLUGS = [
  'vinylboden',
  'klebe-vinyl',
  'rigid-vinyl',
  'laminat',
  'parkett',
  'coretec',
  'primecore',
  'o-r-c-a',
] as const;

// ============================================================================
// Laufzeit
// ============================================================================

/**
 * Vorschau-/Testmodus — Aktion läuft unabhängig vom Startdatum.
 *
 * Zwei Wege, absichtlich in dieser Reihenfolge:
 *  1. `NEXT_PUBLIC_AKTION_FORCE=1` — manuell, z.B. lokal in `.env.local`.
 *  2. Vercel-Umgebung `preview` — greift auf JEDEM Preview-Deployment
 *     automatisch, ohne dass in Vercel eine Variable angelegt werden muss.
 *     Vercel setzt `VERCEL_ENV` selbst; für den Browser wird sie als
 *     `NEXT_PUBLIC_VERCEL_ENV` eingebacken (Projekt-Einstellung
 *     „Automatically expose System Environment Variables", standardmäßig an).
 *
 * In Produktion ist `VERCEL_ENV === 'production'` — dort ist der Vorschau-Modus
 * also nie aktiv, egal was auf den Preview-Deployments passiert.
 */
export function isAktionForced(): boolean {
  if (process.env.NEXT_PUBLIC_AKTION_FORCE === '1') return true;

  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  return vercelEnv === 'preview';
}

/**
 * Läuft die Aktion zum übergebenen Zeitpunkt?
 *
 * `now` ist injizierbar, damit sich der Start ohne Systemuhr-Trickserei
 * prüfen lässt.
 */
export function isAktionActive(now: Date = new Date()): boolean {
  if (isAktionForced()) return true;

  const start = new Date(PAKET_AKTION.startsAt).getTime();
  if (Number.isNaN(start) || now.getTime() < start) return false;

  if (PAKET_AKTION.endsAt) {
    const end = new Date(PAKET_AKTION.endsAt).getTime();
    if (!Number.isNaN(end) && now.getTime() > end) return false;
  }

  return true;
}

// ============================================================================
// Rabattberechnung
// ============================================================================

export interface AktionLine {
  /** Produkt-ID der Warenkorb-Position. */
  productId: number;
  /** Set-Zugehörigkeit, falls die Position Teil eines Set-Angebots ist. */
  setId?: string;
  /** Anzahl Pakete in dieser Position. */
  packages: number;
  /** Davon gratis. */
  freePackages: number;
  /** Rabattbetrag dieser Position in EUR (brutto). */
  discount: number;
}

export interface AktionResult {
  /** true, wenn die Aktion läuft — unabhängig davon, ob Rabatt anfällt. */
  active: boolean;
  /** Summe aller Gratis-Pakete im Warenkorb. */
  freePackages: number;
  /** Gesamtrabatt in EUR (brutto), auf 2 Stellen gerundet. */
  discount: number;
  /** Positionen mit mindestens einem Gratis-Paket. */
  lines: AktionLine[];
}

const EMPTY_RESULT: AktionResult = { active: false, freePackages: 0, discount: 0, lines: [] };

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Gehört das Produkt zu einer Aktions-Kategorie (Bodenprodukt)? */
function isAktionProduct(product: Pick<StoreApiProduct, 'categories'>): boolean {
  return (
    product.categories?.some((cat) =>
      (AKTION_CATEGORY_SLUGS as readonly string[]).includes(cat.slug.toLowerCase())
    ) ?? false
  );
}

/** Fällt die Position unter die Aktion? */
export function isAktionEligible(item: CartItem): boolean {
  if (item.isSample) return false;
  // Set-Positionen, die ohnehin kostenlos sind, bringen keinen Rabatt.
  if (item.isSetItem && item.setItemType !== 'floor') return false;
  return isAktionProduct(item.product);
}

/**
 * Aktion für die Produktseite, bevor etwas im Warenkorb liegt: gleiche Regel
 * und gleicher Paketwert wie `getLineDiscount` (Set-Boden: Set-Preis/m² ×
 * Paketinhalt = `product.price` × `paketinhalt`), damit die Anzeige auf der
 * Produktseite dem späteren Warenkorb-Abzug entspricht.
 */
export function calculateProductAktion(
  product: StoreApiProduct,
  packages: number,
  now: Date = new Date()
): { freePackages: number; discount: number } {
  if (!isAktionActive(now) || !isAktionProduct(product) || packages <= 0) {
    return { freePackages: 0, discount: 0 };
  }
  const freePackages = Math.floor(packages / PAKET_AKTION.everyNth);
  const paketpreis = Number(product.price || 0) * (product.paketinhalt || 1);
  return { freePackages, discount: round2(paketpreis * freePackages) };
}

/**
 * Der Betrag, der für diese Position OHNE Aktion berechnet würde (brutto).
 * Gleiche Formel wie `CartContext.totalPrice`, OrderSummary und die
 * Line-Items im Checkout — bewusst hier zentralisiert.
 */
export function getLineTotal(item: CartItem): number {
  if (item.isSample) return 0;

  if (item.isSetItem && item.setPricePerUnit !== undefined && item.actualM2 !== undefined) {
    return Number(item.setPricePerUnit) * Number(item.actualM2);
  }

  const paketinhalt = item.product.paketinhalt || 1;
  return Number(item.product.price || 0) * paketinhalt * item.quantity;
}

/**
 * Gratis-Pakete dieser Position. Prüft die Laufzeit mit — außerhalb des
 * Aktionsfensters immer 0, damit kein Aufrufer den Datums-Check vergessen kann.
 */
export function getFreePackages(item: CartItem, now: Date = new Date()): number {
  if (!isAktionActive(now)) return 0;
  if (!isAktionEligible(item)) return 0;
  if (item.quantity <= 0) return 0;
  return Math.floor(item.quantity / PAKET_AKTION.everyNth);
}

/**
 * Rabatt einer einzelnen Position. Der Wert eines Gratis-Pakets ist der
 * tatsächlich berechnete Paketpreis dieser Position — bei Set-Böden also der
 * Set-Preis, nicht der UVP.
 */
export function getLineDiscount(item: CartItem, now: Date = new Date()): number {
  const freePackages = getFreePackages(item, now);
  if (freePackages === 0) return 0;

  const lineTotal = getLineTotal(item);
  if (lineTotal <= 0) return 0;

  return round2((lineTotal / item.quantity) * freePackages);
}

/**
 * Gesamtauswertung der Aktion für einen Warenkorb.
 *
 * Liefert bei inaktiver Aktion `EMPTY_RESULT` — Aufrufer brauchen keinen
 * eigenen Datums-Check.
 */
export function calculatePaketAktion(
  cartItems: CartItem[],
  now: Date = new Date()
): AktionResult {
  if (!isAktionActive(now)) return EMPTY_RESULT;

  const lines: AktionLine[] = [];
  let discount = 0;
  let freePackages = 0;

  for (const item of cartItems) {
    const free = getFreePackages(item, now);
    if (free === 0) continue;

    const lineDiscount = getLineDiscount(item, now);
    if (lineDiscount <= 0) continue;

    lines.push({
      productId: item.product.id,
      setId: item.setId,
      packages: item.quantity,
      freePackages: free,
      discount: lineDiscount,
    });
    discount += lineDiscount;
    freePackages += free;
  }

  return { active: true, freePackages, discount: round2(discount), lines };
}

/**
 * Wie viele Pakete fehlen dieser Position noch bis zum nächsten Gratis-Paket?
 * `null`, wenn die Aktion nicht läuft oder die Position nicht teilnimmt.
 * Für Hinweise wie „Noch 2 Pakete bis zum Gratis-Paket".
 */
export function getPackagesUntilNextFree(item: CartItem, now: Date = new Date()): number | null {
  if (!isAktionActive(now)) return null;
  if (!isAktionEligible(item)) return null;
  const rest = item.quantity % PAKET_AKTION.everyNth;
  return PAKET_AKTION.everyNth - rest;
}
