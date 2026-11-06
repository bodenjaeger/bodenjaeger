'use client';

import { Fragment, useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { type StoreApiProduct } from '@/lib/woocommerce';
import Image from 'next/image';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { SORT_OPTIONS, listingHref } from '@/lib/category-listing';
import { filtersToQuery, hasActiveFilters, type FilterState } from '@/lib/category-filters';
import { CategoryFilterButton, CategoryFilterChips, CategoryFilterSidebar, CategoryFilterToggle, ListingToolbar, useFilterCollapse, useFilterNavigation } from '@/components/category/CategoryFilters';
import { fetteZeilenAlsUeberschrift, kategorieIntro } from '@/lib/klick-vinyl';
import PromoTile from '@/components/black-weeks/PromoTile';
import { PROMO_TILE_EVERY, PROMO_TILE_POSITION } from '@/lib/black-weeks';

/** Kommt vor dem Produkt an Index `i` eine Aktionskachel? (Platz 3, dann alle 12 Produkte) */
function promoTileBefore(i: number): boolean {
  const first = PROMO_TILE_POSITION - 1;
  return i >= first && (i - first) % PROMO_TILE_EVERY === 0;
}

interface CategoryImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

interface CategoryPageClientProps {
  slug: string;
  categoryName: string;
  categoryDescription?: string | null;
  categoryImage?: CategoryImage | null;
  /**
   * Produkte, Paginierung und Sortierung kommen serverseitig aus der Seite
   * (lib/category-listing-server.ts), damit Kacheln und Seitenlinks ohne
   * JavaScript im HTML stehen. Blättern = echter Link auf ?page=n.
   */
  products: StoreApiProduct[];
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  sortBy: string;
  error: string | null;
  /**
   * Black-Weeks-Aktionskachel einblenden — vom Server entschieden
   * (`isPromoActive()`), damit Kachel und Seitengröße (11 statt 12) zusammenpassen.
   */
  showPromoTile?: boolean;
  /** Filter der Kategorie, null wenn es keine gibt oder sie nicht geladen werden konnten. */
  filterState?: FilterState | null;
}

const FLOOR_CATEGORIES = new Set(['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'luxus-vinyl', 'coretec', 'primecore', 'o-r-c-a', 'laminat', 'parkett', 'teppichboden']);
const SET_CATEGORIES = new Set(['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'luxus-vinyl', 'coretec', 'primecore', 'o-r-c-a', 'laminat', 'parkett']);
const VINYL_BRAND_CATEGORIES = new Set(['vinylboden', 'rigid-vinyl']);

export default function CategoryPageClient({
  slug,
  categoryName,
  categoryDescription,
  categoryImage,
  products,
  totalProducts,
  totalPages,
  currentPage,
  sortBy,
  error,
  showPromoTile = false,
  filterState = null,
}: CategoryPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [addonProductsMap, setAddonProductsMap] = useState<Map<number, StoreApiProduct>>(new Map());

  // Batch-fetch Dämmung + Sockelleiste für Set-Angebot Preisvergleich
  useEffect(() => {
    const addonIds = new Set<number>();
    products.forEach((p) => {
      if (p.show_setangebot) {
        if (p.daemmung_id) addonIds.add(p.daemmung_id);
        if (p.sockelleisten_id) addonIds.add(p.sockelleisten_id);
      }
    });
    if (addonIds.size === 0) return;

    fetch('/api/products/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(addonIds) }),
    })
      .then(r => r.ok ? r.json() : [])
      .then((addonProducts: StoreApiProduct[]) => {
        const map = new Map<number, StoreApiProduct>();
        addonProducts.forEach(p => map.set(p.id, p));
        setAddonProductsMap(map);
      })
      .catch(() => {});
  }, [products]);

  const reload = () => router.refresh();
  const filterQuery = filterState ? filtersToQuery(filterState.active) : '';
  const isFiltered = filterState ? hasActiveFilters(filterState.active) : false;
  const { apply, pending } = useFilterNavigation(sortBy);
  const { collapsed, toggle } = useFilterCollapse();
  const showSidebar = Boolean(filterState) && !collapsed;

  // Für den Rückweg von der Produktseite (Brotkrume)
  useEffect(() => {
    try {
      sessionStorage.setItem('letzte-liste', window.location.pathname + window.location.search);
    } catch {
      // Speicher nicht verfügbar: Brotkrume führt zur ersten Seite
    }
  }, [currentPage, sortBy, filterQuery]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="content-container py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{categoryName}</h1>

          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Fehler beim Laden der Produkte:</strong> {error}
          </div>

          <button
            onClick={reload}
            className="bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="content-container py-8">
        {/* Category Header */}
        <div className="mb-8">
          {/* Ohne Beschreibung gibt es keinen Beschreibungsblock (dort sitzt sonst
              die H1) — die H1 muss trotzdem immer da sein. Stil wie im Fehlerzustand. */}
          {!categoryDescription && (
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{categoryName}</h1>
          )}

          {/* Kopf im Karriere-Stil: Auf dem Handy kompakt, damit die Produkte schnell sichtbar sind */}
          {(categoryImage?.src || categoryDescription) && (() => {
            const intro = categoryDescription ? kategorieIntro(categoryDescription) : '';
            const mobileIntro = intro.length > 110 ? `${intro.slice(0, 110).trimEnd()} …` : intro;
            const desktopIntro = intro.length > 320 ? `${intro.slice(0, 320).trimEnd()} …` : intro;
            return (
              <section className={`mb-6 overflow-hidden rounded-[20px] bg-dark text-white md:rounded-[28px] ${categoryImage?.src ? 'md:grid md:grid-cols-2' : ''}`}>
                <div className="flex flex-col p-5 md:p-10 lg:p-14">
                  <h1 className="text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-white md:text-5xl lg:text-[60px]">
                    {categoryName}{SET_CATEGORIES.has(slug) && <span className="text-[#ff3b41]">, direkt im Set.</span>}
                  </h1>
                  {intro && (
                    <p className="mt-3 text-sm leading-relaxed text-white md:mt-5 md:text-[17px]">
                      <span className="md:hidden">{mobileIntro}</span>
                      <span className="hidden md:inline">{desktopIntro}</span>
                    </p>
                  )}
                  {FLOOR_CATEGORIES.has(slug) && (
                    <ul className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium md:flex">
                      {[`${totalProducts} Böden`, 'Lieferung frei ab 999 €', '12 Monate kostenfrei einlagern'].map((punkt) => (
                        <li key={punkt} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                          {punkt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {categoryImage?.src && (
                  <div className="relative hidden min-h-[320px] md:block">
                    <Image
                      src={categoryImage.src}
                      alt={categoryImage.alt || categoryName}
                      fill
                      sizes="50vw"
                      className="object-cover"
                      priority
                      quality={85}
                    />
                  </div>
                )}
              </section>
            );
          })()}

          {/* Schnellwahl: echte Filter und Marken-Kategorien */}
          {(() => {
            const optik = filterState?.facets.find((facet) => facet.key.toLowerCase() === 'optik');
            const chipClass = 'inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border border-gray-300 bg-white px-4 text-sm text-dark transition-colors hover:border-dark';
            if (!optik && !VINYL_BRAND_CATEGORIES.has(slug)) return null;
            return (
              <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-sm font-bold text-dark">Beliebt:</span>
                {optik?.values.filter((value) => value.count > 0).map((value) => (
                  <button
                    key={value.slug}
                    type="button"
                    disabled={pending}
                    onClick={() => filterState && apply({ ...filterState.active, values: { ...filterState.active.values, [optik.key]: [value.slug] } })}
                    className={chipClass}
                  >
                    {value.label}
                  </button>
                ))}
                {VINYL_BRAND_CATEGORIES.has(slug) && (
                  <>
                    <Link href="/category/coretec" className={chipClass}>COREtec</Link>
                    <Link href="/category/primecore" className={chipClass}>primeCORE</Link>
                  </>
                )}
              </div>
            );
          })()}

          <ListingToolbar
            filterControls={filterState ? (
              <>
                <CategoryFilterButton state={filterState} apply={apply} pending={pending} />
                <CategoryFilterToggle collapsed={collapsed} onToggle={toggle} />
              </>
            ) : undefined}
            count={`${totalProducts} ${totalProducts === 1 ? 'Produkt' : 'Produkte'}${totalPages > 1 ? ` (Seite ${currentPage} von ${totalPages})` : ''}`}
            sort={sortBy}
            sortOptions={SORT_OPTIONS}
            onSortChange={(value) => {
              // Sortierwechsel startet wieder auf Seite 1
              const href = listingHref(pathname, 1, value, filterQuery);
              startTransition(() => router.push(href, { scroll: false }));
            }}
          />
        </div>

        <div className={showSidebar ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-7' : ''}>
        {filterState && showSidebar && <CategoryFilterSidebar state={filterState} apply={apply} pending={pending} />}
        <div className="min-w-0">
        {filterState && <CategoryFilterChips state={filterState} apply={apply} />}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 ${showSidebar ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
            {products.map((product, index) => (
              <Fragment key={product.id}>
                {showPromoTile && promoTileBefore(index) && <PromoTile />}
                <UnifiedProductCard
                  product={product}
                  daemmungProduct={product.daemmung_id ? (addonProductsMap.get(product.daemmung_id) ?? null) : null}
                  sockelleisteProduct={product.sockelleisten_id ? (addonProductsMap.get(product.sockelleisten_id) ?? null) : null}
                />
              </Fragment>
            ))}
            {/* Weniger Produkte als Platz 3 → Kachel ans Ende */}
            {showPromoTile && products.length < PROMO_TILE_POSITION && <PromoTile />}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Keine Produkte gefunden</h3>
            <p className="text-gray-600 mb-6">
              {isFiltered
                ? 'Für diese Auswahl gibt es keine Produkte. Entferne einen Filter oder lösche alle.'
                : <>In der Kategorie &ldquo;{categoryName}&rdquo; sind derzeit keine Produkte verfügbar.</>}
            </p>
            {isFiltered ? (
              <Link
                href={listingHref(pathname, 1, sortBy)}
                className="inline-block bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Filter löschen
              </Link>
            ) : (
              <button
                onClick={reload}
                className="bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Aktualisieren
              </button>
            )}
          </div>
        )}

        {/* Pagination — gekürzt mit Ellipsen, damit die Reihe auf dem Handy nicht überläuft */}
        {totalPages > 1 && (() => {
          // Fenster: immer Seite 1 + letzte Seite + aktuelle ±1, dazwischen "…"
          const pages: (number | 'ellipsis')[] = [];
          const left = Math.max(2, currentPage - 1);
          const right = Math.min(totalPages - 1, currentPage + 1);
          pages.push(1);
          if (left > 2) pages.push('ellipsis');
          for (let i = left; i <= right; i++) pages.push(i);
          if (right < totalPages - 1) pages.push('ellipsis');
          pages.push(totalPages);

          // Echte Links (?page=n) statt onClick, damit Crawler alle Seiten
          // und damit alle Produkte ohne JavaScript erreichen.
          const navClass = 'px-3 py-2 rounded-lg border border-gray-300 text-gray-500 transition-colors shrink-0';
          const prevLabel = (
            <>
              <span className="hidden sm:inline">Zurück</span>
              <span className="sm:hidden" aria-hidden="true">‹</span>
            </>
          );
          const nextLabel = (
            <>
              <span className="hidden sm:inline">Weiter</span>
              <span className="sm:hidden" aria-hidden="true">›</span>
            </>
          );

          return (
            <nav aria-label="Seitennavigation" className="flex justify-center items-center gap-1 sm:gap-2">
              {currentPage > 1 ? (
                <Link
                  href={listingHref(pathname, currentPage - 1, sortBy, filterQuery)}
                  rel="prev"
                  aria-label="Vorherige Seite"
                  className={`${navClass} hover:bg-gray-100`}
                >
                  {prevLabel}
                </Link>
              ) : (
                <span aria-disabled="true" aria-label="Vorherige Seite" className={`${navClass} opacity-50 cursor-not-allowed`}>
                  {prevLabel}
                </span>
              )}

              {pages.map((page, index) =>
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className="px-1 sm:px-2 py-2 text-gray-400 select-none">
                    …
                  </span>
                ) : (
                  <Link
                    key={page}
                    href={listingHref(pathname, page, sortBy, filterQuery)}
                    aria-label={`Seite ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={`px-3 py-2 rounded-lg border transition-colors shrink-0 ${
                      currentPage === page
                        ? 'bg-brand text-white border-brand'
                        : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </Link>
                )
              )}

              {currentPage < totalPages ? (
                <Link
                  href={listingHref(pathname, currentPage + 1, sortBy, filterQuery)}
                  rel="next"
                  aria-label="Nächste Seite"
                  className={`${navClass} hover:bg-gray-100`}
                >
                  {nextLabel}
                </Link>
              ) : (
                <span aria-disabled="true" aria-label="Nächste Seite" className={`${navClass} opacity-50 cursor-not-allowed`}>
                  {nextLabel}
                </span>
              )}
            </nav>
          );
        })()}

        </div>
        </div>

        {/* Ausführlicher Kategorietext */}
        {categoryDescription && categoryDescription.replace(/<[^>]+>/g, '').trim().length > 110 && (
          <section id="category-full-description" className="mt-12 rounded-[20px] bg-white p-5 md:p-10 lg:p-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.02em] text-dark md:text-3xl">
              {categoryName} kaufen: Das solltest du wissen
            </h2>
            <div
              className="whitespace-pre-line text-[15px] leading-relaxed text-dark lg:columns-2 lg:gap-14
                [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:break-after-avoid [&_h3]:text-[17px] [&_h3]:font-bold [&_h3]:text-dark [&_h3:first-child]:mt-0
                [&_p]:mb-4 [&_strong]:font-semibold
                [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:whitespace-normal [&_ul]:pl-5
                [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:whitespace-normal [&_ol]:pl-5
                [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: fetteZeilenAlsUeberschrift(categoryDescription) }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
