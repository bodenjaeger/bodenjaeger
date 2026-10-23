import type { MetadataRoute } from 'next';
import { wooCommerceClient, type StoreApiProduct, type StoreApiCategory } from '@/lib/woocommerce';
import { wordPressClient } from '@/lib/wordpress';
import { SITE_URL, productUrl, categoryUrl } from '@/lib/site';

/**
 * Sitemap für https://bodenjaeger.de
 *
 * Enthält:
 *   - Statische Seiten (Homepage, Service, Fachmarkt-Subseiten, Legal …)
 *   - Alle Kategorien (dynamisch aus WC-Backend)
 *   - Alle Produkte (dynamisch aus Jäger-API, paginiert)
 *   - Blog + Beiträge, sobald es Beiträge gibt
 *
 * Nicht enthalten: per robots.txt gesperrte und noindex-Seiten (/login,
 * /favoriten, Formulare, Muster), ?page-URLs.
 *
 * Cache: 1 Stunde (revalidate = 3600), damit Backend nicht bei jedem
 * Crawler-Hit kontaktiert wird.
 */

const BASE_URL = SITE_URL;

export const revalidate = 3600;

type ChangeFrequency = MetadataRoute.Sitemap[number]['changeFrequency'];

interface StaticPage {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
}

const STATIC_PAGES: StaticPage[] = [
  // Hauptseiten — höchste Priorität
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/sale', priority: 0.9, changeFrequency: 'daily' },
  { path: '/bestseller', priority: 0.8, changeFrequency: 'weekly' },

  // Fachmarkt — wichtige Lokal-SEO-Seite
  { path: '/fachmarkt-hueckelhoven', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/fachmarkt-hueckelhoven/service', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/verlegeservice', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/set-angebote', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/fachmarkt-hueckelhoven/service/fachberatung', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/musterservice', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/einlagerung', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/werkzeugverleih', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/service/lieferung-abholung', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/anhaengerverleih', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/fachmarkt-hueckelhoven/schausonntag', priority: 0.5, changeFrequency: 'monthly' },

  // Karriere
  { path: '/karriere', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/kontakt', priority: 0.7, changeFrequency: 'yearly' },

  // Versand & Service-Info
  { path: '/versand-lieferzeit', priority: 0.6, changeFrequency: 'yearly' },

  // Newsletter (/login steht nicht hier: per robots.txt gesperrt)
  { path: '/newsletter', priority: 0.5, changeFrequency: 'yearly' },

  // HTML-Sitemap
  { path: '/sitemap-page', priority: 0.4, changeFrequency: 'monthly' },

  // Legal — niedrige Priorität, ändert selten
  { path: '/agb', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/datenschutz', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/impressum', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/widerruf', priority: 0.3, changeFrequency: 'yearly' },
];

// Nicht in die Sitemap: Muster-Produkte (nur über den Muster-Button bestellbar,
// Seiten stehen auf noindex) und die interne Muster-Kategorie (ebenfalls noindex).
const EXCLUDED_PRODUCT_PREFIX = 'muster-';
const EXCLUDED_CATEGORY_SLUGS = new Set(['muster']);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 1. Statische Seiten
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // 2. Kategorien (dynamisch — alle nicht-leeren Kategorien)
  let categoryEntries: MetadataRoute.Sitemap = [];
  try {
    const categories: StoreApiCategory[] = await wooCommerceClient.getCategories({
      per_page: 100,
      hide_empty: true,
    });
    categoryEntries = categories
      .filter((cat) => typeof cat.slug === 'string' && cat.slug.length > 0)
      .filter((cat) => !EXCLUDED_CATEGORY_SLUGS.has(cat.slug))
      .map((cat) => ({
        url: categoryUrl(cat.slug),
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch categories:', error);
  }

  // 3. Produkte (dynamisch, paginiert)
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products: StoreApiProduct[] = await wooCommerceClient.getAllProducts();
    productEntries = products
      .filter((p) => typeof p.slug === 'string' && p.slug.length > 0)
      .filter((p) => !p.slug.startsWith(EXCLUDED_PRODUCT_PREFIX))
      .map((p) => ({
        url: productUrl(p.slug),
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.error('[sitemap] Failed to fetch products:', error);
  }

  // 4. Blog — nur wenn es Beiträge gibt (ohne Beiträge steht /blog auf noindex)
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const { posts, total } = await wordPressClient.getPosts(1, 100);
    if (total > 0) {
      blogEntries = [
        { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
        ...posts.map((post) => ({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: new Date(post.modified || post.date),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        })),
      ];
    }
  } catch (error) {
    console.error('[sitemap] Failed to fetch blog posts:', error);
  }

  return [...staticEntries, ...categoryEntries, ...productEntries, ...blogEntries];
}
