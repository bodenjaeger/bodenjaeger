import Link from 'next/link';
import PromoImage from './PromoImage';
import {
  PROMO_DISCOUNT_LABEL,
  PROMO_IMAGES,
  PROMO_PATH,
  PROMO_RED,
  PROMO_TILE_ALT,
} from '@/lib/black-weeks';

/**
 * Aktionskachel im Produktgrid — Rundung und Hover wie
 * `UnifiedProductCard`, ab md so hoch wie die Nachbarkarten.
 *
 * Die ganze Kachel ist über einen gestreckten Link klickbar.
 */
export default function PromoTile() {
  return (
    <article className="relative aspect-[600/857] overflow-hidden rounded-2xl bg-black transition-shadow duration-300 hover:shadow-lg md:aspect-auto md:h-full md:min-h-full">
      {/* Füllt die Kachel; rechts verankert, damit die Schrift bei schmalen Kacheln sichtbar bleibt. */}
      <PromoImage
        src={PROMO_IMAGES.tile}
        alt={PROMO_TILE_ALT}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        unoptimized
        imageClassName="object-cover object-right"
        fallback={
          <div
            aria-hidden="true"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white"
            style={{ backgroundColor: PROMO_RED }}
          >
            <span className="text-sm font-bold uppercase tracking-widest">Black Weeks</span>
            <span className="text-5xl font-bold leading-none">Bis zu {PROMO_DISCOUNT_LABEL}</span>
            <span className="text-lg font-bold">Laminat · Vinyl · Parkett</span>
            <span className="mt-2 rounded bg-white px-4 py-2 font-bold" style={{ color: PROMO_RED }}>
              Mehr erfahren →
            </span>
          </div>
        }
      />

      <Link href={PROMO_PATH} aria-label={PROMO_TILE_ALT} className="absolute inset-0" />
    </article>
  );
}
