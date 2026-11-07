'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { AktionsVideo, Klickflaeche, StartseitenAktion } from '@/content/startseite-aktion';

/* Aktionsbanner mit den animierten Videos vom Gestalter
   (Inhalt: src/content/startseite-aktion.ts).
   Desktop/Tablet: Querformat vollständig. Mobil: Hochformat bis knapp unter
   die Bodenart-Kacheln, darunter Countdown und Button. Die eingebrannten
   Buttons sind über unsichtbare Klickflächen anklickbar.
   Bei „Bewegung reduzieren“ bleibt das Standbild stehen.
   Das Video steht mit `h-auto` oben im Rahmen; mobil schneidet der Rahmen
   (overflow-hidden) es unten ab. */

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
  if (jetzt === null) return <span className="block h-8" />;
  const rest = Math.max(0, new Date(ende).getTime() - jetzt);
  const tage = Math.floor(rest / 864e5);
  return (
    <span className="block text-[13px] leading-tight text-white/70" role="timer">
      Endet in
      <span className="block font-bold tabular-nums text-white">
        {tage} {tage === 1 ? 'Tag' : 'Tagen'} · {zweistellig(Math.floor((rest % 864e5) / 36e5))}:
        {zweistellig(Math.floor((rest % 36e5) / 6e4))}:{zweistellig(Math.floor((rest % 6e4) / 1e3))}
      </span>
    </span>
  );
}

function Klickflaechen({ flaechen }: { flaechen: Klickflaeche[] }) {
  return (
    <>
      {flaechen.map((f) => (
        <Link
          key={f.label}
          href={f.href}
          aria-label={f.label}
          className="absolute rounded-md transition-shadow hover:shadow-[0_0_0_2px_#fff,0_0_18px_rgba(255,42,42,.7)] focus-visible:shadow-[0_0_0_3px_#fff]"
          style={{ left: `${f.links}%`, top: `${f.oben}%`, width: `${f.breite}%`, height: `${f.hoehe}%` }}
        />
      ))}
    </>
  );
}

function Video({ video, style }: { video: AktionsVideo; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  /* Nur das sichtbare Video laden und abspielen (mobil das Hochformat, sonst
     das Querformat), damit nicht beide Dateien geladen werden.
     „Bewegung reduzieren“: Video bleibt aus, das Standbild steht. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pruefen = () => {
      const sichtbar = el.offsetParent !== null;
      if (!sichtbar || ruhig.matches) {
        el.pause();
        return;
      }
      if (el.preload !== 'auto') el.preload = 'auto';
      el.play().catch(() => {});
    };
    pruefen();
    ruhig.addEventListener('change', pruefen);
    window.addEventListener('resize', pruefen);
    return () => {
      ruhig.removeEventListener('change', pruefen);
      window.removeEventListener('resize', pruefen);
    };
  }, []);
  return (
    <video
      ref={ref}
      src={video.src}
      poster={video.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-auto w-full"
      style={style}
    />
  );
}

export default function AktionsBanner({ aktion, ende }: { aktion: StartseitenAktion; ende: string | null }) {
  const { quer, hoch } = aktion;
  return (
    <section aria-label="Aktuelle Aktion" className="content-container pt-4 lg:pt-6">
      {/* ── Desktop und Tablet ── */}
      <div className="relative hidden overflow-hidden rounded-2xl bg-black md:block" style={{ aspectRatio: `${quer.breite} / ${quer.hoehe}` }}>
        <Link href={aktion.button.href} aria-label={aktion.alt} className="absolute inset-0">
          <Video video={quer} />
        </Link>
        <Klickflaechen flaechen={quer.klickflaechen} />
      </div>

      {/* ── Handy: Hochformat unten gekürzt, darunter Countdown und Button ── */}
      <div className="overflow-hidden rounded-2xl bg-black md:hidden">
        <div className="relative overflow-hidden" style={{ aspectRatio: `${hoch.breite} / ${(hoch.hoehe * hoch.sichtbarBis) / 100}` }}>
          <Link href={aktion.button.href} aria-label={aktion.alt} className="absolute inset-0">
            <Video video={hoch} />
          </Link>
          <Klickflaechen flaechen={hoch.klickflaechen} />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
          {ende ? <Restzeit ende={ende} /> : <span className="text-[13px] text-white/70">Nur für kurze Zeit</span>}
          <Link
            href={aktion.button.href}
            className="relative flex min-h-12 flex-shrink-0 items-center gap-1.5 overflow-hidden rounded-lg bg-white px-5 text-[15px] font-bold text-dark transition-colors hover:bg-ash"
            style={{ boxShadow: '0 0 22px rgba(255,42,42,.65)' }}
          >
            <span className="aktion-glanz pointer-events-none absolute inset-y-0 left-0 w-1/3" aria-hidden="true" />
            <span className="relative">Angebote entdecken</span>
            <ChevronRight className="relative h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
