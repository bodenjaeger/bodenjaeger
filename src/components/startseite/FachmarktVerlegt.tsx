import Image from 'next/image';
import Link from 'next/link';
import { STANDORT, TRUST_STATS } from '@/content/fachmarkt';

const PROJEKTE = [
  { src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-klick-vinyl-wohnzimmer.webp', boden: 'Klick-Vinyl', raum: 'Wohnzimmer', alt: 'Von Bodenjäger verlegtes Klick-Vinyl im Wohnzimmer' },
  { src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-klebe-vinyl-kinderzimmer.webp', boden: 'Klebe-Vinyl', raum: 'Kinderzimmer', alt: 'Von Bodenjäger verlegtes Klebe-Vinyl im Kinderzimmer' },
  { src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-klick-vinyl-bad.webp', boden: 'Klick-Vinyl', raum: 'Bad', alt: 'Von Bodenjäger verlegtes Klick-Vinyl im Bad' },
  { src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-parkett-flur-treppe.webp', boden: 'Parkett', raum: 'Flur & Treppe', alt: 'Von Bodenjäger verlegtes Parkett in Flur und Treppe' },
];

/* Kennzahlen kommen aus TRUST_STATS (dieselben wie auf der Fachmarktseite). */
const KENNZAHLEN = TRUST_STATS.slice(0, 3);

export default function FachmarktVerlegt() {
  return (
    <section className="content-container pt-20 lg:pt-24">
      <div className="grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-12">
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
          <Image
            src="/images/jobs/fachmarkt-aussen-original.png"
            alt="Der Bodenjäger-Fachmarkt in Hückelhoven von außen"
            fill
            sizes="(max-width: 1024px) 100vw, 780px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand">Fachmarkt Hückelhoven</p>
          <h2 className="text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold leading-[1.12] tracking-tight text-dark">Kein reiner Onlineshop.</h2>
          <p className="mt-4 text-lg text-mid">
            Komm vorbei, fass die Böden an und nimm deinen Boden direkt mit. Oder lass ihn verlegen: Wir kommen zu dir und erstellen danach ein individuelles Angebot.
          </p>
          <dl className="my-6 flex flex-wrap gap-x-7 gap-y-4">
            {KENNZAHLEN.map((k) => (
              <div key={k.label}>
                <dt className="sr-only">{k.label}</dt>
                <dd className="text-3xl font-bold leading-none text-dark">
                  {k.value.toLocaleString('de-DE')}
                  {k.suffix}
                </dd>
                <dd className="mt-1.5 text-sm text-mid">{k.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mb-5 font-bold text-dark">
            {STANDORT.strasse}, {STANDORT.plz} {STANDORT.ort}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/fachmarkt-hueckelhoven" className="inline-flex min-h-[52px] items-center rounded-lg bg-dark px-6 font-bold text-white transition-colors hover:bg-mid">
              Fachmarkt entdecken
            </Link>
            <Link
              href="/fachmarkt-hueckelhoven/service/verlegeservice-anfrage"
              className="inline-flex min-h-[52px] items-center rounded-lg bg-brand px-6 font-bold text-white transition-colors hover:bg-[#d11820]"
            >
              Verlegung anfragen
            </Link>
          </div>
        </div>
      </div>

      <p className="mb-4 mt-14 text-sm font-bold uppercase tracking-[0.2em] text-mid">Von uns verlegt</p>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {PROJEKTE.map((p) => (
          <li key={p.src} className="relative aspect-square overflow-hidden rounded-xl">
            <Image src={p.src} alt={p.alt} fill sizes="(max-width: 1024px) 50vw, 340px" className="object-cover" />
            {/* Beschriftung als Verlauf unten im Bild statt Kasten: verdeckt auf dem Handy nicht das halbe Foto */}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-2.5 pt-10 text-white sm:px-4 sm:pb-3.5">
              <span className="block text-[13px] font-bold leading-tight sm:text-[15px]">{p.boden}</span>
              <span className="block text-xs leading-tight text-white/90 sm:text-sm">{p.raum}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
