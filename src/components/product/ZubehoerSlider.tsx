'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/cart-utils';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { useCart } from '@/contexts/CartContext';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import { shimmerBlurDataURL } from '@/lib/imageUtils';

interface ZubehoerCategory {
  name: string;
  metaKey: string; // Meta-Key für die Produkt-IDs (z.B. '_option_products_werkzeug')
}

interface ZubehoerSliderProps {
  product?: StoreApiProduct; // Hauptprodukt für Meta-Keys
  selectedSockelleiste?: StoreApiProduct | null; // Ausgewählte Sockelleiste aus Set-Angebot
  categories?: ZubehoerCategory[];
}

// Standard Kategorien (basierend auf Meta-Keys aus BACKEND-FELDER-DOKUMENTATION.md)
// ✅ Backend liefert jetzt Root-Level Felder: option_products_*
const DEFAULT_CATEGORIES: ZubehoerCategory[] = [
  { name: 'Zubehör für Sockelleisten', metaKey: 'option_products_zubehoer_fuer_sockelleisten' },
  { name: 'Werkzeug', metaKey: 'option_products_werkzeug' },
  { name: 'Kleber', metaKey: 'option_products_kleber' },
  { name: 'Montagekleber & Silikon', metaKey: 'option_products_montagekleber_silikon' },
  { name: 'Untergrundvorbereitung', metaKey: 'option_products_untergrundvorbereitung' },
  { name: 'Schienen & Profile', metaKey: 'option_products_schienen_profile' },
  { name: 'Reinigung & Pflege', metaKey: 'option_products_reinigung_pflege' },
];

/**
 * Zubehör-Slider Komponente für Produktdetailseiten
 *
 * Features:
 * - Linke Seite: Feste Info-Sektion mit "Weiter zum Warenkorb" Button
 * - Rechte Seite: Kategorie-Navigation + horizontaler Produkt-Slider
 * - WooCommerce API Integration
 * - CartContext Integration für "In den Warenkorb" Button
 * - Responsive Design (Desktop/Mobile)
 */
