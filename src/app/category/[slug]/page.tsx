import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { wooCommerceClient } from '@/lib/woocommerce';
import { JsonLd } from '@/components/JsonLd';
import { buildBreadcrumbSchema } from '@/lib/schema';
import { SITE_URL, categoryUrl } from '@/lib/site';
import { parseListingParams, listingHref, pageSuffix } from '@/lib/category-listing';
import { loadListingPage } from '@/lib/category-listing-server';
import { buildMetadata } from '@/lib/seo';
import { getPromoTileListing } from '@/lib/black-weeks';
import { filterAttributesFor, filtersToQuery, hasActiveFilters, parseActiveFilters, type FilterState } from '@/lib/category-filters';
import { loadFilteredListing } from '@/lib/category-filters-server';
import { permanentRedirect, notFound } from 'next/navigation';

// Interne Muster-Kategorie: nicht indexieren (steht auch nicht in der Sitemap)
const NOINDEX_CATEGORIES = new Set(['muster']);

// Category mapping for display names (fallback)
const categoryNames: Record<string, string> = {
  // Hauptkategorien
  'vinylboden': 'Vinylboden',
  'laminat': 'Laminat',
  'parkett': 'Parkett',
  'sockelleisten': 'Sockelleisten',
  'daemmung': 'Dämmung',
  'zubehoer': 'Zubehör',
  'muster': 'Muster',
  'musterbox': 'Kostenlose Bodenmuster bestellen',
  'teppichboden': 'Teppichboden',
  // Marken-Kategorien
  'coretec': 'COREtec',
  'primecore': 'primeCORE',
  'o-r-c-a': 'O.R.C.A.',
  // Unterkategorien Vinylboden
  'klebe-vinyl': 'Klebe-Vinyl',
  'rigid-vinyl': 'Rigid-Vinyl',
  // Unterkategorien Zubehör
  'zubehoer-fuer-sockelleisten': 'Zubehör für Sockelleisten',
  'montagekleber-silikon': 'Montagekleber und Silikon',
  'werkzeug': 'Werkzeug',
  'untergrundvorbereitung': 'Untergrundvorbereitung',
  'reinigung-pflege': 'Reinigung und Pflege',
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params, searchParams }: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  // Canonical zeigt auf die jeweilige Seite selbst (?page=n), ohne sort-Parameter
  const resolvedParams = await searchParams;
  const { page } = parseListingParams(resolvedParams);
  const filterAttributes = filterAttributesFor(slug);
  // Gefilterte Seiten sind Varianten der Kategorie und gehören nicht in den Google-Index
  const isFiltered = filterAttributes ? hasActiveFilters(parseActiveFilters(resolvedParams, filterAttributes)) : false;
  const categoryData = await wooCommerceClient.getCategoryBySlug(slug).catch(() => null);
  const name = categoryData?.name || categoryNames[slug] || slug;

  return buildMetadata({
    // Ab Seite 2 „– Seite N“, damit Title/Description nicht Seite 1 doppeln
    title: `${name} – Bodenbeläge online kaufen${pageSuffix(page)} | Bodenjäger`,
    description: `${name} in großer Auswahl bei Bodenjäger – Top-Qualität, schnelle Lieferung und persönliche Beratung${pageSuffix(page)}.`,
    path: isFiltered ? `/category/${slug}` : listingHref(`/category/${slug}`, page),
    ...((NOINDEX_CATEGORIES.has(slug) || isFiltered) && { robots: { index: false, follow: true } }),
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const { slug } = await params;
  const { showPromoTile, perPage } = getPromoTileListing(slug);
  const resolvedParams = await searchParams;
  const basePath = `/category/${slug}`;
  const filterAttributes = filterAttributesFor(slug);
  const activeFilters = filterAttributes ? parseActiveFilters(resolvedParams, filterAttributes) : null;
  const isFiltered = activeFilters ? hasActiveFilters(activeFilters) : false;
  const requested = parseListingParams(resolvedParams);
  if (isFiltered && activeFilters && first(resolvedParams.page) === '1') {
    permanentRedirect(listingHref(basePath, 1, requested.sort, filtersToQuery(activeFilters)));
  }

  // Try to fetch category information from WordPress
  let categoryData = null;
  try {
    categoryData = await wooCommerceClient.getCategoryBySlug(slug);
    console.log('📁 Category data fetched:', categoryData ? `Found: ${categoryData.name}` : 'Not found');
  } catch (error) {
    console.error('Error fetching category:', error);
  }

  let filterState: FilterState | null = null;
  let filtered: Awaited<ReturnType<typeof loadFilteredListing>> | null = null;
  if (filterAttributes && activeFilters && categoryData) {
    try {
      filtered = await loadFilteredListing({
        slug,
        categoryId: categoryData.id,
        attributeNames: filterAttributes,
        active: activeFilters,
        sort: requested.sort,
        page: requested.page,
        perPage,
        withProducts: isFiltered,
      });
      // Ohne Attribute (noch nicht importiert) keine Filter anzeigen
      if (filtered.filterState.facets.length > 0) filterState = filtered.filterState;
    } catch (error) {
      console.error(`Filter für ${slug} nicht verfügbar:`, error);
    }
  }

  const useFiltered = Boolean(isFiltered && filtered);
  if (useFiltered && filtered && requested.page > filtered.totalPages) notFound();
  const { listing, page, sort } = useFiltered && filtered
    ? {
        listing: { products: filtered.products, totalProducts: filtered.total, totalPages: filtered.totalPages, error: null },
        page: requested.page,
        sort: requested.sort,
      }
    : await loadListingPage(basePath, slug, resolvedParams, perPage);

  // Use WordPress name if available, otherwise use fallback
  const categoryName = categoryData?.name || categoryNames[slug] || slug;
  const categoryDescription = categoryData?.description || null;
  const categoryImage = categoryData?.image || null;

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: SITE_URL },
    { name: categoryName, url: categoryUrl(slug) },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <CategoryPageClient
        slug={slug}
        categoryName={categoryName}
        categoryDescription={categoryDescription}
        categoryImage={categoryImage}
        products={listing.products}
        totalProducts={listing.totalProducts}
        totalPages={listing.totalPages}
        currentPage={page}
        sortBy={sort}
        error={listing.error}
        showPromoTile={showPromoTile}
        filterState={filterState}
      />
    </>
  );
}

// Generate static params for common categories to avoid 404 on direct access
export async function generateStaticParams() {
  const categories = [
    // Hauptkategorien
    'vinylboden',
    'laminat',
    'parkett',
    'sockelleisten',
    'daemmung',
    'zubehoer',
    'muster',
    'musterbox',
    'teppichboden',
    // Marken-Kategorien
    'coretec',
    'primecore',
    'o-r-c-a',
    // Unterkategorien Vinylboden
    'klebe-vinyl',
    'rigid-vinyl',
    // Unterkategorien Zubehör
    'zubehoer-fuer-sockelleisten',
    'montagekleber-silikon',
    'werkzeug',
    'untergrundvorbereitung',
    'reinigung-pflege',
  ];

  return categories.map((slug) => ({
    slug,
  }));
}

// Enable dynamic rendering for categories not in generateStaticParams
export const dynamicParams = true;

// ISR: Kategorie-Seiten alle 5 Minuten neu rendern, damit neue/aktualisierte
// Kategorien (Name, Bild, Beschreibung) nicht dauerhaft im Full-Route-Cache einfrieren.
export const revalidate = 300;
