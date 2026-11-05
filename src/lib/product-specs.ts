/** Eigenschaften aus der WooCommerce-Tabelle, damit die Seite sie modern darstellen kann. */
export interface ProductSpec {
  label: string;
  value: string;
}

function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&sup2;/g, '²')
    .replace(/&times;/g, '×')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseProductSpecs(html: string | null | undefined): ProductSpec[] {
  if (!html) return [];
  const specs: ProductSpec[] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => toText(c[1]));
    if (cells.length === 2 && cells[0] && cells[1]) {
      specs.push({ label: cells[0].replace(/:$/, ''), value: cells[1] });
    }
  }
  return specs;
}

const HIGHLIGHTS = [/nutzschicht/i, /nutzungsklasse/i, /gesamtst|aufbauh|st(ä|ae)rke/i, /dielenma|format|abmessung/i, /fu(ß|ss)boden/i, /wasser/i];

/** Längere Texte passen nicht in eine Kachel und bleiben in der Liste. */
const MAX_KACHEL_ZEICHEN = 22;

/** Bis zu vier wichtige Werte für die Kacheln oben. */
export function pickHighlightSpecs(specs: ProductSpec[]): ProductSpec[] {
  const picked: ProductSpec[] = [];
  for (const pattern of HIGHLIGHTS) {
    const spec = specs.find((s) => pattern.test(s.label) && s.value.length <= MAX_KACHEL_ZEICHEN && !picked.includes(s));
    if (spec) picked.push(spec);
    if (picked.length === 4) break;
  }
  return picked;
}
