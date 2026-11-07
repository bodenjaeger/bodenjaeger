import { PROMO_MAX_DISCOUNT, PROMO_PATH } from '@/lib/black-weeks';

/**
 * Inhalt des Aktionsbanners oben auf der Startseite (`AktionsBanner`).
 *
 * Eine Vorlage für alle Geräte: Texte, Rabatt, Countdown und Buttons setzt
 * der Shop als echten Text, dazu EIN freigestelltes Motiv ohne Text
 * (`bild`). Aufbau wie das Aktionsmotiv: links Text und Button, in der Mitte
 * das Motiv, rechts Leuchtschild, Rabatt und Bodenarten. Mobil gestapelt.
 *
 * Für eine neue Aktion nur diese Datei anpassen. Läuft keine Aktion
 * (`isPromoActive()`), zeigt die Startseite automatisch den normalen Slider.
 */
export interface StartseitenAktion {
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

export const BLACK_WEEKS_AKTION: StartseitenAktion = {
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
