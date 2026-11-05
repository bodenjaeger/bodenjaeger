'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { formatPrice } from '@/lib/cart-utils';
import type { StoreApiProduct } from '@/lib/woocommerce';
import type { SetQuantityCalculation, SparpaketQuantityCalculation } from '@/lib/setCalculations';
import { useCart } from '@/contexts/CartContext';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import type { GA4Item } from '@/lib/analytics/types';
import { calculateProductAktion } from '@/lib/promo';

// Simple price interface - prices come from backend!
interface SetPrices {
  totalDisplayPrice: number;
  comparisonPriceTotal?: number;
  savings?: number;
  savingsPercent?: number;
}

interface TotalPriceProps {
  quantities: SetQuantityCalculation | null;
  prices: SetPrices | null;
  einheit: string;
  product: StoreApiProduct;
  selectedDaemmung: StoreApiProduct | null;
  selectedSockelleiste: StoreApiProduct | null;
  daemmungProduct: StoreApiProduct | null;  // Standard dämmung for price calculation
  sockelleisteProduct: StoreApiProduct | null;  // Standard sockelleiste for price calculation
  sparpaket?: SparpaketQuantityCalculation | null;  // Klebe-Vinyl Sparpaket
}

// Individuelle Angebote erst ab dieser Fläche
const ANGEBOT_AB_M2 = 100;

