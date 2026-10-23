import type { StoreApiProduct } from '@/lib/woocommerce';
import { stripHtml } from '@/lib/schema';

const MAX_LENGTH = 155;

const clean = (text: string): string => stripHtml(text).replace(/\s+/g, ' ').trim();

// Namensbestandteile, die bei vielen Produkten vorkommen und daher nichts über
// die Zuordnung eines Textes zum Produkt aussagen.
const GENERIC_NAME_TOKENS = new Set([
  'rigid', 'vinyl', 'klebe', 'laminat', 'parkett', 'coretec', 'primecore', 'stauf', 'mit', 'und', 'für', 'set',
]);

/**
 * Individuell gepflegte Description (Rank Math) hat Vorrang — aber nur, wenn sie
 * wie eine echte Meta-Description aussieht (keine Aufzählung, 50–160 Zeichen) und
 * einen markanten Teil des Produktnamens enthält. Viele Einträge sind kopierte
 * Spiegelstrich-Listen oder Texte eines anderen Produkts und würden Dubletten erzeugen.
 * Prüfliste für die Pflege: docs/rank-math-descriptions-pruefliste.csv
 */
function usableCustomDescription(raw: string | null | undefined, productName: string): string | null {
  if (!raw) return null;
  if (/[•▪●]|<li|\n\s*[-*]/.test(raw)) return null;
  const text = clean(raw);
  if (text.length < 50 || text.length > 160) return null;

  const nameTokens = clean(productName)
    .toLowerCase()
    .split(/[\s\-–/]+/)
    .filter((t) => t.length >= 4 && !GENERIC_NAME_TOKENS.has(t) && !/^\d/.test(t));
  const lower = text.toLowerCase();
  return nameTokens.some((t) => lower.includes(t)) ? text : null;
}

/** Spiegelpunkte der Kurzbeschreibung („2,5 mm stark | Nutzschicht: 0,55 mm“ → „2,5 mm stark, Nutzschicht: 0,55 mm“). */
function keyFacts(shortDescription: string): string[] {
  const items = [...shortDescription.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
    .map((m) => clean(m[1]).replace(/\s*\|\s*/g, ', '))
    .filter(Boolean);
  if (items.length > 0) return items;
  const text = clean(shortDescription);
  return text ? [text] : [];
}

/**
 * Pro Produkt eindeutige Meta-Description (max. 155 Zeichen):
 * „{Name}: {1–2 Kernpunkte} – ab {Preis} €/{Einheit}. Lieferzeit {X}. Jetzt bei Bodenjäger kaufen.“
 * Wird es zu lang, entfallen erst Kernpunkte, dann die Lieferzeit.
 */
export function buildProductMetaDescription(
  product: StoreApiProduct,
  customDescription?: string | null
): string {
  const custom = usableCustomDescription(customDescription, product.name);
  if (custom) return custom;

  const unit = (product.einheit_short || '').replace(/\.$/, '');
  const price = Number(product.price) > 0
    ? ` – ab ${Number(product.price).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €${unit ? `/${unit}` : ''}`
    : '';
  const delivery = product.show_lieferzeit && product.lieferzeit
    ? ` Lieferzeit ${product.lieferzeit.replace(/ oder im Markt abholen/i, '').replace(/(\d)-(\d)/, '$1–$2')}.`
    : '';
  const facts = keyFacts(product.short_description || '');

  const build = (count: number, withDelivery: boolean) =>
    `${product.name}${count > 0 ? `: ${facts.slice(0, count).join(', ')}` : ''}${price}.${withDelivery ? delivery : ''} Jetzt bei Bodenjäger kaufen.`;

  for (const withDelivery of [true, false]) {
    for (let count = Math.min(2, facts.length); count >= 0; count--) {
      const text = build(count, withDelivery);
      if (text.length <= MAX_LENGTH) return text;
    }
  }
  return `${product.name}${price}. Bei Bodenjäger kaufen.`.slice(0, MAX_LENGTH);
}
