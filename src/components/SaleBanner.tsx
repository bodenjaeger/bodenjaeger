'use client';

import Link from 'next/link';
import { SALE_BANNER } from '@/content/sale-banner';
import { isAktionActive } from '@/lib/promo';

// Globaler Aktions-Balken, Inhalt und An/Aus in `src/content/sale-banner.ts`.
// Wird als oberste Zeile im Shop-Header gerendert (Header.tsx) und bleibt beim
// Scrollen sichtbar.
export default function SaleBanner() {
  const { enabled, onlyWhilePaketAktion, textMobile, textDesktop, href, backgroundColor, textColor } =
    SALE_BANNER;

  if (!enabled) return null;
  if (onlyWhilePaketAktion && !isAktionActive()) return null;

  const content = (
    <>
      {/* Mobil: kompakt, einzeilig */}
      <span className="md:hidden">{textMobile}</span>
      {/* Desktop: vollständiger Text */}
      <span className="hidden md:inline">{textDesktop}</span>
    </>
  );

  const className = 'block w-full px-4 py-2 text-center text-sm font-bold md:py-2.5 md:text-base';
  const style = { backgroundColor, color: textColor };

  return href ? (
    <Link href={href} className={`${className} hover:underline`} style={style}>
      {content}
    </Link>
  ) : (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
