import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Zeile {
  titel: string;
  text: string;
  href: string;
  bild?: string;
  label?: { text: string; aktion: boolean };
}

const PROMO_LABEL = { text: 'Black Weeks', aktion: true };

/* Schnellwahl der Bodenarten als Liste mit Pfeil – wie „Offene Stellen“
   auf der Karriereseite. Die letzte Zeile führt zum Bodenfinder. */
export default function BodenWahl({ promoActive }: { promoActive: boolean }) {
  const promo = promoActive ? PROMO_LABEL : undefined;
  const zeilen: Zeile[] = [
    {
      titel: 'Klick-Vinyl',
      text: 'Wasserfest, auch für Küche & Bad – einfach selbst klicken',
      href: '/category/rigid-vinyl',
      bild: '/images/Startseite/Bodenkategorie Rigid-Vinyl.webp',
      label: promo,
    },
    {
      titel: 'Luxus-Vinyl',
      text: 'primeCORE & COREtec: lebenslange Garantie, bis 600 m² ohne Übergangsschienen',
      href: '/category/luxus-vinyl',
      bild: '/images/Startseite/Bodenkategorie primeCORE.webp',
      label: { text: 'Unser Favorit', aktion: false },
    },
    {
      titel: 'Klebe-Vinyl',
      text: 'Flach & leise – im Sparpaket mit Grundierung, Spachtel & Kleber',
      href: '/category/klebe-vinyl',
      bild: '/images/Startseite/Bodenkategorie Klebe-Vinyl.webp',
      label: { text: 'Sparpaket', aktion: false },
    },
    {
      titel: 'Laminat',
      text: 'Preiswert & robust – auch feuchtraumgeeignet für Küche & Bad',
      href: '/category/laminat',
      bild: '/images/Startseite/Bodenkategorie Laminat.webp',
      label: promo,
    },
    {
      titel: 'Parkett',
      text: 'Echtes Holz, natürlich & langlebig',
      href: '/category/parkett',
      bild: '/images/Startseite/Bodenkategorie Parkett.webp',
      label: promo,
    },
    {
      titel: 'Noch unsicher?',
      text: '3 kurze Fragen – wir empfehlen dir den passenden Boden',
      href: '#bodenfinder',
    },
  ];

  return (
    <section className="content-container pt-14 lg:pt-16">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight tracking-tight text-dark">
          Welchen Boden suchst du?
        </h2>
        <p className="text-mid">Jeder Boden als Set – Dämmung &amp; Sockelleiste gratis</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {zeilen.map((z) => (
          <li key={z.titel}>
            <Link
              href={z.href}
              className="group flex items-center gap-3 rounded-xl border border-ash bg-white p-3 transition-colors hover:border-mid sm:gap-4 sm:pr-4"
            >
              <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-ash text-2xl font-bold text-dark sm:h-16 sm:w-16 sm:text-3xl">
                {z.bild ? (
                  <Image src={z.bild} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  '?'
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-dark sm:text-lg">{z.titel}</span>
                  {z.label && (
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold leading-none text-white ${
                        z.label.aktion ? 'border border-[#d11820] bg-[#140809]' : 'bg-dark'
                      }`}
                    >
                      {z.label.text}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-mid">{z.text}</span>
              </span>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand sm:h-11 sm:w-11 transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
