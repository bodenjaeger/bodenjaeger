'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAlert } from '@/hooks/useAlert';
import {
  FREE_SAMPLE_LIMIT,
  SAMPLE_SHIPPING_SURCHARGE,
  SAMPLE_SLUG_PREFIX,
  isMusterProduct,
} from '@/lib/sampleUtils';

interface UnifiedProductCardProps {
  product: StoreApiProduct;
  daemmungProduct?: StoreApiProduct | null;
  sockelleisteProduct?: StoreApiProduct | null;
}

/**
 * Gemeinsame Hülle der beiden Aktions-Buttons auf der Karte.
 *
 * `cursor-pointer` ist Pflicht und nicht Kosmetik: Browser geben <button>
 * per Default `cursor: default`, und weder Tailwind Preflight noch die
 * globale button-Regel in globals.css setzen etwas anderes. Ohne den Zeiger
 * wirken die Kacheln wie Bildbeschriftung statt wie Bedienelemente — genau
 * der gemeldete Eindruck.
 *
 * Der Fokusring liegt bewusst als weißer Spalt plus brandroter Ring außen
 * (`ring-offset-white`): Die Buttons sitzen auf der Unterkante des
 * Produktbilds, ein einfarbiger Ring würde je nach Bodenfoto verschwinden.
 * Der weiße Spalt trennt ihn in jedem Fall vom Hintergrund.
 *
 * Als Hover-Rot dient #d11820, nicht `bg-brand` (#ed1b24): brandrot trägt
 * weiße Schrift nur mit Kontrast 4,39:1 und verfehlt damit WCAG AA für kleine
 * Schrift (4,5:1) — die Labels hier sind 10-12px. #d11820 kommt auf 5,44:1 und
 * ist im Projekt bereits der etablierte Hover-Ton (u.a. cart/page.tsx,
 * CategoryPageClient, FachmarktPage). Der Wert steht literal in der Klasse,
 * weil Tailwind arbitrary values zur Buildzeit braucht.
 */
