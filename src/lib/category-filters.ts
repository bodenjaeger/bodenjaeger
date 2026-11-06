/**
 * Regeln der Produktfilter auf den Kategorieseiten.
 * Ohne Server-Importe, weil Seite und Client-Komponente sie gemeinsam nutzen.
 * Die Werte kommen aus den WooCommerce-Attributen (Excel-Import).
 */

const VINYL = ['Bodenart', 'Farbgebung', 'Optik', 'Kollektion', 'Nutzungsklasse', 'Dämmung integriert', 'Stärke', 'Marke', 'Fußbodenheizung geeignet'];
const LAMINAT = ['Farbgebung', 'Optik', 'Nutzungsklasse', 'Abriebklasse', 'Stärke', 'Feuchtraumgeeignet', 'Marke'];
const PARKETT = ['Farbgebung', 'Optik', 'Oberfläche', 'Sortierung', 'Verlegeart'];
const SOCKELLEISTEN = ['Farbe', 'Profil', 'Höhe', 'Material', 'Überstreichbar'];

/** Sockelleisten-Profil aus dem Namenskürzel (St58-…, WM40-…). Unbekannte Kürzel bekommen keinen Wert. */
export const SOCKELLEISTEN_PROFILE: Array<[RegExp, string]> = [
  [/^PWM\d/i, 'Premium Weimarer (Nadelholz)'],
  [/^WM\d/i, 'Weimarer'],
  [/^HB\d/i, 'Hamburger'],
  [/^St\s?\d/i, 'Standard'],
  [/^AD\d/i, 'Abdeckleiste'],
];

/** Anzeigereihenfolge der Profile im Filter. */
const PROFIL_REIHENFOLGE = ['Standard', 'Hamburger', 'Weimarer', 'Premium Weimarer (Nadelholz)', 'Abdeckleiste'];

const MUSTERBOX = ['Bodenart', 'Farbgebung', 'Optik', 'Kollektion', 'Marke'];
/** Aktionsseite: Bodenarten gemischt, nur Filter, die überall passen. */
export const PROMO_FILTER_ATTRIBUTES = ['Bodenart', 'Farbgebung', 'Optik', 'Kollektion', 'Nutzungsklasse', 'Stärke', 'Marke'];

const FILTERS_BY_CATEGORY: Record<string, string[]> = {
  vinylboden: VINYL,
  'rigid-vinyl': VINYL,
  'luxus-vinyl': VINYL,
  'klebe-vinyl': VINYL,
  coretec: VINYL,
  primecore: VINYL,
  laminat: LAMINAT,
  parkett: PARKETT,
  sockelleisten: SOCKELLEISTEN,
  // Musterbox: hier stehen die Böden selbst, deshalb die wichtigsten Bodenfilter
  'kostenlose-bodenmuster-bestellen': MUSTERBOX,
  musterbox: MUSTERBOX,
};

export function filterAttributesFor(slug: string): string[] | null {
  return FILTERS_BY_CATEGORY[slug] ?? null;
}

export function filterUnit(slug: string): string {
  return slug === 'sockelleisten' ? 'lfm' : 'm²';
}

export function filterSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    // Sonst würden "Premium" und "Premium +" zum selben Wert
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Excel-Werte tragen teils einen Zusatz: "23/34 | sehr starke gewerbliche Nutzung" wird "23/34". */
export function shortFilterValue(value: string): string {
  return value.split('|')[0].trim();
}

export interface ActiveFilters {
  /** URL-Name des Attributs → gewählte Wert-Slugs */
  values: Record<string, string[]>;
  priceFrom: number | null;
  priceTo: number | null;
}

export interface FilterFacetValue {
  label: string;
  slug: string;
  count: number;
  selected: boolean;
}

export interface FilterFacet {
  key: string;
  label: string;
  values: FilterFacetValue[];
}

export interface FilterState {
  facets: FilterFacet[];
  priceMin: number;
  priceMax: number;
  unit: string;
  active: ActiveFilters;
  /** Treffer der aktuellen Auswahl, auch ohne aktive Filter */
  total: number;
}

function parsePrice(raw: string | string[] | undefined): number | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (!text) return null;
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseActiveFilters(
  searchParams: Record<string, string | string[] | undefined>,
  attributes: string[]
): ActiveFilters {
  const values: Record<string, string[]> = {};
  for (const attribute of attributes) {
    const key = filterSlug(attribute);
    const raw = searchParams[key];
    const text = Array.isArray(raw) ? raw.join(',') : raw;
    const slugs = text ? text.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (slugs.length > 0) values[key] = slugs;
  }
  return {
    values,
    priceFrom: parsePrice(searchParams['preis-von']),
    priceTo: parsePrice(searchParams['preis-bis']),
  };
}