export default function TotalPrice({
  quantities,
  prices,
  product,
  selectedDaemmung,
  selectedSockelleiste,
  daemmungProduct,
  sockelleisteProduct,
  sparpaket = null
}: TotalPriceProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  const { addSetToCart, openCartDrawer } = useCart();
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const [cartButtonVisible, setCartButtonVisible] = useState(true);
  const hasData = !!quantities && !!prices;

  // Kaufleiste (nur mobil): sichtbar, solange der große Button außerhalb des Bildes ist
  useEffect(() => {
    const button = cartButtonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) => setCartButtonVisible(entry.isIntersecting));
    observer.observe(button);
    return () => observer.disconnect();
  }, [hasData]);

  // Schwebende Elemente: über die Leiste schieben bzw. vom großen Button wegnehmen (globals.css)
  useEffect(() => {
    document.body.classList.toggle('kaufleiste-sichtbar', hasData && !cartButtonVisible);
    document.body.classList.toggle('kaufbutton-sichtbar', hasData && cartButtonVisible);
    return () => document.body.classList.remove('kaufleiste-sichtbar', 'kaufbutton-sichtbar');
  }, [hasData, cartButtonVisible]);

  // Mobile Browserleisten fahren beim Scrollen ein und aus: Leiste am sichtbaren Rand halten
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const verdeckt = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--kaufleiste-abstand', `${Math.round(verdeckt)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--kaufleiste-abstand');
    };
  }, []);

  // Show loading state if data not yet available
  if (!quantities || !prices) {
    return (
      <div className="p-6 bg-white rounded-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  const {
    totalDisplayPrice,
    savings,
    savingsPercent
  } = prices;

  const hasSavings = savings !== undefined && savings > 0;

  // Aktion "Jedes 7. Paket gratis" (Kundenentscheidung): Rabatt direkt von der
  // Gesamtsumme abziehen – gleiche Berechnung wie später im Warenkorb (promo.ts)
  const aktion = calculateProductAktion(product, quantities.floor.packages);
  const endpreis = totalDisplayPrice - aktion.discount;

  // Calculate total packages in set
  const totalPackages =
    quantities.floor.packages +
    (quantities.insulation?.packages || 0) +
    (quantities.baseboard?.packages || 0);

  // Handle add to cart - prepare with correct pricing
  const handleAddToCart = () => {
    // We need to pass pricing info to prepareSetForCart
    // For now, we'll create the bundle directly here with correct pricing

    // Calculate prices for each product (same logic as ProductPageContent.tsx line 94)
    // Use product.price directly — setangebot_gesamtpreis is the combined set price, not the floor price
    const bodenPricePerM2 = product.price || 0;

    console.log('🛒 WARENKORB DEBUG:', {
      bodenPricePerM2,
      'product.setangebot_gesamtpreis': product.setangebot_gesamtpreis,
      'product.price': product.price,
      'quantities.floor': quantities?.floor,
      selectedDaemmung: selectedDaemmung?.name,
      selectedSockelleiste: selectedSockelleiste?.name
    });

    // Dämmung pricing (same logic as ProductPageContent.tsx)
    let daemmungSetPricePerUnit = 0;
    let daemmungRegularPricePerUnit = 0;
    if (selectedDaemmung && daemmungProduct && quantities.insulation) {
      const daemmungPricePerM2 = selectedDaemmung.price || 0;
      const standardDaemmungPrice = daemmungProduct.price || 0;

      const daemmungVerrechnung = selectedDaemmung.verrechnung ??
        Math.max(0, daemmungPricePerM2 - standardDaemmungPrice);

      // ✅ Verwende isFree aus quantities für konsistente Logik
      const istKostenlos = quantities.insulation.isFree;

      daemmungSetPricePerUnit = istKostenlos ? 0 : daemmungVerrechnung;
      daemmungRegularPricePerUnit = daemmungPricePerM2;

      console.log('🛒 DÄMMUNG DEBUG:', {
        daemmungPricePerM2,
        standardDaemmungPrice,
        daemmungVerrechnung,
        istKostenlos,
        daemmungSetPricePerUnit,
        'quantities.insulation': quantities.insulation
      });
    }

    // Sockelleiste pricing (same logic as ProductPageContent.tsx)
    let sockelleisteSetPricePerUnit = 0;
    let sockelleisteRegularPricePerUnit = 0;
    if (selectedSockelleiste && sockelleisteProduct && quantities.baseboard) {
      const sockelleistePricePerLfm = selectedSockelleiste.price || 0;
      const standardSockelleistePrice = sockelleisteProduct.price || 0;

      const sockelleisteVerrechnung = selectedSockelleiste.verrechnung ??
        Math.max(0, sockelleistePricePerLfm - standardSockelleistePrice);

      // ✅ Verwende isFree aus quantities für konsistente Logik
      const istKostenlos = quantities.baseboard.isFree;

      sockelleisteSetPricePerUnit = istKostenlos ? 0 : sockelleisteVerrechnung;
      sockelleisteRegularPricePerUnit = sockelleistePricePerLfm;
    }

    // Create set bundle with pricing
    const setBundle = {
      floor: {
        product: product,
        packages: quantities.floor.packages,
        actualM2: quantities.floor.actualM2,
        setPricePerUnit: bodenPricePerM2,
        regularPricePerUnit: bodenPricePerM2,
      },
      insulation: selectedDaemmung && quantities.insulation ? {
        product: selectedDaemmung,
        packages: quantities.insulation.packages,
        actualM2: quantities.insulation.actualM2,
        setPricePerUnit: daemmungSetPricePerUnit,
        regularPricePerUnit: daemmungRegularPricePerUnit,
        standardProduct: product, // Reference for price calculation
      } : null,
      baseboard: selectedSockelleiste && quantities.baseboard ? {
        product: selectedSockelleiste,
        packages: quantities.baseboard.packages,
        actualLfm: quantities.baseboard.actualLfm,
        setPricePerUnit: sockelleisteSetPricePerUnit,
        regularPricePerUnit: sockelleisteRegularPricePerUnit,
        standardProduct: product, // Reference for price calculation
      } : null,
      // Klebe-Vinyl Sparpaket: alle Gebinde mitgeben (auch 0), Preis im Set immer 0
      sparpaket: sparpaket?.positionen.map((position) => ({
        typ: position.typ,
        product: position.product,
        packages: position.packages,
        amount: position.amount,
        regularPricePerUnit: position.grossesGebinde.price || 0,
      })),
    };

    console.log('🛒 SET BUNDLE VOR ADD TO CART:', JSON.stringify(setBundle, null, 2));

    addSetToCart(setBundle);

    // GA4 add_to_cart — Set-Bundle: ein Event mit allen Bestandteilen.
    // price = €/Paket (setPricePerUnit ist €/m² bzw. €/lfm).
    const ga4Items: GA4Item[] = [];
    const floorPaketinhalt = product.paketinhalt || 1;
    ga4Items.push(
      mapProductToItem(product, quantities.floor.packages, {
        variant: 'Set: Boden',
        pricePerUnitOverride: bodenPricePerM2 * floorPaketinhalt,
      })
    );
    if (selectedDaemmung && quantities.insulation) {
      const dPaketinhalt = selectedDaemmung.paketinhalt || 1;
      ga4Items.push(
        mapProductToItem(selectedDaemmung, quantities.insulation.packages, {
          variant: 'Set: Dämmung',
          pricePerUnitOverride: daemmungSetPricePerUnit * dPaketinhalt,
        })
      );
    }
    if (selectedSockelleiste && quantities.baseboard) {
      const sPaketinhalt = selectedSockelleiste.paketinhalt || 1;
      ga4Items.push(
        mapProductToItem(selectedSockelleiste, quantities.baseboard.packages, {
          variant: 'Set: Sockelleiste',
          pricePerUnitOverride: sockelleisteSetPricePerUnit * sPaketinhalt,
        })
      );
    }
    sparpaket?.positionen
      .filter((position) => position.packages > 0)
      .forEach((position) => {
        ga4Items.push(
          mapProductToItem(position.product, position.packages, {
            variant: 'Set: Sparpaket',
            pricePerUnitOverride: 0,
          })
        );
      });
    track.addToCart(ga4Items, totalDisplayPrice);

    openCartDrawer();
    setAddedToCart(true);

    // Scroll to Zubehör section
    setTimeout(() => {
      const zubehoerSection = document.getElementById('zubehoer-section');
      if (zubehoerSection) {
        zubehoerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);

    setTimeout(() => setAddedToCart(false), 3000);
  };

  // Handle request quote
  const handleRequestQuote = () => {
    // TODO: Open contact form or mailto link
    window.location.href = '/kontakt';
  };

  return (
    <div>
      {/* 1. GESAMTPREIS + ERSPARNIS */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-pale px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm text-dark">Gesamtpreis <span className="text-xs">(inkl. MwSt.)</span></p>
          {hasSavings && (
            <p className="mt-0.5 text-sm font-bold text-cta">Du sparst {formatPrice(savings ?? 0)} €</p>
          )}
        </div>
        <p className="whitespace-nowrap text-[28px] font-bold leading-none text-dark sm:text-3xl">{formatPrice(endpreis)} €</p>
      </div>

      {/* Aktion: Gratis-Pakete */}
      {aktion.freePackages > 0 && (
        <p className="mt-2 text-sm font-semibold text-brand">
          {aktion.freePackages === 1 ? '1 Paket' : `${aktion.freePackages} Pakete`} gratis – du sparst{' '}
          {formatPrice(aktion.discount)} €
        </p>
      )}

      {/* Success Message */}
      {addedToCart && (
        <div role="status" className="mt-3 rounded-lg border border-[#c3e6cb] bg-[#d4edda] px-4 py-3 text-sm font-medium text-[#155724]">
          Set mit {totalPackages} Paketen erfolgreich in den Warenkorb gelegt!
        </div>
      )}

      {/* 2. CTA */}
      <button
        ref={cartButtonRef}
        type="button"
        onClick={handleAddToCart}
        disabled={addedToCart}
        className={`mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg text-base font-bold text-white transition-all ${
          addedToCart ? 'bg-[#155724]' : 'bg-dark hover:bg-[#1a1a1d] active:scale-[0.98]'
        }`}
      >
        {addedToCart ? (
          'Set hinzugefügt!'
        ) : (
          <>
            <Image src="/images/Icons/warenkorb-weiss.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
            In den Warenkorb
          </>
        )}
      </button>

      {quantities.floor.actualM2 >= ANGEBOT_AB_M2 && (
        <button
          type="button"
          onClick={handleRequestQuote}
          className="mt-2 w-full py-2 text-center text-xs font-semibold text-mid underline hover:text-dark"
        >
          Individuelles Angebot anfragen
        </button>
      )}

      {/* Kaufleiste mobil */}
      {!cartButtonVisible && createPortal(
        <div
          style={{ bottom: 'var(--kaufleiste-abstand, 0px)' }}
          className="fixed inset-x-0 z-30 border-t border-ash bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="whitespace-nowrap text-xl font-bold leading-tight text-dark">{formatPrice(endpreis)} €</p>
              <p className="truncate text-xs text-mid">
                {quantities.floor.actualM2.toFixed(2).replace('.', ',')} m² · {quantities.floor.packages} {quantities.floor.packages === 1 ? 'Paket' : 'Pakete'} · inkl. MwSt.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addedToCart}
              className={`flex min-h-12 flex-shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white ${addedToCart ? 'bg-[#155724]' : 'bg-dark'}`}
            >
              {addedToCart ? (
                'Hinzugefügt!'
              ) : (
                <>
                  <Image src="/images/Icons/warenkorb-weiss.png" alt="" width={20} height={20} className="h-5 w-5" />
                  In den Warenkorb
                </>
              )}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
