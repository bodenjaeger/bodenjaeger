import { PROMO_IMAGES, PROMO_MAX_DISCOUNT, PROMO_PATH } from '@/lib/black-weeks';

/**
 * Inhalt des Aktionsbanners oben auf der Startseite (`AktionsBanner`).
 *
 * Eine Vorlage für alle Geräte: Texte, Rabatt, Countdown und Buttons setzt
 * der Shop als echten Text, dazu EIN freigestelltes Motiv ohne Text
 * (`bild`). Aufbau wie das Aktionsmotiv: links Text und Button, in der Mitte
 * das Motiv, rechts Leuchtschild, Rabatt und Bodenarten. Mobil gestapelt.
 *
 * Mit `grafik` zeigt das Banner stattdessen die fertige Aktionsgrafik
 * (Black Weeks: exakt das gestaltete, animierte Motiv).
 *
 * Für eine neue Aktion nur diese Datei anpassen. Läuft keine Aktion
 * (`isPromoActive()`), zeigt die Startseite automatisch den normalen Slider.
 */
/** Klickfläche auf einer Grafik, in Prozent der sichtbaren Bildfläche */
export interface Klickflaeche {
  label: string;
  href: string;
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
}

/**
 * Fertige Aktionsgrafik statt Textvorlage, wenn das Motiv exakt so aussehen
 * soll wie gestaltet (inkl. Animation). Eingebrannte Buttons werden über
 * unsichtbare Klickflächen anklickbar.
 */
export interface AktionsGrafik {
  alt: string;
  /** animierte WebP/GIF: am Bildoptimierer vorbei ausliefern */
  animiert?: boolean;
  /** Querformat ab Tablet (md) */
  desktop: { src: string; breite: number; hoehe: number; klickflaechen: Klickflaeche[] };
  /** Hochformat am Handy, oben und unten angeschnitten (Pixel des Originals) */
  mobil: { src: string; breite: number; hoehe: number; ausschnittOben: number; ausschnittHoehe: number; klickflaechen: Klickflaeche[] };
}

export interface StartseitenAktion {
  /** Gesetzt: Grafik zeigen (exakt wie gestaltet). Leer: Textvorlage. */
  grafik?: AktionsGrafik;
  /** Text im Leuchtschild, z. B. „Black Weeks“ */
  marke: string;
  /** kleine Zeile oben links, `kickerAkzent` erscheint rot */
  kicker: string;
  kickerAkzent?: string;
  /** jede Zeile endet mit einem roten Punkt */
  titel: string[];
  /** kurze Zeile unter dem Trennstrich */
  zeile: string;
  rabatt?: { oben: string; gross: string; unten: string };
  /** Bodenart-Links, zugleich die Zeile „Vinyl • Laminat • Parkett“ */
  links: Array<{ label: string; href: string }>;
  button: { label: string; href: string };
  /** Motiv ohne Text, möglichst quadratisch */
  bild: { src: string; alt: string };
  /** Leuchtfarbe für Schild, Punkte und Schein */
  akzent: string;
  hintergrund: string;
}

/* Klickflächen gemessen an den Black-Weeks-Grafiken (wie in der Aktions-
   vorlage); bei neuem Motiv neu messen. Mobil: Ausschnitt ab Bildzeile 69,
   800 px hoch – von „Black Weeks“ bis zu den Bodenart-Kacheln. */
const BW_MOBIL_OBEN = 69;
const BW_MOBIL_HOEHE = 800;
const bwMobil = (yProzentOriginal: number) => ((yProzentOriginal / 100) * 1143 - BW_MOBIL_OBEN) / BW_MOBIL_HOEHE * 100;

export const BLACK_WEEKS_AKTION: StartseitenAktion = {
  grafik: {
    alt: `Black Weeks bei Bodenjäger: Dein Traumboden zum Black-Weeks-Preis. Bis zu ${PROMO_MAX_DISCOUNT} % sparen auf Vinyl, Laminat und Parkett – online und im Fachmarkt.`,
    animiert: true,
    desktop: {
      src: PROMO_IMAGES.heroDesktop,
      breite: 1600,
      hoehe: 773,
      klickflaechen: [
        { label: 'Jetzt Angebote entdecken', href: PROMO_PATH, links: 3.15, oben: 76.3, breite: 30, hoehe: 8.6 },
        { label: 'Vinyl-Angebote', href: `${PROMO_PATH}?art=vinyl`, links: 58, oben: 78.7, breite: 12.8, hoehe: 8.1 },
        { label: 'Laminat-Angebote', href: `${PROMO_PATH}?art=laminat`, links: 70.9, oben: 78.7, breite: 12.4, hoehe: 8.1 },
        { label: 'Parkett-Angebote', href: `${PROMO_PATH}?art=parkett`, links: 84.2, oben: 78.7, breite: 13, hoehe: 8.1 },
      ],
    },
    mobil: {
      src: PROMO_IMAGES.heroMobile,
      breite: 800,
      hoehe: 1143,
      ausschnittOben: BW_MOBIL_OBEN,
      ausschnittHoehe: BW_MOBIL_HOEHE,
      klickflaechen: [
        { label: 'Vinyl-Angebote', href: `${PROMO_PATH}?art=vinyl`, links: 28, oben: bwMobil(68.9), breite: 21.4, hoehe: 5.1 * 1143 / BW_MOBIL_HOEHE },
        { label: 'Laminat-Angebote', href: `${PROMO_PATH}?art=laminat`, links: 49.8, oben: bwMobil(68.9), breite: 22.9, hoehe: 5.1 * 1143 / BW_MOBIL_HOEHE },
        { label: 'Parkett-Angebote', href: `${PROMO_PATH}?art=parkett`, links: 73, oben: bwMobil(68.9), breite: 23.1, hoehe: 5.1 * 1143 / BW_MOBIL_HOEHE },
      ],
    },
  },
  marke: 'Black Weeks',
  kicker: 'Black Weeks',
  kickerAkzent: '2026',
  titel: ['Dein Traumboden', 'Unser Black-Weeks-Preis'],
  zeile: 'Nur für kurze Zeit – online & im Fachmarkt.',
  rabatt: { oben: 'Bis zu', gross: `${PROMO_MAX_DISCOUNT}%`, unten: 'sparen!' },
  links: [
    { label: 'Vinyl', href: `${PROMO_PATH}?art=vinyl` },
    { label: 'Laminat', href: `${PROMO_PATH}?art=laminat` },
    { label: 'Parkett', href: `${PROMO_PATH}?art=parkett` },
  ],
  button: { label: 'Jetzt Angebote entdecken', href: PROMO_PATH },
  /* Ausschnitt aus dem Black-Weeks-Motiv (nur die Dielen, ohne Schrift).
     Schärfer wird es mit der Originaldatei ohne Text vom Gestalter. */
  bild: { src: '/promo/black-weeks-dielen.webp', alt: 'Bodendielen in Holz- und Steinoptik vor rot beleuchteter Wand' },
  akzent: '#ff2a2a',
  hintergrund: '#050505',
};
