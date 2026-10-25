/**
 * Black-Weeks-Aktion 2026 — EINZIGE Quelle für Laufzeit, Slugs und Regeln.
 *
 * Bannerleiste (Header), Aktionskachel (Listings) und die Aktionsseite
 * `/aktion/black-weeks` lesen alle `isPromoActive()`. Unabhängig von der
 * beendeten Paket-Aktion in `src/lib/promo.ts`; am Warenkorb ändert diese
 * Aktion nichts — die Preise kommen wie immer aus WooCommerce.
 *
 * ── Nur auf dem Server auswerten ────────────────────────────────────────────
 * `PROMO_END`, `PROMO_PREVIEW` und `PROMO_EXCLUSIVE` sind keine
 * `NEXT_PUBLIC_`-Variablen und im Browser `undefined`. Die Seiten werten
 * `isPromoActive()` serverseitig aus und reichen das Ergebnis als Prop weiter.
 * Das verhindert außerdem, dass Server-HTML und Browser zur Startminute
 * unterschiedlich rendern (Hydration-Fehler, Layout-Shift).
 *
 * ── Start um 00:00 ohne Deploy ──────────────────────────────────────────────
 * Die Shopseiten liegen gerendert im Cache. Ein Vercel-Cron
 * (`/api/cron/black-weeks`, siehe `vercel.json`) leert ihn kurz nach Start
 * und Ende komplett; die Aktionsseite prüft die Zeit ohnehin bei jedem Aufruf.
 */

import type { StoreApiProduct } from '@/lib/woocommerce';
import { PRODUCTS_PER_PAGE } from '@/lib/category-listing';

// ============================================================================
// Konfiguration
// ============================================================================

/** URL der Aktionsseite. Bei Änderung auch den Ordner unter `src/app/aktion/` umbenennen. */
export const PROMO_PATH = '/aktion/black-weeks';

/** Anker der Aktionsbedingungen auf der Aktionsseite (Ziel des Sternchens). */
export const PROMO_CONDITIONS_HREF = `${PROMO_PATH}#bedingungen`;

/** WooCommerce-Kategorie mit den Aktionsböden (im Backend gepflegt). */
export const PROMO_CATEGORY_SLUG = process.env.NEXT_PUBLIC_PROMO_CATEGORY_SLUG || 'black-weeks';

/** Start: 01.11.2026, 00:00 Uhr Europe/Berlin (Winterzeit, +01:00). */
export const PROMO_START = '2026-11-01T00:00:00+01:00';

/** Aktionskachel zusätzlich alle n Produkte (nach der ersten an Platz 3). */
export const PROMO_TILE_EVERY = 12;

/** Platz der ersten Aktionskachel im Grid (1-basiert). */
export const PROMO_TILE_POSITION = 3;

/**
 * Höchstzahl an Produkten, die die Aktionsseite in einem Request lädt
 * (Tabs, Sortierung und Blättern laufen danach im Browser). Hat die
 * Kategorie mehr, fehlen die übrigen — die Seite warnt dann im Server-Log
 * und in der Vorschau sichtbar.
 */
export const PROMO_MAX_PRODUCTS = 100;

export const PROMO_IMAGES = {
  /** Wird von uns geliefert; bis dahin zeigt die Seite einen Platzhalter. */
  hero: '/promo/black-weeks-hero.webp',
  tile: '/promo/black-weeks-tile.webp',
} as const;

export const PROMO_TILE_ALT = 'Black Weeks: bis zu 59 % auf Laminat, Vinyl und Parkett';

/**
 * Aktionsrot für Leiste und Kachel. Bewusst nicht das Markenrot #ed1b24:
 * Weiß darauf erreicht nur 4,4:1. #d11820 (Hover-Rot des Shops) schafft 5,4:1.
 */
export const PROMO_RED = '#d11820';

// ============================================================================
// Laufzeit
// ============================================================================

/**
 * Vorschau: `PROMO_PREVIEW=true` aktiviert die Aktion unabhängig vom Datum.
 * Nur auf Preview-Deployments bzw. lokal setzen, in Production nie.
 */
export function isPromoPreview(): boolean {
  return process.env.PROMO_PREVIEW === 'true';
}

/** UTC-Offset von Europe/Berlin an einem Kalendertag, z. B. `+01:00`. */
function berlinOffset(date: string): string {
  const noonUtc = new Date(`${date}T12:00:00Z`);
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  })
    .formatToParts(noonUtc)
    .find((part) => part.type === 'timeZoneName')?.value;
  const offset = name?.replace('GMT', '');
  return offset && /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : '+01:00';
}

