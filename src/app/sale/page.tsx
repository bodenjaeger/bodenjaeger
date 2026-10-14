import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { SITE_URL } from '@/lib/site';
import { parseListingParams, listingHref } from '@/lib/category-listing';
import { loadListing } from '@/lib/category-listing-server';

/**
 * Sale-Übersichtsseite
 * Zeigt alle Produkte im Sale
 */
export default async function SalePage({ searchParams }: PageProps<'/sale'>) {
  const { page, sort } = parseListingParams(await searchParams);
  const listing = await loadListing('sale', page, sort);

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
    />
  );
}

// Canonical zeigt auf die jeweilige Seite selbst (?page=n), ohne sort-Parameter
export async function generateMetadata({ searchParams }: PageProps<'/sale'>): Promise<Metadata> {
  const { page } = parseListingParams(await searchParams);
  return {
    title: 'Sale - Reduzierte Bodenbeläge | Bodenjäger',
    description: 'Hochwertige Bodenbeläge zu reduzierten Preisen. Laminat, Vinyl, Parkett im Sale - Nur solange der Vorrat reicht!',
    alternates: {
      canonical: `${SITE_URL}${listingHref('/sale', page)}`,
    },
  };
}
