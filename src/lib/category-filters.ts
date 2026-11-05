/**
 * Regeln der Produktfilter auf den Kategorieseiten.
 * Ohne Server-Importe, weil Seite und Client-Komponente sie gemeinsam nutzen.
 * Die Werte kommen aus den WooCommerce-Attributen (Excel-Import).
 */

const VINYL = ['Farbgebung', 'Optik', 'Kollektion', 'Verlegeart', 'Nutzungsklasse', 'Dämmung integriert', 'Stärke', 'Marke', 'Fußbodenheizung geeignet'];
const LAMINAT = ['Farbgebung', 'Optik', 'Nutzungsklasse', 'Abriebklasse', 'Stärke', 'Feuchtraumgeeignet', 'Marke'];
const PARKETT = ['Farbgebung', 'Optik', 'Oberfläche', 'Sortierung', 'Verlegeart'];
const SOCKELLEISTEN = ['Höhe', 'Material', 'Überstreichbar'];

const FILTERS_BY_CATEGORY: Record<string, string[]> = {
  vinylboden: VINYL,
  'rigid-vinyl': VINYL,
  'klebe-vinyl': VINYL,
  coretec: VINYL,
  primecore: VINYL,
  laminat: LAMINAT,
  parkett: PARKETT,
  sockelleisten: SOCKELLEISTEN,
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
