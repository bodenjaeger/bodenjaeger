/**
 * Inhalte der Mega-Menüs im Shop-Header (Desktop) und der Schnellfilter im
 * Mobile-Menü. Einzige Quelle, damit beide nicht auseinanderlaufen.
 *
 * Alle Filterlinks nutzen die echten Filter der Kategorieseiten
 * (`src/lib/category-filters.ts`): Parameter = `filterSlug(Attributname)`,
 * Wert = `filterSlug(Attributwert)`. Mehrere Werte eines Filters werden mit
 * Komma verbunden (`?farbgebung=hell,mittel`). Neue Werte nur eintragen, wenn
 * es sie im WooCommerce-Attribut wirklich gibt, sonst zeigt die Kategorie
 * „keine Treffer“.
 */

import { PROMO_PATH } from '@/lib/black-weeks'

/** Farbpunkte für Farbton-Chips, gleiche Werte wie im Kategorie-Filter. */
export const FARBTON_SWATCH: Record<string, string> = {
  hell: '#e6d9c3',
  mittel: '#ae8a60',
  dunkel: '#54402f',
}

export interface MegaKarte {
  label: string
  href: string
  punkte: string[]
}

export interface MegaChip {
  label: string
  href: string
  swatch?: string
}

export interface MegaGruppe {
  titel: string
  chips: MegaChip[]
}

export interface MegaLink {
  label: string
  href: string
  text?: string
}

export type FinderIcon = 'wohnen' | 'kueche' | 'bad' | 'buero' | 'klick' | 'klebe'

/**
 * Eine Wahlmöglichkeit im Boden-Finder: setzt einen oder mehrere Filter.
 * Mehrere Werte eines Filters gelten als „oder“ (23/33 oder 23/34).
 * Werte = Slug des VOLLEN WooCommerce-Werts, z. B. „23/33 | starke gewerbliche
 * Nutzung“ → `23-33-starke-gewerbliche-nutzung` (nicht nur `23-33`).
 */
export interface FinderOption {
  id: string
  label: string
  swatch?: string
  icon?: FinderIcon
  filter: Record<string, string[]>
  /** Kurzer Satz, was die Auswahl im Shop bewirkt. */
  hinweis?: string
}

export interface FinderSchritt {
  id: string
  titel: string
  /** kacheln = große Felder mit Symbol, farben = Farbkreise, chips = kleine Chips */
  darstellung: 'kacheln' | 'farben' | 'chips'
  /** Nur eine Wahl je Schritt (Raum, Verlegung) – sonst mehrere möglich. */
  einzeln?: boolean
  optionen: FinderOption[]
}

export interface BodenFinder {
  titel: string
  /** Kategorie-Slug für die Trefferzahlen (/api/menu-filter) */
  kategorie: string
  basis: string
  schritte: FinderSchritt[]
}

export interface Teaser {
  titel: string
  text: string
  linkLabel: string
  href: string
  dunkel?: boolean
}

export interface MegaPanel {
  id: string
  /** Überschrift der linken Spalte */
  linksTitel: string
  karten?: MegaKarte[]
  links?: MegaLink[]
  marken?: MegaLink[]
  finder?: BodenFinder
  gruppen?: MegaGruppe[]
  teaser: Teaser[]
  fuss: { label: string; href: string; text: string }
}

const farbton = (basis: string) =>
  (['hell', 'mittel', 'dunkel'] as const).map((wert) => ({
    id: wert,
    label: wert.charAt(0).toUpperCase() + wert.slice(1),
    swatch: FARBTON_SWATCH[wert],
    filter: { farbgebung: [wert] },
    href: `${basis}?farbgebung=${wert}`,
  }))

const TEASER_FACHMARKT: Teaser = {
  titel: 'Lieber vor Ort anfassen?',
  text: 'Alle Böden siehst du auch in unserer Ausstellung in Hückelhoven.',
  linkLabel: 'Zum Fachmarkt',
  href: '/fachmarkt-hueckelhoven',
  dunkel: true,
}

const TEASER_MUSTER: Teaser = {
  titel: 'Unsicher beim Dekor?',
  text: 'Bestell dir Muster nach Hause und vergleiche in Ruhe.',
  linkLabel: 'Muster bestellen',
  href: '/category/musterbox',
}

