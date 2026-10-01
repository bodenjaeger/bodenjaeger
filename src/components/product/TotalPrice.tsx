'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import type { SetQuantityCalculation, SparpaketQuantityCalculation } from '@/lib/setCalculations';
import { useCart } from '@/contexts/CartContext';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import type { GA4Item } from '@/lib/analytics/types';

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
  lieferzeit?: string;
  showLieferzeit?: boolean;
}

export default function TotalPrice({
  quantities,
  prices,
  product,
  selectedDaemmung,
  selectedSockelleiste,
  daemmungProduct,
  sockelleisteProduct,
  sparpaket = null,
  lieferzeit = '3-7 Arbeitstage',
  showLieferzeit = true
}: TotalPriceProps) {
  const [addedToCart, setAddedToCart] = useState(false);
  const { addSetToCart, openCartDrawer } = useCart();

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
        regularPricePerUnit: position.product.price || 0,
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
    <div className="p-0">
      {/* 1. GESAMTSUMMEN-HEADER */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className="text-dark text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold min-w-0">
          Gesamtsumme <span className="text-[10px] sm:text-sm md:text-base font-normal">(inkl. MwSt.)</span>
        </span>
        <div className="text-right flex-shrink-0">
          <div className="text-[#000000] font-bold text-xl sm:text-2xl md:text-[28px] lg:text-[32px] leading-tight">
            {totalDisplayPrice.toFixed(2).replace('.', ',')}€
          </div>
        </div>
      </div>

      {/* 2. ERSPARNIS-BOX */}
      {hasSavings && (
        <div className="py-2 my-4">
          <div
            className="font-semibold text-sm md:text-base"
            style={{ color: 'var(--color-success)' }}
          >
            Du sparst {savings?.toFixed(2).replace('.', ',')}€ ({Math.round(savingsPercent || 0)}%)
          </div>
        </div>
      )}

      {/* Success Message */}
      {addedToCart && (
        <div className="bg-[#d4edda] border border-[#c3e6cb] text-[#155724] px-4 py-3 rounded-lg mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">
            Set mit {totalPackages} Paketen erfolgreich in den Warenkorb gelegt!
          </span>
        </div>
      )}

      {/* 4. CTA BUTTONS */}
      <div className="grid grid-cols-2 gap-3 mt-5 mb-4">
        {/* Sekundär-Button: Individuelles Angebot */}
        <button
          type="button"
          onClick={handleRequestQuote}
          className="w-full bg-transparent border border-dark hover:bg-[#f5f5f5] text-dark font-semibold text-[9px] sm:text-[10px] md:text-xs text-center leading-tight rounded-md transition-colors" style={{ padding: '5px' }}
        >
          Individuelles Angebot anfragen
        </button>

        {/* Primär-Button: In den Warenkorb */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={addedToCart}
          className={`w-full font-semibold text-[9px] sm:text-[10px] md:text-xs text-center leading-tight rounded-lg transition-all ${
            addedToCart
              ? 'bg-[#155724] hover:bg-[#0f4419] text-white'
              : 'bg-dark hover:bg-[#1a1a1d] active:scale-[0.98] text-white'
          }`} style={{ padding: '5px' }}
        >
          {addedToCart ? (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Set hinzugefügt!
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Image
                src="/images/Icons/warenkorb-weiss.png"
                alt=""
                width={20}
                height={20}
                className="w-5 h-5"
              />
              In den Warenkorb
            </span>
          )}
        </button>
      </div>

      {/* 5. LIEFERHINWEIS — nur wenn show_lieferzeit aktiv */}
      {showLieferzeit && (
      <div className="text-left text-[#666666] text-[13px] md:text-sm pt-3 mt-3 border-t border-ash">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
          <span><span className="font-bold">Lieferzeit:</span> {lieferzeit} oder im Markt abholen</span>
        </div>
      </div>
      )}
    </div>
  );
}
