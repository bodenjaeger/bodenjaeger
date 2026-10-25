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
export async function loadListing(
  category: string,
  page: number,
  sort: string,
  perPage: number = PRODUCTS_PER_PAGE
): Promise<ListingData> {
  const [orderby, order] = sort.split('-');

  try {
    const result = await wooCommerceClient.getProductsPage({
      category,
      page,
      per_page: perPage,
      orderby,
      order,
    });

    return {
      products: result.products,
      totalProducts: result.total,
      totalPages: result.totalPages,
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