export const MEGA_PANELS: Record<string, MegaPanel> = {
  vinyl: {
    id: 'vinyl',
    linksTitel: 'Welches Vinyl passt zu dir?',
    karten: [
      { label: 'Klick-Vinyl', href: '/category/rigid-vinyl', punkte: ['Schwimmend verlegt, ohne Kleben', 'Schnell selbst verlegt'] },
      { label: 'Klebe-Vinyl', href: '/category/klebe-vinyl', punkte: ['Fest mit dem Untergrund verklebt', 'Komplett im Sparpaket ab 5 Paketen'] },
    ],
    marken: [
      { label: 'COREtec', href: '/category/coretec' },
      { label: 'primeCORE', href: '/category/primecore' },
    ],
    finder: {
      titel: 'Vinyl-Finder',
      kategorie: 'vinylboden',
      basis: '/category/vinylboden',
      schritte: [
        {
          id: 'nutzung',
          titel: 'Wofür?',
          darstellung: 'kacheln',
          einzeln: true,
          optionen: [
            { id: 'wohnen', label: 'Zuhause', icon: 'wohnen', filter: {} },
            {
              id: 'buero',
              label: 'Büro & Gewerbe',
              icon: 'buero',
              filter: { nutzungsklasse: ['23-33-starke-gewerbliche-nutzung', '23-34-sehr-starke-gewerbliche-nutzung'] },
              hinweis: 'Nur Nutzungsklasse 23/33 und 23/34',
            },
          ],
        },
        {
          id: 'bodenart',
          titel: 'Verlegung',
          darstellung: 'kacheln',
          einzeln: true,
          optionen: [
            { id: 'klick', label: 'Klick-Vinyl', icon: 'klick', filter: { bodenart: ['klick-vinyl'] }, hinweis: 'Schwimmend, ohne Kleben' },
            { id: 'klebe', label: 'Klebe-Vinyl', icon: 'klebe', filter: { bodenart: ['klebe-vinyl'] }, hinweis: 'Fest verklebt' },
          ],
        },
        { id: 'farbton', titel: 'Farbton', darstellung: 'farben', optionen: farbton('/category/vinylboden') },
        {
          id: 'optik',
          titel: 'Optik',
          darstellung: 'chips',
          optionen: [
            { id: 'landhausdiele', label: 'Landhausdiele', filter: { optik: ['landhausdiele'] } },
            { id: 'fliese', label: 'Fliese', filter: { optik: ['fliese'] } },
            { id: 'fischgraet', label: 'Fischgrät', filter: { optik: ['fischgraet'] } },
          ],
        },
      ],
    },
    teaser: [TEASER_FACHMARKT, TEASER_MUSTER],
    fuss: {
      label: 'Alle Vinylböden ansehen',
      href: '/category/vinylboden',
      text: 'Fragen zum passenden Boden? Ruf uns an: 02433 938884',
    },
  },

  laminat: {
    id: 'laminat',
    linksTitel: 'Laminat entdecken',
    links: [
      { label: 'Alle Laminatböden', href: '/category/laminat', text: 'Unser ganzes Laminat-Sortiment' },
      { label: 'O.R.C.A.', href: '/category/o-r-c-a', text: 'Markenlaminat' },
      { label: 'Landhausdiele', href: '/category/laminat?optik=landhausdiele', text: 'Der Klassiker' },
      { label: 'XL-Landhausdiele', href: '/category/laminat?optik=xl-landhausdiele', text: 'Extra groß für weite Räume' },
    ],
    finder: {
      titel: 'Laminat-Finder',
      kategorie: 'laminat',
      basis: '/category/laminat',
      schritte: [
        {
          id: 'raum',
          titel: 'Wo wird verlegt?',
          darstellung: 'kacheln',
          einzeln: true,
          optionen: [
            { id: 'wohnen', label: 'Wohnen', icon: 'wohnen', filter: {} },
            { id: 'kueche', label: 'Küche', icon: 'kueche', filter: { feuchtraumgeeignet: ['ja'] }, hinweis: 'Nur feuchtraumgeeignetes Laminat' },
            { id: 'bad', label: 'Bad', icon: 'bad', filter: { feuchtraumgeeignet: ['ja'] }, hinweis: 'Nur feuchtraumgeeignetes Laminat' },
            { id: 'buero', label: 'Büro & Gewerbe', icon: 'buero', filter: { nutzungsklasse: ['23-33-starke-gewerbliche-nutzung'] }, hinweis: 'Nur Nutzungsklasse 23/33' },
          ],
        },
        { id: 'farbton', titel: 'Farbton', darstellung: 'farben', optionen: farbton('/category/laminat') },
        {
          id: 'optik',
          titel: 'Optik',
          darstellung: 'chips',
          optionen: [
            { id: 'landhausdiele', label: 'Landhausdiele', filter: { optik: ['landhausdiele'] } },
            { id: 'xl', label: 'XL-Landhausdiele', filter: { optik: ['xl-landhausdiele'] } },
            { id: 'fliese', label: 'Fliese', filter: { optik: ['fliese'] } },
            { id: 'endlos', label: 'Endlosdiele', filter: { optik: ['endlosdiele'] } },
          ],
        },
      ],
    },
    teaser: [TEASER_MUSTER, TEASER_FACHMARKT],
    fuss: {
      label: 'Alle Laminatböden ansehen',
      href: '/category/laminat',
      text: 'Jeden Boden gibt es im Set mit Dämmung und Sockelleiste',
    },
  },

  parkett: {
    id: 'parkett',
    linksTitel: 'Format',
    karten: [
      { label: 'Landhausdiele', href: '/category/parkett?optik=landhausdiele', punkte: ['Klassisch und zeitlos'] },
      { label: 'XL Landhausdiele', href: '/category/parkett?optik=xl-landhausdiele', punkte: ['Extra breit und lang für große Räume'] },
    ],
    gruppen: [
      {
        titel: 'Farbton',
        chips: farbton('/category/parkett').map(({ label, href, swatch }) => ({ label, href, swatch })),
      },
      {
        titel: 'Oberfläche',
        chips: [
          { label: 'Gebürstet, natur geölt', href: '/category/parkett?oberflaeche=gebuerstet-natur-geoelt' },
          { label: 'Gebürstet, weiß geölt', href: '/category/parkett?oberflaeche=gebuerstet-weiss-geoelt' },
        ],
      },
    ],
    teaser: [
      { titel: 'Echtholz erleben', text: 'Parkett siehst und fühlst du am besten in unserer Ausstellung.', linkLabel: 'Zum Fachmarkt', href: '/fachmarkt-hueckelhoven', dunkel: true },
      TEASER_MUSTER,
    ],
    fuss: {
      label: 'Alle Parkettböden ansehen',
      href: '/category/parkett',
      text: 'Jeden Boden gibt es im Set mit Dämmung und Sockelleiste',
    },
  },

  zubehoer: {
    id: 'zubehoer',
    linksTitel: 'Fürs Set',
    links: [
      { label: 'Sockelleisten', href: '/category/sockelleisten', text: 'Passend zu jedem Boden' },
      { label: 'Dämmung', href: '/category/daemmung', text: 'Trittschall für Klick-Vinyl, Laminat und Parkett' },
      { label: 'Abdeckleisten', href: '/category/sockelleisten?profil=abdeckleiste', text: 'Überdecken vorhandene Fliesensockel' },
      { label: 'Zubehör für Sockelleisten', href: '/category/zubehoer-fuer-sockelleisten', text: 'Ecken, Endkappen, Verbinder' },
    ],
    gruppen: [
      {
        titel: 'Sockelleiste · Profil',
        chips: [
          { label: 'Standard', href: '/category/sockelleisten?profil=standard' },
          { label: 'Hamburger', href: '/category/sockelleisten?profil=hamburger' },
          { label: 'Weimarer', href: '/category/sockelleisten?profil=weimarer' },
          { label: 'Premium Weimarer', href: '/category/sockelleisten?profil=premium-weimarer-nadelholz' },
        ],
      },
      {
        titel: 'Sockelleiste · Farbe',
        chips: [
          { label: 'Weiß', href: '/category/sockelleisten?farbe=weiss', swatch: '#ffffff' },
          { label: 'Farbig', href: '/category/sockelleisten?farbe=farbig', swatch: '#ae8a60' },
        ],
      },
    ],
    teaser: [
      { titel: 'Alle Böden im Set', text: 'Boden, Dämmung und Sockelleiste passend zusammengestellt.', linkLabel: 'Zu den Set-Angeboten', href: '/fachmarkt-hueckelhoven/service/set-angebote', dunkel: true },
      { titel: 'Silenced Board', text: 'Unsere Dämmung für Holzuntergründe und alle, die Wert auf ein Naturprodukt legen.', linkLabel: 'Zur Dämmung', href: '/category/daemmung' },
    ],
    fuss: {
      label: 'Alles Zubehör ansehen',
      href: '/category/zubehoer',
      text: 'Profile von Standard bis Premium Weimarer',
    },
  },

  verlegen: {
    id: 'verlegen',
    linksTitel: 'Vorbereiten & verlegen',
    links: [
      { label: 'Untergrundvorbereitung', href: '/category/untergrundvorbereitung', text: 'Damit der neue Boden sauber liegt' },
      { label: 'Kleber', href: '/category/kleber', text: 'Für Klebe-Vinyl und Parkett' },
      { label: 'Werkzeug', href: '/category/werkzeug', text: 'Alles zum Selbstverlegen' },
    ],
    gruppen: [],
    teaser: [
      { titel: 'Lieber verlegen lassen?', text: 'Wir kommen zu dir und erstellen danach ein individuelles Angebot.', linkLabel: 'Verlegeservice anfragen', href: '/fachmarkt-hueckelhoven/service/verlegeservice-anfrage', dunkel: true },
      { titel: 'Werkzeug leihen', text: 'Profi-Werkzeug zum Selbstverlegen gibt es im Fachmarkt zum Ausleihen.', linkLabel: 'Zum Werkzeugverleih', href: '/fachmarkt-hueckelhoven/service/werkzeugverleih' },
    ],
    fuss: {
      label: 'Alles Zubehör ansehen',
      href: '/category/zubehoer',
      text: 'Fragen zur Verlegung? Ruf uns an: 02433 938884',
    },
  },
}

