import Image from 'next/image';
import Link from 'next/link';
import { FARBTON_SWATCH } from '@/content/megaMenu';
import { PROMO_PATH } from '@/lib/black-weeks';

/* Schnellauswahl ganz oben auf der Startseite (Vorbild: Laminat-Shop24).
   Mobil sieht man sie sofort, noch vor dem Aktionsbanner: eine Reihe
   Bodenarten als runde Bilder und darunter beliebte Filter als Chips.
   Beide Reihen lassen sich mobil waagerecht wischen.

   Alle Filterlinks sind die echten Kategoriefilter wie im Menü
   (`src/content/megaMenu.ts`). Optik und Farbton führen in die Vinyl-
   Kategorie, weil es dort die meisten Optiken gibt. */

interface Kreis {
  label: string;
  href: string;
  bild?: string;
  /** Kreis ohne Bild: Hintergrund- und Textfarbe */
  flaeche?: string;
  inhalt?: string;
  icon?: string;
}

interface Chip {
  label: string;
  href: string;
  swatch?: string;
}

const KREISE: Kreis[] = [
  { label: 'Klick-Vinyl', href: '/category/rigid-vinyl', bild: '/images/Startseite/Bodenkategorie Rigid-Vinyl.webp' },
  { label: 'Luxus-Vinyl', href: '/category/luxus-vinyl', bild: '/images/Startseite/Bodenkategorie primeCORE.webp' },
  { label: 'Klebe-Vinyl', href: '/category/klebe-vinyl', bild: '/images/Startseite/Bodenkategorie Klebe-Vinyl.webp' },
  { label: 'Laminat', href: '/category/laminat', bild: '/images/Startseite/Bodenkategorie Laminat.webp' },
  { label: 'Parkett', href: '/category/parkett', bild: '/images/Startseite/Bodenkategorie Parkett.webp' },
  { label: 'Zubehör', href: '/category/zubehoer', flaeche: 'bg-white border border-ash text-dark', inhalt: '+' },
  { label: 'Gratis-Muster', href: '/category/musterbox', flaeche: 'bg-cta', icon: '/images/Icons/musterbox-weiss.png' },
];

const CHIPS: Chip[] = [
  { label: 'Landhausdiele', href: '/category/vinylboden?optik=landhausdiele' },
  { label: 'XL-Diele', href: '/category/laminat?optik=xl-landhausdiele' },
  { label: 'Fischgrät', href: '/category/vinylboden?optik=fischgraet' },
  { label: 'Fliesenoptik', href: '/category/vinylboden?optik=fliese' },
  { label: 'Hell', href: '/category/vinylboden?farbgebung=hell', swatch: FARBTON_SWATCH.hell },
  { label: 'Mittel', href: '/category/vinylboden?farbgebung=mittel', swatch: FARBTON_SWATCH.mittel },
  { label: 'Dunkel', href: '/category/vinylboden?farbgebung=dunkel', swatch: FARBTON_SWATCH.dunkel },
  { label: 'Küche & Bad', href: '/category/rigid-vinyl' },
  { label: 'Echtholz geölt', href: '/category/parkett?oberflaeche=gebuerstet-natur-geoelt' },
];

const WISCHREIHE =
  '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden';

export default function Schnellauswahl({ promoActive }: { promoActive: boolean }) {
  const kreise: Kreis[] = promoActive
    ? [{ label: 'Black Weeks', href: PROMO_PATH, flaeche: 'bg-black text-white', inhalt: '%' }, ...KREISE]
    : KREISE;

  return (
    <nav aria-label="Schnellauswahl" className="content-container pt-4 lg:pt-6">
      <ul className={`${WISCHREIHE} gap-3 lg:justify-between lg:gap-4`}>
        {kreise.map((k) => (
          <li key={k.label} className="flex-shrink-0">
            <Link href={k.href} className="group flex w-[72px] flex-col items-center gap-1.5 text-center lg:w-[104px]">
              <span
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-2xl font-bold ring-2 ring-transparent ring-offset-2 ring-offset-pale transition-shadow group-hover:ring-brand lg:h-24 lg:w-24 lg:text-4xl ${
                  k.flaeche ?? 'bg-ash'
                }`}
              >
                {k.bild && <Image src={k.bild} alt="" fill sizes="(max-width: 1024px) 64px, 96px" className="object-cover" />}
                {k.icon && <Image src={k.icon} alt="" width={36} height={36} className="h-8 w-8 object-contain lg:h-11 lg:w-11" />}
                {k.inhalt}
              </span>
              <span className="text-xs font-bold leading-tight text-dark lg:text-sm">{k.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ul className={`${WISCHREIHE} mt-3 lg:mt-5 lg:flex-wrap lg:justify-center lg:overflow-visible`}>
        {CHIPS.map((c) => (
          <li key={c.label} className="flex-shrink-0">
            <Link
              href={c.href}
              className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ash bg-white px-4 text-sm text-dark transition-colors hover:border-mid"
            >
              {c.swatch && (
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c.swatch }} aria-hidden="true" />
              )}
              {c.label}
            </Link>
          </li>
        ))}
        <li className="flex-shrink-0">
          <Link
            href="#bodenfinder"
            className="flex h-10 items-center whitespace-nowrap rounded-full bg-dark px-4 text-sm font-bold text-white transition-colors hover:bg-mid"
          >
            Noch unsicher? Bodenfinder
          </Link>
        </li>
      </ul>
    </nav>
  );
}
