import { PROMO_PATH } from '@/lib/black-weeks';

/**
 * Aktionsbanner oben auf der Startseite (`AktionsBanner`).
 *
 * Zeigt die animierten Aktionsvideos vom Gestalter (MP4, ohne Ton, in
 * Schleife). Die im Video eingebrannten Buttons werden über unsichtbare
 * Klickflächen anklickbar. Mobil wird das Hochformat unten gekürzt (bis
 * unter die Bodenart-Kacheln); Countdown und Button stehen darunter.
 *
 * Für eine neue Aktion: Videos und Standbilder in /public/promo ablegen,
 * hier eintragen und die Klickflächen neu messen (Prozent der Videofläche).
 * Läuft keine Aktion (`isPromoActive()`), zeigt die Startseite automatisch
 * den normalen Slider.
 */

/** Klickfläche in Prozent der Videofläche */
export interface Klickflaeche {
  label: string;
  href: string;
  links: number;
  oben: number;
  breite: number;
  hoehe: number;
}

export interface AktionsVideo {
  src: string;
  /** Standbild: wird gezeigt, bis das Video lädt, und bei „Bewegung reduzieren“ */
  poster: string;
  breite: number;
  hoehe: number;
  klickflaechen: Klickflaeche[];
}

export interface StartseitenAktion {
  alt: string;
  button: { label: string; href: string };
  /** Querformat ab Tablet (md) */
  quer: AktionsVideo;
  /** Hochformat am Handy, sichtbar nur bis `sichtbarBis` Prozent der Höhe */
  hoch: AktionsVideo & { sichtbarBis: number };
}

/* Black Weeks: Klickflächen an den Videos gemessen (gleiches Layout wie die
   Werbemotive). Mobil sichtbar bis 76 % der Höhe = knapp unter den Kacheln. */
const HOCH_SICHTBAR = 76;
const hochOben = (prozent: number) => (prozent / HOCH_SICHTBAR) * 100;

export const BLACK_WEEKS_AKTION: StartseitenAktion = {
  alt: 'Black Weeks bei Bodenjäger: Dein Traumboden zum Black-Weeks-Preis. Bis zu 50 % sparen auf Vinyl, Laminat und Parkett – online und im Fachmarkt.',
  button: { label: 'Jetzt Angebote entdecken', href: PROMO_PATH },
  quer: {
    src: '/promo/black-weeks-quer.mp4',
    poster: '/promo/black-weeks-quer-poster.webp',
    breite: 2576,
    hoehe: 1244,
    klickflaechen: [
      { label: 'Jetzt Angebote entdecken', href: PROMO_PATH, links: 3.15, oben: 76.3, breite: 30, hoehe: 8.6 },
      { label: 'Vinyl-Angebote', href: `${PROMO_PATH}?art=vinyl`, links: 58, oben: 78.7, breite: 12.8, hoehe: 8.1 },
      { label: 'Laminat-Angebote', href: `${PROMO_PATH}?art=laminat`, links: 70.9, oben: 78.7, breite: 12.4, hoehe: 8.1 },
      { label: 'Parkett-Angebote', href: `${PROMO_PATH}?art=parkett`, links: 84.2, oben: 78.7, breite: 13, hoehe: 8.1 },
    ],
  },
  hoch: {
    src: '/promo/black-weeks-hoch.mp4',
    poster: '/promo/black-weeks-hoch-poster.webp',
    breite: 1802,
    hoehe: 2576,
    sichtbarBis: HOCH_SICHTBAR,
    klickflaechen: [
      { label: 'Vinyl-Angebote', href: `${PROMO_PATH}?art=vinyl`, links: 28, oben: hochOben(68.9), breite: 21.4, hoehe: hochOben(5.1) },
      { label: 'Laminat-Angebote', href: `${PROMO_PATH}?art=laminat`, links: 49.8, oben: hochOben(68.9), breite: 22.9, hoehe: hochOben(5.1) },
      { label: 'Parkett-Angebote', href: `${PROMO_PATH}?art=parkett`, links: 73, oben: hochOben(68.9), breite: 23.1, hoehe: hochOben(5.1) },
    ],
  },
};