/** Zweite Spalte im Menü „Verlegen & Pflegen“. */
export const VERLEGEN_PFLEGEN: MegaLink[] = [
  { label: 'Montagekleber & Silikon', href: '/category/montagekleber-silikon', text: 'Für Sockelleisten und Anschlüsse' },
  { label: 'Reinigung & Pflege', href: '/category/reinigung-pflege', text: 'Damit dein Boden lange schön bleibt' },
  { label: 'Zubehör für Sockelleisten', href: '/category/zubehoer-fuer-sockelleisten', text: 'Ecken, Endkappen, Verbinder' },
]

/** Reihenfolge der Hauptpunkte im Header mit Mega-Menü. */
export const MEGA_NAV: Array<{ id: string; label: string; href: string }> = [
  { id: 'vinyl', label: 'Vinyl', href: '/category/vinylboden' },
  { id: 'laminat', label: 'Laminat', href: '/category/laminat' },
  { id: 'parkett', label: 'Parkett', href: '/category/parkett' },
  { id: 'zubehoer', label: 'Zubehör', href: '/category/zubehoer' },
  { id: 'verlegen', label: 'Verlegen & Pflegen', href: '/category/zubehoer' },
]

/** Schnellfilter im Mobile-Menü, je Hauptpunkt aus SHOP_NAV (id). */
export const MOBILE_SCHNELLFILTER: Record<string, MegaChip[]> = {
  vinyl: [
    ...farbton('/category/vinylboden').map(({ label, href, swatch }) => ({ label, href, swatch })),
    { label: 'Landhausdiele', href: '/category/vinylboden?optik=landhausdiele' },
    { label: 'Fliese', href: '/category/vinylboden?optik=fliese' },
    { label: 'Fischgrät', href: '/category/vinylboden?optik=fischgraet' },
  ],
  laminat: [
    { label: 'Küche & Bad', href: '/category/laminat?feuchtraumgeeignet=ja' },
    { label: 'Büro & Gewerbe', href: '/category/laminat?nutzungsklasse=23-33-starke-gewerbliche-nutzung' },
    ...farbton('/category/laminat').map(({ label, href, swatch }) => ({ label, href, swatch })),
    { label: 'XL-Landhausdiele', href: '/category/laminat?optik=xl-landhausdiele' },
  ],
  parkett: [
    ...farbton('/category/parkett').map(({ label, href, swatch }) => ({ label, href, swatch })),
    { label: 'XL Landhausdiele', href: '/category/parkett?optik=xl-landhausdiele' },
  ],
  zubehoer: [
    { label: 'Standard', href: '/category/sockelleisten?profil=standard' },
    { label: 'Hamburger', href: '/category/sockelleisten?profil=hamburger' },
    { label: 'Weimarer', href: '/category/sockelleisten?profil=weimarer' },
    { label: 'Premium Weimarer', href: '/category/sockelleisten?profil=premium-weimarer-nadelholz' },
    { label: 'Weiß', href: '/category/sockelleisten?farbe=weiss', swatch: '#ffffff' },
  ],
}

