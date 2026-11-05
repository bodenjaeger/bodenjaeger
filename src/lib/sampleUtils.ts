import type { CartItem } from '@/contexts/CartContext';

// Muster sind immer kostenlos. Ab dem 4. Muster fällt pro zusätzlichem
// Muster ein Fracht-Aufschlag an.
export const FREE_SAMPLE_LIMIT = 3;
export const SAMPLE_SHIPPING_SURCHARGE = 1.99;

// Backend-Konvention: jedes Muster-Produkt hat den Slug des Boden-Produkts
// mit vorangestelltem "muster-". Beispiel:
//   Boden:  "rigid-vinyl-vara-fjord"
//   Muster: "muster-rigid-vinyl-vara-fjord"
export const SAMPLE_SLUG_PREFIX = 'muster-';

/**
 * Mögliche Muster-Slugs eines Bodens. WordPress hängt bei doppelten Adressen
 * „-2“ an (rigid-vinyl-vara-canyon-2), das Muster heißt dann trotzdem
 * muster-rigid-vinyl-vara-canyon.
 */
export function sampleSlugsFor(productSlug: string): string[] {
  const ohneZaehler = productSlug.replace(/-\d+$/, '');
  return [...new Set([productSlug, ohneZaehler])].map((slug) => `${SAMPLE_SLUG_PREFIX}${slug}`);
}

/** Sucht das Muster zu einem Boden, zuerst über die exakte Adresse. */
export async function findSampleProduct<T>(productSlug: string): Promise<T | null> {
  for (const slug of sampleSlugsFor(productSlug)) {
    const response = await fetch(`/api/products/samples?slug=${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error('Fehler beim Suchen des Musters');
    const results = await response.json();
    if (Array.isArray(results) && results.length > 0) return results[0] as T;
  }
  return null;
}

// WooCommerce-Kategorie-ID der Muster-Kategorie ("muster").
// Wird u.a. für Coupon-Validierung (Ausschluss von Mustern) verwendet.
export const SAMPLE_CATEGORY_ID = 66;

// Erkennt Muster-Produkte am Slug-Präfix oder an der "muster"-Kategorie.
// Backend-seitig haben Muster aktuell teilweise einen Platzhalter-Preis (z.B. 10€)
// stehen — fachlich sind sie aber kostenlos. Frontend muss den Preis-Display deshalb
// für Muster überschreiben.
export function isMusterProduct(
  product:
    | { slug?: string; categories?: Array<{ slug: string }> }
    | null
    | undefined
): boolean {
  if (!product) return false;
  if (product.slug && product.slug.startsWith(SAMPLE_SLUG_PREFIX)) return true;
  if (product.categories?.some((c) => c.slug === 'muster')) return true;
  return false;
}

export function countSamples(items: CartItem[]): number {
  return items.reduce((n, item) => (item.isSample ? n + item.quantity : n), 0);
}

export function calculateSampleShippingSurcharge(sampleCount: number): number {
  return Math.max(0, sampleCount - FREE_SAMPLE_LIMIT) * SAMPLE_SHIPPING_SURCHARGE;
}
