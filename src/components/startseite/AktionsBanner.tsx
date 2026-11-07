'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import type { StartseitenAktion } from '@/content/startseite-aktion';

/* Aktionsbanner als Vorlage für alle Geräte (Inhalt: src/content/startseite-aktion.ts).
   Ein Foto ohne Text, alles Weitere ist echter Text: scharf auf jedem
   Bildschirm, für Google lesbar und ohne zweite Grafik fürs Handy.
   Mobil: Foto oben, Text darunter. Ab lg: Text links, Foto rechts. */

function zweistellig(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/* Erst nach dem Laden rechnen, sonst passen Server- und Browser-HTML nicht zusammen. */
function Restzeit({ ende }: { ende: string }) {
  const [jetzt, setJetzt] = useState<number | null>(null);
  useEffect(() => {
    setJetzt(Date.now());
    const timer = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (jetzt === null) return null;
  const rest = Math.max(0, new Date(ende).getTime() - jetzt);
  const tage = Math.floor(rest / 864e5);
  const uhr = `${zweistellig(Math.floor((rest % 864e5) / 36e5))}:${zweistellig(Math.floor((rest % 36e5) / 6e4))}:${zweistellig(
    Math.floor((rest % 6e4) / 1e3)
  )}`;
  return (
    <p className="text-sm leading-tight text-white/75" role="timer">
      Endet in
      <span className="block font-bold tabular-nums text-white">
        {tage} {tage === 1 ? 'Tag' : 'Tagen'} · {uhr}
      </span>
    </p>
  );
}

export default function AktionsBanner({ aktion, ende }: { aktion: StartseitenAktion; ende: string | null }) {
  return (
    <section aria-label="Aktuelle Aktion" className="content-container pt-4 lg:pt-6">
      <div
        className="grid overflow-hidden rounded-2xl text-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        style={{ backgroundColor: aktion.hintergrund }}
      >
        {/* Foto: mobil oben, ab lg rechts */}
        <Link
          href={aktion.button.href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block aspect-[16/9] sm:aspect-[2/1] lg:order-2 lg:aspect-auto lg:min-h-[460px]"
        >
          <Image
            src={aktion.bild.src}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 760px"
            className="object-cover"
            style={{ objectPosition: aktion.bild.position ?? 'center' }}
          />
          {/* weicher Übergang zur Textfläche */}
          <span
            className="absolute inset-0 hidden lg:block"
            style={{ background: `linear-gradient(90deg, ${aktion.hintergrund} 0%, transparent 30%)` }}
          />
          <span
            className="absolute inset-0 lg:hidden"
            style={{ background: `linear-gradient(0deg, ${aktion.hintergrund} 0%, transparent 35%)` }}
          />
          {aktion.rabatt && (
            <span className="absolute right-4 top-4 flex h-24 w-24 -rotate-6 flex-col items-center justify-center rounded-full bg-[#d11820] text-center leading-none shadow-xl sm:h-28 sm:w-28 lg:right-8 lg:top-8 lg:h-40 lg:w-40">
              <span className="text-xs font-bold uppercase tracking-wide sm:text-sm lg:text-base">{aktion.rabatt.oben}</span>
              <span className="my-0.5 whitespace-nowrap text-[28px] font-bold tracking-tight sm:text-[32px] lg:my-1 lg:text-5xl">
                {aktion.rabatt.gross}
              </span>
              <span className="text-xs font-bold uppercase tracking-wide sm:text-sm lg:text-base">{aktion.rabatt.unten}</span>
            </span>
          )}
        </Link>

        {/* Text */}
        <div className="flex flex-col justify-center gap-4 px-5 pb-5 pt-1 sm:px-8 sm:pb-8 lg:order-1 lg:gap-6 lg:p-12 xl:p-14">
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-white/80 lg:text-sm">
            <span className="h-0.5 w-8 bg-brand" aria-hidden="true" />
            {aktion.kicker}
          </p>
          <h2 className="text-[clamp(1.6rem,6.5vw,2.4rem)] font-bold leading-[1.05] tracking-tight lg:text-[clamp(2.4rem,3.6vw,3.4rem)]">
            {aktion.titel.map((zeile) => (
              <span key={zeile} className="block">
                {zeile}
                <span className="text-brand">.</span>
              </span>
            ))}
          </h2>
          <ul className="hidden flex-wrap gap-2 sm:flex">
            {aktion.links.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="flex h-10 items-center gap-1 rounded-lg border border-white/25 px-4 text-sm font-bold transition-colors hover:border-white"
                >
                  {l.label}
                  <ChevronRight className="h-4 w-4 text-brand" strokeWidth={3} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 lg:gap-x-6">
            <Link
              href={aktion.button.href}
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-5 text-[15px] font-bold text-dark transition-colors hover:bg-ash lg:min-h-[52px] lg:px-6 lg:text-base"
            >
              {aktion.button.label}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </Link>
            {ende && <Restzeit ende={ende} />}
          </div>
        </div>
      </div>
    </section>
  );
}
