'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type BodenfinderSchluessel = 'klick' | 'laminat' | 'parkett' | 'klebe' | 'prime';

export interface BodenfinderProdukt {
  name: string;
  slug: string;
  /** Set-Preis je Einheit, wie vom Backend geliefert */
  price: number;
  paketinhalt: number | null;
  einheit: string;
}

export interface BodenfinderEmpfehlung {
  titel: string;
  warum: string;
  href: string;
  bild: string;
  produkte: BodenfinderProdukt[];
}

type Raum = 'wohn' | 'kueche' | 'haus';
type Prio = 'wasser' | 'preis' | 'holz' | 'ruhe';
type Verlegen = 'klick' | 'lassen' | 'egal';

const FRAGEN = [
  {
    key: 'raum' as const,
    text: 'Wo soll der Boden hin?',
    optionen: [
      ['wohn', 'Wohn- & Schlafräume'],
      ['kueche', 'Küche, Bad oder Flur'],
      ['haus', 'Ganze Wohnung / Haus'],
    ],
  },
  {
    key: 'prio' as const,
    text: 'Was ist dir am wichtigsten?',
    optionen: [
      ['wasser', 'Wasserfest & pflegeleicht'],
      ['preis', 'Kleiner Preis pro m²'],
      ['holz', 'Echtes Holz'],
      ['ruhe', 'Leise & komfortabel'],
    ],
  },
  {
    key: 'verlegen' as const,
    text: 'Wie willst du verlegen?',
    optionen: [
      ['klick', 'Ich klicke selbst'],
      ['lassen', 'Ich lasse verlegen'],
      ['egal', 'Weiß ich noch nicht'],
    ],
  },
];

function empfehlung(raum: Raum, prio: Prio, verlegen: Verlegen): BodenfinderSchluessel {
  if (prio === 'holz') return 'parkett';
  if (verlegen === 'lassen' && raum === 'haus') return 'klebe';
  if (prio === 'ruhe') return 'prime';
  if (prio === 'preis' && raum !== 'kueche') return 'laminat';
  return 'klick';
}

const euro = (wert: number) => wert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const preis = (wert: number) => wert.toFixed(2).replace('.', ',');

export default function Bodenfinder({ empfehlungen }: { empfehlungen: Record<BodenfinderSchluessel, BodenfinderEmpfehlung> }) {
  const [antworten, setAntworten] = useState<Partial<Record<'raum' | 'prio' | 'verlegen', string>>>({});
  const [qm, setQm] = useState(40);

  const fertig = antworten.raum && antworten.prio && antworten.verlegen;
  const anzahl = [antworten.raum, antworten.prio, antworten.verlegen].filter(Boolean).length;
  const ergebnis = fertig ? empfehlungen[empfehlung(antworten.raum as Raum, antworten.prio as Prio, antworten.verlegen as Verlegen)] : null;
  const erstes = ergebnis?.produkte[0];

  /* Richtwert wie im Warenkorb: ganze Pakete, Preis kommt fertig vom Backend */
  const richtwert = erstes
    ? erstes.paketinhalt
      ? Math.ceil(qm / erstes.paketinhalt) * erstes.paketinhalt * erstes.price
      : qm * erstes.price
    : null;

  return (
    <section id="bodenfinder" className="content-container scroll-mt-28 pt-20 lg:scroll-mt-48 lg:pt-24">
      <div className="grid gap-8 rounded-2xl border border-ash bg-white p-5 sm:gap-10 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:p-11">
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2.5 text-sm font-bold uppercase tracking-[0.2em] text-brand">Bodenfinder · 30 Sekunden</p>
            <h2 className="text-[clamp(1.9rem,3.4vw,2.8rem)] font-bold leading-[1.05] tracking-tight text-dark">
              Welcher Boden passt zu dir?
            </h2>
          </div>
          {FRAGEN.map((frage, index) => (
            <fieldset key={frage.key}>
              <legend className="mb-2.5 flex items-center gap-3 font-bold text-dark">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-dark text-[13px] text-white">{index + 1}</span>
                {frage.text}
              </legend>
              <div className="flex flex-wrap gap-2">
                {frage.optionen.map(([wert, label]) => {
                  const aktiv = antworten[frage.key] === wert;
                  return (
                    <button
                      key={wert}
                      type="button"
                      aria-pressed={aktiv}
                      onClick={() => setAntworten((a) => ({ ...a, [frage.key]: wert }))}
                      className={`min-h-11 rounded-full border px-4 text-[15px] transition-colors ${
                        aktiv ? 'border-[#d11820] bg-[#d11820] font-bold text-white' : 'border-ash bg-white text-dark hover:border-mid'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="rounded-xl bg-pale p-5 sm:p-6 lg:min-h-[400px]" aria-live="polite">
          {!ergebnis ? (
            <div className="flex flex-col gap-3.5">
              <p className="text-[13px] font-bold uppercase tracking-wider text-mid">Frage {Math.min(anzahl + 1, 3)} von 3</p>
              <div className="h-1.5 rounded-full bg-ash">
                <div className="h-1.5 rounded-full bg-brand transition-[width] duration-300" style={{ width: `${Math.round((anzahl / 3) * 100)}%` }} />
              </div>
              <p className="mt-3 text-[22px] font-bold leading-tight text-dark">Deine Empfehlung erscheint hier.</p>
              <p className="text-mid">Mit passenden Böden und einem Preis-Richtwert für deine Fläche.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3.5">
                <span className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full">
                  <Image src={ergebnis.bild} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">Unsere Empfehlung</p>
                  <h3 className="text-2xl font-bold leading-tight text-dark">{ergebnis.titel}</h3>
                </div>
              </div>
              <p className="text-mid">{ergebnis.warum}</p>

              {ergebnis.produkte.length > 0 && (
                <ul className="rounded-xl border border-ash bg-white px-4">
                  {ergebnis.produkte.map((p) => (
                    <li key={p.slug} className="border-b border-ash last:border-b-0">
                      <Link href={`/products/${p.slug}`} className="flex items-center gap-3 py-3 text-dark hover:text-brand">
                        <span className="min-w-0 flex-1 font-bold">{p.name}</span>
                        <span className="whitespace-nowrap font-bold text-red-600">
                          {preis(p.price)} €/{p.einheit}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {erstes && richtwert !== null && (
                <div className="rounded-xl bg-dark p-4 text-white">
                  <label htmlFor="bodenfinder-qm" className="flex justify-between text-sm font-bold">
                    <span>Deine Fläche</span>
                    <span>{qm} m²</span>
                  </label>
                  <input
                    id="bodenfinder-qm"
                    type="range"
                    min={5}
                    max={150}
                    step={1}
                    value={qm}
                    onChange={(e) => setQm(Number(e.target.value))}
                    className="my-2.5 w-full accent-brand"
                  />
                  <p className="text-sm text-ash">
                    {erstes.name}: ca. {euro(richtwert)} im Set – Richtwert in ganzen Paketen, ohne Verschnitt.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Link href={ergebnis.href} className="inline-flex min-h-12 items-center rounded-lg bg-brand px-5 font-bold text-white transition-colors hover:bg-[#d11820]">
                  Passende Böden
                </Link>
                <Link href="/category/musterbox" className="inline-flex min-h-12 items-center gap-1.5 rounded-lg bg-cta px-4 font-bold text-white transition-colors hover:bg-cta-dark">
                  <Image src="/images/Icons/musterbox-weiss.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
                  Gratis-Muster
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setAntworten({})}
                className="self-start py-2.5 text-sm text-mid underline"
              >
                Neu wählen
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
