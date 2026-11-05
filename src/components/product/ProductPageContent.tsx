'use client';

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { calculateSetQuantities, calculateSparpaketQuantities } from '@/lib/setCalculations';
import { KLEBEVINYL_SPARPAKET } from '@/content/klebevinyl-sparpaket';
import type { SparpaketAnzeige } from './SetAngebot';
import {
  FREE_SAMPLE_LIMIT,
  SAMPLE_SHIPPING_SURCHARGE,
  SAMPLE_SLUG_PREFIX,
  findSampleProduct,
  sampleSlugsFor,
} from '@/lib/sampleUtils';
import { useCart } from '@/contexts/CartContext';
import { useAlert } from '@/hooks/useAlert';
import AlertModal from '@/components/AlertModal';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import ImageGallery from './ImageGallery';
import AccessoryBuyBox from './AccessoryBuyBox';
import BuyBoxServices from './BuyBoxServices';
import ProductInfo from './ProductInfo';
import QuantitySelector from './QuantitySelector';
import TotalPrice from './TotalPrice';
import ZubehoerSlider from './ZubehoerSlider';
import ProductSummary from './ProductSummary';
import StickyColumn from './StickyColumn';
import ProductDetailSections from './ProductDetailSections';
import { extractProductFeatures } from '@/lib/product-features';
import type { ProductMedia } from '@/lib/product-media';
import { getPrimaryCategory } from '@/lib/product-category';
import type { TrustedShopsRating } from '@/lib/trusted-shops';

interface ProductPageContentProps {
  product: StoreApiProduct;
  daemmungProduct: StoreApiProduct | null;
  sockelleisteProduct: StoreApiProduct | null;
  daemmungOptions: StoreApiProduct[];
  sockelleisteOptions: StoreApiProduct[];
  sparpaketProducts?: StoreApiProduct[];  // nur Klebe-Vinyl, sonst leer
  media?: ProductMedia;  // optionale PDFs, Video, Visualisierung
  trustedShopsRating?: TrustedShopsRating | null;
}