const CARD_ACTION_BUTTON = [
  'flex cursor-pointer items-center justify-start gap-2 text-white',
  'transition-colors duration-200',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

/** Geometrie der Buttons — unverändert aus dem bestehenden Design. */
const CARD_ACTION_STYLE = {
  height: '10px',
  padding: '1rem',
  borderRadius: '6px',
} as const

/**
 * Einheitliche Produktkarte für alle Übersichten
 * Basiert auf CategoryPageClient Design
 */
export default function UnifiedProductCard({ product }: UnifiedProductCardProps) {
  const [isOrderingSample, setIsOrderingSample] = useState(false);
  const { addSampleToCart, getFreeSamplesRemaining } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { showSuccess, showError, showInfo } = useAlert();

  const wishlisted = isInWishlist(product.id);

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
      const sampleSlug = `${SAMPLE_SLUG_PREFIX}${product.slug}`;
      const response = await fetch(`/api/products/samples?slug=${encodeURIComponent(sampleSlug)}`);
      if (!response.ok) {
        throw new Error('Fehler beim Suchen des Musters');
      }

      const results: StoreApiProduct[] = await response.json();
      const sampleProduct = Array.isArray(results) && results.length > 0 ? results[0] : null;

      if (!sampleProduct) {
        showError(
          `Leider gibt es für "${product.name}" derzeit kein Muster.\n\nBitte kontaktieren Sie uns für weitere Informationen oder schauen Sie sich ähnliche Produkte an.`,
          'Muster nicht verfügbar'
        );
        return;
      }

      const freeSamplesRemaining = getFreeSamplesRemaining();
      const result = addSampleToCart(sampleProduct);

      if (result.status === 'duplicate') {
        showInfo(
          `Ein Muster von "${product.name}" befindet sich bereits in Ihrem Warenkorb.`,
          'Bereits im Warenkorb'
        );
        return;
      }

      const surchargeLabel = SAMPLE_SHIPPING_SURCHARGE.toFixed(2).replace('.', ',');
      const followUp = freeSamplesRemaining > 1
        ? `Sie können noch ${freeSamplesRemaining - 1} weitere Muster versandkostenfrei bestellen.\nAb dem ${FREE_SAMPLE_LIMIT + 1}. Muster fallen ${surchargeLabel} € Fracht pro zusätzlichem Muster an.`
        : freeSamplesRemaining === 1
          ? `Sie haben alle ${FREE_SAMPLE_LIMIT} versandkostenfreien Muster verwendet.\nAb dem ${FREE_SAMPLE_LIMIT + 1}. Muster fallen ${surchargeLabel} € Fracht pro zusätzlichem Muster an.`
          : `Für dieses zusätzliche Muster fallen ${surchargeLabel} € Fracht an.`;

      showSuccess(
        `Kostenloses Muster wurde in den Warenkorb gelegt!\n\n${followUp}`,
        'Muster hinzugefügt'
      );
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
    <article className="bg-white rounded-lg overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
      <Link href={`/products/${product.slug}`} className="block">
        {/* Bildbereich */}
        <div className="relative aspect-[4/3] bg-white">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]?.src || ''}
              alt={product.images[0]?.alt || product.name}
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
            {/* Sale Badge - on_sale aus Backend als Trigger, Prozent aus discount_percent oder setangebot_ersparnis_prozent */}
            {product.on_sale && (() => {
              const percent = product.setangebot_ersparnis_prozent || product.discount_percent || 0;
              return percent > 0 ? (
                <div className="text-white rounded font-bold shadow-md w-fit" style={{ fontSize: '12px', padding: '3% 10%', whiteSpace: 'nowrap', backgroundColor: '#ed1b24' }}>
                  -{Math.round(percent)}%
                </div>
              ) : null;
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

        {/* Action Buttons on Border - Only for floor products */}
        {isFloorProduct && (
          <div className="absolute left-0 right-0 flex justify-between px-4 z-10" style={{ bottom: '-2%' }}>
            {/* Gemerkt: brandrot als Ruhezustand, Hover wird dunkel — der
                Farbwechsel signalisiert „Klick entfernt wieder". Ungemerkt
                umgekehrt: dunkel, Hover brandrot. So braucht der Toggle nur
                die zwei Markenfarben und keinen dritten Ton.

                Kein `aria-pressed`: Der Zustand steckt schon im wechselnden
                Label („setzen" / „entfernen"), beides zusammen würde ihn
                doppelt ansagen. Das Label muss wechseln, damit der Accessible
                Name den sichtbaren Text „Auf die/der Merkliste" enthält
                (WCAG 2.5.3 Label in Name) — ein statisches Label plus
                `aria-pressed` würde das verletzen. */}
            <button
              type="button"
              onClick={handleToggleWishlist}
              aria-label={
                wishlisted
                  ? `${product.name} von der Merkliste entfernen`
                  : `${product.name} auf die Merkliste setzen`
              }
              className={`${CARD_ACTION_BUTTON} ${
                wishlisted ? 'bg-brand hover:bg-dark' : 'bg-dark hover:bg-[#d11820]'
              }`}
              style={CARD_ACTION_STYLE}
            >
              <Image
                src="/images/Icons/favoriten-weiss.png"
                alt=""
                width={16}
                height={16}
              />
              <div className="flex flex-col items-start">
                <span className="text-[0.65rem] leading-tight">{wishlisted ? 'Auf der' : 'Auf die'}</span>
                <span className="text-xs font-bold leading-tight">Merkliste</span>
              </div>
            </button>
            <button
              type="button"
              onClick={handleOrderSample}
              disabled={isOrderingSample}
              aria-busy={isOrderingSample}
              aria-label={`Kostenloses Muster von ${product.name} bestellen`}
              className={`${CARD_ACTION_BUTTON} bg-dark hover:bg-[#d11820]`}
              style={CARD_ACTION_STYLE}
            >
              <Image
                src="/images/Icons/musterbox-weiss.png"
                alt=""
                width={16}
                height={16}
              />
              <div className="flex flex-col items-start">
                <span className="text-[0.65rem] leading-tight">Kostenloses</span>
                <span className="text-xs font-bold leading-tight">Muster</span>
              </div>
            </button>
          </div>
        )}
        </div>

        {/* Produktinfo-Bereich */}
        <div className="bg-gray-100 p-4">
          {/* Produktname */}
          <h3 className="text-gray-900 font-medium text-base mb-3 line-clamp-2 min-h-[3rem]">
            {product.name}
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
          <div className="h-[1px] bg-dark mx-8 mb-3" />

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
              ? (product.setangebot_einzelpreis || 0)
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
              </div>
            );
          })()}
        </div>
      </Link>
    </article>
  );
}
