'use client';

import Image from 'next/image';
import { Box, FileText } from 'lucide-react';
import StarRating from '@/components/footer/StarRating';
import { TRUSTED_SHOPS_BEWERTUNG } from '@/lib/footer-nav';
import type { ProductMedia } from '@/lib/product-media';
import type { StoreApiProduct } from '@/lib/woocommerce';

interface ProductSummaryProps {
  product: StoreApiProduct;
  features: string[];
  media: ProductMedia;
  showSampleButton: boolean;
  isOrderingSample: boolean;
  onOrderSample: () => void;
}

export default function ProductSummary({
  product,
  features,
  media,
  showSampleButton,
  isOrderingSample,
  onOrderSample,
}: ProductSummaryProps) {
  const { note, maximum } = TRUSTED_SHOPS_BEWERTUNG;
  const noteText = note.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const subtitle = product.show_text_produktuebersicht ? product.text_produktuebersicht : null;

  return (
    <div className="min-w-0">
      {product.categories?.[0] && <p className="text-sm text-mid">{product.categories[0].name}</p>}
      <h1 className="mt-1 text-2xl font-bold leading-tight text-dark lg:text-[32px]">{product.name}</h1>
      {subtitle && <p className="mt-2 text-sm text-mid">{subtitle}</p>}

      {/* Bewusst als Shopbewertung beschriftet: keine Bewertung dieses Produkts */}
      <div
        className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mid"
        role="img"
        aria-label={`Trusted Shops Shopbewertung ${noteText} von ${maximum}`}
      >
        <StarRating note={note} maximum={maximum} />
        <span><span className="font-bold text-dark">{noteText}</span> Shopbewertung bei Trusted Shops</span>
      </div>

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
          <button
            type="button"
            onClick={onOrderSample}
            disabled={isOrderingSample}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-cta-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image src="/images/Icons/musterbox-weiss.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
            {isOrderingSample ? 'Lädt …' : 'Kostenlose Muster bestellen'}
          </button>
        )}

        {media.visualizer && (
          <a
            href={media.visualizer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-brand bg-white px-4 py-3 text-sm font-bold text-brand transition-colors hover:bg-brand/5"
          >
            <Box className="h-5 w-5" aria-hidden="true" />
            Boden virtuell verlegen
          </a>
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
