import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce';
import {
  filterSlug,
  filterUnit,
  shortFilterValue,
  type ActiveFilters,
  type FilterFacet,
  type FilterState,
} from '@/lib/category-filters';

interface IndexProduct {
  id: number;
  price: number;
  /** URL-Name des Attributs → Werte */
  attributes: Map<string, string[]>;
}

const INDEX_REVALIDATE_SECONDS = 300;
const MAX_INDEX_PAGES = 20;

/** Lädt ID, Preis und Attribute aller Produkte der Kategorie in der gewünschten Reihenfolge. */
async function loadIndex(categoryId: number, sort: string, attributeNames: string[]): Promise<IndexProduct[]> {
  const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!baseUrl || !key || !secret) throw new Error('WooCommerce-Zugang fehlt');

  const [orderby, order] = sort.split('-');
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const wanted = new Set(attributeNames);
  const index: IndexProduct[] = [];

  for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
    const params = new URLSearchParams({
      category: String(categoryId),
      status: 'publish',
      per_page: '100',
      page: String(page),
      orderby,
      order,
      _fields: 'id,price,attributes',
    });
    const response = await fetch(`${baseUrl}/wp-json/wc/v3/products?${params}`, {
      headers: { Authorization: `Basic ${auth}` },
      next: { revalidate: INDEX_REVALIDATE_SECONDS },
    });
    if (!response.ok) throw new Error(`Filterdaten: HTTP ${response.status}`);

    const items = (await response.json()) as Array<{
      id: number;
      price: string;
      attributes?: Array<{ name: string; options: string[] }>;
    }>;
    for (const item of items) {
      const attributes = new Map<string, string[]>();
      for (const attribute of item.attributes ?? []) {
        if (wanted.has(attribute.name)) attributes.set(filterSlug(attribute.name), attribute.options);
      }
      // Ohne Filterwerte (z. B. Muster) gehört ein Produkt nicht in die Filterliste
      if (attributes.size > 0) {
        index.push({ id: item.id, price: parseFloat(item.price) || 0, attributes });
      }
    }
    if (page >= parseInt(response.headers.get('x-wp-totalpages') || '1', 10)) break;
  }
  return index;
}

function matches(product: IndexProduct, active: ActiveFilters, skipKey?: string): boolean {
  for (const [key, slugs] of Object.entries(active.values)) {
    if (key === skipKey) continue;
    const options = product.attributes.get(key) ?? [];
    if (!options.some((option) => slugs.includes(filterSlug(option)))) return false;
  }
  if (active.priceFrom !== null && product.price < active.priceFrom) return false;
  if (active.priceTo !== null && product.price > active.priceTo) return false;
  return true;
}

const FARB_REIHENFOLGE = ['hell', 'mittel', 'dunkel'];

function sortValues(key: string, labels: string[]): string[] {
  if (key === 'farbgebung') {
    return [...labels].sort((a, b) => FARB_REIHENFOLGE.indexOf(a) - FARB_REIHENFOLGE.indexOf(b));
  }
  if (key === 'staerke' || key === 'hoehe') {
    return [...labels].sort((a, b) => parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.')));
  }
  return [...labels].sort((a, b) => a.localeCompare(b, 'de'));
}

function buildFacets(index: IndexProduct[], attributeNames: string[], active: ActiveFilters): FilterFacet[] {
  const facets: FilterFacet[] = [];
  for (const label of attributeNames) {
    const key = filterSlug(label);
    const allLabels = new Set<string>();
    const counts = new Map<string, number>();
    for (const product of index) {
      const options = product.attributes.get(key) ?? [];
      options.forEach((option) => allLabels.add(option));
      if (matches(product, active, key)) {
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
  return facets;
}

export interface FilteredListing {
  filterState: FilterState;
  /** Nur bei aktiver Auswahl gesetzt, sonst bleibt die normale Liste */
  products: StoreApiProduct[];
  total: number;
  totalPages: number;
}

/**
 * Baut die Filter einer Kategorie und, wenn gefiltert wird, die passende Produktseite.
 * Fehler lässt die Seite nicht scheitern: Der Aufrufer zeigt dann die normale Liste.
 */
export async function loadFilteredListing(params: {
  slug: string;
  categoryId: number;
  attributeNames: string[];
  active: ActiveFilters;
  sort: string;
  page: number;
  perPage: number;
  withProducts: boolean;
}): Promise<FilteredListing> {
  const { slug, categoryId, attributeNames, active, sort, page, perPage, withProducts } = params;
  const index = await loadIndex(categoryId, sort, attributeNames);
  const matching = index.filter((product) => matches(product, active));
  const prices = index.map((product) => product.price);

  const filterState: FilterState = {
    facets: buildFacets(index, attributeNames, active),
    priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
    priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    unit: filterUnit(slug),
    active,
    total: matching.length,
  };

  const totalPages = Math.max(1, Math.ceil(matching.length / perPage));
  let products: StoreApiProduct[] = [];
  if (withProducts) {
    const ids = matching.slice((page - 1) * perPage, page * perPage).map((product) => product.id);
    const loaded = await wooCommerceClient.getProductsByIds(ids);
    products = ids.map((id) => loaded.get(id)).filter((p): p is StoreApiProduct => Boolean(p));
  }

  return { filterState, products, total: matching.length, totalPages };
}
