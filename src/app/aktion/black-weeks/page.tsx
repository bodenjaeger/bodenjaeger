import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import BlackWeeksListing from '@/components/black-weeks/BlackWeeksListing';
import { JsonLd } from '@/components/JsonLd';
import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce';
import { buildBreadcrumbSchema } from '@/lib/schema';
import { buildMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import {
  PROMO_CATEGORY_SLUG,
  PROMO_DISCOUNT_LABEL,
  PROMO_MAX_PRODUCTS,
  PROMO_PATH,
  isPromoActive,
  isPromoPreview,
} from '@/lib/black-weeks';

/**
 * Aktionsseite Black Weeks (`/aktion/black-weeks`).
 *
 * Wird bei jedem Aufruf gerendert (`connection()`), damit der Zeitcheck
 * minutengenau greift: vor Start und nach Ende → 307 auf die Startseite.
 * Die Produktliste selbst kommt weiter aus dem 5-Minuten-Datencache
 * (`getProductsPage`), das Backend wird also nicht pro Aufruf belastet.
 */

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: `Black Weeks: Bis zu ${PROMO_DISCOUNT_LABEL} auf Laminat, Vinyl & Parkett | Bodenjäger`,
    description:
      `Black Weeks bei Bodenjäger: Bis zu ${PROMO_DISCOUNT_LABEL} Rabatt auf ausgewählte Laminat-, Vinyl- und Parkettböden. Nur für kurze Zeit – jetzt zugreifen und sparen.`,
    path: PROMO_PATH,
  });
}

async function loadPromoProducts(): Promise<{
  products: StoreApiProduct[];
  total: number;
  error: boolean;
}> {
  try {
    const result = await wooCommerceClient.getProductsPage({
      category: PROMO_CATEGORY_SLUG,
      page: 1,
      per_page: PROMO_MAX_PRODUCTS,
      orderby: 'popularity',
      order: 'desc',
    });
    return { products: result.products, total: result.total, error: false };
  } catch (error) {
    console.error('❌ [black-weeks] Aktionsprodukte konnten nicht geladen werden:', error);
    return { products: [], total: 0, error: true };
  }
}

export default async function BlackWeeksPage() {
  await connection();
  if (!isPromoActive()) redirect('/');

  // Titelbild pflegt der Kunde selbst als Bild der Aktionskategorie in WooCommerce
  const [{ products, total, error }, category] = await Promise.all([
    loadPromoProducts(),
    wooCommerceClient.getCategoryBySlug(PROMO_CATEGORY_SLUG).catch(() => null),
  ]);
  const titleImage = category?.image?.src ? category.image : null;

  // Mehr Produkte in der Kategorie, als in einem Request geladen werden
  const tooMany = total > products.length;
  if (tooMany) {
    console.warn(
      `[black-weeks] Kategorie „${PROMO_CATEGORY_SLUG}“ hat ${total} Produkte, geladen werden höchstens ${PROMO_MAX_PRODUCTS} — der Rest fehlt auf der Aktionsseite.`
    );
  }

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: SITE_URL },
    { name: 'Black Weeks', url: `${SITE_URL}${PROMO_PATH}` },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <JsonLd data={breadcrumb} />

      {/* Schwarzes Band im Stil der Aktionsgrafiken. Nur der Kopf der Seite —
          die Produktkarten sind für hellen Grund gestaltet und bleiben darauf. */}
      <section className="bg-black text-white">
        <div className="content-container pb-10 pt-8">
          {/* Breadcrumb — „Aktion“ ohne Link, es gibt keine Übersichtsseite */}
          <nav aria-label="Brotkrumen" className="mb-6 text-sm text-gray-400">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:underline">Startseite</Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>Aktion</li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="font-medium text-white">Black Weeks</li>
            </ol>
          </nav>

          {/* Titelbild aus der Kategorie (animiertes GIF) — als <img>, damit
              der Next-Optimierer die Animation nicht anfasst. Fehlt es, steht
              direkt die Überschrift da. */}
          {titleImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={titleImage.src}
              alt={titleImage.alt || `Black Weeks bei Bodenjäger: bis zu ${PROMO_DISCOUNT_LABEL} auf Laminat, Vinyl und Parkett`}
              width={1500}
              height={500}
              fetchPriority="high"
              className="mb-8 h-auto w-full"
            />
          )}

          <div className="max-w-3xl">
            <h1 className="mb-4 text-2xl font-bold md:text-3xl">
              Bis zu {PROMO_DISCOUNT_LABEL} auf Laminat, Vinyl &amp; Parkett – Jetzt zugreifen und sparen!
            </h1>
            <p className="text-base leading-relaxed text-gray-200 md:text-lg">[EINLEITUNGSTEXT]</p>
          </div>
        </div>
      </section>

      <div id="angebote" className="content-container scroll-mt-48 py-10">
        {tooMany && isPromoPreview() && (
          <div className="mb-6 rounded border-2 border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            <strong>Nur in der Vorschau sichtbar:</strong> Die Kategorie hat {total} Produkte, die Seite
            lädt höchstens {PROMO_MAX_PRODUCTS}. Es fehlen {total - products.length} Produkte.
          </div>
        )}

        {products.length > 0 ? (
          <BlackWeeksListing products={products} />
        ) : (
          <div className="py-12 text-center">
            <h2 className="mb-2 text-xl font-medium text-gray-900">
              {error ? 'Die Aktionsböden konnten gerade nicht geladen werden' : 'Die Aktionsböden sind gleich da'}
            </h2>
            <p className="mb-6 text-gray-600">
              {error
                ? 'Bitte versuche es in ein paar Minuten noch einmal.'
                : 'Wir stellen die Angebote gerade zusammen. Schau gleich noch einmal vorbei oder stöbere in unserem Sortiment.'}
            </p>
            <Link
              href="/sale"
              className="inline-block rounded-lg bg-brand px-6 py-3 font-medium text-white transition-colors hover:bg-[#d11820]"
            >
              Zu den Angeboten
            </Link>
          </div>
        )}

        {/* Aktionsbedingungen — Ziel des Sternchens in Leiste und Kachel */}
        <section id="bedingungen" className="mt-16 scroll-mt-48 border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-600">
          <h2 className="mb-2 text-sm font-bold text-gray-900">*Aktionsbedingungen</h2>
          <p>[AKTIONSBEDINGUNGEN]</p>
        </section>
      </div>
    </div>
  );
}
