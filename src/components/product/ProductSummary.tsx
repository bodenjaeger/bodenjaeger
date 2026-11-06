'use client';

import { klickVinylName } from '@/lib/klick-vinyl';
import Image from 'next/image';
import { Check, FileText } from 'lucide-react';
import StarRating from '@/components/footer/StarRating';
import type { TrustedShopsRating } from '@/lib/trusted-shops';
import type { ProductMedia } from '@/lib/product-media';
import type { StoreApiProduct } from '@/lib/woocommerce';

interface ProductSummaryProps {
  product: StoreApiProduct;
  features: string[];
  media: ProductMedia;
  rating: TrustedShopsRating | null;
  showSampleButton: boolean;
  isOrderingSample: boolean;
  onOrderSample: () => void;
  sampleInCart: boolean;
  freeSamplesRemaining: number;
  sampleSurcharge: number;
  onShowCart: () => void;
}

export default function ProductSummary({
  product,
  features,
  media,
  rating,
  showSampleButton,
  isOrderingSample,
  onOrderSample,
  sampleInCart,
  freeSamplesRemaining,
  sampleSurcharge,
  onShowCart,
}: ProductSummaryProps) {
  const noteText = rating?.note.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const subtitle = product.show_text_produktuebersicht ? product.text_produktuebersicht : null;

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold leading-tight text-dark lg:text-[32px]">{klickVinylName(product.name)}</h1>
      {subtitle && <p className="mt-2 text-sm text-mid">{subtitle}</p>}

      {/* Bewusst als Shopbewertung beschriftet: keine Bewertung dieses Produkts */}
      {rating && (
        <div
          className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mid"
          role="img"
          aria-label={`Trusted Shops Shopbewertung ${noteText} von ${rating.maximum}`}
        >
          <StarRating note={rating.note} maximum={rating.maximum} />
          <span><span className="font-bold text-dark">{noteText}</span> Shopbewertung bei Trusted Shops</span>
        </div>
      )}

      {product.sku && <p className="mt-2 text-xs text-mid">Art.-Nr.: {product.sku}</p>}

      {features.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {features.slice(0, 5).map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm leading-snug text-dark">
              <Image src="/images/Icons/haken-rot.png" alt="" width={18} height={18} className="mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 space-y-3">
        {showSampleButton && (
          <div>
            {/* Roomvo setzt „Boden virtuell verlegen“ neben diesen Button und erkennt ihn über
                button:has(img[alt='Musterbox']): Alt-Text und Bild nicht entfernen. Hinterlegt
                Roomvo den Boden nicht, erscheint kein Visualizer-Button. */}
            <div>
              <button
                type="button"
                onClick={sampleInCart ? onShowCart : onOrderSample}
                disabled={isOrderingSample}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  sampleInCart ? 'border-2 border-cta bg-white text-cta hover:bg-cta/5' : 'bg-cta text-white hover:bg-cta-dark'
                }`}
              >
                <Image
                  src="/images/Icons/musterbox-weiss.png"
                  alt="Musterbox"
                  width={20}
                  height={20}
                  className={`h-5 w-5 object-contain ${sampleInCart ? 'hidden' : ''}`}
                />
                {sampleInCart && <Check className="h-5 w-5" aria-hidden="true" />}
                {sampleInCart
                  ? 'Muster im Warenkorb – ansehen'
                  : isOrderingSample
                    ? 'Lädt …'
                    : freeSamplesRemaining > 0
                      ? 'Kostenlose Muster bestellen'
                      : `Muster bestellen (${sampleSurcharge.toFixed(2).replace('.', ',')} € Fracht)`}
              </button>
            </div>
            {sampleInCart && (
              <p className="mt-1.5 text-center text-xs text-mid" role="status">
                {freeSamplesRemaining > 0
                  ? `Noch ${freeSamplesRemaining} ${freeSamplesRemaining === 1 ? 'weiteres Muster' : 'weitere Muster'} versandkostenfrei`
                  : `Jedes weitere Muster: ${sampleSurcharge.toFixed(2).replace('.', ',')} € Fracht`}
              </p>
            )}
          </div>
        )}
      </div>

      {(media.datenblatt || media.verlegeanleitung) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-mid">
          {media.datenblatt && (
            <a href={media.datenblatt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
              <FileText className="h-4 w-4" aria-hidden="true" /> Hersteller-Datenblatt (PDF)
            </a>
          )}
          {media.verlegeanleitung && (
            <a href={media.verlegeanleitung} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand">
              <FileText className="h-4 w-4" aria-hidden="true" /> Verlegeanleitung (PDF)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
