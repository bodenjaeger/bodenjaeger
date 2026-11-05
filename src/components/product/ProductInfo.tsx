'use client';

import type { StoreApiProduct } from '@/lib/woocommerce';
import SetAngebot, { type SparpaketAnzeige } from './SetAngebot';

interface ProductInfoProps {
  product: StoreApiProduct;
  daemmungProduct?: StoreApiProduct | null;
  sockelleisteProduct?: StoreApiProduct | null;
  daemmungOptions?: StoreApiProduct[];
  sockelleisteOptions?: StoreApiProduct[];
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  // Correct prices from ProductPageContent calculations
  savingsPercent?: number;
  // ✅ NEU: Einzelpreise für Dämmung und Sockelleiste (vom Parent berechnet)
  daemmungSetPricePerUnit?: number;
  daemmungRegularPricePerUnit?: number;
  sockelleisteSetPricePerUnit?: number;
  sockelleisteRegularPricePerUnit?: number;
  sparpaket?: SparpaketAnzeige | null;  // Klebe-Vinyl Sparpaket
}

export default function ProductInfo({
  product,
  daemmungProduct,
  sockelleisteProduct,
  daemmungOptions = [],
  sockelleisteOptions = [],
  onProductSelection,
  savingsPercent,
  daemmungSetPricePerUnit = 0,
  daemmungRegularPricePerUnit = 0,
  sockelleisteSetPricePerUnit = 0,
  sockelleisteRegularPricePerUnit = 0,
  sparpaket = null
}: ProductInfoProps) {
  // Klebe-Vinyl: Titel "Sparpaket" statt Backend-Titel ("Komplett-Set")
  const setangebotTitel = sparpaket ? 'Sparpaket' : product.setangebot_titel || undefined;

  // Set-Preis (Boden im Set) = aktueller WooCommerce-Preis (product.price)
  const basePrice = product.price || 0;

  // Durchstrichener Preis (Boden-Karte) = WooCommerce Regulärer Preis
  const regularPrice = product.uvp || product.regular_price || product.price || 0;

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

  return (
    <SetAngebot
      setangebotTitel={setangebotTitel}
      productName={product.name}
      productImage={productImage}
      basePrice={basePrice}
      regularPrice={regularPrice}
      einheit={einheit}
      daemmungName={daemmungName}
      daemmungImage={daemmungImage}
      daemmungSetPricePerUnit={daemmungSetPricePerUnit}
      daemmungRegularPricePerUnit={daemmungRegularPricePerUnit}
      daemmungVE={daemmungVE}
      daemmungOptions={daemmungOptions}
      sockelleisteName={sockelleisteName}
      sockelleisteImage={sockelleisteImage}
      sockelleisteSetPricePerUnit={sockelleisteSetPricePerUnit}
      sockelleisteRegularPricePerUnit={sockelleisteRegularPricePerUnit}
      sockelleisteVE={sockelleisteVE}
      sockelleisteEinheit={sockelleisteEinheit}
      sockelleisteOptions={sockelleisteOptions}
      onProductSelection={onProductSelection}
      savingsPercent={savingsPercent}
      sparpaket={sparpaket}
    />
  );
}
