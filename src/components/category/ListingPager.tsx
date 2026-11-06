'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListingPagerProps {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  onSelect: (page: number) => void;
}

const arrowClass =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors';

/** Kompakter Seitenwähler über der Liste: ‹ Seite [n] von N › */
export default function ListingPager({ currentPage, totalPages, hrefFor, onSelect }: ListingPagerProps) {
  if (totalPages < 2) return null;
  return (
    <nav aria-label="Seite wählen" className="flex items-center gap-1.5">
      {currentPage > 1 ? (
        <Link href={hrefFor(currentPage - 1)} aria-label="Vorherige Seite" className={`${arrowClass} hover:border-mid`}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrowClass} opacity-40`}>
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}
      <label className="flex h-11 items-center gap-1.5 rounded-lg border border-ash bg-white px-3 text-sm text-dark">
        <span className="sr-only">Seite</span>
        <span aria-hidden="true">Seite</span>
        <select
          value={currentPage}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="cursor-pointer appearance-none bg-transparent font-bold text-dark focus:outline-none"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <option key={page} value={page}>{page}</option>
          ))}
        </select>
        <span>von {totalPages}</span>
      </label>
      {currentPage < totalPages ? (
        <Link href={hrefFor(currentPage + 1)} aria-label="Nächste Seite" className={`${arrowClass} hover:border-mid`}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={`${arrowClass} opacity-40`}>
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
