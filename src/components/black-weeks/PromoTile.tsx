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
 * Aktionskachel im Produktgrid — Rahmen, Rundung und Hover wie
 * `UnifiedProductCard`, Höhe über das Grid (Zeilenhöhe der Nachbarkarten).
 *
 * Die ganze Kachel ist über einen gestreckten Link klickbar.
 */
export default function PromoTile() {
  return (
    <article className="relative min-h-[420px] overflow-hidden rounded-lg bg-black transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
      {/* Hochformat 600×857 (≈ 0,7) — eine Produktkarte ist etwa 0,6–0,7,
          `object-cover` schneidet also höchstens seitlich wenige Prozent ab. */}
      <PromoImage
        src={PROMO_IMAGES.tile}
        alt={PROMO_TILE_ALT}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        unoptimized
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
