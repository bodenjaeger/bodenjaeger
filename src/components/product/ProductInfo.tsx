'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import SetAngebot, { type SparpaketAnzeige } from './SetAngebot';
import SetAngebotMobile from './SetAngebotMobile';
import { getBodenKategorie } from './ProduktBreadcrumb';

interface ProductInfoProps {
  product: StoreApiProduct;
  daemmungProduct?: StoreApiProduct | null;
  sockelleisteProduct?: StoreApiProduct | null;
  daemmungOptions?: StoreApiProduct[];
  sockelleisteOptions?: StoreApiProduct[];
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  // Correct prices from ProductPageContent calculations
  comparisonPriceTotal?: number;
  totalDisplayPrice?: number;
  savingsAmount?: number;
  savingsPercent?: number;
  // ✅ NEU: Einzelpreise für Dämmung und Sockelleiste (vom Parent berechnet)
  daemmungSetPricePerUnit?: number;
  daemmungRegularPricePerUnit?: number;
  sockelleisteSetPricePerUnit?: number;
  sockelleisteRegularPricePerUnit?: number;
  sparpaket?: SparpaketAnzeige | null;  // Klebe-Vinyl Sparpaket
}

// Kopf (Titel, Art.-Nr., Vorteile) und Set-Box stehen im Layout in getrennten Spalten.
// Beide bekommen dieselben Props wie früher ProductInfo; die Ableitung unten ist unverändert.
function ableiten({
  product,
  daemmungProduct,
  sockelleisteProduct,
  sparpaket = null
}: ProductInfoProps) {
  // Klebe-Vinyl: Titel "Sparpaket" statt Backend-Titel ("Komplett-Set")
  const setangebotTitel = sparpaket ? 'Sparpaket' : product.setangebot_titel || undefined;

  // Extract features from short_description or jaeger_meta
  const getFeaturesFromDescription = (html: string): string[] => {
    // Strategy 1: Extract from <li> tags
    const matches = html.match(/<li>(.*?)<\/li>/g);
    if (matches) {
      return matches.map(match => match.replace(/<\/?li>/g, '').trim()).slice(0, 3);
    }
    // Strategy 2: Bullet points as plain text (• or -)
    const lines = html
      .replace(/<[^>]*>/g, '')
      .split(/\n|<br\s*\/?>/)
      .map(line => line.replace(/^[\s•\-–]+/, '').trim())
      .filter(line => line.length > 0);
    if (lines.length > 0) {
      return lines.slice(0, 3);
    }
    return [];
  };

  let features: string[] = [];

  if (product.short_description) {
    features = getFeaturesFromDescription(product.short_description);
  }

  // ✅ Fallback: Create features from ROOT-LEVEL FIELDS if no features found
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

  // Set-Preis (Boden im Set) = aktueller WooCommerce-Preis (product.price)
  const basePrice = product.price || 0;

  // Durchstrichener Preis (Boden-Karte) = WooCommerce Regulärer Preis
  const regularPrice = product.uvp || product.regular_price || product.price || 0;

  // Gesamt-Vergleichspreis = regulärer Boden-Preis + Standard-Dämmung + Standard-Sockelleiste
  const bodenRegular = product.uvp || product.regular_price || product.price || 0;
  const standardDaemmungPrice = daemmungProduct?.price || 0;
  const standardSockelleistePrice = sockelleisteProduct?.price || 0;
  const gesamtVergleichspreisProM2 = product.setangebot_einzelpreis ||
    (bodenRegular + standardDaemmungPrice + standardSockelleistePrice);
  const einheit = product.einheit_short || 'm²';
  const productImage = product.images && product.images.length > 0
    ? product.images[0].src
    : '/images/placeholder.jpg';

  // ✅ Dämmung information from loaded product - USE ROOT-LEVEL FIELDS
  const daemmungName = daemmungProduct?.name || 'Trittschalldämmung';
  const daemmungImage = daemmungProduct?.images && daemmungProduct.images.length > 0
    ? daemmungProduct.images[0].src
    : '/images/placeholder.jpg';
  const daemmungVE = daemmungProduct?.paketinhalt
    ? `${daemmungProduct.paketinhalt}${daemmungProduct.einheit_short || 'm²'}`
    : undefined;

  // ✅ Sockelleiste information from loaded product - USE ROOT-LEVEL FIELDS
  const sockelleisteName = sockelleisteProduct?.name || 'Sockelleiste';
  const sockelleisteImage = sockelleisteProduct?.images && sockelleisteProduct.images.length > 0
    ? sockelleisteProduct.images[0].src
    : '/images/placeholder.jpg';
  const sockelleisteVE = sockelleisteProduct?.paketinhalt
    ? `${sockelleisteProduct.paketinhalt}${sockelleisteProduct.einheit_short || 'lfm'}`
    : undefined;
  const sockelleisteEinheit = sockelleisteProduct?.einheit_short || 'lfm';

  // ✅ PREISE KOMMEN VON PARENT (ProductPageContent) - KEINE lokale Berechnung!
  // Diese Werte wurden bereits im Parent korrekt berechnet

  return {
    setangebotTitel,
    features,
    basePrice,
    regularPrice,
    gesamtVergleichspreisProM2,
    einheit,
    productImage,
    daemmungName,
    daemmungImage,
    daemmungVE,
    sockelleisteName,
    sockelleisteImage,
    sockelleisteVE,
    sockelleisteEinheit,
  };
}

