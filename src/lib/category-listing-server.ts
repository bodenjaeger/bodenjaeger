import { notFound, permanentRedirect } from 'next/navigation';
import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce';
import {
  PRODUCTS_PER_PAGE,
  hasExplicitFirstPage,
  listingHref,
  parseListingParams,
} from '@/lib/category-listing';

export interface ListingData {
  products: StoreApiProduct[];
  totalProducts: number;
  totalPages: number;
  error: string | null;
}

/**
 * Wie loadListing, erzwingt aber saubere Seiten-URLs:
 * `?page=1` → Weiterleitung auf die URL ohne Parameter, Seiten hinter der
 * letzten Seite → 404 (sonst entstehen leere Duplikate wie ?page=99).
 *
 * `perPage`: Mit Black-Weeks-Kachel 11 statt 12, damit das Raster voll bleibt.
 */
export async function loadListingPage(
  basePath: string,
  category: string,
  searchParams: Record<string, string | string[] | undefined>,
  perPage: number = PRODUCTS_PER_PAGE
): Promise<{ listing: ListingData; page: number; sort: string }> {
  const { page, sort } = parseListingParams(searchParams);
  if (hasExplicitFirstPage(searchParams)) {
    permanentRedirect(listingHref(basePath, 1, sort));
  }

  const listing = await loadListing(category, page, sort, perPage);
  if (!listing.error && page > 1 && page > listing.totalPages) {
    notFound();
  }

  return { listing, page, sort };
}

/**
 * Lädt eine Seite einer Produktliste serverseitig, damit Produktkacheln und
 * Paginierung ohne JavaScript im HTML stehen (Crawlbarkeit).
 */
const MAX_LISTING_CHUNKS = 5;

export async function loadListing(
  category: string,
  page: number,
  sort: string,
  perPage: number = PRODUCTS_PER_PAGE
): Promise<ListingData> {
  const [orderby, order] = sort.split('-');

  try {
    // Die ganze Kategorie in 100er-Blöcken laden und selbst in Seiten teilen:
    // Bei gleichen Sortierwerten (z. B. „Beliebteste“ ohne Verkäufe) liefert die API
    // je Seite eine andere Reihenfolge – Produkte kämen doppelt oder gar nicht.
    const all: StoreApiProduct[] = [];
    const seen = new Set<number>();
    for (let chunk = 1; chunk <= MAX_LISTING_CHUNKS; chunk++) {
      const result = await wooCommerceClient.getProductsPage({ category, page: chunk, per_page: 100, orderby, order });
      for (const product of result.products) {
        if (!seen.has(product.id)) {
          seen.add(product.id);
          all.push(product);
        }
      }
      if (chunk >= result.totalPages) break;
    }

    const start = (page - 1) * perPage;
    return {
      products: all.slice(start, start + perPage),
      totalProducts: all.length,
      totalPages: Math.max(1, Math.ceil(all.length / perPage)),
      error: null,
    };
  } catch (error) {
    console.error(`❌ Error fetching products for listing ${category}:`, error);
    return {
      products: [],
      totalProducts: 0,
      totalPages: 1,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
