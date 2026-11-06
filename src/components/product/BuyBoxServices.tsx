import { Package, PackageCheck, Phone, Truck } from 'lucide-react';
import { formatLieferzeit } from '@/lib/product-features';
import type { StoreApiProduct } from '@/lib/woocommerce';
import ZahlungsIcons from './ZahlungsIcons';

/** Liefer- und Serviceangaben samt Zahlarten, unten in jeder Kaufbox. */
export default function BuyBoxServices({ product }: { product: StoreApiProduct }) {
  return (
    <>
      <ul className="space-y-2.5 text-sm text-mid">
        {product.show_lieferzeit && (
          <li className="flex items-center gap-3">
            <Truck className="h-5 w-5 flex-shrink-0 text-dark" aria-hidden="true" />
            Lieferzeit: {formatLieferzeit(product.lieferzeit)} oder im Markt abholen
          </li>
        )}
        <li className="flex items-center gap-3">
          <PackageCheck className="h-5 w-5 flex-shrink-0 text-dark" aria-hidden="true" />
          Shopbestellungen ab 999 € versandkostenfrei
        </li>
        <li className="flex items-center gap-3">
          <Package className="h-5 w-5 flex-shrink-0 text-dark" aria-hidden="true" />
          Kostenlose Einlagerung bis zu 12 Monate
        </li>
        <li className="flex items-center gap-3">
          <Phone className="h-5 w-5 flex-shrink-0 text-dark" aria-hidden="true" />
          <a href="tel:+492433938884" className="hover:text-dark">Persönliche Beratung: 02433 938884</a>
        </li>
      </ul>
      <ZahlungsIcons />
    </>
  );
}
