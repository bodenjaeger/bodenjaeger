'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PromoImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Animierte Grafiken am Optimierer vorbei ausliefern — er würde nur das erste Bild behalten. */
  unoptimized?: boolean;
  /** Klassen fürs Bild, Standard `object-cover`. */
  imageClassName?: string;
  /** Wird angezeigt, solange die Grafik fehlt (404) oder lädt. */
  fallback: React.ReactNode;
}

/**
 * Aktionsgrafik mit Platzhalter. Die Bilder legt der Kunde später unter
 * `public/promo/` ab — bis dahin schlägt das Laden fehl, und der Platzhalter
 * bleibt stehen. Sobald die Datei da ist, deckt das Bild ihn ab, ohne
 * Code-Änderung.
 */
export default function PromoImage({ src, alt, sizes, priority, unoptimized, imageClassName = 'object-cover', fallback }: PromoImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <>
      {fallback}
      {!failed && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className={imageClassName}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}
