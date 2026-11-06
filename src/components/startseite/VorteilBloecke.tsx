import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';

interface Block {
  pills: [string, string];
  titel: string;
  punkte: string[];
  cta: { label: string; href: string };
  bild: { src: string; alt: string };
  einschub?: { src: string; alt: string };
}

const BLOECKE: Block[] = [
  {
    pills: ['Komplett-Set', 'Ein Preis pro m²'],
    titel: 'Alles drin. Nichts vergessen.',
    punkte: [
      'Dämmung & Sockelleiste gratis im Set',
      'Klebe-Vinyl im Sparpaket mit Grundierung, Spachtelmasse & Kleber (ab 5 Paketen)',
      'Shopbestellungen ab 999 € versandkostenfrei',
      'Jetzt kaufen und 12 Monate kostenfrei bei uns einlagern',
    ],
    cta: { label: 'Set-Angebote ansehen', href: '/fachmarkt-hueckelhoven/service/set-angebote' },
    bild: {
      src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-klick-vinyl-wohnzimmer.webp',
      alt: 'Wohnzimmer mit frisch verlegtem Klick-Vinyl',
    },
  },
  {
    pills: ['Gratis Musterbox', 'Boden virtuell verlegen'],
    titel: 'Erst sehen. Dann entscheiden.',
    punkte: [
      'Kostenlose Musterbox – bei deinem Licht, neben deinen Möbeln',
      'Boden virtuell verlegen: Foto vom Raum hochladen und den Boden direkt darin sehen',
      'Im Fachmarkt Muster und ganze Dielen zum Mitnehmen',
    ],
    cta: { label: 'Gratis Musterbox bestellen', href: '/category/musterbox' },
    bild: { src: '/images/Startseite/3 - Kostenlose Musterbox.webp', alt: 'Geöffnete Bodenjäger-Musterbox mit Bodenmustern' },
    einschub: { src: '/images/Startseite/3 - 3D-Bodenplanung.webp', alt: 'Boden virtuell im eigenen Raum verlegen' },
  },
];

function Haken() {
  return (
    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand">
      <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

export default function VorteilBloecke() {
  return (
    <section className="content-container pt-20 lg:pt-24">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand">Darum Bodenjäger</p>
      <h2 className="mb-10 text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.05] tracking-tight text-dark lg:mb-12">
        Einfacher war neuer Boden nie.
      </h2>
      <div className="flex flex-col gap-16 lg:gap-20">
        {BLOECKE.map((b, index) => (
          <article key={b.titel} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className={`relative overflow-hidden rounded-2xl ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
              <div className="relative aspect-[5/4]">
                <Image src={b.bild.src} alt={b.bild.alt} fill sizes="(max-width: 1024px) 100vw, 680px" className="object-cover" />
              </div>
              {b.einschub && (
                <div className="absolute bottom-4 right-4 aspect-[4/3] w-[38%] overflow-hidden rounded-xl border-4 border-white shadow-xl">
                  <Image src={b.einschub.src} alt={b.einschub.alt} fill sizes="260px" className="object-cover" />
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap gap-1.5 text-[13px] font-bold">
                <span className="rounded-full bg-dark px-3 py-1 text-white">{b.pills[0]}</span>
                <span className="rounded-full bg-ash px-3 py-1 text-dark">{b.pills[1]}</span>
              </div>
              <h3 className="mb-5 mt-3.5 text-[clamp(1.8rem,3vw,2.6rem)] font-bold leading-[1.1] tracking-tight text-dark">
                {b.titel}
              </h3>
              <ul className="mb-7 flex flex-col gap-3">
                {b.punkte.map((p) => (
                  <li key={p} className="flex gap-3 text-dark">
                    <Haken />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={b.cta.href}
                className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-brand px-6 font-bold text-white transition-colors hover:bg-[#d11820]"
              >
                {b.cta.label}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
