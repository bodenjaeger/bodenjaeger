'use client';

import Link from 'next/link';

interface LoadMoreProps {
  /** Erste angezeigte Position (1-basiert) */
  from: number;
  /** Letzte angezeigte Position */
  to: number;
  total: number;
  /** Gibt es eine weitere Seite? Nicht aus der Anzahl ableiten: doppelte Produkte zwischen Seiten verfälschen sie. */
  hasMore: boolean;
  pending?: boolean;
  /** Echter Link auf die nächste Seite (für Google und ohne JavaScript) */
  href?: string;
  onLoadMore: () => void;
}

/** „1–24 von 78 Produkten“, Fortschrittsbalken und „Weitere anzeigen“. */
export default function LoadMore({ from, to: shownTo, total, hasMore, pending = false, href, onLoadMore }: LoadMoreProps) {
  if (total === 0) return null;
  const to = hasMore ? Math.min(shownTo, total) : total;
  const percent = Math.round((to / total) * 100);
  const buttonClass =
    'mt-1 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-lg bg-dark px-6 text-sm font-bold text-white transition-colors hover:bg-[#d11820]';

  return (
    <div className="mx-auto mb-4 flex max-w-sm flex-col items-center gap-3 text-center">
      <p className="text-sm text-mid" aria-live="polite">
        {from > 1 ? `${from}–${to}` : to} von {total} {total === 1 ? 'Produkt' : 'Produkten'}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ash" aria-hidden="true">
        <div className="h-full rounded-full bg-dark transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      {hasMore && (href ? (
        <Link
          href={href}
          scroll={false}
          onClick={(e) => {
            e.preventDefault();
            if (!pending) onLoadMore();
          }}
          aria-disabled={pending}
          className={`${buttonClass} ${pending ? 'cursor-wait opacity-70' : ''}`}
        >
          {pending ? 'Lädt …' : 'Weitere anzeigen'}
        </Link>
      ) : (
        <button type="button" onClick={onLoadMore} className={buttonClass}>
          Weitere anzeigen
        </button>
      ))}
    </div>
  );
}