export default function ProductPageContent({
  product,
  daemmungProduct,
  sockelleisteProduct,
  daemmungOptions,
  sockelleisteOptions,
  sparpaketProducts = [],
  media = {},
  trustedShopsRating = null
}: ProductPageContentProps) {
  // ✅ USE ROOT-LEVEL FIELDS (backend/ROOT_LEVEL_FIELDS.md)
  const paketinhalt = product.paketinhalt || 1;
  const einheit = product.einheit_short || 'm²';

  // Cart context
  const { addSampleToCart, getFreeSamplesRemaining, cartItems, openCartDrawer } = useCart();

  // Warenkorb liegt im Browser: erst nach dem Laden auswerten
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sampleSlugs = sampleSlugsFor(product.slug);
  const sampleInCart = mounted && cartItems.some((item) => item.isSample && sampleSlugs.includes(item.product.slug));
  const freeSamplesRemaining = mounted ? getFreeSamplesRemaining() : FREE_SAMPLE_LIMIT;

  // Alert modal
  const { alertState, showError, closeAlert } = useAlert();

  // Klebe-Vinyl Sparpaket: Produktseite startet mit der Mindestmenge
  const hasSparpaket = sparpaketProducts.length > 0;
  const initialPackages = hasSparpaket ? KLEBEVINYL_SPARPAKET.mindestPakete : 1;

  // State for wanted m² (user input)
  const [wantedM2, setWantedM2] = useState(paketinhalt * initialPackages);

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
    if (product.slug.startsWith(SAMPLE_SLUG_PREFIX)) return false;
    const accessoryCategories = ['zubehoer', 'sockelleisten', 'daemmung'];
    const inAccessoryCategory = (product.categories ?? []).some(cat =>
      accessoryCategories.includes(cat.slug.toLowerCase())
    );
    // Alles ohne Set und ohne Bodenkategorie gilt ebenfalls als Nicht-Bodenbelag
    return inAccessoryCategory || (!isFloorProduct && !hasSparpaket && !daemmungProduct && !sockelleisteProduct);
  }, [product.categories, product.slug, isFloorProduct, hasSparpaket, daemmungProduct, sockelleisteProduct]);

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

  // Klebe-Vinyl Sparpaket: Gebinde je Bestandteil (nur Mengen)
  const sparpaket = useMemo(() => {
    if (!hasSparpaket || !quantities) return null;
    return calculateSparpaketQuantities(quantities.floor.packages, quantities.floor.actualM2, sparpaketProducts);
  }, [hasSparpaket, quantities, sparpaketProducts]);

  // Sparpaket-Zeilen für das Set-Angebot (Zahnspachtel wird nicht angezeigt)
  const sparpaketAnzeige = useMemo((): SparpaketAnzeige | null => {
    if (!sparpaket) return null;
    // Unter Mindestmenge komplett ausblenden (Kundenvorgabe) – Titel "Sparpaket" bleibt
    if (!sparpaket.aktiv) {
      return {
        aktiv: false,
        mindestPakete: KLEBEVINYL_SPARPAKET.mindestPakete,
        fehlendePakete: Math.max(0, KLEBEVINYL_SPARPAKET.mindestPakete - (quantities?.floor.packages ?? 0)),
        zeilen: [],
      };
    }
    const zeilen = KLEBEVINYL_SPARPAKET.bestandteile
      .filter(b => b.imSetAnzeigen)
      .map(b => {
        const positionen = sparpaket.positionen.filter(p => p.typ === b.typ);
        if (positionen.length === 0) return null;
        const first = positionen[0].product;
        return {
          typ: b.typ,
          label: b.label,
          // Gebindegröße aus dem Namen nehmen – Gebinde werden nicht angezeigt
          name: first.name.replace(/\s+\d+([.,]\d+)?\s*kg$/i, ''),
          image: first.images?.[0]?.src || '/images/placeholder.jpg',
          // Streichpreis pro m² Boden: Verbrauch × Preis des großen Gebindes
          regularPreisProM2: b.verbrauchProM2 * (positionen[0].grossesGebinde.price || 0),
        };
      })
      .filter((z): z is NonNullable<typeof z> => z !== null);
    return { aktiv: sparpaket.aktiv, mindestPakete: KLEBEVINYL_SPARPAKET.mindestPakete, fehlendePakete: 0, zeilen };
  }, [sparpaket, quantities?.floor.packages]);

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
    // Klebe-Vinyl Sparpaket (Kundenvorgabe): Bauchemie mit der vorgegebenen Menge pro m² × Preis des
    // großen Gebindes – dieselben Werte wie die Set-Zeilen, nicht die aufgerundeten Gebinde.
    // Unter Mindestmenge fällt die Bauchemie aus dem Streichpreis.
    const sparpaketRegularProM2 = sparpaketAnzeige?.aktiv
      ? sparpaketAnzeige.zeilen.reduce((sum, z) => sum + z.regularPreisProM2, 0)
      : 0;
    const comparisonPriceTotal = quantities.floor.actualM2 * (gesamtStreichpreisProM2 + sparpaketRegularProM2);
    // totalDisplayPrice = Set-Preis (was der Kunde MIT Set bezahlt)
    const totalDisplayPrice = bodenPriceTotal + daemmungSetPrice + sockelleisteSetPrice;
    const savings = comparisonPriceTotal - totalDisplayPrice;
    // Rabatt (Kundenvorgabe): Summe der Einzelpreise gegenüber unserem Verkaufspreis
    const savingsPercent = comparisonPriceTotal > 0 && savings > 0 ? (savings / comparisonPriceTotal) * 100 : 0;

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
  }, [product, quantities, selectedDaemmung, selectedSockelleiste, daemmungProduct, sockelleisteProduct, sparpaketAnzeige]);

  const primaryCategory = getPrimaryCategory(product.categories);
  // Mobil: Fallen Sparpaket-Zeilen weg oder kommen dazu, bleibt +/- an derselben Bildschirmstelle
  const sparpaketZeilen = sparpaketAnzeige?.zeilen.length ?? 0;
  useLayoutEffect(() => {
    const before = quantityTopBefore.current;
    quantityTopBefore.current = null;
    if (before === null || !quantityRef.current || window.innerWidth >= 1024) return;
    const verschoben = quantityRef.current.getBoundingClientRect().top - before;
    if (Math.abs(verschoben) > 1) window.scrollBy({ top: verschoben, behavior: 'instant' });
  }, [sparpaketZeilen]);

  // Brotkrume führt zur zuletzt besuchten Listenseite derselben Kategorie (z. B. ?page=2)
  const categoryPath = primaryCategory ? `/category/${primaryCategory.slug}` : null;
  const [categoryHref, setCategoryHref] = useState(categoryPath);
  useEffect(() => {
    try {
      const letzte = sessionStorage.getItem('letzte-liste');
      if (categoryPath && letzte?.startsWith(`${categoryPath}?`)) setCategoryHref(letzte);
    } catch {
      // Speicher nicht verfügbar: normaler Kategorielink
    }
  }, [categoryPath]);

  const features = useMemo(() => extractProductFeatures(product.short_description), [product.short_description]);

  // Handle quantity changes from QuantitySelector
  const quantityRef = useRef<HTMLDivElement>(null);
  const quantityTopBefore = useRef<number | null>(null);
  const handleQuantityChange = (newPackages: number, newSqm: number) => {
    quantityTopBefore.current = quantityRef.current?.getBoundingClientRect().top ?? null;
    setWantedM2(newSqm);
  };

  // Handle selected products from SetAngebot
  // useCallback: Stabile Referenz verhindert, dass Mobile-SetAngebot's useEffect
  // die Desktop-Auswahl überschreibt (Race Condition)
  const handleProductSelection = useCallback((daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => {
    setSelectedDaemmung(daemmung);
    setSelectedSockelleiste(sockelleiste);
  }, []);


  // Handle sample order - find and add MUSTER product to cart
  const handleOrderSample = async () => {
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

      // GA4 add_to_cart — Muster (price = 0; Aufschlag steckt im Versand, nicht im Item)
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
    <div className={`min-h-screen bg-white py-8 pb-28 overflow-x-clip lg:pb-8`}>
      <div className="content-container">
        {/* Gemeinsame Optik für alle Produkte, nur die Kaufbox unterscheidet sich */}
          <>
            <nav aria-label="Brotkrumen" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-mid">
              <Link href="/" className="hover:text-dark">Startseite</Link>
              {primaryCategory && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <Link href={categoryHref ?? `/category/${primaryCategory.slug}`} className="hover:text-dark">{primaryCategory.name}</Link>
                </>
              )}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-bold text-dark" aria-current="page">{product.name}</span>
            </nav>

            {/* Desktop: Spalten laufen mit und enden bündig, danach folgt das Zubehör */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <StickyColumn keepInPlace className="min-w-0 lg:sticky lg:self-start">
                <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                  <ImageGallery product={product} hideDiscount={!isAccessory} videoUrl={media.video} />
                  <ProductSummary
                    product={product}
                    features={features}
                    media={media}
                    rating={trustedShopsRating}
                    showSampleButton={isFloorProduct}
                    isOrderingSample={isOrderingSample}
                    onOrderSample={handleOrderSample}
                    sampleInCart={sampleInCart}
                    freeSamplesRemaining={freeSamplesRemaining}
                    sampleSurcharge={SAMPLE_SHIPPING_SURCHARGE}
                    onShowCart={openCartDrawer}
                  />
                </div>
              </StickyColumn>

              <StickyColumn className={`min-w-0 lg:sticky lg:self-start ${isAccessory ? '' : 'mt-7'}`}>
              <aside className="space-y-4 rounded-xl border border-ash bg-white p-4 lg:p-5">
                {isAccessory ? (
                  <AccessoryBuyBox product={product} />
                ) : (
                  <>
                <ProductInfo
                  product={product}
                  daemmungProduct={daemmungProduct}
                  sockelleisteProduct={sockelleisteProduct}
                  daemmungOptions={daemmungOptions}
                  sockelleisteOptions={sockelleisteOptions}
                  onProductSelection={handleProductSelection}
                  savingsPercent={prices?.savingsPercent}
                  daemmungSetPricePerUnit={prices?.daemmungSetPricePerUnit || 0}
                  daemmungRegularPricePerUnit={prices?.daemmungRegularPricePerUnit || 0}
                  sockelleisteSetPricePerUnit={prices?.sockelleisteSetPricePerUnit || 0}
                  sockelleisteRegularPricePerUnit={prices?.sockelleisteRegularPricePerUnit || 0}
                  sparpaket={sparpaketAnzeige}
                />

                <div ref={quantityRef}>
                  <QuantitySelector
                    paketinhalt={paketinhalt}
                    einheit={einheit}
                    einheitFull={product.einheit || undefined}
                    verpackungsartFull={product.verpackungsart || undefined}
                    initialPackages={initialPackages}
                    onQuantityChange={handleQuantityChange}
                  />
                </div>

                <TotalPrice
                  quantities={quantities}
                  prices={prices}
                  einheit={einheit}
                  product={product}
                  selectedDaemmung={selectedDaemmung}
                  selectedSockelleiste={selectedSockelleiste}
                  daemmungProduct={daemmungProduct}
                  sockelleisteProduct={sockelleisteProduct}
                  sparpaket={sparpaket}
                />

                <BuyBoxServices product={product} />
                  </>
                )}
              </aside>
              </StickyColumn>
            </div>

            {/* Zubehör erst nach der Kaufbox, damit der Desktop oben ruhig bleibt */}
            <div id="zubehoer-section" className="mt-6 min-w-0 scroll-mt-44 lg:mt-8 lg:scroll-mt-56">
              <ZubehoerSlider product={product} selectedSockelleiste={selectedSockelleiste} />
            </div>

            <ProductDetailSections product={product} features={features} media={media} isFloor={!isAccessory} />
          </>
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
