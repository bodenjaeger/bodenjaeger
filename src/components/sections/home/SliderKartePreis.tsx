'use client';

import type { StoreApiProduct } from '@/lib/woocommerce';
import { useSparpaketStreichpreisProM2, sparpaketRabattProzent } from '@/hooks/useSparpaketStreichpreisProM2';

/**
 * Preisanzeige und Sale-Badge der Karten im Sale- und Bestseller-Slider der Startseite.
 * Eigene Komponenten, weil der Klebe-Vinyl-Streichpreis einen Hook braucht und die
 * Slider ihre Karten direkt in einer Schleife rendern.
 */

/** Preisanzeige – Klebe-Vinyl: Streichpreis = Boden + Standard-Sockelleiste + Bauchemie. */
export function SliderPreis({ product }: { product: StoreApiProduct }) {
  const sparpaketStreichpreisProM2 = useSparpaketStreichpreisProM2(product);

  const unit = product.einheit_short || 'm²';
  const price = product.price;
  // Streichpreis: Bei Set-Produkten = setangebot_einzelpreis (Vergleichspreis inkl. Zusatzprodukte)
  const isSetProduct = product.show_setangebot && product.setangebot_einzelpreis;
  const stattPrice = isSetProduct
    ? (sparpaketStreichpreisProM2 ?? (product.setangebot_einzelpreis || 0))
    : (product.regular_price || 0);
  const hasDiscount = stattPrice > price;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-900 font-medium">{isSetProduct ? 'Set-Preis' : 'Preis'}</span>
        <div className="flex flex-col items-end">
          {hasDiscount && (
            <span className="text-gray-500 text-sm line-through">
              {stattPrice.toFixed(2).replace('.', ',')} €/{unit}
            </span>
          )}
          <span className={`font-bold text-xl ${hasDiscount ? 'text-red-600' : 'text-gray-900'}`}>
            {price.toFixed(2).replace('.', ',')} €/{unit}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Sale-Badge – Klebe-Vinyl: höherer Wert aus Backend-Prozent und Sparpaket-Ersparnis. */
export function SliderSaleBadge({ product, backendProzent }: { product: StoreApiProduct; backendProzent: number }) {
  const sparpaketStreichpreisProM2 = useSparpaketStreichpreisProM2(product);
  const percent = sparpaketRabattProzent(sparpaketStreichpreisProM2, product.price || 0, backendProzent);

  return percent > 0 ? (
    <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-sm shadow-md w-fit">
      -{Math.round(percent)}%
    </div>
  ) : null;
}
