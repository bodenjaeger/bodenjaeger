'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PROMO_DISCOUNT_LABEL, PROMO_IMAGES, PROMO_PATH } from '@/lib/black-weeks';

/* Ein einziges Aktionsbanner statt Slider, solange eine Aktion läuft.
   Desktop: das Black-Weeks-Querformat vollständig.
   Mobil: quadratischer Ausschnitt des Hochformats (von „Black Weeks“ bis
   „Vinyl · Laminat · Parkett“), der eingebrannte Button fällt weg. Darunter
   eine echte Leiste mit Countdown und Button. 20 % = ab Bildzeile 69 von 1143,
   damit oben die kleine Zeile „Black Weeks 2026“ wegfällt. */

function zweistellig(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function Restzeit({ ende }: { ende: string }) {
  const [jetzt, setJetzt] = useState<number | null>(null);
  useEffect(() => {
    setJetzt(Date.now());
    const timer = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (jetzt === null) return <span>&nbsp;</span>;
  const rest = Math.max(0, new Date(ende).getTime() - jetzt);
  const tage = Math.floor(rest / 864e5);
  return (
    <span className="tabular-nums">
      Endet in {tage} {tage === 1 ? 'Tag' : 'Tagen'} · {zweistellig(Math.floor((rest % 864e5) / 36e5))}:
      {zweistellig(Math.floor((rest % 36e5) / 6e4))}:{zweistellig(Math.floor((rest % 6e4) / 1e3))}
    </span>
  );
}

export default function AktionsBanner({ ende }: { ende: string | null }) {
  const alt = `Black Weeks bei Bodenjäger: bis zu ${PROMO_DISCOUNT_LABEL} auf Laminat, Vinyl und Parkett`;

  return (
    <section aria-label="Aktuelle Aktion" className="content-container pt-4 lg:pt-6">
      <div className="overflow-hidden rounded-2xl bg-black">
        <Link href={PROMO_PATH} aria-label="Zu den Black-Weeks-Angeboten" className="block">
          {/* Desktop/Tablet quer */}
          <div className="relative hidden aspect-[1600/773] md:block">
            <Image src={PROMO_IMAGES.heroDesktop} alt={alt} fill priority unoptimized sizes="1400px" className="object-cover" />
          </div>
          {/* Mobil: Hochformat oben angeschnitten */}
          <div className="relative aspect-square md:hidden">
            <Image src={PROMO_IMAGES.heroMobile} alt={alt} fill priority unoptimized sizes="100vw" className="object-cover object-[50%_20%]" />
          </div>
        </Link>
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-white md:hidden">
          <p className="text-[13px] leading-tight text-white/80">
            {ende ? <Restzeit ende={ende} /> : 'Nur für kurze Zeit'}
          </p>
          <Link
            href={PROMO_PATH}
            className="flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-bold text-dark"
          >
            Angebote
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
