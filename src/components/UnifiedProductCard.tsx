'use client';

import { useEffect, useState, useMemo } from 'react';
import { Check, Heart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAlert } from '@/hooks/useAlert';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import {
  SAMPLE_SHIPPING_SURCHARGE,
  findSampleProduct,
  isMusterProduct,
  sampleSlugsFor,
} from '@/lib/sampleUtils';
import { useSparpaketStreichpreisProM2, sparpaketRabattProzent } from '@/hooks/useSparpaketStreichpreisProM2';
import { usePromoActive } from '@/contexts/PromoContext';
import { PROMO_RED, isPromoProduct } from '@/lib/black-weeks';
import { klickVinylName } from '@/lib/klick-vinyl';

interface UnifiedProductCardProps {
  product: StoreApiProduct;
  daemmungProduct?: StoreApiProduct | null;
  sockelleisteProduct?: StoreApiProduct | null;
}

/**
 * Einheitliche Produktkarte für alle Übersichten
 * Basiert auf CategoryPageClient Design
 */
export default function UnifiedProductCard({ product, sockelleisteProduct }: UnifiedProductCardProps) {
  const [isOrderingSample, setIsOrderingSample] = useState(false);
  const { addSampleToCart, getFreeSamplesRemaining, cartItems, openCartDrawer } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showError } = useAlert();

  // Klebe-Vinyl: Streichpreis = Boden + Standard-Sockelleiste + Bauchemie (wie Produktseite in Grundeinstellung)
  const sparpaketStreichpreisProM2 = useSparpaketStreichpreisProM2(product, sockelleisteProduct);

  const wishlisted = isInWishlist(product.id);
  const sampleSlugs = sampleSlugsFor(product.slug);
  const sampleInCart = mounted && cartItems.some((item) => item.isSample && sampleSlugs.includes(item.product.slug));
  const freeSamplesRemaining = mounted ? getFreeSamplesRemaining() : 1;
  const setInhalt = product.show_setangebot
    ? [product.daemmung_id ? 'Dämmung' : null, product.sockelleisten_id ? 'Sockelleiste' : null].filter(Boolean).join(' & ')
    : '';

  // Black-Weeks-Label: nur während der Aktion und für Produkte der Aktionskategorie
  const showPromoLabel = usePromoActive() && isPromoProduct(product);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  // Check if product is a floor product (only floors have samples)
  const isFloorProduct = useMemo(() => {
    if (!product.categories || !Array.isArray(product.categories)) return false;

    const floorCategories = ['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'laminat', 'parkett'];
    return product.categories.some(cat =>
      floorCategories.includes(cat.slug.toLowerCase())
    );
  }, [product.categories]);

  // Handle sample order - find and add MUSTER product to cart
  const handleOrderSample = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to product page
    e.stopPropagation();

    if (isOrderingSample) return; // Prevent double-clicks

    setIsOrderingSample(true);

    try {
      const sampleProduct = await findSampleProduct<StoreApiProduct>(product.slug);

      if (!sampleProduct) {
        showError(
          `Leider gibt es für "${product.name}" derzeit kein Muster.\n\nBitte kontaktieren Sie uns für weitere Informationen oder schauen Sie sich ähnliche Produkte an.`,
          'Muster nicht verfügbar'
        );
        return;
      }

      const result = addSampleToCart(sampleProduct);
      if (result.status === 'duplicate') return;

      const sampleItem = mapProductToItem(sampleProduct, 1, {
        variant: 'Muster',
        category: 'Muster',
        pricePerUnitOverride: 0,
      });
      track.addToCart([sampleItem], 0);
    } catch (error) {
      console.error('Error ordering sample:', error);
      showError(
        'Fehler beim Hinzufügen des Musters. Bitte versuchen Sie es erneut.',
        'Fehler'
      );
    } finally {
      setIsOrderingSample(false);
    }
  };
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white transition-shadow duration-300 hover:shadow-lg">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        {/* Bildbereich */}
        <div className="relative aspect-[4/3] bg-white">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]?.src || ''}
              alt={klickVinylName(product.images[0]?.alt || product.name)}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              loading="lazy"
              quality={80}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-sm">Kein Bild</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {/* Aktion und Prozent in einem Label; andere Böden zeigen nur den Streichpreis. */}
            {showPromoLabel && (() => {
              const percent = product.on_sale
                ? sparpaketRabattProzent(
                    sparpaketStreichpreisProM2,
                    product.price || 0,
                    product.setangebot_ersparnis_prozent || product.discount_percent || 0
                  )
                : 0;
              return (
                <div
                  className="w-fit whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: '#140809', border: `1px solid ${PROMO_RED}` }}
                >
                  Black Weeks{percent > 0 ? ` -${Math.round(percent)} %` : ''}
                </div>
              );
            })()}

            {/* Aktion Badge — Stil aus Backend, Jäger-Farben */}
            {product.show_aktion && product.aktion && (
              <div
                className="rounded font-bold shadow-md w-fit"
                style={{
                  fontSize: '12px',
                  padding: '3% 10%',
                  whiteSpace: 'nowrap' as const,
                  backgroundColor: {
                    'aktion-bg-black': '#2e2d32',
                    'aktion-bg-red': '#ed1b24',
                    'aktion-bg-blue': '#5095cb',
                    'aktion-bg-navy': '#1e40af',
                    'aktion-bg-green': '#28a745',
                    'aktion-bg-yellow': '#fff201',
                    'aktion-bg-gray': '#4c4c4c',
                  }[product.aktion_button_style || ''] || '#2e2d32',
                  color: product.aktion_text_color
                    ? {
                        'aktion-text-red': '#ed1b24',
                        'aktion-text-blue': '#5095cb',
                        'aktion-text-green': '#28a745',
                        'aktion-text-yellow': '#fff201',
                        'aktion-text-white': '#FFFFFF',
                        'aktion-text-black': '#2e2d32',
                      }[product.aktion_text_color] || '#FFFFFF'
                    : product.aktion_button_style === 'aktion-bg-yellow' ? '#2e2d32' : '#FFFFFF',
                }}
              >
                {product.aktion}
              </div>
            )}

            {/* Angebotspreis Hinweis Badge — Stil aus Backend, Jäger-Farben */}
            {product.show_angebotspreis_hinweis && product.angebotspreis_hinweis && (
              <div
                className="rounded font-bold shadow-md w-fit"
                style={{
                  fontSize: '12px',
                  padding: '3% 10%',
                  whiteSpace: 'nowrap' as const,
                  backgroundColor: {
                    'aktion-bg-black': '#2e2d32',
                    'aktion-bg-red': '#ed1b24',
                    'aktion-bg-blue': '#5095cb',
                    'aktion-bg-navy': '#1e40af',
                    'aktion-bg-green': '#28a745',
                    'aktion-bg-yellow': '#fff201',
                    'aktion-bg-gray': '#4c4c4c',
                  }[product.angebotspreis_button_style || ''] || '#2e2d32',
                  color: product.angebotspreis_text_color
                    ? {
                        'aktion-text-red': '#ed1b24',
                        'aktion-text-blue': '#5095cb',
                        'aktion-text-green': '#28a745',
                        'aktion-text-yellow': '#fff201',
                        'aktion-text-white': '#FFFFFF',
                        'aktion-text-black': '#2e2d32',
                      }[product.angebotspreis_text_color] || '#FFFFFF'
                    : product.angebotspreis_button_style === 'aktion-bg-yellow' ? '#2e2d32' : '#FFFFFF',
                }}
              >
                {product.angebotspreis_hinweis}
              </div>
            )}
          </div>

        {isFloorProduct && (
          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={
              wishlisted
                ? `${klickVinylName(product.name)} von der Merkliste entfernen`
                : `${klickVinylName(product.name)} auf die Merkliste setzen`
            }
            className="absolute right-3 top-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-dark shadow-md transition-colors hover:text-[#d11820] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <Heart className={`h-5 w-5 ${wishlisted ? 'fill-[#d11820] text-[#d11820]' : ''}`} aria-hidden="true" />
          </button>
        )}
        </div>

        {/* Produktinfo-Bereich */}
        <div className="flex flex-1 flex-col p-4">
          {/* Produktname */}
          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-dark">
            {klickVinylName(product.name)}
          </h3>

          {/* Produktbeschreibung als Liste mit Haken — gleiche Logik wie ProductInfo.tsx */}
          {(() => {
            // Gleiche Extraktion wie auf der Produktseite: <li>-Tags aus short_description
            let features: string[] = [];

            if (product.short_description) {
              // Strategy 1: Extract from <li> tags
              const matches = product.short_description.match(/<li>(.*?)<\/li>/g);
              if (matches) {
                features = matches.map(match => match.replace(/<\/?li>/g, '').trim()).slice(0, 3);
              }

              // Strategy 2: Bullet points as plain text (• or -)
              if (features.length === 0) {
                const lines = product.short_description
                  .replace(/<[^>]*>/g, '') // Strip HTML tags
                  .split(/\n|<br\s*\/?>/)
                  .map(line => line.replace(/^[\s•\-–]+/, '').trim())
                  .filter(line => line.length > 0);
                if (lines.length > 0) {
                  features = lines.slice(0, 3);
                }
              }
            }

            // Fallback: Root-Level-Felder (identisch mit ProductInfo.tsx)
            if (features.length === 0) {
              if (product.text_produktuebersicht && product.show_text_produktuebersicht) {
                features.push(product.text_produktuebersicht);
              }
              if (product.lieferzeit && product.show_lieferzeit) {
                features.push(product.lieferzeit);
              }
              if (product.paketinhalt) {
                features.push(`Paketinhalt: ${product.paketinhalt} ${product.einheit_short || 'm²'}`);
              }
            }

            if (features.length === 0) return null;

            return (
              <ul className="mb-3 space-y-1">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start text-xs text-gray-700">
                    <Image
                      src="/images/Icons/haken-rot.png"
                      alt="Check"
                      width={14}
                      height={14}
                      className="mr-1.5 flex-shrink-0 mt-0.5"
                    />
                    <span className="line-clamp-1">{feature}</span>
                  </li>
                ))}
              </ul>
            );
          })()}

          {/* Trennlinie */}
          <div className="mt-auto mb-3 h-px bg-gray-200" />

          {/* Preisanzeige */}
          {(() => {
            // Muster sind immer kostenlos — Backend-Preis (Platzhalter) überschreiben.
            if (isMusterProduct(product)) {
              return (
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">Muster</span>
                  <span className="font-bold text-xl text-success">Kostenlos</span>
                </div>
              );
            }

            const unit = product.einheit_short || 'm²';
            const showUnit = unit !== '-' && unit.trim() !== '';

            // Preise direkt aus Backend-Feldern
            const displayPrice = product.price || 0;

            // Streichpreis: Bei Set-Produkten = setangebot_einzelpreis (Vergleichspreis inkl. Zusatzprodukte)
            const isSetProduct = product.show_setangebot && product.setangebot_einzelpreis;
            const stattPrice = isSetProduct
              ? (sparpaketStreichpreisProM2 ?? (product.setangebot_einzelpreis || 0))
              : (product.regular_price || product.price || 0);
            const hasDiscount = stattPrice > displayPrice;

            return (
              <div className="space-y-1">
                {/* Streichpreis: Vergleichspreis inkl. Zusatzprodukte (Set) oder WooCommerce Regulärpreis */}
                {hasDiscount && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Statt</span>
                    <span className="text-gray-500 line-through">
                      {stattPrice.toFixed(2).replace('.', ',')} {showUnit ? `€/${unit}` : '€'}
                    </span>
                  </div>
                )}

                {/* Hauptpreis */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 font-medium">{isSetProduct && isFloorProduct ? 'Set-Preis' : 'Preis'}</span>
                  <span className={`font-bold text-xl ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
                    {displayPrice.toFixed(2).replace('.', ',')} {showUnit ? `€/${unit}` : '€'}
                  </span>
                </div>
                {setInhalt && isSetProduct && isFloorProduct && (
                  <p className="text-xs text-gray-700">Set inkl. {setInhalt}</p>
                )}
              </div>
            );
          })()}
        </div>
      </Link>
      {isFloorProduct && (
        <div className="px-4 pb-4">
          {/* Gleicher Button wie auf der Produktseite. Kein Alt-Text „Musterbox“: Daran erkennt Roomvo die Produktseite. */}
          <button
            type="button"
            onClick={sampleInCart ? openCartDrawer : handleOrderSample}
            disabled={isOrderingSample}
            aria-label={sampleInCart ? `Muster von ${klickVinylName(product.name)} im Warenkorb ansehen` : `Muster von ${klickVinylName(product.name)} bestellen`}
            className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              sampleInCart ? 'border-2 border-cta bg-white text-cta hover:bg-cta/5' : 'bg-cta text-white hover:bg-cta-dark'
            }`}
          >
            {sampleInCart ? (
              <Check className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Image src="/images/Icons/musterbox-weiss.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
            )}
            {sampleInCart
              ? 'Muster im Warenkorb – ansehen'
              : isOrderingSample
                ? 'Lädt …'
                : freeSamplesRemaining > 0
                  ? 'Kostenlose Muster bestellen'
                  : `Muster bestellen (${SAMPLE_SHIPPING_SURCHARGE.toFixed(2).replace('.', ',')} € Fracht)`}
          </button>
        </div>
      )}
    </article>
  );
}