/** Link „Angebote“: während der Black Weeks auf die Aktionsseite. */
export function angeboteHref(promoActive: boolean): string {
  return promoActive ? PROMO_PATH : '/sale'
}

/** Gewählte Filter des Boden-Finders: Filtername → Wert-Slugs („oder“ innerhalb eines Filters). */
export function finderFilter(finder: BodenFinder, auswahl: Record<string, string[]>): Record<string, string[]> {
  const werte: Record<string, Set<string>> = {}
  for (const schritt of finder.schritte) {
    for (const optionId of auswahl[schritt.id] ?? []) {
      const option = schritt.optionen.find((o) => o.id === optionId)
      if (!option) continue
      for (const [key, slugs] of Object.entries(option.filter)) {
        if (!werte[key]) werte[key] = new Set()
        slugs.forEach((slug) => werte[key].add(slug))
      }
    }
  }
  return Object.fromEntries(Object.entries(werte).map(([key, set]) => [key, [...set]]))
}

/** Baut die Kategorie-Adresse aus der Auswahl im Boden-Finder. */
export function finderHref(finder: BodenFinder, auswahl: Record<string, string[]>): string {
  const werte = finderFilter(finder, auswahl)
  const params = new URLSearchParams()
  for (const key of Object.keys(werte).sort()) params.set(key, werte[key].join(','))
  const query = params.toString().replace(/%2C/g, ',')
  return query ? `${finder.basis}?${query}` : finder.basis
}
