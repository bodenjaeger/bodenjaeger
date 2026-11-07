'use client';

import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StartseitenAktion } from '@/content/startseite-aktion';

/* Aktionsbanner im Look des Black-Weeks-Motivs (Inhalt: src/content/startseite-aktion.ts).

   Die Szene (Raum, Dielen, Licht) ist ein Bild ohne Schrift. Alles andere ist
   echter Text und sitzt an denselben Stellen wie im gestalteten Motiv. Die
   Maße stehen unten in Pixeln des Originals (Desktop 2576 px, mobil 1803 px
   breit) und werden in Prozent bzw. `cqw` umgerechnet: Das Banner skaliert
   dadurch wie ein Bild, bleibt aber scharf und für Google lesbar.

   Bewegung wie im Motiv per CSS (globals.css, „Aktionsbanner“): Schild
   flackert an, Rabatt leuchtet auf, Kacheln blinken nacheinander rot, Glanz
   über den Button. Bei „Bewegung reduzieren“ alles ruhig. */

interface Raster {
  breite: number;
  hoehe: number;
}

/** Position und Größe aus Original-Pixeln */
function platz(r: Raster, x: number, y: number, extra: { w?: number; h?: number; schrift?: number } = {}): CSSProperties {
  return {
    left: `${(x / r.breite) * 100}%`,
    top: `${(y / r.hoehe) * 100}%`,
    ...(extra.w !== undefined && { width: `${(extra.w / r.breite) * 100}%` }),
    ...(extra.h !== undefined && { height: `${(extra.h / r.hoehe) * 100}%` }),
    ...(extra.schrift !== undefined && { fontSize: `${(extra.schrift / r.breite) * 100}cqw` }),
  };
}

const DESKTOP: Raster = { breite: 2576, hoehe: 1244 };
const MOBIL: Raster = { breite: 1803, hoehe: 1995 };

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
  if (jetzt === null) return <span className="block h-5" />;
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

/* Leuchtschild: zwei versetzte Klammern wie im Motiv, Schrift mit leichter Tiefe */
function Schild({ r, text, klammerL, klammerR, textBox, schrift, akzent }: {
  r: Raster;
  text: string;
  klammerL: [number, number, number, number];
  klammerR: [number, number, number, number];
  textBox: [number, number, number, number];
  schrift: number;
  akzent: string;
}) {
  const strich = `${(9 / r.breite) * 100}cqw`;
  const leuchten = `0 0 ${(26 / r.breite) * 100}cqw ${akzent}, inset 0 0 ${(16 / r.breite) * 100}cqw ${akzent}99`;
  return (
    <div className="aktion-schild pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        className="absolute"
        style={{ ...platz(r, klammerL[0], klammerL[1], { w: klammerL[2], h: klammerL[3] }), borderStyle: 'solid', borderColor: akzent, borderWidth: `${strich} 0 ${strich} ${strich}`, boxShadow: leuchten }}
      />
      <span
        className="absolute"
        style={{ ...platz(r, klammerR[0], klammerR[1], { w: klammerR[2], h: klammerR[3] }), borderStyle: 'solid', borderColor: akzent, borderWidth: `${strich} ${strich} ${strich} 0`, boxShadow: leuchten }}
      />
      <span
        className="absolute flex items-center justify-center whitespace-nowrap font-bold uppercase leading-none tracking-[-0.03em] text-white"
        style={{
          ...platz(r, textBox[0], textBox[1], { w: textBox[2], h: textBox[3], schrift }),
          transform: 'scaleY(1.22)',
          textShadow: '0 0.03em 0 #c9c9c9, 0 0.055em 0 #8a8a8a, 0 0.08em 0.04em rgba(0,0,0,.7), 0 0 0.25em rgba(255,255,255,.25)',
        }}
      >
        {text}
      </span>
    </div>
  );
}

const ZAHL_SCHATTEN = (akzent: string) =>
  `0 0.012em 0 #dcdcdc, 0 0.024em 0 #bdbdbd, 0 0.036em 0 #9a9a9a, 0 0.05em 0.02em rgba(0,0,0,.65), 0 0 0.1em ${akzent}e6, 0 0 0.28em ${akzent}99`;

function Kachel({ r, x, y, w, h, schrift, href, label, akzent }: {
  r: Raster; x: number; y: number; w: number; h: number; schrift: number; href: string; label: string; akzent: string;
}) {
  return (
    <div className="aktion-kachel absolute" style={platz(r, x, y, { w, h })}>
      <Link
        href={href}
        aria-label={`${label}-Angebote`}
        className="flex h-full w-full -skew-x-[8deg] items-center justify-center gap-[0.3em] border border-white/25 bg-[#141414]/95 font-bold uppercase text-white transition-colors hover:border-white"
        style={{ fontSize: `${(schrift / r.breite) * 100}cqw`, borderRadius: `${(6 / r.breite) * 100}cqw` }}
      >
        <span className="skew-x-[8deg]">{label}</span>
        <ChevronRight className="h-[1em] w-[1em] shrink-0 skew-x-[8deg]" style={{ color: akzent }} strokeWidth={3.5} aria-hidden="true" />
      </Link>
    </div>
  );
}