/**
 * Ende aus `PROMO_END`. Ein reines Datum (`2026-11-30`) gilt bis 23:59:59
 * Europe/Berlin dieses Tages; ein voller ISO-Zeitpunkt wird direkt übernommen.
 * Fehlt oder ungültig → `null`.
 */
export function getPromoEnd(): Date | null {
  const raw = process.env.PROMO_END?.trim();
  if (!raw) return null;

  const end = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T23:59:59.999${berlinOffset(raw)}`)
    : new Date(raw);

  return Number.isNaN(end.getTime()) ? null : end;
}

/** Enddatum für die Bannerleiste, z. B. „30.11.“ — `null`, wenn nicht gesetzt. */
export function formatPromoEnd(): string | null {
  const end = getPromoEnd();
  if (!end) return null;
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
  }).formatToParts(end);
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return day && month ? `${day}.${month}.` : null;
}

/**
 * Läuft die Aktion? Steuert Bannerleiste, Aktionskachel und die
 * Erreichbarkeit der Aktionsseite.
 *
 * Ohne gültiges `PROMO_END` bleibt die Aktion aus (außer in der Vorschau):
 * Eine Aktion ohne Ende darf nicht versehentlich unbefristet live gehen.
 */
export function isPromoActive(now: Date = new Date()): boolean {
  if (isPromoPreview()) return true;

  const start = new Date(PROMO_START).getTime();
  if (now.getTime() < start) return false;

  const end = getPromoEnd();
  if (!end) {
    console.warn('[black-weeks] PROMO_END fehlt oder ist ungültig — Aktion bleibt aus.');
    return false;
  }
  return now.getTime() <= end.getTime();
}

/**
 * Aktionskachel für ein Listing (/category/[slug], /sale, /bestseller).
 * Mit Kachel lädt die Seite ein Produkt weniger, damit das Raster voll bleibt
 * (Kachel + 11 Produkte = 12 Plätze). Nicht in der Aktionskategorie selbst.
 */
export function getPromoTileListing(category: string): { showPromoTile: boolean; perPage: number } {
  const showPromoTile = category !== PROMO_CATEGORY_SLUG && isPromoActive();
  return { showPromoTile, perPage: showPromoTile ? PRODUCTS_PER_PAGE - 1 : PRODUCTS_PER_PAGE };
}

/**
 * Exklusiv-Modus: Aktionsböden nur auf der Aktionsseite zeigen.
 *
 * ACHTUNG — derzeit ohne Wirkung. Ein sauberes Ausblenden braucht eine
 * Erweiterung der Plugin-API `/jaeger/v1/products` um `exclude_category`.
 * Im Frontend nachträglich herauszufiltern würde Produktanzahl und
 * Seitenzahlen der Listings verfälschen. Nach der Plugin-Erweiterung den
 * Parameter in `loadListing()` (category-listing-server.ts) und bei den
 * Slider-Abfragen der Startseite übergeben, wenn dieser Schalter an ist.
 */
export function isPromoExclusive(): boolean {
  return process.env.PROMO_EXCLUSIVE === 'true';
}

// ============================================================================
// Aktionsseite: Bodenart und Rabatt
// ============================================================================

export type PromoBodenart = 'laminat' | 'vinyl' | 'parkett';

export const PROMO_BODENART_TABS: ReadonlyArray<{ value: PromoBodenart | 'alle'; label: string }> = [
  { value: 'alle', label: 'Alle' },
  { value: 'laminat', label: 'Laminat' },
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'parkett', label: 'Parkett' },
];

const BODENART_SLUGS: Record<PromoBodenart, readonly string[]> = {
  laminat: ['laminat'],
  vinyl: ['vinylboden', 'klebe-vinyl', 'rigid-vinyl'],
  parkett: ['parkett'],
};

/** Bodenart eines Produkts anhand seiner WooCommerce-Kategorien. */
export function getPromoBodenart(product: Pick<StoreApiProduct, 'categories'>): PromoBodenart | null {
  const slugs = product.categories?.map((c) => c.slug.toLowerCase()) ?? [];
  for (const art of Object.keys(BODENART_SLUGS) as PromoBodenart[]) {
    if (BODENART_SLUGS[art].some((s) => slugs.includes(s))) return art;
  }
  return null;
}

/**
 * Rabatt in Prozent für die Sortierung „Höchster Rabatt“ — dieselbe Quelle
 * wie das Prozent-Badge der Produktkarte (Set-Ersparnis, sonst Sale-Rabatt).
 */
export function getPromoDiscount(product: StoreApiProduct): number {
  return product.setangebot_ersparnis_prozent || product.discount_percent || 0;
}
