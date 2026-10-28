'use client';

import { useEffect, useRef, useState } from 'react';
import { PROMO_IMAGES } from '@/lib/black-weeks';

interface PromoHeroProps {
  alt: string;
  /** Sprungziel beim Klick auf die Grafik, z. B. `#angebote`. */
  href: string;
}

/**
 * Hero der Aktionsseite: Querformat ab 768 px, darunter Hochformat.
 *
 * `<picture>` statt zweier `next/image`: Der Browser lädt nur die passende
 * Datei. Die Grafiken sind animiert, der Next-Optimierer würde sie ohnehin
 * unverändert durchreichen. Der Rahmen hat je Breakpoint exakt das
 * Seitenverhältnis der Grafik — nichts wird abgeschnitten.
 *
 * Die Buttons in der Grafik sind nur Bild; klickbar ist die ganze Grafik
 * (Sprung zur Produktliste). Fehlt eine Datei, bleibt der Platzhalter stehen.
 */
export default function PromoHero({ alt, href }: PromoHeroProps) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Scheitert das Laden vor der Hydration, kommt `onError` nie an.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <a
      href={href}
      className="relative block aspect-[800/1143] overflow-hidden md:aspect-[1600/773] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center text-lg font-medium text-gray-400">
          Aktionsgrafik folgt
          <span className="sr-only">: {alt}</span>
        </span>
      ) : (
        <picture>
          <source media="(min-width: 768px)" srcSet={PROMO_IMAGES.heroDesktop} />
          <img
            ref={imgRef}
            src={PROMO_IMAGES.heroMobile}
            alt={alt}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        </picture>
      )}
    </a>
  );
}
