import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce';
import { PRODUCTS_PER_PAGE } from '@/lib/category-listing';

export interface ListingData {
  products: StoreApiProduct[];
  totalProducts: number;
  totalPages: number;
  error: string | null;
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
