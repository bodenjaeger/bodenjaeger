import type { Metadata } from 'next';
import CategoryPageClient from '@/components/category/CategoryPageClient';
import { wooCommerceClient } from '@/lib/woocommerce';
import { JsonLd } from '@/components/JsonLd';
import { buildBreadcrumbSchema } from '@/lib/schema';
import { SITE_URL, categoryUrl } from '@/lib/site';
import { parseListingParams, listingHref } from '@/lib/category-listing';
import { loadListing } from '@/lib/category-listing-server';

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

export async function generateMetadata({ params, searchParams }: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  // Canonical zeigt auf die jeweilige Seite selbst (?page=n), ohne sort-Parameter
  const { page } = parseListingParams(await searchParams);
  const categoryData = await wooCommerceClient.getCategoryBySlug(slug).catch(() => null);
  const name = categoryData?.name || categoryNames[slug] || slug;

  return {
    title: `${name} – Bodenbeläge online kaufen | Bodenjäger`,
    description: `${name} in großer Auswahl bei Bodenjäger – Top-Qualität, schnelle Lieferung und persönliche Beratung.`,
    alternates: {
      canonical: `${SITE_URL}${listingHref(`/category/${slug}`, page)}`,
    },
    ...(NOINDEX_CATEGORIES.has(slug) && { robots: { index: false, follow: true } }),
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const { slug } = await params;
  const { page, sort } = parseListingParams(await searchParams);
  const listing = await loadListing(slug, page, sort);

  // Try to fetch category information from WordPress
  let categoryData = null;
  try {
    categoryData = await wooCommerceClient.getCategoryBySlug(slug);
    console.log('📁 Category data fetched:', categoryData ? `Found: ${categoryData.name}` : 'Not found');
  } catch (error) {
    console.error('Error fetching category:', error);
  }

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
