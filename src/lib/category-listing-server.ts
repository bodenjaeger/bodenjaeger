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
 */
export async function loadListingPage(
  basePath: string,
  category: string,
  searchParams: Record<string, string | string[] | undefined>
): Promise<{ listing: ListingData; page: number; sort: string }> {
  const { page, sort } = parseListingParams(searchParams);
  if (hasExplicitFirstPage(searchParams)) {
    permanentRedirect(listingHref(basePath, 1, sort));
  }

  const listing = await loadListing(category, page, sort);
  if (!listing.error && page > 1 && page > listing.totalPages) {
    notFound();
  }

  return { listing, page, sort };
}

/**
 * Lädt eine Seite einer Produktliste serverseitig, damit Produktkacheln und
 * Paginierung ohne JavaScript im HTML stehen (Crawlbarkeit).
 */
export async function loadListing(category: string, page: number, sort: string): Promise<ListingData> {
  const [orderby, order] = sort.split('-');

  try {
    const result = await wooCommerceClient.getProductsPage({
      category,
      page,
      per_page: PRODUCTS_PER_PAGE,
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
