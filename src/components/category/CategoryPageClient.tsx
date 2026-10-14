'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { type StoreApiProduct } from '@/lib/woocommerce';
import Image from 'next/image';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { SORT_OPTIONS, listingHref } from '@/lib/category-listing';

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
}

export default function CategoryPageClient({
  categoryName,
  categoryDescription,
  categoryImage,
  products,
  totalProducts,
  totalPages,
  currentPage,
  sortBy,
  error,
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
          {/* Category Image & Description - Two Column Layout */}
          {(categoryImage || categoryDescription) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left: Category Image */}
              {categoryImage && categoryImage.src && (
                <div className="relative aspect-video bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={categoryImage.src}
                    alt={categoryImage.alt || categoryName}
                    fill
                    className="object-cover"
                    priority
                    quality={85}
                  />
                </div>
              )}

              {/* Right: Category Name & Description */}
              {categoryDescription && (
                <div className="bg-gray-100 rounded-md p-6 flex flex-col">
                  {/* Category Name as Heading */}
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{categoryName}</h1>

                  {/* Category Description */}
                  <div className="text-gray-900 text-base md:text-lg leading-relaxed md:leading-loose flex-grow">
                    {(() => {
                      // Remove HTML tags and get first 200 characters (mobile) or 400 (desktop)
                      const plainText = categoryDescription
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .trim();

                      // Mobile: 200 chars, Desktop: 400 chars (we show both, CSS handles display)
                      const mobilePreview = plainText.length > 200
                        ? plainText.substring(0, 200) + '...'
                        : plainText;

                      const desktopPreview = plainText.length > 400
                        ? plainText.substring(0, 400) + '...'
                        : plainText;

                      return (
                        <>
                          <span className="md:hidden">{mobilePreview}</span>
                          <span className="hidden md:inline">{desktopPreview}</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Weiterlesen Link */}
                  {categoryDescription.replace(/<[^>]+>/g, '').trim().length > 200 && (
                    <a
                      href="#category-full-description"
                      className="text-gray-900 font-medium mt-4 inline-block hover:underline"
                    >
                      Weiterlesen →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-600 mb-4 sm:mb-0">
              {totalProducts} {totalProducts === 1 ? 'Produkt' : 'Produkte'} gefunden
              {totalPages > 1 && ` (Seite ${currentPage} von ${totalPages})`}
            </p>

            {/* Sorting Options */}
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => {
                  // Sortierwechsel startet wieder auf Seite 1
                  const href = listingHref(pathname, 1, e.target.value);
                  startTransition(() => router.push(href, { scroll: false }));
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {/* Erste Option = DEFAULT_SORT, damit das Dropdown beim
                    Seitenaufruf den tatsächlich sortierten Zustand zeigt. */}
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {products.map((product) => (
              <UnifiedProductCard
                key={product.id}
                product={product}
                daemmungProduct={product.daemmung_id ? (addonProductsMap.get(product.daemmung_id) ?? null) : null}
                sockelleisteProduct={product.sockelleisten_id ? (addonProductsMap.get(product.sockelleisten_id) ?? null) : null}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">Keine Produkte gefunden</h3>
            <p className="text-gray-600 mb-6">
              In der Kategorie &ldquo;{categoryName}&rdquo; sind derzeit keine Produkte verfügbar.
            </p>
            <button
              onClick={reload}
              className="bg-brand hover:bg-[#d11820] text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Aktualisieren
            </button>
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
                  href={listingHref(pathname, currentPage - 1, sortBy)}
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
                    href={listingHref(pathname, page, sortBy)}
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
                  href={listingHref(pathname, currentPage + 1, sortBy)}
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

        {/* Full Category Description at bottom */}
        {categoryDescription && categoryDescription.replace(/<[^>]+>/g, '').trim().length > 200 && (
          <div id="category-full-description" className="mt-16 bg-gray-100 rounded-md p-8">
            <h2 className="text-2xl font-bold text-dark mb-6">
              Über {categoryName}
            </h2>
            <div
              className="text-dark prose prose-lg max-w-none
                [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-dark [&_h3]:mt-6 [&_h3]:mb-4
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-dark [&_h2]:mt-8 [&_h2]:mb-4
                [&_p]:text-dark [&_p]:leading-relaxed [&_p]:mb-6
                [&_ul]:text-dark [&_ul]:mb-4 [&_ul]:space-y-2
                [&_ol]:text-dark [&_ol]:mb-4 [&_ol]:space-y-2
                [&_li]:text-dark [&_li]:leading-relaxed
                [&_strong]:text-dark [&_strong]:font-semibold
                [&_em]:text-dark
                [&_br]:block [&_br]:my-4
                whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: categoryDescription }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
