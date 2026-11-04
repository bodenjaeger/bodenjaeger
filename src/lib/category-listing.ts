/**
 * Gemeinsame Regeln für die Produktlisten (/category/[slug], /bestseller, /sale).
 *
 * Bewusst ohne Server-Importe, weil CategoryPageClient (Client Component)
 * dieselben Konstanten braucht wie die Server-Seiten, die die Produkte laden.
 */

export const PRODUCTS_PER_PAGE = 12;

/**
 * Standard-Sortierung der Kategorieseiten: Bestseller zuerst.
 * Wird aus der URL weggelassen und steht als erste Option im Dropdown.
 */
export const DEFAULT_SORT = 'popularity-desc';

export const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'popularity-desc', label: 'Beliebteste' },
  { value: 'date-desc', label: 'Neueste zuerst' },
  { value: 'date-asc', label: 'Älteste zuerst' },
  { value: 'price-asc', label: 'Preis: Niedrig zu Hoch' },
  { value: 'price-desc', label: 'Preis: Hoch zu Niedrig' },
  { value: 'title-asc', label: 'Name: A-Z' },
  { value: 'title-desc', label: 'Name: Z-A' },
];

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Liest ?page= und ?sort= robust aus (ungültige Werte → Standard). */
export function parseListingParams(searchParams: SearchParamsRecord): { page: number; sort: string } {
  const rawPage = parseInt(first(searchParams.page) || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawSort = first(searchParams.sort);
  const sort = SORT_OPTIONS.some((o) => o.value === rawSort) ? (rawSort as string) : DEFAULT_SORT;

  return { page, sort };
}

/** „ – Seite N“ ab Seite 2 (für eindeutige Titles/Descriptions), sonst leer. */
export function pageSuffix(page: number): string {
  return page > 1 ? ` – Seite ${page}` : '';
}

/** Steht `?page=1` ausdrücklich in der URL? (→ Weiterleitung auf die URL ohne Parameter) */
export function hasExplicitFirstPage(searchParams: SearchParamsRecord): boolean {
  return first(searchParams.page) === '1';
}

/** URL einer Listenseite. Seite 1 und Standard-Sortierung werden weggelassen. */
export function listingHref(basePath: string, page: number, sort: string = DEFAULT_SORT): string {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (sort !== DEFAULT_SORT) params.set('sort', sort);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
