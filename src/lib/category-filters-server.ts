import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce';
import {
  buildFilterState,
  filterSlug,
  filterUnit,
  matchesFilters,
  type ActiveFilters,
  type FilterIndexProduct,
  type FilterState,
} from '@/lib/category-filters';

const BODENARTEN = ['Laminat', 'Parkett'];

/** WooCommerce liefert Werte teils mit HTML-Zeichen ("Klicken &amp; Kleben"). */
function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
}

const INDEX_REVALIDATE_SECONDS = 300;
const MAX_INDEX_PAGES = 20;

/** Lädt ID, Preis und Attribute aller Produkte der Kategorie in der gewünschten Reihenfolge. */
export async function loadFilterIndex(categoryId: number, sort: string, attributeNames: string[]): Promise<FilterIndexProduct[]> {
  const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!baseUrl || !key || !secret) throw new Error('WooCommerce-Zugang fehlt');

  const [orderby, order] = sort.split('-');
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const wanted = new Set(attributeNames);
  const index: FilterIndexProduct[] = [];

  for (let page = 1; page <= MAX_INDEX_PAGES; page++) {
    const params = new URLSearchParams({
      category: String(categoryId),
      status: 'publish',
      per_page: '100',
      page: String(page),
      orderby,
      order,
      _fields: 'id,price,attributes,categories',
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
      categories?: Array<{ name: string }>;
    }>;
    for (const item of items) {
      const attributes: Record<string, string[]> = {};
      for (const attribute of item.attributes ?? []) {
        if (wanted.has(attribute.name)) attributes[filterSlug(attribute.name)] = attribute.options.map(decodeEntities);
      }
      // Bodenart: Vinyl nach Klick- und Klebe-Vinyl aus der Excel, sonst aus den Kategorien
      if (wanted.has('Bodenart') && Object.keys(attributes).length > 0) {
        const vinylArt = item.attributes?.find((a) => a.name === 'Art des Vinylbodens')?.options ?? [];
        const bodenart = vinylArt.length > 0
          ? vinylArt.map(decodeEntities)
          : BODENARTEN.filter((name) => item.categories?.some((c) => c.name === name));
        if (bodenart.length > 0) attributes.bodenart = bodenart;
      }
      // Ohne Filterwerte (z. B. Muster) gehört ein Produkt nicht in die Filterliste
      if (Object.keys(attributes).length > 0) {
        index.push({ id: item.id, price: parseFloat(item.price) || 0, attributes });
      }
    }
    if (page >= parseInt(response.headers.get('x-wp-totalpages') || '1', 10)) break;
  }
  return index;
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
  const index = await loadFilterIndex(categoryId, sort, attributeNames);
  const matching = index.filter((product) => matchesFilters(product, active));
  const filterState: FilterState = buildFilterState(index, attributeNames, active, filterUnit(slug));

  const totalPages = Math.max(1, Math.ceil(matching.length / perPage));
  let products: StoreApiProduct[] = [];
  if (withProducts) {
    const ids = matching.slice((page - 1) * perPage, page * perPage).map((product) => product.id);
    const loaded = await wooCommerceClient.getProductsByIds(ids);
    products = ids.map((id) => loaded.get(id)).filter((p): p is StoreApiProduct => Boolean(p));
  }

  return { filterState, products, total: matching.length, totalPages };
}
