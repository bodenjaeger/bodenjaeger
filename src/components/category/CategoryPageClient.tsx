'use client';

import { Fragment, useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { type StoreApiProduct } from '@/lib/woocommerce';
import Image from 'next/image';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { PRODUCTS_PER_PAGE, SORT_OPTIONS, listingHref } from '@/lib/category-listing';
import { filtersToQuery, hasActiveFilters, type FilterState } from '@/lib/category-filters';
import { CategoryFilterButton, CategoryFilterChips, CategoryFilterSidebar, CategoryFilterToggle, ListingToolbar, useFilterCollapse, useFilterNavigation } from '@/components/category/CategoryFilters';
import { fetteZeilenAlsUeberschrift, kategorieIntro } from '@/lib/klick-vinyl';
import PromoTile from '@/components/black-weeks/PromoTile';
import ListingPager from '@/components/category/ListingPager';
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

const SET_CATEGORIES = new Set(['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'luxus-vinyl', 'coretec', 'primecore', 'o-r-c-a', 'laminat', 'parkett']);

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
  const [loadingMore, startTransition] = useTransition();
  const [addonProductsMap, setAddonProductsMap] = useState<Map<number, StoreApiProduct>>(new Map());

  // „Weitere anzeigen“: Die nächste Seite kommt wie gewohnt vom Server (?page=n),
  // wird hier aber an die bisherige Liste angehängt statt sie zu ersetzen.
  const [shownProducts, setShownProducts] = useState<StoreApiProduct[]>(products);
  const [firstShownPage, setFirstShownPage] = useState(currentPage);
  const appendNext = useRef(false);
  useEffect(() => {
    if (appendNext.current) {
      setShownProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...products.filter((p) => !seen.has(p.id))];
      });
    } else {
      setShownProducts(products);
      setFirstShownPage(currentPage);
    }
    appendNext.current = false;
  }, [products, currentPage]);

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
        setAddonProductsMap((prev) => {
          const map = new Map(prev);
          addonProducts.forEach(p => map.set(p.id, p));
          return map;
        });
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
      <div className="min-h-screen bg-pale">
        <div className="content-container py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{categoryName}</h1>

          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6">
            <strong>Fehler beim Laden der Produkte:</strong> {error}
          </div>

          <button
            onClick={reload}
            className="bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pale">
      <div className="content-container py-8">
        {/* Category Header */}
        <div className="mb-8">
          {/* Ohne Beschreibung gibt es keinen Beschreibungsblock (dort sitzt sonst
              die H1) — die H1 muss trotzdem immer da sein. Stil wie im Fehlerzustand. */}
          {!categoryDescription && !categoryImage?.src && (
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{categoryName}</h1>
          )}

          {/* Kopf im Karriere-Stil: Auf dem Handy kompakt, damit die Produkte schnell sichtbar sind */}
          {(categoryImage?.src || categoryDescription) && (() => {
            const intro = categoryDescription ? kategorieIntro(categoryDescription) : '';
            const mobileIntro = intro.length > 110 ? `${intro.slice(0, 110).trimEnd()} …` : intro;
            const desktopIntro = intro.length > 320 ? `${intro.slice(0, 320).trimEnd()} …` : intro;
            return (
              <section className={`mb-6 overflow-hidden rounded-2xl bg-dark text-white ${categoryImage?.src ? 'md:grid md:grid-cols-2' : ''}`}>
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
                  {categoryDescription && categoryDescription.replace(/<[^>]+>/g, '').trim().length > 110 && (
                    <a
                      href="#category-full-description"
                      className="mt-4 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-bold text-white underline underline-offset-4 hover:text-[#ff3b41] md:mt-6 md:text-base"
                    >
                      Weiterlesen <span aria-hidden="true">→</span>
                    </a>
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

          {/* Schnellwahl: setzt Optik- und Marken-Filter direkt auf dieser Seite */}
          {filterState && (() => {
            const quick = ['optik', 'marke', 'farbe', 'profil']
              .map((key) => filterState.facets.find((facet) => facet.key === key))
              .filter((facet): facet is NonNullable<typeof facet> => Boolean(facet))
              .flatMap((facet) => facet.values.filter((value) => value.count > 0 || value.selected).map((value) => ({ facet, value })));
            if (quick.length === 0) return null;
            const toggle = (key: string, valueSlug: string) => {
              const current = filterState.active.values[key] ?? [];
              const next = current.includes(valueSlug) ? current.filter((s) => s !== valueSlug) : [...current, valueSlug];
              const values = { ...filterState.active.values };
              if (next.length > 0) values[key] = next;
              else delete values[key];
              apply({ ...filterState.active, values });
            };
            return (
              <div role="group" aria-label="Beliebte Filter" className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="shrink-0 text-sm font-bold text-dark">Beliebt:</span>
                {quick.map(({ facet, value }) => (
                  <button
                    key={`${facet.key}-${value.slug}`}
                    type="button"
                    disabled={pending}
                    aria-pressed={value.selected}
                    onClick={() => toggle(facet.key, value.slug)}
                    className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors disabled:cursor-wait ${
                      value.selected ? 'border-[#d11820] bg-[#d11820] text-white' : 'border-ash bg-white text-dark hover:border-mid'
                    }`}
                  >
                    {value.label}
                  </button>
                ))}
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
            pager={(
              <ListingPager
                currentPage={currentPage}
                totalPages={totalPages}
                hrefFor={(page) => listingHref(pathname, page, sortBy, filterQuery)}
                onSelect={(page) => startTransition(() => router.push(listingHref(pathname, page, sortBy, filterQuery)))}
              />
            )}
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
        {shownProducts.length > 0 ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 ${showSidebar ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
            {shownProducts.map((product, index) => (
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
            {showPromoTile && shownProducts.length < PROMO_TILE_POSITION && <PromoTile />}
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
                className="inline-block bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Filter löschen
              </Link>
            ) : (
              <button
                onClick={reload}
                className="bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-bold transition-colors"
              >
                Aktualisieren
              </button>
            )}
          </div>
        )}

        {/* Weitere Produkte anhängen */}
        {totalPages > 1 && (() => {
          const perPage = showPromoTile ? PRODUCTS_PER_PAGE - 1 : PRODUCTS_PER_PAGE;
          const shownFrom = (firstShownPage - 1) * perPage;
          const shownTo = Math.min(totalProducts, shownFrom + shownProducts.length);
          const percent = totalProducts > 0 ? Math.round((shownTo / totalProducts) * 100) : 0;
          return (
            <div className="mx-auto mb-8 flex max-w-sm flex-col items-center gap-3 text-center">
              <p className="text-sm text-mid">
                {shownFrom > 0 ? `${shownFrom + 1}–${shownTo}` : shownTo} von {totalProducts} {totalProducts === 1 ? 'Produkt' : 'Produkten'}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ash" aria-hidden="true">
                <div className="h-full rounded-full bg-dark" style={{ width: `${percent}%` }} />
              </div>
              {currentPage < totalPages && (
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => {
                    appendNext.current = true;
                    startTransition(() => router.push(listingHref(pathname, currentPage + 1, sortBy, filterQuery), { scroll: false }));
                  }}
                  className="mt-1 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-dark px-6 text-sm font-bold text-white transition-colors hover:bg-[#d11820] disabled:cursor-wait disabled:opacity-70"
                >
                  {loadingMore ? 'Lädt …' : 'Weitere anzeigen'}
                </button>
              )}
            </div>
          );
        })()}

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
          const navClass = 'px-3 py-2 rounded-lg border border-ash bg-white text-mid transition-colors shrink-0';
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
                  className={`${navClass} hover:border-mid`}
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
                        : 'border-ash bg-white text-mid hover:border-mid'
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
                  className={`${navClass} hover:border-mid`}
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
          <section id="category-full-description" className="mt-12 rounded-2xl bg-white p-5 md:p-10 lg:p-12">
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
