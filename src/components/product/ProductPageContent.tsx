'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { MinusIcon, PlusIcon } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { calculateSetQuantities } from '@/lib/setCalculations';
import {
  FREE_SAMPLE_LIMIT,
  SAMPLE_SHIPPING_SURCHARGE,
  SAMPLE_SLUG_PREFIX,
} from '@/lib/sampleUtils';
import { useCart } from '@/contexts/CartContext';
import { useAlert } from '@/hooks/useAlert';
import AlertModal from '@/components/AlertModal';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import ImageGallery from './ImageGallery';
import ZahlungsIcons from './ZahlungsIcons';
import ProductInfo from './ProductInfo';
import QuantitySelector from './QuantitySelector';
import TotalPrice from './TotalPrice';
import ZubehoerSlider from './ZubehoerSlider';

interface ProductPageContentProps {
  product: StoreApiProduct;
  daemmungProduct: StoreApiProduct | null;
  sockelleisteProduct: StoreApiProduct | null;
  daemmungOptions: StoreApiProduct[];
  sockelleisteOptions: StoreApiProduct[];
}

export default function ProductPageContent({
  product,
  daemmungProduct,
  sockelleisteProduct,
  daemmungOptions,
  sockelleisteOptions
}: ProductPageContentProps) {
  // ✅ USE ROOT-LEVEL FIELDS (backend/ROOT_LEVEL_FIELDS.md)
  const paketinhalt = product.paketinhalt || 1;
  const einheit = product.einheit_short || 'm²';

  // Cart context
  const { addSampleToCart, getFreeSamplesRemaining } = useCart();

  // Alert modal
  const { alertState, showSuccess, showError, showInfo, closeAlert } = useAlert();

  // State for wanted m² (user input)
  const [wantedM2, setWantedM2] = useState(paketinhalt);

  // State for selected addition products
  const [selectedDaemmung, setSelectedDaemmung] = useState<StoreApiProduct | null>(daemmungProduct);
  const [selectedSockelleiste, setSelectedSockelleiste] = useState<StoreApiProduct | null>(sockelleisteProduct);

  // State for sample order loading
  const [isOrderingSample, setIsOrderingSample] = useState(false);

  // GA4 view_item bei Produktseiten-Mount / Produktwechsel
  useEffect(() => {
    track.viewItem(product, 1);
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if product is a floor product (only floors have samples)
  const isFloorProduct = useMemo(() => {
    if (!product.categories || !Array.isArray(product.categories)) return false;

    const floorCategories = ['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'laminat', 'parkett'];
    return product.categories.some(cat =>
      floorCategories.includes(cat.slug.toLowerCase())
    );
  }, [product.categories]);

  // Check if product is an accessory (simple layout)
  const isAccessory = useMemo(() => {
    if (!product.categories || !Array.isArray(product.categories)) return false;
    const accessoryCategories = ['zubehoer', 'sockelleisten', 'daemmung'];
    return product.categories.some(cat =>
      accessoryCategories.includes(cat.slug.toLowerCase())
    );
  }, [product.categories]);

  // Calculate quantities ONLY (no prices - prices come from backend!)
  const quantities = useMemo(() => {
    if (!product || wantedM2 <= 0) return null;

    return calculateSetQuantities(
      wantedM2,
      product,
      selectedDaemmung,
      selectedSockelleiste,
      undefined, // customInsulationM2
      undefined, // customBaseboardLfm
      daemmungProduct, // standardInsulationProduct
      sockelleisteProduct // standardBaseboardProduct
    );
  }, [wantedM2, product, selectedDaemmung, selectedSockelleiste, daemmungProduct, sockelleisteProduct]);

  // ✅ VOLLSTÄNDIGE SET-ANGEBOT BERECHNUNG
  // Basierend auf: SETANGEBOT_BERECHNUNG_KOMPLETT.md
  const prices = useMemo(() => {
    if (!product || !quantities) return null;

    // SCHRITT 1: BODEN BERECHNUNG
    // Set-Preis = aktueller WooCommerce-Preis (product.price)
    const bodenPricePerM2 = product.price || 0;
    const bodenPriceTotal = quantities.floor.actualM2 * bodenPricePerM2;

    // Vergleichspreis (nur Boden-Anteil, Streichpreis = bodenRegular + standardDämmung + standardSockelleiste wird in SCHRITT 4 zusammengesetzt)
    const bodenComparisonPricePerM2 = product.uvp || product.regular_price || product.price || 0;
    const bodenComparisonPriceTotal = quantities.floor.actualM2 * bodenComparisonPricePerM2;

    console.log('🔧 BODEN PREIS DEBUG:', {
      produktName: product.name,
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      uvp: product.uvp,
      paketpreis: product.paketpreis,
      paketpreis_s: product.paketpreis_s,
      paketinhalt: product.paketinhalt,
      setangebot_einzelpreis: product.setangebot_einzelpreis,
      setangebot_gesamtpreis: product.setangebot_gesamtpreis,
    });

    // SCHRITT 2: DÄMMUNG BERECHNUNG (falls vorhanden)
    let daemmungRegularPrice = 0;
    let daemmungSetPrice = 0;
    let daemmungSetPricePerUnit = 0;  // ✅ NEU: Einzelpreis für SetAngebot-Komponente
    let daemmungRegularPricePerUnit = 0;  // ✅ NEU: Regulärer Einzelpreis

    if (selectedDaemmung && daemmungProduct && quantities.insulation) {
      const daemmungPricePerM2 = selectedDaemmung.price || 0;
      const daemmungPaketinhalt = selectedDaemmung.paketinhalt || 1;

      // Standard-Dämmung (zum Vergleich)
      const standardDaemmungPrice = daemmungProduct.price || 0;

      // ✅ DYNAMISCHE VERRECHNUNG-BERECHNUNG (mit Backend-Fallback)
      // Wenn Backend verrechnung liefert, verwende es. Sonst berechne Differenz.
      const daemmungVerrechnung = selectedDaemmung.verrechnung ?? Math.max(0, daemmungPricePerM2 - standardDaemmungPrice);

      console.log('🔧 Dämmung Verrechnung:', {
        produktName: selectedDaemmung.name,
        produktPreis: daemmungPricePerM2,
        standardPreis: standardDaemmungPrice,
        verrechnungBerechnet: daemmungVerrechnung,
        quelle: selectedDaemmung.verrechnung !== undefined ? 'Backend' : 'Frontend-Berechnung',
        isFree: quantities.insulation.isFree,
        pakete: quantities.insulation.packages,
        actualM2: quantities.insulation.actualM2
      });

      // ✅ VERWENDE MENGEN AUS quantities (mit korrekter Rundung!)
      const istKostenlos = quantities.insulation.isFree;

      // REGULÄRER PREIS (Streichpreis): Preis des gewählten Produkts (Einzelkauf)
      // Standard-Produkt: eigener Preis = standardDaemmungPrice
      // Options-Produkt: eigener (höherer) Preis = daemmungPricePerM2
      const daemmungPaketeRegular = Math.ceil(quantities.floor.actualM2 / daemmungPaketinhalt);
      const daemmungM2Regular = daemmungPaketeRegular * daemmungPaketinhalt;
      daemmungRegularPrice = daemmungM2Regular * daemmungPricePerM2;
      daemmungRegularPricePerUnit = daemmungPricePerM2;

      // SET-ANGEBOT PREIS: verrechnung = 0 → kostenlos, verrechnung > 0 → nur Aufpreis
      daemmungSetPricePerUnit = daemmungVerrechnung;
      daemmungSetPrice = quantities.insulation.actualM2 * daemmungVerrechnung;
    }

    // SCHRITT 3: SOCKELLEISTE BERECHNUNG
    let sockelleisteRegularPrice = 0;
    let sockelleisteSetPrice = 0;
    let sockelleisteSetPricePerUnit = 0;  // ✅ NEU: Einzelpreis für SetAngebot-Komponente
    let sockelleisteRegularPricePerUnit = 0;  // ✅ NEU: Regulärer Einzelpreis

    if (selectedSockelleiste && sockelleisteProduct && quantities.baseboard) {
      const sockelleistePricePerLfm = selectedSockelleiste.price || 0;
      const sockelleistePaketinhalt = selectedSockelleiste.paketinhalt || 1;

      // Standard-Sockelleiste (zum Vergleich)
      const standardSockelleistePrice = sockelleisteProduct.price || 0;

      // ✅ DYNAMISCHE VERRECHNUNG-BERECHNUNG (mit Backend-Fallback)
      // Wenn Backend verrechnung liefert, verwende es. Sonst berechne Differenz.
      const sockelleisteVerrechnung = selectedSockelleiste.verrechnung ?? Math.max(0, sockelleistePricePerLfm - standardSockelleistePrice);

      console.log('🔧 Sockelleiste Verrechnung:', {
        produktName: selectedSockelleiste.name,
        produktPreis: sockelleistePricePerLfm,
        standardPreis: standardSockelleistePrice,
        verrechnungBerechnet: sockelleisteVerrechnung,
        quelle: selectedSockelleiste.verrechnung !== undefined ? 'Backend' : 'Frontend-Berechnung',
        isFree: quantities.baseboard.isFree,
        pakete: quantities.baseboard.packages,
        actualLfm: quantities.baseboard.actualLfm
      });

      // ✅ VERWENDE MENGEN AUS quantities (mit korrekter Rundung!)
      const istKostenlos = quantities.baseboard.isFree;

      // REGULÄRER PREIS (Streichpreis): Preis des gewählten Produkts (Einzelkauf)
      // Standard-Produkt: eigener Preis = standardSockelleistePrice
      // Options-Produkt: eigener (höherer) Preis = sockelleistePricePerLfm
      const sockelleisteStückRegular = Math.ceil(quantities.floor.actualM2 / sockelleistePaketinhalt);
      const sockelleisteLfmRegular = sockelleisteStückRegular * sockelleistePaketinhalt;
      sockelleisteRegularPrice = sockelleisteLfmRegular * sockelleistePricePerLfm;
      sockelleisteRegularPricePerUnit = sockelleistePricePerLfm;

      // SET-ANGEBOT PREIS: verrechnung = 0 → kostenlos, verrechnung > 0 → nur Aufpreis
      sockelleisteSetPricePerUnit = sockelleisteVerrechnung;
      sockelleisteSetPrice = quantities.baseboard.actualLfm * sockelleisteVerrechnung;
    }

    // SCHRITT 4: GESAMTPREISE
    // Streichpreis pro m²: immer dynamisch berechnet aus den gewählten Produkten
    // (setangebot_einzelpreis ist statisch und kennt keine Premium-Optionen)
    const gesamtStreichpreisProM2 = bodenComparisonPricePerM2 + daemmungRegularPricePerUnit + sockelleisteRegularPricePerUnit;
    // comparisonPriceTotal = Streichpreis × m² (konsistent mit per-m²-Anzeige in SetAngebot)
    const comparisonPriceTotal = quantities.floor.actualM2 * gesamtStreichpreisProM2;
    // totalDisplayPrice = Set-Preis (was der Kunde MIT Set bezahlt)
    const totalDisplayPrice = bodenPriceTotal + daemmungSetPrice + sockelleisteSetPrice;
    const savings = comparisonPriceTotal - totalDisplayPrice;
    // ✅ Backend-Wert verwenden (setangebot_ersparnis_prozent) — konsistent mit Produktkarten
    const savingsPercent = product.setangebot_ersparnis_prozent || 0;

    return {
      totalDisplayPrice,
      comparisonPriceTotal,
      savings: savings > 0 ? savings : undefined,
      savingsPercent,
      // ✅ NEU: Einzelpreise für SetAngebot-Komponente
      daemmungSetPricePerUnit,
      daemmungRegularPricePerUnit,
      sockelleisteSetPricePerUnit,
      sockelleisteRegularPricePerUnit,
    };
  }, [product, quantities, selectedDaemmung, selectedSockelleiste, daemmungProduct, sockelleisteProduct]);

  // Handle quantity changes from QuantitySelector
  const handleQuantityChange = (newPackages: number, newSqm: number) => {
    setWantedM2(newSqm);
  };

  // Handle selected products from SetAngebot
  // useCallback: Stabile Referenz verhindert, dass Mobile-SetAngebot's useEffect
  // die Desktop-Auswahl überschreibt (Race Condition)
  const handleProductSelection = useCallback((daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => {
    setSelectedDaemmung(daemmung);
    setSelectedSockelleiste(sockelleiste);
  }, []);

  // ========== PRODUCT TABS (Beschreibung / Eigenschaften) ==========

  const ProductTabs = ({ product }: { product: StoreApiProduct }) => {
    const [activeTab, setActiveTab] = useState<'beschreibung' | 'eigenschaften' | null>('beschreibung');

    const rawBeschreibung = product.artikelbeschreibung || '';
    // ChatGPT-UI-HTML bereinigen: Nur <p>, <strong>, <em>, <br>, <ul>, <li>, <ol> behalten
    const cleanHtml = (html: string): string => {
      // Entferne alle div-Wrapper (ChatGPT kopiert UI-Container mit)
      let cleaned = html.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
      // Entferne class/style/data-Attribute von allen Tags
      cleaned = cleaned.replace(/<(\w+)\s+[^>]*?>/gi, '<$1>');
      return cleaned.trim();
    };
    const cleanedBeschreibung = cleanHtml(rawBeschreibung);
    const beschreibung = cleanedBeschreibung.includes('<p')
      ? cleanedBeschreibung
      : cleanedBeschreibung.replace(/\r?\n\r?\n/g, '<br/><br/>').replace(/\r?\n/g, '<br/>');
    const descriptionHtml = product.description || '';
    const hasBeschreibung = !!beschreibung;
    const hasEigenschaften = descriptionHtml.includes('<table') || descriptionHtml.includes('bj-specs');

    if (!hasBeschreibung && !hasEigenschaften) return null;

    const toggleTab = (tab: 'beschreibung' | 'eigenschaften') => {
      setActiveTab(activeTab === tab ? null : tab);
    };

    return (
      <div style={{ width: '100%' }}>
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '0' }}>
          {hasBeschreibung && (
            <button
              onClick={() => toggleTab('beschreibung')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 32px', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === 'beschreibung' ? '#e5e5e5' : '#fff',
                color: '#2e2d32',
                outline: activeTab === 'beschreibung' ? 'none' : '1px solid #d1d5db',
              }}
            >
              Artikelbeschreibung
              <svg style={{ width: '16px', height: '16px', transform: activeTab === 'beschreibung' ? 'rotate(0)' : 'rotate(-90deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {hasEigenschaften && (
            <button
              onClick={() => toggleTab('eigenschaften')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 32px', borderRadius: '9999px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', border: 'none',
                backgroundColor: activeTab === 'eigenschaften' ? '#e5e5e5' : '#fff',
                color: '#2e2d32',
                outline: activeTab === 'eigenschaften' ? 'none' : '1px solid #d1d5db',
              }}
            >
              Weitere Artikeldetails
              <svg style={{ width: '16px', height: '16px', transform: activeTab === 'eigenschaften' ? 'rotate(0)' : 'rotate(-90deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: 'clamp(16px, 4vw, 32px)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            {activeTab === 'beschreibung' && hasBeschreibung && (
              <div
                style={{ color: '#2e2d32', fontSize: '14px', lineHeight: '1.75' }}
                dangerouslySetInnerHTML={{ __html: beschreibung }}
              />
            )}

            {activeTab === 'eigenschaften' && hasEigenschaften && (
              <div
                className="bj-specs-table"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  // ========== SIMPLE PRODUCT LAYOUT COMPONENTS (for Accessories) ==========

  // Service Icons for Simple Layout (matches Layout 1 styling)
  const ServiceIcons = () => (
    <div className="space-y-0 text-base sm:text-lg lg:text-2xl text-gray-700">
      <div className="flex items-center gap-2 sm:gap-3 pb-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
        <Image
          src="/images/Icons/telefon-schieferschwarz.png"
          alt="Telefon"
          width={24}
          height={24}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
        />
        <span className="break-words">Persönliche Beratung unter 02433938884</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
        <Image
          src="/images/Icons/lager-schieferschwarz.png"
          alt="Lager"
          width={24}
          height={24}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
        />
        <span className="break-words">Kostenlose Einlagerung bis zu 12 Monate</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
        <Image
          src="/images/Icons/termin-schieferschwarz.png"
          alt="Termin"
          width={24}
          height={24}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
        />
        <span className="break-words">Lieferung zum Wunschtermin</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 pt-3">
        <Image
          src="/images/Icons/lieferung-schieferschwarz.png"
          alt="Lieferung"
          width={24}
          height={24}
          className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
        />
        <span className="break-words">Kostenlose Lieferung ab 999€</span>
      </div>
    </div>
  );

  // Extract features from short_description (same logic as ProductInfo)
  const getFeatures = (): string[] => {
    if (product.short_description) {
      // Strategy 1: Extract from <li> tags
      const matches = product.short_description.match(/<li>(.*?)<\/li>/g);
      if (matches) {
        return matches.map(match => match.replace(/<\/?li>/g, '').trim()).slice(0, 3);
      }
      // Strategy 2: Bullet points as plain text (• or -)
      const lines = product.short_description
        .replace(/<[^>]*>/g, '')
        .split(/\n|<br\s*\/?>/)
        .map(line => line.replace(/^[\s•\-–]+/, '').trim())
        .filter(line => line.length > 0);
      if (lines.length > 0) {
        return lines.slice(0, 3);
      }
    }
    const features: string[] = [];
    if (product.text_produktuebersicht && product.show_text_produktuebersicht) {
      features.push(product.text_produktuebersicht);
    }
    if (product.lieferzeit && product.show_lieferzeit) {
      features.push(product.lieferzeit);
    }
    if (product.paketinhalt) {
      features.push(`Paketinhalt: ${product.paketinhalt} ${product.einheit_short || 'm²'}`);
    }
    return features;
  };

  // Product Info for Simple Layout
  const SimpleProductInfo = () => {
    const price = product.price || 0;
    const regularPrice = product.regular_price || price;
    const einheitShort = product.einheit_short || 'Stück';
    const uvp = product.uvp || regularPrice;
    const hasDiscount = uvp > price;
    const features = getFeatures();

    return (
      <div className="bg-white rounded-lg p-6">
        {/* Product Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
          {product.name}
        </h1>

        {/* Article Number */}
        <div className="text-sm text-gray-600 mb-4">
          Art.Nr.: {product.sku || 'N/A'}
        </div>

        {/* Features List with red checkmarks (same as ProductInfo) */}
        {features.length > 0 && (
          <div className="space-y-2 pt-2 mb-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <Image
                  src="/images/Icons/haken-rot.png"
                  alt="Check"
                  width={20}
                  height={20}
                  className="flex-shrink-0 mt-0.5"
                />
                <span className="text-gray-700 text-lg leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    );
  };

  // Quantity and Cart for Simple Layout (Design based on Unbenannt-1.png)
  const SimpleQuantityAndCart = () => {
    const [packages, setPackages] = useState(1);
    const [units, setUnits] = useState(product.paketinhalt || 1);
    const { addToCart, openCartDrawer } = useCart();
    const [isAdding, setIsAdding] = useState(false);

    const price = product.price || 0;
    const paketinhalt = product.paketinhalt || 1;
    const rawEinheit = product.einheit_short || 'Stück';
    const showUnit = rawEinheit !== '-' && rawEinheit.trim() !== '';
    const einheitShort = showUnit ? rawEinheit : 'Stück';
    const verpackungsart = product.verpackungsart_short || 'Pak.';

    // Ausgeschriebene Labels über den +/- Feldern
    const packageLabel = product.verpackungsart || 'Paket(e)';
    const unitLabel = product.einheit || 'Quadratmeter';
    // Zweites Feld ausblenden wenn: kein Unit ODER (paketinhalt=1 UND Labels identisch)
    const showBothFields = showUnit && !(paketinhalt === 1 && packageLabel === unitLabel);

    // Calculate total content and price
    const totalContent = packages * paketinhalt;
    const totalPrice = totalContent * price;

    // Update units when packages change
    const handlePackagesChange = (newPackages: number) => {
      const validPackages = Math.max(1, newPackages);
      setPackages(validPackages);
      setUnits(validPackages * paketinhalt);
    };

    // Update packages when units change
    const handleUnitsChange = (newUnits: number) => {
      const validUnits = Math.max(paketinhalt, newUnits);
      setUnits(validUnits);
      const calculatedPackages = Math.ceil(validUnits / paketinhalt);
      setPackages(calculatedPackages);
    };

    const handleAddToCart = () => {
      try {
        console.log('🛒 Simple Product Add to Cart:', {
          productName: product.name,
          productId: product.id,
          packages: packages,
          units: totalContent,
          price: price
        });

        setIsAdding(true);

        // IMPORTANT: Use addToCart, NOT addSetToCart for simple products
        addToCart(product, packages);

        // GA4 add_to_cart — Standard-Produkt (kein Set)
        const paketpreis = price * paketinhalt;
        const ga4Item = mapProductToItem(product, packages, {
          pricePerUnitOverride: paketpreis,
        });
        track.addToCart([ga4Item], paketpreis * packages);

        // Open cart drawer to show success
        openCartDrawer();

        setTimeout(() => setIsAdding(false), 1000);
      } catch (error) {
        console.error('❌ Fehler beim Hinzufügen zum Warenkorb:', error);
        showError(
          'Fehler beim Hinzufügen zum Warenkorb. Bitte versuchen Sie es erneut.',
          'Fehler'
        );
        setIsAdding(false);
      }
    };

    const handleRequestQuote = () => {
      window.location.href = '/kontakt';
    };

    return (
      <div className="space-y-4">
        {/* Top Section: Content and Price per Unit - eigener Hintergrund */}
        <div className="bg-[#e8e8e8] rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 px-1 sm:px-2">
            <div className="text-dark text-xs sm:text-sm md:text-base font-normal min-w-0">
              {showUnit
                ? <>Inhalt: {totalContent.toFixed(1).replace('.', ',')}{einheitShort} = {totalPrice.toFixed(2).replace('.', ',')} €</>
                : <>{packages} {verpackungsart} = {totalPrice.toFixed(2).replace('.', ',')} €</>
              }
            </div>
            <div className="text-dark text-2xl sm:text-3xl md:text-4xl font-bold flex-shrink-0">
              {showUnit
                ? <>{price.toFixed(2).replace('.', ',')} <span className="text-lg sm:text-xl md:text-2xl">€/{einheitShort}</span></>
                : <>{totalPrice.toFixed(2).replace('.', ',')} <span className="text-lg sm:text-xl md:text-2xl">€</span></>
              }
            </div>
          </div>
        </div>

        {/* Quantity, Total, Buttons - eigener Hintergrund */}
        <div className="bg-[#e8e8e8] rounded-2xl p-6 space-y-4">
        {/* Quantity Selectors: Packages and Units */}
        <div className={`grid ${showBothFields ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
          {/* Packages Selector */}
          <div className="text-center">
            <div className="text-dark text-base font-normal mb-3">{packageLabel}</div>
            <div className="flex items-center justify-center gap-0">
              <button
                onClick={() => handlePackagesChange(packages - 1)}
                className="w-12 h-12 bg-white border border-gray-300 rounded-l-lg
                         hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <MinusIcon className="w-5 h-5 text-dark" />
              </button>
              <input
                type="number"
                value={packages}
                onChange={(e) => handlePackagesChange(parseInt(e.target.value) || 1)}
                className="w-28 h-12 text-center border-t border-b border-gray-300 bg-white
                         text-lg font-medium text-dark focus:outline-none"
                min="1"
              />
              <button
                onClick={() => handlePackagesChange(packages + 1)}
                className="w-12 h-12 bg-white border border-gray-300 rounded-r-lg
                         hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <PlusIcon className="w-5 h-5 text-dark" />
              </button>
            </div>
          </div>

          {/* Units Selector - nur wenn sinnvoll (andere Einheit oder paketinhalt > 1) */}
          {showBothFields && (
          <div className="text-center">
            <div className="text-dark text-base font-normal mb-3">
              {unitLabel}
            </div>
            <div className="flex items-center justify-center gap-0">
              <button
                onClick={() => handleUnitsChange(units - paketinhalt)}
                className="w-12 h-12 bg-white border border-gray-300 rounded-l-lg
                         hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <MinusIcon className="w-5 h-5 text-dark" />
              </button>
              <input
                type="number"
                value={units}
                step={paketinhalt}
                onChange={(e) => handleUnitsChange(parseFloat(e.target.value) || paketinhalt)}
                className="w-28 h-12 text-center border-t border-b border-gray-300 bg-white
                         text-lg font-medium text-dark focus:outline-none"
                min={paketinhalt}
              />
              <button
                onClick={() => handleUnitsChange(units + paketinhalt)}
                className="w-12 h-12 bg-white border border-gray-300 rounded-r-lg
                         hover:bg-gray-50 flex items-center justify-center transition-colors"
              >
                <PlusIcon className="w-5 h-5 text-dark" />
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Total Price with Border Top */}
        <div className="border-t-2 border-gray-400 pt-4">
          <div className="flex items-center justify-between mb-6 px-1 sm:px-2 gap-2">
            <div className="text-dark text-sm sm:text-xl md:text-2xl font-bold min-w-0">
              Gesamtsumme <span className="text-[10px] sm:text-sm md:text-base font-normal">(inkl. MwSt.)</span>
            </div>
            <div className="text-dark text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold flex-shrink-0">
              {totalPrice.toFixed(2).replace('.', ',')} €
            </div>
          </div>

          {/* Action Buttons (gleich wie TotalPrice bei Böden) */}
          <div className="grid grid-cols-2 gap-3 mt-5 mb-4">
            <button
              type="button"
              onClick={handleRequestQuote}
              className="w-full bg-transparent border border-dark hover:bg-[#f5f5f5] text-dark font-semibold text-[9px] sm:text-[10px] md:text-xs rounded-md transition-colors text-center leading-tight"
              style={{ padding: '8px 5px' }}
            >
              Individuelles Angebot anfragen
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`w-full font-semibold text-[9px] sm:text-[10px] md:text-xs rounded-lg transition-all text-center leading-tight ${
                isAdding
                  ? 'bg-[#155724] hover:bg-[#0f4419] text-white'
                  : 'bg-dark hover:bg-[#1a1a1d] active:scale-[0.98] text-white'
              }`}
              style={{ padding: '8px 5px' }}
            >
              {isAdding ? (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Hinzugefügt!
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

          {/* Delivery Info (gleich wie TotalPrice bei Böden) — nur wenn show_lieferzeit aktiv */}
          {product.show_lieferzeit && (
          <div className="text-left text-[#666666] text-[13px] md:text-sm pt-3 mt-3 border-t border-ash">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              <span><span className="font-bold">Lieferzeit:</span> {product.lieferzeit || '3-7 Arbeitstage'} oder im Markt abholen</span>
            </div>
          </div>
          )}
        </div>
        </div>
      </div>
    );
  };

  // Product Details for Simple Layout
  const ProductDetails = () => (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Produktdetails
      </h2>
      {product.description && (
        <div
          className="prose prose-gray max-w-none"
          dangerouslySetInnerHTML={{ __html: product.description }}
        />
      )}
    </div>
  );

  // Simple Product Layout (for accessories)
  const SimpleProductLayout = () => (
    <>
      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8 mb-12 w-full">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Image Gallery - reused */}
          <ImageGallery product={product} />

          {/* Service Icons - only on desktop (on mobile shown after right column) */}
          <div className="hidden lg:block">
            <ServiceIcons />
          </div>

          {/* Product Details - only on desktop (on mobile shown at bottom) */}
          <div className="hidden lg:block">
            <ProductDetails />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Product Info */}
          <SimpleProductInfo />

          {/* Quantity & Add to Cart */}
          <SimpleQuantityAndCart />

          {/* Zahlungsarten – kleine Logo-Reihe wie im Footer */}
          <ZahlungsIcons />

          {/* Service Icons - mobile only */}
          <div className="lg:hidden">
            <ServiceIcons />
          </div>
        </div>
      </div>

      {/* Product Details - mobile only, after grid */}
      <div className="lg:hidden mb-12">
        <ProductDetails />
      </div>
    </>
  );

  // ========== END SIMPLE PRODUCT LAYOUT COMPONENTS ==========

  // Handle sample order - find and add MUSTER product to cart
  const handleOrderSample = async () => {
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

      // GA4 add_to_cart — Muster (price = 0; Aufschlag steckt im Versand, nicht im Item)
      const sampleItem = mapProductToItem(sampleProduct, 1, {
        variant: 'Muster',
        category: 'Muster',
        pricePerUnitOverride: 0,
      });
      track.addToCart([sampleItem], 0);

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
    <div className="min-h-screen bg-gray-50 py-8 overflow-x-hidden">
      <div className="content-container">
        {isAccessory ? (
          // ========== SIMPLE PRODUCT LAYOUT for Accessories ==========
          <SimpleProductLayout />
        ) : (
          // ========== SET-ANGEBOT LAYOUT for Main Products (100% UNCHANGED) ==========
          <>
        {/* Main Product Section - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8 mb-12 w-full">
          {/* LEFT COLUMN - Image Gallery */}
          <div className="space-y-6">
            <ImageGallery product={product} />

            {/* Action Buttons - Only for floor products */}
            {isFloorProduct && (
              <div className="w-full">
                <button
                  onClick={handleOrderSample}
                  disabled={isOrderingSample}
                  className="w-full px-3 sm:px-4 py-3 rounded-lg text-white text-sm sm:text-base font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--color-bg-darkest)' }}
                >
                  {isOrderingSample ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="truncate">Lädt...</span>
                    </>
                  ) : (
                    <>
                      <Image
                        src="/images/Icons/musterbox-weiss.png"
                        alt="Musterbox"
                        width={20}
                        height={20}
                        className="w-5 h-5 object-contain flex-shrink-0"
                      />
                      <span className="truncate">Kostenloses Muster bestellen</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Service Icons - only on desktop (on mobile shown after Zahlungsarten) */}
            <div className="hidden lg:block space-y-0 text-base sm:text-lg lg:text-2xl text-gray-700">
              <div className="flex items-center gap-2 sm:gap-3 pb-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/telefon-schieferschwarz.png"
                  alt="Telefon"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Persönliche Beratung unter 02433938884</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/lager-schieferschwarz.png"
                  alt="Lager"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Kostenlose Einlagerung bis zu 12 Monate</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/termin-schieferschwarz.png"
                  alt="Termin"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Lieferung zum Wunschtermin</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 pt-3">
                <Image
                  src="/images/Icons/lieferung-schieferschwarz.png"
                  alt="Lieferung"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Kostenlose Lieferung ab 999€</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Product Info & Cart */}
          <div className="space-y-6">
            <ProductInfo
              product={product}
              daemmungProduct={daemmungProduct}
              sockelleisteProduct={sockelleisteProduct}
              daemmungOptions={daemmungOptions}
              sockelleisteOptions={sockelleisteOptions}
              onProductSelection={handleProductSelection}
              comparisonPriceTotal={prices?.comparisonPriceTotal || undefined}
              totalDisplayPrice={prices?.totalDisplayPrice}
              savingsAmount={prices?.savings || undefined}
              savingsPercent={prices?.savingsPercent}
              daemmungSetPricePerUnit={prices?.daemmungSetPricePerUnit || 0}
              daemmungRegularPricePerUnit={prices?.daemmungRegularPricePerUnit || 0}
              sockelleisteSetPricePerUnit={prices?.sockelleisteSetPricePerUnit || 0}
              sockelleisteRegularPricePerUnit={prices?.sockelleisteRegularPricePerUnit || 0}
            />

            {/* Quantity + Price Container with Gray Background */}
            <div className="bg-ash rounded-md p-4">
              {/* Quantity Selector */}
              <QuantitySelector
                paketinhalt={paketinhalt}
                einheit={einheit}
                einheitFull={product.einheit || undefined}
                verpackungsartFull={product.verpackungsart || undefined}
                onQuantityChange={handleQuantityChange}
              />

              {/* Total Price with integrated buttons */}
              <TotalPrice
                quantities={quantities}
                prices={prices}
                einheit={einheit}
                product={product}
                selectedDaemmung={selectedDaemmung}
                selectedSockelleiste={selectedSockelleiste}
                daemmungProduct={daemmungProduct}
                sockelleisteProduct={sockelleisteProduct}
                lieferzeit={product.lieferzeit || '3-7 Arbeitstage'}
                showLieferzeit={!!product.show_lieferzeit}
              />
            </div>

            {/* Zahlungsarten – kleine Logo-Reihe wie im Footer */}
            <ZahlungsIcons />

            {/* Service Icons - mobile only (on desktop shown in left column) */}
            <div className="lg:hidden space-y-0 text-base sm:text-lg text-gray-700">
              <div className="flex items-center gap-2 sm:gap-3 pb-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/telefon-schieferschwarz.png"
                  alt="Telefon"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Persönliche Beratung unter 02433938884</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/lager-schieferschwarz.png"
                  alt="Lager"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Kostenlose Einlagerung bis zu 12 Monate</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 py-3 border-b-2" style={{ borderBottomColor: 'var(--color-bg-gray)' }}>
                <Image
                  src="/images/Icons/termin-schieferschwarz.png"
                  alt="Termin"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Lieferung zum Wunschtermin</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 pt-3">
                <Image
                  src="/images/Icons/lieferung-schieferschwarz.png"
                  alt="Lieferung"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                />
                <span className="break-words">Kostenlose Lieferung ab 999€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zubehör Slider Section */}
        <div id="zubehoer-section" className="mb-8">
          <ZubehoerSlider product={product} selectedSockelleiste={selectedSockelleiste} />
        </div>

        <ProductTabs product={product} />
          </>
        )}
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
}
