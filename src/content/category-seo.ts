import { kategorieIntro } from '@/lib/klick-vinyl';

/**
 * Seitentitel für Google je Kategorie (≤ 60 Zeichen, Muster „[Keyword] kaufen | Nutzen | Bodenjäger“).
 * Später ersetzbar durch Backend-Felder (z. B. Rank Math), siehe CLAUDE.md.
 */
export const CATEGORY_SEO_TITLES: Record<string, string> = {
  vinylboden: 'Vinylboden kaufen | Beratung vom Fachmarkt | Bodenjäger',
  'rigid-vinyl': 'Klick-Vinyl kaufen | Beratung vom Fachmarkt | Bodenjäger',
  'klebe-vinyl': 'Klebe-Vinyl kaufen | Sparpaket vom Fachmarkt | Bodenjäger',
  'luxus-vinyl': 'Luxus-Vinyl kaufen | primeCORE & COREtec | Bodenjäger',
  coretec: 'COREtec Vinylboden kaufen | Fachmarkt-Beratung | Bodenjäger',
  primecore: 'primeCORE Klick-Vinyl kaufen | Eigenmarke | Bodenjäger',
  'o-r-c-a': 'O.R.C.A. Laminat kaufen | wasserresistent | Bodenjäger',
  laminat: 'Laminat kaufen | Set mit Dämmung & Leiste | Bodenjäger',
  parkett: 'Parkett kaufen | Echtholz im Set | Bodenjäger',
  teppichboden: 'Teppichboden kaufen | Fachmarkt Hückelhoven | Bodenjäger',
  zubehoer: 'Zubehör für Bodenbeläge kaufen | Bodenjäger',
  sockelleisten: 'Sockelleisten kaufen | passend zum Boden | Bodenjäger',
  'zubehoer-fuer-sockelleisten': 'Zubehör für Sockelleisten | Ecken & Endkappen | Bodenjäger',
  daemmung: 'Trittschalldämmung kaufen | Laminat & Parkett | Bodenjäger',
  untergrundvorbereitung: 'Untergrund vorbereiten | Grundierung & Spachtel | Bodenjäger',
  kleber: 'Bodenkleber kaufen | Designbelag & Parkett | Bodenjäger',
  'montagekleber-silikon': 'Silikon & Montagekleber kaufen | Bodenjäger',
  werkzeug: 'Werkzeug für die Bodenverlegung | Bodenjäger',
  'reinigung-pflege': 'Bodenpflege kaufen | Reiniger für Vinyl & Laminat | Bodenjäger',
  musterbox: 'Kostenlose Bodenmuster bestellen | Bodenjäger',
};

const MAX_DESCRIPTION = 155;

/** Seitentitel: eigener Titel oder Standardmuster; ab Seite 2 mit Seitenzusatz vor „| Bodenjäger“. */
export function categorySeoTitle(slug: string, name: string, suffix: string): string {
  const title = CATEGORY_SEO_TITLES[slug] ?? `${name} kaufen | Beratung vom Fachmarkt | Bodenjäger`;
  return title.replace(/ \| Bodenjäger$/, `${suffix} | Bodenjäger`);
}

/** Beschreibung aus dem ersten Absatz des Kategorietexts, an Wortgrenze gekürzt. */
export function categorySeoDescription(name: string, description: string | null | undefined, suffix: string): string {
  const intro = description ? kategorieIntro(description).replace(/\s+/g, ' ').trim() : '';
  if (intro.length < 60) {
    return `${name} bei Bodenjäger: persönliche Beratung vom Fachmarkt, bis zu 3 Gratis-Muster und versandkostenfreie Shopbestellung ab 999 €${suffix}.`;
  }
  const room = MAX_DESCRIPTION - suffix.length;
  if (intro.length <= room) return `${intro.replace(/\.$/, '')}${suffix}.`;
  const cut = intro.slice(0, room - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,:;–-]$/, '')}…${suffix}`;
}