export default function ZubehoerSlider({
  product,
  selectedSockelleiste,
  categories = DEFAULT_CATEGORIES
}: ZubehoerSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<StoreApiProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { addToCart, cartItems, openCartDrawer, setSingleItemQuantity } = useCart();

  // Hilfsfunktion: Für "Zubehör für Sockelleisten" die ausgewählte Sockelleiste nutzen,
  // für alle anderen Kategorien das Hauptprodukt
  const getSourceProduct = (metaKey: string): StoreApiProduct | undefined | null => {
    if (metaKey === 'option_products_zubehoer_fuer_sockelleisten' && selectedSockelleiste) {
      return selectedSockelleiste;
    }
    return product;
  };

  // Filtere Kategorien: Nur die anzeigen, die Produkt-IDs haben
  const availableCategories = categories.filter((category) => {
    const source = getSourceProduct(category.metaKey);
    const productIdsString = source?.[category.metaKey as keyof typeof source];
    return productIdsString && typeof productIdsString === 'string' && productIdsString.trim().length > 0;
  });

  const [activeCategory, setActiveCategory] = useState<string>('');

  // Setze die erste verfügbare Kategorie als aktiv, wenn noch keine ausgewählt ist
  useEffect(() => {
    if (!activeCategory && availableCategories.length > 0) {
      setActiveCategory(availableCategories[0].metaKey);
    }
  }, [availableCategories, activeCategory]);

  // Produkte für aktive Kategorie laden (aus Meta-Keys)
  useEffect(() => {
    const loadProducts = async () => {
      if (!activeCategory || !product) return;

      const source = getSourceProduct(activeCategory);
      if (!source) return;

      setLoading(true);
      setError(null);

      try {
        // 1. Produkt-IDs aus dem richtigen Quell-Produkt auslesen
        const productIdsString = source[activeCategory as keyof typeof source];

        if (!productIdsString || typeof productIdsString !== 'string') {
          console.warn(`⚠️ No product IDs found for key: ${activeCategory}`);
          console.log(`💡 Product keys:`, Object.keys(product || {}));
          setProducts([]);
          setLoading(false);
          return;
        }

        console.log(`✅ Found product IDs string: ${productIdsString}`);

        // 2. Komma-getrennte IDs parsen
        const productIds = productIdsString
          .split(',')
          .map((id: string) => parseInt(id.trim()))
          .filter((id: number) => !isNaN(id) && id > 0);

        if (productIds.length === 0) {
          console.warn(`⚠️ No valid product IDs after parsing: ${productIdsString}`);
          setProducts([]);
          setLoading(false);
          return;
        }

        console.log(`📋 Parsed ${productIds.length} product IDs:`, productIds);

        // 3. Produkte über API-Route laden (server-side)
        const response = await fetch('/api/products/by-ids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: productIds }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const loadedProducts: StoreApiProduct[] = await response.json();

        console.log(`✅ Loaded ${loadedProducts.length} products via API`);
        setProducts(loadedProducts);
      } catch (err) {
        console.error('❌ Error loading accessory products:', err);
        setError('Fehler beim Laden der Produkte');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [activeCategory, product, selectedSockelleiste]);

  // Scroll-Position prüfen
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    // Kurz warten bis DOM gerendert ist, dann Scroll-Position prüfen
    const timer = setTimeout(checkScrollPosition, 100);
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [products]);

  // Scroll nach links
  const scrollLeft = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 240;
    container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  };

  // Scroll nach rechts
  const scrollRight = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = 240;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // In den Warenkorb
  const handleAddToCart = (product: StoreApiProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('🛒 Adding product to cart:', product.name, product.id);
    addToCart(product, 1);

    // GA4 add_to_cart — Cross-Selling-Karussell, Standard-Single-Item-Logik
    const paketinhalt = product.paketinhalt || 1;
    const paketpreis = (Number(product.price) || 0) * paketinhalt;
    const ga4Item = mapProductToItem(product, 1, {
      pricePerUnitOverride: paketpreis,
    });
    track.addToCart([ga4Item], paketpreis);
  };

  // Wenn keine Kategorien mit Produkten vorhanden sind, nichts anzeigen
  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-ash bg-white px-4 lg:p-5">
      {/* Mobil: Akkordeon wie die übrigen Abschnitte */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        className="flex min-h-14 w-full items-center justify-between text-left text-base font-bold text-dark lg:hidden"
      >
        Passendes Zubehör
        <svg className={`h-5 w-5 transition-transform ${mobileOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className={`${mobileOpen ? 'block' : 'hidden'} pb-6 lg:block lg:pb-0`}>
        <div>
          <h2 className="mb-3 hidden text-lg lg:block">
            <span className="font-bold text-dark">Passendes Zubehör</span>
            <span className="font-normal text-mid"> – Für ein perfektes Ergebnis</span>
          </h2>

          {/* Kategorie-Navigation */}
          <div className="mb-4 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-pale p-1 scrollbar-hide">
            {availableCategories.map((category) => (
              <button
                key={category.metaKey}
                onClick={() => setActiveCategory(category.metaKey)}
                aria-pressed={activeCategory === category.metaKey}
                className={`flex-shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeCategory === category.metaKey
                    ? 'bg-white font-bold text-dark shadow-sm ring-1 ring-ash'
                    : 'text-mid hover:text-dark'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Produkt-Slider */}
          <div className="relative px-0 md:px-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12 text-red-600">
                {error}
              </div>
            )}

            {/* Products */}
            {!loading && !error && products.length > 0 && (
              <>
                <div
                  ref={scrollContainerRef}
                  className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 snap-x snap-mandatory"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                >
                  {products.map((product) => {
                    const price = product.prices?.price
                      ? parseFloat(product.prices.price) / 100
                      : (product.price || 0);  // ✅ Backend liefert bereits Euro, nicht Cent!
                    const rawUnit = product.einheit_short || 'Stk.';
                    const showUnit = rawUnit !== '-' && rawUnit.trim() !== '';
                    const unit = showUnit ? rawUnit : (product.verpackungsart_short || 'Stk.');

                    return (
                      <div
                        key={product.id}
                        className="flex-shrink-0 w-[calc(25%-12px)] min-w-[150px] snap-start"
                      >
                        <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col relative">
                          <div className="flex flex-col h-full">
                            {/* Produktbild - Klickbar zum Produkt */}
                            <div className="relative">
                            <Link href={`/products/${product.slug}`} className="relative aspect-square bg-gray-100 block overflow-hidden">
                              {product.images.length > 0 ? (
                                <Image
                                  src={product.images[0]?.src}
                                  alt={product.images[0]?.alt || product.name}
                                  fill
                                  sizes="(max-width: 768px) 220px, 220px"
                                  className="object-cover"
                                  loading="lazy"
                                  quality={100}
                                  placeholder="blur"
                                  blurDataURL={shimmerBlurDataURL(220, 220)}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">Kein Bild</span>
                                </div>
                              )}
                            </Link>

                            {/* + auf dem Bild, klappt im Warenkorb zu − Menge + auf */}
                            {(() => {
                              const menge = cartItems.find((item) => item.id === product.id && !item.isSetItem && !item.isSample)?.quantity ?? 0;
                              return (
                                <div className={`absolute bottom-2 right-2 flex h-10 items-center justify-end overflow-hidden rounded-lg border border-ash bg-white shadow-sm transition-[width] duration-200 ${menge > 0 ? 'w-[calc(100%-1rem)]' : 'w-10'}`}>
                                  {menge > 0 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setSingleItemQuantity(product.id, menge - 1)}
                                        aria-label={`${product.name}: eins weniger`}
                                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-xl font-bold text-dark"
                                      >
                                        −
                                      </button>
                                      <span aria-live="polite" className="min-w-0 flex-1 text-center text-sm font-bold text-dark">{menge}</span>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleAddToCart(product, e)}
                                    aria-label={`${product.name}: in den Warenkorb`}
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-xl font-bold text-dark"
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            })()}
                            </div>

                            {/* Produktinfo */}
                            <div className="p-3 flex-1 flex flex-col">
                              {/* Produktname - Klickbar zum Produkt */}
                              <Link href={`/products/${product.slug}`}>
                                <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] hover:text-red-600 transition-colors">
                                  {product.name}
                                </h3>
                              </Link>

                              {/* Kurzbeschreibung als Aufzählung */}
                              {product.short_description && (
                                <ul className="text-xs text-gray-600 mb-3 flex-1 space-y-1">
                                  {product.short_description
                                    .replace(/<[^>]*>/g, '')
                                    .split(/\n|<br\s*\/?>/)
                                    .map(line => line.trim())
                                    .filter(line => line.length > 0)
                                    .slice(0, 3)
                                    .map((line, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-gray-400 mt-0.5">•</span>
                                        <span>{line}</span>
                                      </li>
                                    ))}
                                </ul>
                              )}

                              {/* Preis */}
                              <div className="mt-auto text-right">
                                <div className="whitespace-nowrap text-lg font-bold leading-tight text-dark sm:text-xl">
                                  {formatPrice(price)} €
                                </div>
                                <div className="truncate text-xs text-mid">pro {unit}</div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>

                {/* Scroll Left Button */}
                <button
                  onClick={scrollLeft}
                  className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg hover:shadow-xl items-center justify-center transition-all z-10 ${
                    canScrollLeft
                      ? 'bg-dark text-white cursor-pointer'
                      : 'bg-dark/50 text-white/60 cursor-not-allowed'
                  }`}
                  disabled={!canScrollLeft}
                  aria-label="Zurück"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Scroll Right Button */}
                <button
                  onClick={scrollRight}
                  className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full shadow-lg hover:shadow-xl items-center justify-center transition-all z-10 ${
                    canScrollRight
                      ? 'bg-dark text-white cursor-pointer'
                      : 'bg-dark/50 text-white/60 cursor-not-allowed'
                  }`}
                  disabled={!canScrollRight}
                  aria-label="Weitere Produkte"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* No Products */}
            {!loading && !error && products.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Keine Produkte in dieser Kategorie gefunden.
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="mt-3 flex justify-start pb-4 lg:justify-end lg:pb-0">
              <button
                type="button"
                onClick={openCartDrawer}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-dark px-5 text-sm font-bold text-white transition-colors hover:bg-[#1a1a1d]"
              >
                Weiter zum Warenkorb
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
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
