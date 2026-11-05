'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { track } from '@/lib/analytics/track';
import { mapProductToItem } from '@/lib/analytics/mapItem';
import { formatPrice } from '@/lib/cart-utils';
import type { StoreApiProduct } from '@/lib/woocommerce';
import BuyBoxServices from './BuyBoxServices';
import MobileBuyBar from './MobileBuyBar';
import QuantitySelector from './QuantitySelector';

/** Kaufbox für Produkte ohne Set: Zubehör, Werkzeug, Kleber usw. */
export default function AccessoryBuyBox({ product }: { product: StoreApiProduct }) {
  const { addToCart, openCartDrawer } = useCart();
  const cartButtonRef = useRef<HTMLButtonElement>(null);

  const price = product.price || 0;
  const paketinhalt = product.paketinhalt || 1;
  const rawEinheit = product.einheit_short || '';
  const hasUnit = rawEinheit !== '-' && rawEinheit.trim() !== '';
  const verpackung = product.verpackungsart_short || 'Pak.';
  const regularPrice = product.uvp || product.regular_price || price;
  const rabatt = regularPrice > price ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

  const [packages, setPackages] = useState(1);
  const total = packages * paketinhalt * price;

  const handleAddToCart = () => {
    addToCart(product, packages);
    const paketpreis = price * paketinhalt;
    track.addToCart([mapProductToItem(product, packages, { pricePerUnitOverride: paketpreis })], paketpreis * packages);
    openCartDrawer();
  };

  return (
    <>
      <div className="flex items-end justify-between gap-3 border-b border-ash pb-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-dark">Preis</p>
          {rabatt > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mid">
              <span className="rounded bg-brand px-1.5 py-0.5 font-bold text-white">-{rabatt}%</span>
              <span>statt <span className="line-through">{formatPrice(hasUnit ? regularPrice : regularPrice * paketinhalt)} €</span></span>
            </p>
          )}
        </div>
        <p className="whitespace-nowrap font-bold">
          <span className="text-2xl text-brand">{formatPrice(hasUnit ? price : price * paketinhalt)} €</span>
          <span className="text-sm font-normal text-mid"> /{hasUnit ? rawEinheit : verpackung}</span>
        </p>
      </div>

      <QuantitySelector
        paketinhalt={paketinhalt}
        einheit={rawEinheit || '-'}
        einheitFull={product.einheit || undefined}
        verpackungsartFull={product.verpackungsart || undefined}
        showVerschnitt={false}
        onQuantityChange={(newPackages) => setPackages(newPackages)}
      />

      <div>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-pale px-3 py-2.5">
          <p className="min-w-0 text-sm text-dark">Gesamtpreis <span className="text-xs">(inkl. MwSt.)</span></p>
          <p className="whitespace-nowrap text-[28px] font-bold leading-none text-dark sm:text-3xl">{formatPrice(total)} €</p>
        </div>
        <button
          ref={cartButtonRef}
          type="button"
          onClick={handleAddToCart}
          className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-dark text-base font-bold text-white transition-all hover:bg-[#1a1a1d] active:scale-[0.98]"
        >
          <Image src="/images/Icons/warenkorb-weiss.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          In den Warenkorb
        </button>
      </div>

      <BuyBoxServices product={product} />

      <MobileBuyBar
        targetRef={cartButtonRef}
        price={`${formatPrice(total)} €`}
        details={`${packages} ${verpackung} · inkl. MwSt.`}
        onAction={handleAddToCart}
        action={
          <>
            <Image src="/images/Icons/warenkorb-weiss.png" alt="" width={20} height={20} className="h-5 w-5 max-[419px]:hidden" />
            <span><span className="max-[359px]:hidden">In den </span>Warenkorb</span>
          </>
        }
      />
    </>
  );
}