export function hasActiveFilters(active: ActiveFilters): boolean {
  return Object.keys(active.values).length > 0 || active.priceFrom !== null || active.priceTo !== null;
}

/** Teil der Adresse für die Auswahl, ohne führendes Fragezeichen. */
export function filtersToQuery(active: ActiveFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(active.values).sort()) {
    params.set(key, active.values[key].join(','));
  }
  if (active.priceFrom !== null) params.set('preis-von', String(active.priceFrom));
  if (active.priceTo !== null) params.set('preis-bis', String(active.priceTo));
  return params.toString();
}

export const NO_FILTERS: ActiveFilters = { values: {}, priceFrom: null, priceTo: null };

export interface FilterIndexProduct {
  id: number;
  price: number;
  /** URL-Name des Attributs → Werte */
  attributes: Record<string, string[]>;
}

export function matchesFilters(product: FilterIndexProduct, active: ActiveFilters, skipKey?: string): boolean {
  for (const [key, slugs] of Object.entries(active.values)) {
    if (key === skipKey) continue;
    const options = product.attributes[key] ?? [];
    if (!options.some((option) => slugs.includes(filterSlug(option)))) return false;
  }
  if (active.priceFrom !== null && product.price < active.priceFrom) return false;
  if (active.priceTo !== null && product.price > active.priceTo) return false;
  return true;
}

const FARB_REIHENFOLGE = ['hell', 'mittel', 'dunkel'];
/** Vom Kunden festgelegt: von der Einstiegs- bis zur Luxus-Kollektion. */
const KOLLEKTION_REIHENFOLGE = ['Essence Line', 'Authentic Line', 'Heritage Line', 'Klassik', 'Exquisit', 'Premium', 'Premium +', 'Luxus'];

function sortValues(key: string, labels: string[]): string[] {
  if (key === 'farbgebung') {
    return [...labels].sort((a, b) => FARB_REIHENFOLGE.indexOf(a) - FARB_REIHENFOLGE.indexOf(b));
  }
  if (key === 'kollektion') {
    // Unbekannte Kollektionen landen hinten statt vorne
    const rang = (label: string) => {
      const position = KOLLEKTION_REIHENFOLGE.indexOf(label);
      return position === -1 ? KOLLEKTION_REIHENFOLGE.length : position;
    };
    return [...labels].sort((a, b) => rang(a) - rang(b));
  }
  if (key === 'profil') {
    return [...labels].sort((a, b) => PROFIL_REIHENFOLGE.indexOf(a) - PROFIL_REIHENFOLGE.indexOf(b));
  }
  if (key === 'farbe') {
    return [...labels].sort((a, b) => (a === 'Weiß' ? -1 : b === 'Weiß' ? 1 : 0));
  }
  if (key === 'staerke' || key === 'hoehe') {
    return [...labels].sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')));
  }
  return [...labels].sort((a, b) => a.localeCompare(b, 'de'));
}

/** Trefferzahlen je Wert: Die eigene Filtergruppe zählt nicht mit, damit weitere Werte wählbar bleiben. */
export function buildFilterState(
  index: FilterIndexProduct[],
  attributeNames: string[],
  active: ActiveFilters,
  unit: string
): FilterState {
  const facets: FilterFacet[] = [];
  for (const label of attributeNames) {
    const key = filterSlug(label);
    const allLabels = new Set<string>();
    const counts = new Map<string, number>();
    for (const product of index) {
      const options = product.attributes[key] ?? [];
      options.forEach((option) => allLabels.add(option));
      if (matchesFilters(product, active, key)) {
        options.forEach((option) => counts.set(option, (counts.get(option) ?? 0) + 1));
      }
    }
    // Filter mit nur einem Wert helfen niemandem
    if (allLabels.size < 2) continue;
    facets.push({
      key,
      label,
      values: sortValues(key, [...allLabels]).map((option) => ({
        label: shortFilterValue(option),
        slug: filterSlug(option),
        count: counts.get(option) ?? 0,
        selected: active.values[key]?.includes(filterSlug(option)) ?? false,
      })),
    });
  }
  const prices = index.map((product) => product.price);
  return {
    facets,
    priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    unit,
    active,
    total: index.filter((product) => matchesFilters(product, active)).length,
  };
}
