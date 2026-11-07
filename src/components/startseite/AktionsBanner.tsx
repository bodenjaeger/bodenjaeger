'use client';

import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StartseitenAktion } from '@/content/startseite-aktion';

/* Aktionsbanner als Vorlage für alle Geräte (Inhalt: src/content/startseite-aktion.ts).
   Optik wie das Black-Weeks-Motiv: schwarzer Grund mit rotem Schein,
   Leuchtschild, große Rabattzahl, Bodenart-Kacheln, weißer Button.
   Alles echter Text, nur die Dielen sind ein Bild.
   Ab lg drei Spalten wie im Motiv, darunter gestapelt und kompakt. */

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
  const rest = jetzt === null ? null : Math.max(0, new Date(ende).getTime() - jetzt);
  /* Countdown als Kästchen wie bei den Black-Weeks-Angeboten, hier auf Schwarz */
  const felder = [
    { label: 'Tage', wert: rest === null ? '–' : String(Math.floor(rest / 864e5)) },
    { label: 'Std.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 864e5) / 36e5)) },
    { label: 'Min.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 36e5) / 6e4)) },
    { label: 'Sek.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 6e4) / 1e3)) },
  ];
  return (
    <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2" role="timer" aria-label="Verbleibende Zeit der Black Weeks">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Endet in</p>
      <div className="flex gap-1.5">
        {felder.map((f) => (
          <div key={f.label} className="min-w-[52px] rounded-lg border border-white/15 bg-white/[0.07] px-1.5 py-1.5 text-center lg:min-w-[58px]">
            <p className="text-xl font-bold leading-none tabular-nums text-white lg:text-2xl">{f.wert}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/60">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Punkt({ farbe }: { farbe: string }) {
  return <span style={{ color: farbe }}>.</span>;
}

export default function AktionsBanner({ aktion, ende }: { aktion: StartseitenAktion; ende: string | null }) {
  const a = aktion.akzent;
  const schild: CSSProperties = {
    borderColor: a,
    boxShadow: `0 0 22px ${a}b3, inset 0 0 16px ${a}73`,
    textShadow: '0 0 14px rgba(255,255,255,.35)',
  };
  const leuchtZahl: CSSProperties = { textShadow: `0 0 28px ${a}cc, 0 4px 0 rgba(0,0,0,.35)` };

  const schildElement = (klasse: string) => (
    <p className={`inline-block rounded-md border-[3px] font-bold uppercase leading-none tracking-tight ${klasse}`} style={schild}>
      {aktion.marke}
    </p>
  );

  const rabattElement = (klasse: { oben: string; gross: string; unten: string }) =>
    aktion.rabatt && (
      <p className="font-bold leading-none">
        <span className={`block ${klasse.oben}`}>{aktion.rabatt.oben}</span>
        <span className={`block tracking-tight ${klasse.gross}`} style={leuchtZahl}>
          {aktion.rabatt.gross}
        </span>
        <span className={`block ${klasse.unten}`}>{aktion.rabatt.unten}</span>
      </p>
    );

  const kacheln = (klasse: string) => (
    <ul className={`flex gap-2 ${klasse}`}>
      {aktion.links.map((l) => (
        <li key={l.label} className="min-w-0 flex-1 lg:flex-none">
          <Link
            href={l.href}
            className="flex h-10 -skew-x-6 items-center justify-center gap-1 rounded-md border border-white/20 bg-white/[0.06] px-3 text-sm font-bold uppercase transition-colors hover:border-white lg:h-12 lg:px-5 lg:text-base"
          >
            <span className="skew-x-6">{l.label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 skew-x-6" style={{ color: a }} strokeWidth={3} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );

  const button = (
    <Link
      href={aktion.button.href}
      className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-6 text-base font-bold text-dark transition-colors hover:bg-ash lg:inline-flex lg:min-h-14 lg:text-lg"
      style={{ boxShadow: `0 0 26px ${a}80` }}
    >
      {aktion.button.label}
      <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
    </Link>
  );

  return (
    <section aria-label="Aktuelle Aktion" className="content-container pt-4 lg:pt-6">
      <div
        className="relative overflow-hidden rounded-2xl text-white"
        style={{
          backgroundColor: aktion.hintergrund,
          backgroundImage: `radial-gradient(ellipse 60% 70% at 58% 45%, ${a}40 0%, transparent 70%)`,
        }}
      >
        {/* ── Mobil und Tablet ── */}
        <div className="flex flex-col items-center gap-3 px-4 py-5 text-center sm:px-8 lg:hidden">
          <h2 className="sr-only">
            {aktion.titel.join('. ')}. {aktion.rabatt ? `${aktion.rabatt.oben} ${aktion.rabatt.gross} ${aktion.rabatt.unten}` : ''}
          </h2>
          {schildElement('px-4 py-2 text-[clamp(1.9rem,9vw,2.6rem)]')}
          <div className="grid w-full max-w-[520px] grid-cols-2 items-center gap-3">
            <div className="relative aspect-[388/395] overflow-hidden rounded-xl">
              <Image src={aktion.bild.src} alt={aktion.bild.alt} fill sizes="(max-width: 640px) 50vw, 260px" className="object-cover" priority />
            </div>
            {rabattElement({
              oben: 'text-lg',
              gross: 'text-[clamp(3.6rem,17vw,5.5rem)]',
              unten: 'text-[clamp(1.6rem,7.5vw,2.4rem)]',
            })}
          </div>
          {kacheln('w-full max-w-[520px]')}
          <div className="mt-1 w-full max-w-[520px]">{button}</div>
          {ende ? <Restzeit ende={ende} /> : <span className="text-sm text-white/70">{aktion.zeile}</span>}
        </div>

        {/* ── Desktop: Aufbau wie das Motiv ── */}
        <div className="hidden min-h-[480px] grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1.2fr)] items-center gap-6 px-10 py-12 lg:grid xl:px-14">
          <div className="flex flex-col gap-5">
            <p className="flex items-center gap-4 text-sm font-bold uppercase tracking-[0.3em] text-white/85">
              <span className="h-0.5 w-12" style={{ backgroundColor: a }} aria-hidden="true" />
              {aktion.kicker}
              {aktion.kickerAkzent && <span style={{ color: a }}>{aktion.kickerAkzent}</span>}
            </p>
            <h2 className="text-[clamp(1.9rem,2.7vw,2.9rem)] font-bold leading-[1.08] tracking-tight">
              {/* Wörter nie trennen: „Black-Weeks-Preis“ bleibt wie im Motiv zusammen */}
              {aktion.titel.map((zeile) => (
                <span key={zeile} className="block">
                  {zeile.split(' ').map((wort, i, alle) => (
                    <Fragment key={i}>
                      <span className="whitespace-nowrap">
                        {wort}
                        {i === alle.length - 1 && <Punkt farbe={a} />}
                      </span>
                      {i < alle.length - 1 && ' '}
                    </Fragment>
                  ))}
                </span>
              ))}
            </h2>
            <p className="flex flex-wrap items-center gap-x-3 text-[clamp(1.2rem,1.8vw,1.75rem)]">
              {aktion.links.map((l, i) => (
                <span key={l.label} className="flex items-center gap-3">
                  {i > 0 && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a }} aria-hidden="true" />}
                  {l.label}
                </span>
              ))}
            </p>
            <span className="h-1 w-14 rounded-full" style={{ backgroundColor: a }} aria-hidden="true" />
            <p className="text-white/80">{aktion.zeile}</p>
            <div className="flex flex-col items-start gap-3">
              {button}
              {ende && <Restzeit ende={ende} />}
            </div>
          </div>

          <div className="relative aspect-[388/395] self-end">
            {/* rote Leuchtleiste wie im Motiv */}
            <span
              className="absolute -top-12 bottom-0 left-[8%] w-1 rounded-full"
              style={{ backgroundColor: a, boxShadow: `0 0 18px 4px ${a}` }}
              aria-hidden="true"
            />
            <Image
              src={aktion.bild.src}
              alt={aktion.bild.alt}
              fill
              sizes="380px"
              className="object-contain"
              style={{ maskImage: 'radial-gradient(ellipse 58% 56% at 50% 50%, #000 70%, transparent 100%)' }}
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            {schildElement('px-6 py-3 text-[clamp(2.2rem,3.8vw,3.6rem)]')}
            {rabattElement({
              oben: 'text-[clamp(1.4rem,2vw,2rem)]',
              gross: 'text-[clamp(6rem,10vw,9.5rem)]',
              unten: 'text-[clamp(2.4rem,4vw,3.8rem)]',
            })}
            {kacheln('flex-wrap justify-center')}
          </div>
        </div>
      </div>
    </section>
  );
}
