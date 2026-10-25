import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { parseListingParams, listingHref, pageSuffix } from '@/lib/category-listing';
import { loadListingPage } from '@/lib/category-listing-server';
import { buildMetadata } from '@/lib/seo';
import { getPromoTileListing } from '@/lib/black-weeks';

/**
 * Sale-Übersichtsseite
 * Zeigt alle Produkte im Sale
 */
export default async function SalePage({ searchParams }: PageProps<'/sale'>) {
  const { showPromoTile, perPage } = getPromoTileListing('sale');
  const { listing, page, sort } = await loadListingPage('/sale', 'sale', await searchParams, perPage);

  return (
    <CategoryPageClient
      slug="sale"
      categoryName="Sale - Reduzierte Bodenbeläge"
      categoryDescription="Entdecke unsere reduzierten Bodenbeläge zu unschlagbaren Preisen. Hochwertige Qualität zum Sonderpreis - Nur solange der Vorrat reicht!"
      categoryImage={null}
      products={listing.products}
      totalProducts={listing.totalProducts}
      totalPages={listing.totalPages}
      currentPage={page}
      sortBy={sort}
      error={listing.error}
      showPromoTile={showPromoTile}
    />
  );
}

// Canonical zeigt auf die jeweilige Seite selbst (?page=n), ohne sort-Parameter
export async function generateMetadata({ searchParams }: PageProps<'/sale'>): Promise<Metadata> {
  const { page } = parseListingParams(await searchParams);
  return buildMetadata({
    title: `Sale - Reduzierte Bodenbeläge${pageSuffix(page)} | Bodenjäger`,
    description: `Hochwertige Bodenbeläge zu reduzierten Preisen. Laminat, Vinyl, Parkett im Sale - Nur solange der Vorrat reicht${pageSuffix(page)}!`,
    path: listingHref('/sale', page),
  });
}
