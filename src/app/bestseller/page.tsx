import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { parseListingParams, listingHref, pageSuffix } from '@/lib/category-listing';
import { loadListingPage } from '@/lib/category-listing-server';
import { buildMetadata } from '@/lib/seo';
import { getPromoTileListing } from '@/lib/black-weeks';

/**
 * Bestseller-Übersichtsseite
 * Zeigt die beliebtesten Produkte
 */
export default async function BestsellerPage({ searchParams }: PageProps<'/bestseller'>) {
  const { showPromoTile, perPage } = getPromoTileListing('bestseller');
  const { listing, page, sort } = await loadListingPage('/bestseller', 'bestseller', await searchParams, perPage);

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
      showPromoTile={showPromoTile}
    />
  );
}

// Canonical zeigt auf die jeweilige Seite selbst (?page=n), ohne sort-Parameter
export async function generateMetadata({ searchParams }: PageProps<'/bestseller'>): Promise<Metadata> {
  const { page } = parseListingParams(await searchParams);
  return buildMetadata({
    title: `Bestseller - Beliebteste Bodenbeläge${pageSuffix(page)} | Bodenjäger`,
    description: `Entdecken Sie unsere Bestseller: Die beliebtesten Bodenbeläge unserer Kunden. Laminat, Vinyl und Parkett in Top-Qualität${pageSuffix(page)}.`,
    path: listingHref('/bestseller', page),
  });
}
