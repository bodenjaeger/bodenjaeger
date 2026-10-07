'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { shimmerBlurDataURL } from '@/lib/imageUtils';
import { SliderPreis, SliderSaleBadge } from './SliderKartePreis';

interface SaleProductSliderProps {
  products: StoreApiProduct[];
  title?: string;
  subtitle?: string;
}

/**
 * Sale-Produktslider für die Startseite
 *
 * Features:
 * - Horizontaler Scroll mit Prev/Next Buttons
 * - Smooth Scroll Animation
 * - Responsive: Zeigt 1-4 Produkte je nach Viewport
 * - Verwendet StandardProductCard Komponente
 * - Auto-hide Buttons wenn am Anfang/Ende
 */
export default function SaleProductSlider({
  products,
  title = 'Böden im Sale',
  subtitle,
}: SaleProductSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Prüfe Scroll-Position
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10); // 10px Toleranz
  };

  // Scroll nach links
  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8; // Scrolle 80% der sichtbaren Breite

    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth',
    });
  };

  // Scroll nach rechts
  const scrollRight = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  };

  // Check scroll position on mount and scroll
  useEffect(() => {
    checkScrollPosition();

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, []);

  // Wenn keine Produkte vorhanden
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50 overflow-hidden">
      <div className="content-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
            {subtitle && <p className="text-gray-600">{subtitle}</p>}
          </div>

          {/* Navigation Buttons (Desktop) */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                canScrollLeft
                  ? 'bg-white shadow-md hover:shadow-lg text-gray-900'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Vorherige Produkte"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={scrollRight}
              disabled={!canScrollRight}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                canScrollRight
                  ? 'bg-white shadow-md hover:shadow-lg text-gray-900'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              aria-label="Nächste Produkte"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Slider Container */}
        <div className="relative">
          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 sm:gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4 px-4 -mx-4 sm:px-0 sm:mx-0"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-[calc(100%-2rem)] sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.125rem)]"
              >
                {/* Sale Product Card */}
                <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                  <Link href={`/products/${product.slug}`}>
                    {/* Bildbereich */}
                    <div className="relative aspect-[4/3] bg-gray-200">
                      {product.images?.length > 0 ? (
                        <Image
                          src={product.images[0]?.src}
                          alt={product.images[0]?.alt || product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          priority={false}
                          loading="lazy"
                          quality={80}
                          placeholder="blur"
                          blurDataURL={shimmerBlurDataURL(400, 300)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <span className="text-gray-400 text-sm">Kein Bild verfügbar</span>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                        {/* Sale Badge */}
                        {product.on_sale && (
                          <SliderSaleBadge
                            product={product}
                            backendProzent={product.setangebot_ersparnis_prozent || product.discount_percent || 0}
                          />
                        )}

                        {/* Aktion Badge */}
                        {product.show_aktion && product.aktion && (
                          <div className="bg-dark text-white px-3 py-1 rounded font-medium text-sm shadow-md">
                            {product.aktion}
                          </div>
                        )}

                        {/* Angebotspreis Hinweis Badge */}
                        {product.show_angebotspreis_hinweis && product.angebotspreis_hinweis && (
                          <div className="bg-black text-white px-3 py-1 rounded font-bold text-sm shadow-md">
                            {product.angebotspreis_hinweis}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Produktinfo-Bereich */}
                    <div className="bg-gray-100 p-4">
                      {/* Produktname */}
                      <h3 className="text-gray-900 font-medium text-base mb-3 line-clamp-2 min-h-[3rem]">
                        {product.name}
                      </h3>

                      {/* Trennlinie */}
                      <div className="h-[1px] bg-dark mx-8 mb-3" />

                      {/* Preisanzeige */}
                      <SliderPreis product={product} />
                    </div>
                  </Link>
                </article>
              </div>
            ))}
          </div>

          {/* Gradient Overlays (Desktop only) */}
          {canScrollLeft && (
            <div className="hidden md:block absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none" />
          )}
          {canScrollRight && (
            <div className="hidden md:block absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
          )}
        </div>

        {/* Mobile Navigation Indicators */}
        <div className="flex md:hidden justify-center gap-2 mt-6">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              canScrollLeft
                ? 'bg-gray-900 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            ← Zurück
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              canScrollRight
                ? 'bg-gray-900 text-white'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            Weiter →
          </button>
        </div>

        {/* Alle Angebote Button */}
        <div className="flex justify-center mt-8">
          <a
            href="/sale"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
          >
            Alle Sale-Angebote ansehen
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* Hide scrollbar with CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
