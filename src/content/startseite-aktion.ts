import { PROMO_MAX_DISCOUNT, PROMO_PATH } from '@/lib/black-weeks';

/**
 * Inhalt des Aktionsbanners oben auf der Startseite (`AktionsBanner`).
 *
 * Das Banner sieht aus wie das gestaltete Black-Weeks-Motiv, ist aber aus
 * echtem Text gebaut: Szene (Raum, Dielen, Licht) als Bild ohne Schrift,
 * darüber Leuchtschild, Überschrift, Rabatt, Bodenart-Kacheln und Button.
 * Alles skaliert mit der Bannerbreite, die Bewegung (Flackern, Aufleuchten)
 * kommt aus globals.css. Mobil eigenes Hochformat, kompakter als das Motiv.
 *
 * Für eine neue Aktion Texte und Szene hier tauschen. Läuft keine Aktion
 * (`isPromoActive()`), zeigt die Startseite automatisch den normalen Slider.
 */
export interface StartseitenAktion {
  /** Text im Leuchtschild */
  marke: string;
  /** kleine Zeile oben, `kickerAkzent` erscheint rot */
  kicker: string;
  kickerAkzent?: string;
  /** Überschrift; jede Zeile endet mit einem roten Punkt */
  titel: string[];
  zeile: string;
  rabatt: { oben: string; gross: string; zeichen: string; unten: string };
  /** Bodenart-Kacheln, zugleich die Zeile „Vinyl • Laminat • Parkett“ */
  links: Array<{ label: string; href: string }>;
  button: { label: string; href: string };
  /** Szene ohne Schrift: Desktop 2576×1244, mobil 1803×1525 */
  szene: { desktop: string; mobil: string; alt: string };
  akzent: string;
}

export const BLACK_WEEKS_AKTION: StartseitenAktion = {
  marke: 'Black Weeks',
  kicker: 'Black Weeks',
  kickerAkzent: '2026',
  titel: ['Dein Traumboden', 'Unser Black-Weeks-Preis'],
  zeile: 'Nur für kurze Zeit – online & im Fachmarkt.',
  rabatt: { oben: 'Bis zu', gross: String(PROMO_MAX_DISCOUNT), zeichen: '%', unten: 'sparen!' },
  links: [
    { label: 'Vinyl', href: `${PROMO_PATH}?art=vinyl` },
    { label: 'Laminat', href: `${PROMO_PATH}?art=laminat` },
    { label: 'Parkett', href: `${PROMO_PATH}?art=parkett` },
  ],
  button: { label: 'Jetzt Angebote entdecken', href: PROMO_PATH },
  szene: {
    desktop: '/promo/black-weeks-szene-desktop.webp',
    mobil: '/promo/black-weeks-szene-mobil.webp',
    alt: 'Bodendielen in Holz- und Steinoptik vor schwarzer Wand mit roter Lichtleiste',
  },
  akzent: '#ff2a2a',
};