function Titel({ zeilen, akzent }: { zeilen: string[]; akzent: string }) {
  return (
    <>
      {zeilen.map((zeile) => (
        <span key={zeile} className="block">
          {zeile.split(' ').map((wort, i, alle) => (
            <Fragment key={i}>
              <span className="whitespace-nowrap">
                {wort}
                {i === alle.length - 1 && <span style={{ color: akzent }}>.</span>}
              </span>
              {i < alle.length - 1 && ' '}
            </Fragment>
          ))}
        </span>
      ))}
    </>
  );
}

function Glanzbutton({ href, children, className, style }: { href: string; children: ReactNode; className: string; style: CSSProperties }) {
  return (
    <Link href={href} className={`relative flex items-center justify-center gap-[0.4em] overflow-hidden bg-white font-bold text-dark transition-colors hover:bg-ash ${className}`} style={style}>
      <span className="aktion-glanz pointer-events-none absolute inset-y-0 left-0 w-1/3" aria-hidden="true" />
      <span className="relative">{children}</span>
      <ChevronRight className="relative h-[1em] w-[1em]" strokeWidth={3.5} aria-hidden="true" />
    </Link>
  );
}

export default function AktionsBanner({ aktion, ende }: { aktion: StartseitenAktion; ende: string | null }) {
  const a = aktion.akzent;
  const rahmen = { '--akzent': a, containerType: 'inline-size' } as CSSProperties;
  const r = aktion.rabatt;
  const zahl = (rr: Raster, x: number, y: number, s: number) => (
    <p className="absolute whitespace-nowrap font-bold leading-none tracking-[-0.03em] text-white" style={{ ...platz(rr, x, y, { schrift: s }), textShadow: ZAHL_SCHATTEN(a) }}>
      {r.gross}
      <span className="relative top-[-0.36em] ml-[0.02em] text-[0.55em]">{r.zeichen}</span>
    </p>
  );

  return (
    <section aria-label="Aktuelle Aktion" className="content-container pt-4 lg:pt-6">
      <h2 className="sr-only">
        {aktion.titel.join('. ')}. {r.oben} {r.gross} {r.zeichen} {r.unten}
      </h2>

      {/* ── Desktop und Tablet: Aufbau exakt wie das Querformat-Motiv ── */}
      <div className="aktion-banner relative hidden overflow-hidden rounded-2xl bg-black text-white md:block" style={{ ...rahmen, aspectRatio: `${DESKTOP.breite} / ${DESKTOP.hoehe}` }}>
        <Image src={aktion.szene.desktop} alt={aktion.szene.alt} fill priority sizes="(max-width: 1400px) 100vw, 1352px" className="object-cover" />
        <Link href={aktion.button.href} tabIndex={-1} aria-hidden="true" className="absolute inset-0" />

        <p className="pointer-events-none absolute flex items-center whitespace-nowrap font-bold uppercase leading-none tracking-[0.32em] text-white/90" style={platz(DESKTOP, 73, 204, { schrift: 26 })}>
          <span className="mr-[1.6em] inline-block h-[0.16em] w-[3.1em]" style={{ backgroundColor: a }} aria-hidden="true" />
          {aktion.kicker}
          {aktion.kickerAkzent && <span className="ml-[0.5em]" style={{ color: a }}>{aktion.kickerAkzent}</span>}
        </p>
        <p className="pointer-events-none absolute font-bold leading-[1.02] tracking-[-0.025em]" style={{ ...platz(DESKTOP, 74, 272, { w: 960, schrift: 89 }) }}>
          <Titel zeilen={aktion.titel} akzent={a} />
        </p>
        <p className="pointer-events-none absolute flex items-center gap-[0.45em] whitespace-nowrap leading-none" style={platz(DESKTOP, 76, 648, { schrift: 63 })}>
          {aktion.links.map((l, i) => (
            <Fragment key={l.label}>
              {i > 0 && <span className="inline-block h-[0.2em] w-[0.2em] rounded-full" style={{ backgroundColor: a }} aria-hidden="true" />}
              {l.label}
            </Fragment>
          ))}
        </p>
        <span className="pointer-events-none absolute" style={{ ...platz(DESKTOP, 82, 774, { w: 104, h: 5 }), backgroundColor: a }} aria-hidden="true" />
        <p className="pointer-events-none absolute whitespace-nowrap leading-none text-white/85" style={platz(DESKTOP, 84, 822, { schrift: 36 })}>
          {aktion.zeile}
        </p>
        <Glanzbutton
          href={aktion.button.href}
          className="absolute"
          style={{ ...platz(DESKTOP, 82, 950, { w: 772, h: 105, schrift: 43 }), borderRadius: `${(16 / DESKTOP.breite) * 100}cqw`, boxShadow: `0 0 ${(40 / DESKTOP.breite) * 100}cqw ${a}a6` }}
        >
          {aktion.button.label}
        </Glanzbutton>

        <Schild r={DESKTOP} text={aktion.marke} klammerL={[1280, 150, 440, 222]} klammerR={[2070, 114, 430, 218]} textBox={[1320, 140, 1170, 210]} schrift={170} akzent={a} />

        <div className="aktion-rabatt pointer-events-none absolute inset-0">
          <p className="absolute whitespace-nowrap font-bold leading-none" style={platz(DESKTOP, 1663, 414, { schrift: 68 })}>{r.oben}</p>
          {zahl(DESKTOP, 1636, 420, 452)}
          <p className="absolute whitespace-nowrap font-bold leading-none tracking-[-0.01em]" style={{ ...platz(DESKTOP, 1772, 778, { schrift: 158 }), textShadow: '0 0.03em 0 #9a9a9a, 0 0 0.25em rgba(255,42,42,.55)' }}>
            {r.unten}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
          {aktion.links.map((l, i) => {
            const spalten = [[1494, 330], [1826, 320], [2169, 335]][i] ?? [1494, 330];
            return <Kachel key={l.label} r={DESKTOP} x={spalten[0]} y={979} w={spalten[1]} h={101} schrift={42} href={l.href} label={l.label} akzent={a} />;
          })}
        </div>
      </div>

      {/* ── Handy: Hochformat-Motiv, unten gekürzt; Button und Countdown darunter ── */}
      <div className="overflow-hidden rounded-2xl bg-black text-white md:hidden">
        <div className="aktion-banner relative" style={{ ...rahmen, aspectRatio: `${MOBIL.breite} / ${MOBIL.hoehe}` }}>
          <Image src={aktion.szene.mobil} alt={aktion.szene.alt} fill priority sizes="100vw" className="object-cover" />
          <Link href={aktion.button.href} tabIndex={-1} aria-hidden="true" className="absolute inset-0" />

          <p className="pointer-events-none absolute inset-x-0 flex items-center justify-center whitespace-nowrap font-bold uppercase leading-none tracking-[0.3em] text-white/90" style={{ top: `${(146 / MOBIL.hoehe) * 100}%`, fontSize: `${(38 / MOBIL.breite) * 100}cqw` }}>
            <span className="mr-[1.4em] inline-block h-[0.14em] w-[3em]" style={{ backgroundColor: a }} aria-hidden="true" />
            {aktion.kicker}
            {aktion.kickerAkzent && <span className="ml-[0.5em]" style={{ color: a }}>{aktion.kickerAkzent}</span>}
          </p>

          <Schild r={MOBIL} text={aktion.marke} klammerL={[340, 220, 720, 300]} klammerR={[1020, 188, 700, 300]} textBox={[330, 262, 1400, 200]} schrift={176} akzent={a} />

          <p className="pointer-events-none absolute inset-x-0 text-center font-bold leading-[1.14] tracking-[-0.02em]" style={{ top: `${(572 / MOBIL.hoehe) * 100}%`, fontSize: `${(105 / MOBIL.breite) * 100}cqw` }}>
            <Titel zeilen={aktion.titel} akzent={a} />
          </p>

          <div className="aktion-rabatt pointer-events-none absolute inset-0">
            <p className="absolute whitespace-nowrap font-bold leading-none" style={platz(MOBIL, 894, 950, { schrift: 66 })}>{r.oben}</p>
            {zahl(MOBIL, 872, 960, 514)}
            <p className="absolute whitespace-nowrap font-bold leading-none" style={{ ...platz(MOBIL, 914, 1385, { schrift: 203 }), textShadow: '0 0.03em 0 #9a9a9a, 0 0 0.25em rgba(255,42,42,.55)' }}>
              {r.unten}
            </p>
          </div>

          <div className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
            {aktion.links.map((l, i) => {
              const spalten = [[505, 386], [898, 413], [1316, 416]][i] ?? [505, 386];
              return <Kachel key={l.label} r={MOBIL} x={spalten[0]} y={1775} w={spalten[1]} h={131} schrift={58} href={l.href} label={l.label} akzent={a} />;
            })}
          </div>

          <span className="pointer-events-none absolute rounded-full bg-black/70 px-[0.6em] py-[0.2em] text-white/80" style={{ right: '2%', bottom: '1.5%', fontSize: `${(26 / MOBIL.breite) * 100}cqw` }}>
            KI-generiert
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
          {ende ? <Restzeit ende={ende} /> : <span className="text-[13px] text-white/70">{aktion.zeile}</span>}
          <Glanzbutton href={aktion.button.href} className="min-h-12 flex-shrink-0 rounded-lg px-5 text-[15px]" style={{ boxShadow: `0 0 22px ${a}a6` }}>
            Angebote entdecken
          </Glanzbutton>
        </div>
      </div>
    </section>
  );
}