export function ProductInfoKopf({ children, ...props }: ProductInfoProps & { children?: ReactNode }) {
  const { product } = props;
  const { features } = ableiten(props);
  const kategorie = getBodenKategorie(product);

  return (
    <div>
      {/* Kategorie-Label steht VOR der H1: Roomvo liest die Art.-Nr. aus `h1 + div.text-sm.text-gray-600` */}
      {kategorie && (
        <div className="text-sm text-mid mb-1">{kategorie.name}</div>
      )}

      {/* Product Title */}
      <h1 className="text-3xl xl:text-4xl font-bold text-dark">
        {product.name}
      </h1>

      {/* Article Number – muss direkt auf die H1 folgen (Roomvo-Produktkennung) */}
      <div className="text-sm text-gray-600 mt-2">
        Art.Nr.: {product.sku || 'N/A'}
      </div>

      {/* Features List */}
      {features.length > 0 && (
        <div className="space-y-2 mt-5">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Image
                src="/images/Icons/haken-rot.png"
                alt="Check"
                width={20}
                height={20}
                className="flex-shrink-0 mt-0.5"
              />
              <span className="text-gray-700 text-sm leading-relaxed">
                {feature}
              </span>
            </div>
          ))}
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function ProductSetAngebot(props: ProductInfoProps) {
  const {
    daemmungOptions = [],
    sockelleisteOptions = [],
    onProductSelection,
    comparisonPriceTotal,
    totalDisplayPrice,
    savingsAmount,
    savingsPercent,
    daemmungSetPricePerUnit = 0,
    daemmungRegularPricePerUnit = 0,
    sockelleisteSetPricePerUnit = 0,
    sockelleisteRegularPricePerUnit = 0,
    sparpaket = null,
    product,
  } = props;
  const d = ableiten(props);

  return (
    <>
      {/* Set Angebot Component - Desktop */}
      <div className="hidden md:block">
        <SetAngebot
          setangebotTitel={d.setangebotTitel}
          productName={product.name}
          productImage={d.productImage}
          basePrice={d.basePrice}
          regularPrice={d.regularPrice}
          gesamtVergleichspreisProM2={d.gesamtVergleichspreisProM2}
          einheit={d.einheit}
          daemmungName={d.daemmungName}
          daemmungImage={d.daemmungImage}
          daemmungSetPricePerUnit={daemmungSetPricePerUnit}
          daemmungRegularPricePerUnit={daemmungRegularPricePerUnit}
          daemmungVE={d.daemmungVE}
          daemmungOptions={daemmungOptions}
          sockelleisteName={d.sockelleisteName}
          sockelleisteImage={d.sockelleisteImage}
          sockelleisteSetPricePerUnit={sockelleisteSetPricePerUnit}
          sockelleisteRegularPricePerUnit={sockelleisteRegularPricePerUnit}
          sockelleisteVE={d.sockelleisteVE}
          sockelleisteEinheit={d.sockelleisteEinheit}
          sockelleisteOptions={sockelleisteOptions}
          onProductSelection={onProductSelection}
          comparisonPriceTotal={comparisonPriceTotal}
          totalDisplayPrice={totalDisplayPrice}
          savingsAmount={savingsAmount}
          savingsPercent={savingsPercent}
          sparpaket={sparpaket}
        />
      </div>

      {/* Set Angebot Component - Mobile */}
      <div className="md:hidden">
        <SetAngebotMobile
          setangebotTitel={d.setangebotTitel}
          productName={product.name}
          productImage={d.productImage}
          basePrice={d.basePrice}
          regularPrice={d.regularPrice}
          einheit={d.einheit}
          daemmungName={d.daemmungName}
          daemmungImage={d.daemmungImage}
          daemmungSetPricePerUnit={daemmungSetPricePerUnit}
          daemmungRegularPricePerUnit={daemmungRegularPricePerUnit}
          sockelleisteName={d.sockelleisteName}
          sockelleisteImage={d.sockelleisteImage}
          sockelleisteSetPricePerUnit={sockelleisteSetPricePerUnit}
          sockelleisteRegularPricePerUnit={sockelleisteRegularPricePerUnit}
          sockelleisteEinheit={d.sockelleisteEinheit}
          comparisonPriceTotal={comparisonPriceTotal}
          totalDisplayPrice={totalDisplayPrice}
          savingsPercent={savingsPercent}
          daemmungOptions={daemmungOptions}
          sockelleisteOptions={sockelleisteOptions}
          onProductSelection={onProductSelection}
          sparpaket={sparpaket}
        />
      </div>
    </>
  );
}
