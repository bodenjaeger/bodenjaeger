import { PROMO_DISCOUNT_LABEL, PROMO_PATH } from '@/lib/black-weeks';

/**
 * Inhalt des Aktionsbanners oben auf der Startseite (`AktionsBanner`).
 *
 * Eine Vorlage für alle Geräte: Es braucht nur EIN Foto ohne Text.
 * Überschrift, Rabatt, Countdown und Buttons setzt der Shop als echten Text
 * darüber. Desktop: Text links, Foto rechts. Mobil: Foto oben, Text darunter.
 *
 * Für eine neue Aktion nur diese Datei anpassen. Foto: Querformat oder
 * Hochformat, mind. 1400 px breit, Motiv in der Mitte (Ränder werden je nach
 * Gerät angeschnitten, `bild.position` verschiebt den Ausschnitt).
 */
export interface StartseitenAktion {
  /** kleine Zeile über der Überschrift, z. B. „Black Weeks 2026“ */
  kicker: string;
  /** jede Zeile endet mit einem roten Punkt */
  titel: string[];
  /** roter Rabatt-Kreis auf dem Foto */
  rabatt?: { oben: string; gross: string; unten: string };
  /** Bodenart-Links neben dem Button (ab Tablet) */
  links: Array<{ label: string; href: string }>;
  button: { label: string; href: string };
  bild: { src: string; alt: string; position?: string };
  /** Hintergrund der Textfläche */
  hintergrund: string;
}

export const BLACK_WEEKS_AKTION: StartseitenAktion = {
  kicker: 'Black Weeks 2026',
  titel: ['Dein Traumboden', 'Unser Black-Weeks-Preis'],
  rabatt: { oben: 'Bis zu', gross: PROMO_DISCOUNT_LABEL, unten: 'sparen' },
  links: [
    { label: 'Vinyl', href: `${PROMO_PATH}?art=vinyl` },
    { label: 'Laminat', href: `${PROMO_PATH}?art=laminat` },
    { label: 'Parkett', href: `${PROMO_PATH}?art=parkett` },
  ],
  button: { label: 'Jetzt Angebote entdecken', href: PROMO_PATH },
  bild: {
    src: '/images/fachmarkt-hueckelhoven/verlegeservice/projekt-klick-vinyl-wohnzimmer.webp',
    alt: 'Wohnzimmer mit hellem Holzboden und Weihnachtsbaum',
    position: '50% 62%',
  },
  hintergrund: '#000000',
};
