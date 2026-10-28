import Link from 'next/link';
import { PROMO_DISCOUNT_LABEL, PROMO_PATH, PROMO_RED } from '@/lib/black-weeks';

export interface BlackWeeksBannerProps {
  /** Enddatum, z. B. „30.11.“ — `null`, wenn `PROMO_END` fehlt (nur in der Vorschau möglich). */
  endLabel: string | null;
}

/**
 * Bannerleiste der Black Weeks, oberste Zeile im Shop-Header.
 *
 * Ob sie erscheint, entscheidet der Server (`isPromoActive()` in layout.tsx)
 * — die Leiste steht damit schon im HTML und schiebt nichts nach.
 *
 * Die ganze Leiste ist klickbar über einen gestreckten Link (`after:inset-0`).
 */
export default function BlackWeeksBanner({ endLabel }: BlackWeeksBannerProps) {
  return (
    <div
      className="relative flex items-center justify-center gap-3 px-4 py-2 text-sm font-bold text-white md:py-2.5 md:text-base"
      style={{ backgroundColor: '#000000' }}
    >
      <Link
        href={PROMO_PATH}
        className="min-w-0 truncate whitespace-nowrap after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[-4px] focus-visible:after:outline-white"
      >
        {/* Mobil: kurz und einzeilig */}
        <span className="md:hidden">Black Weeks: bis zu {PROMO_DISCOUNT_LABEL}</span>
        <span className="hidden md:inline">
          Black Weeks: Bis zu {PROMO_DISCOUNT_LABEL} auf Laminat, Vinyl &amp; Parkett – nur bis {endLabel ?? '[ENDDATUM]'}
        </span>
      </Link>
      <span aria-hidden="true" className="md:hidden">
        →
      </span>
      <span
        aria-hidden="true"
        className="hidden shrink-0 rounded bg-white px-3 py-1 text-sm md:inline-block"
        style={{ color: PROMO_RED }}
      >
        Jetzt zugreifen
      </span>
    </div>
  );
}
