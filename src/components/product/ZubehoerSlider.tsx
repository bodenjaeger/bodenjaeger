'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [addedProductId, setAddedProductId] = useState<number | null>(null);

  const { addToCart, openCartDrawer, cartItems } = useCart();

  // Mobil: Akkordeon, standardmäßig zu. Öffnet sich, sobald ein neues Set mit diesem Boden
  // im Warenkorb landet – TotalPrice scrollt danach zu #zubehoer-section (unverändert).
  const [mobilOffen, setMobilOffen] = useState(false);
  const setAnzahl = cartItems.filter(
    (item) => item.isSetItem && item.setItemType === 'floor' && item.id === product?.id
  ).length;
  const vorherigeSetAnzahl = useRef<number | null>(null);
  useEffect(() => {
    if (vorherigeSetAnzahl.current !== null && setAnzahl > vorherigeSetAnzahl.current) {
      setMobilOffen(true);
    }
    vorherigeSetAnzahl.current = setAnzahl;
  }, [setAnzahl]);

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

  // Tab-Leiste: prüfen, ob rechts noch Tabs verdeckt sind (für den Verlauf)
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsMehrRechts, setTabsMehrRechts] = useState(false);
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const pruefen = () => setTabsMehrRechts(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    pruefen();
    el.addEventListener('scroll', pruefen);
    window.addEventListener('resize', pruefen);
    return () => {
      el.removeEventListener('scroll', pruefen);
      window.removeEventListener('resize', pruefen);
    };
  }, [availableCategories.length, mobilOffen]);

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

    // Visuelles Feedback
    setAddedProductId(product.id);
    setTimeout(() => {
      setAddedProductId(null);
    }, 2000);
  };

  // Wenn keine Kategorien mit Produkten vorhanden sind, nichts anzeigen
  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <section className="bg-white lg:bg-pale lg:rounded-xl lg:border lg:border-ash">
      {/* Mobil: Akkordeon-Kopf */}
      <button
        type="button"
        onClick={() => setMobilOffen(!mobilOffen)}
        aria-expanded={mobilOffen}
        className="lg:hidden w-full flex items-center justify-between py-4 border-b border-ash text-left"
      >
        <span className="text-base font-bold text-dark">Passendes Zubehör</span>
        <svg className={`w-5 h-5 text-dark transition-transform ${mobilOffen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className={`${mobilOffen ? '' : 'hidden'} lg:block py-4 lg:p-6`}>
        {/* Überschrift + Infotexte */}
        <h2 className="hidden lg:block text-xl font-bold text-dark mb-1">
          Passendes Zubehör
        </h2>
        <p className="text-sm text-gray-700">
          Hier findest du unsere Vorauswahl der passenden Zubehörprodukte zu deiner obigen Produktauswahl.{' '}
          <span className="text-gray-600">Die Anzahl der Produkte kannst du ganz einfach im Warenkorb anpassen.</span>
        </p>

        <div className="min-w-0 mt-4">
          {/* Kategorie-Navigation als Tab-Leiste */}
          {availableCategories.length > 0 && (
            <div className="relative mb-5">
            <div ref={tabsRef} className="overflow-x-auto scrollbar-hide border-b border-ash">
              <div className="flex gap-1 min-w-min" role="tablist">
                {availableCategories.map((category) => (
                  <button
                    key={category.metaKey}
                    role="tab"
                    aria-selected={activeCategory === category.metaKey}
                    onClick={() => setActiveCategory(category.metaKey)}
                    className={`px-3 py-2.5 -mb-px border-b-2 text-xs sm:text-sm whitespace-nowrap transition-colors ${
                      activeCategory === category.metaKey
                        ? 'border-brand font-semibold text-dark'
                        : 'border-transparent text-mid hover:text-dark'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Scroll-Hinweis: Verlauf rechts, solange weitere Tabs verdeckt sind */}
            {tabsMehrRechts && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-0 bottom-px w-12 bg-gradient-to-l from-white lg:from-pale to-transparent"
              />
            )}
            </div>
          )}

          {/* Produkt-Slider */}
          {/* md:px-14: Pfeile (w-10) liegen im Randbereich, nicht über den Karten */}
          <div className="relative px-0 md:px-14">
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
                        className="flex-shrink-0 w-[calc(25%-12px)] min-w-[160px] snap-start"
                      >
                        <article className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col relative">
                          <div className="flex flex-col h-full">
                            {/* Produktbild - Klickbar zum Produkt */}
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
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {price.toFixed(2).replace('.', ',')}€
                                </div>
                                <div className="text-xs text-gray-500">
                                  pro {unit}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Warenkorb Button (absolute) */}
                          <button
                            onClick={(e) => handleAddToCart(product, e)}
                            className={`absolute bottom-3 left-3 w-10 h-10 rounded-full text-white flex items-center justify-center transition-all shadow-lg z-10 ${
                              addedProductId === product.id
                                ? 'bg-green-600 scale-110'
                                : 'bg-black hover:bg-gray-800'
                            }`}
                            aria-label="In den Warenkorb"
                          >
                            {addedProductId === product.id ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            )}
                          </button>
                        </article>
                      </div>
                    );
                  })}
                </div>

                {/* Scroll Left Button */}
                <button
                  onClick={scrollLeft}
                  className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg hover:shadow-xl items-center justify-center transition-all z-10 ${
                    canScrollLeft
                      ? 'bg-dark text-white cursor-pointer'
                      : 'bg-dark/40 text-white/60 cursor-not-allowed'
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
                  className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg hover:shadow-xl items-center justify-center transition-all z-10 ${
                    canScrollRight
                      ? 'bg-dark text-white cursor-pointer'
                      : 'bg-dark/40 text-white/60 cursor-not-allowed'
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

          <div className="flex justify-end mt-2">
            <button
              onClick={openCartDrawer}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-dark text-white text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Weiter zum Warenkorb
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
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
