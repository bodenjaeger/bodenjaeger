import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { SITE_URL } from '@/lib/site';
import { parseListingParams, listingHref } from '@/lib/category-listing';
import { loadListing } from '@/lib/category-listing-server';

/**
 * Bestseller-Übersichtsseite
 * Zeigt die beliebtesten Produkte
 */
export default async function BestsellerPage({ searchParams }: PageProps<'/bestseller'>) {
  const { page, sort } = parseListingParams(await searchParams);
  const listing = await loadListing('bestseller', page, sort);

  return (
    <CategoryPageClient
      slug="bestseller"
      categoryName="Bestseller - Unsere beliebtesten Bodenbeläge"
      categoryDescription="Die Top-Seller unserer Kunden! Diese Bodenbeläge überzeugen durch hervorragende Qualität, ansprechendes Design und ein unschlagbares Preis-Leistungs-Verhältnis."
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
export async function generateMetadata({ searchParams }: PageProps<'/bestseller'>): Promise<Metadata> {
  const { page } = parseListingParams(await searchParams);
  return {
    title: 'Bestseller - Beliebteste Bodenbeläge | Bodenjäger',
    description: 'Entdecken Sie unsere Bestseller: Die beliebtesten Bodenbeläge unserer Kunden. Laminat, Vinyl und Parkett in Top-Qualität.',
    alternates: {
      canonical: `${SITE_URL}${listingHref('/bestseller', page)}`,
    },
  };
}
