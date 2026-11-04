/**
 * Inhalte der Karriereseite (/karriere).
 *
 * Stelle vorübergehend ausblenden: `aktiv: false` setzen. Zusätzlich prüft
 * `lib/join-status.ts`, ob die Anzeige bei JOIN noch online ist.
 * Neue Stelle: Eintrag in STELLEN ergänzen.
 */

export interface Stelle {
  id: string
  titel: string
  /** Vollzeit oder Teilzeit. Weitere Details stehen in der JOIN-Anzeige. */
  umfang: 'Vollzeit' | 'Teilzeit'
  joinUrl: string
  aktiv: boolean
  /** Überschrift im Abschnitt „Was du bei uns machst". */
  headline: string
  bild: string
  bildAlt: string
  /** CSS object-position für den Bildausschnitt */
  bildPosition: string
  aufgaben: string[]
  anforderung: string
  cta: string
}

export const STELLEN: Stelle[] = [
  {
    id: 'bodenleger',
    titel: 'Parkett- und Bodenleger (m/w/d)',
    umfang: 'Vollzeit',
    joinUrl: 'https://join.com/companies/bodenjaeger/16834877-parkett-und-bodenleger-m-w-d',
    aktiv: true,
    headline: 'Du verlegst Böden, die man gerne zeigt.',
    bild: '/images/fachmarkt-hueckelhoven/verlegeservice/verlegeservice-hero.webp',
    bildAlt: 'Bodenleger von Bodenjäger misst beim Kunden aus',
    bildPosition: '50% 70%',
    aufgaben: [
      'Vinyl, Parkett und Laminat beim Kunden verlegen',
      'Untergründe vorbereiten, spachteln und ausgleichen',
      'Treppen gestalten und renovieren',
      'Projekte überwiegend in Hückelhoven und Umgebung',
    ],
    anforderung:
      'Erfahrung im Verlegen, Führerschein Klasse B und einen sauberen Anspruch. Eine abgeschlossene Ausbildung ist von Vorteil, aber kein Muss.',
    cta: 'Als Bodenleger bewerben',
  },
  {
    id: 'verkaeufer',
    titel: 'Verkäufer / Fachberater Bodenbeläge (m/w/d)',
    umfang: 'Vollzeit',
    joinUrl: 'https://join.com/companies/bodenjaeger/16861076-verkaeufer-fachberater-bodenbelaege-m-w-d',
    aktiv: true,
    headline: 'Du findest für jeden den richtigen Boden.',
    bild: '/images/fachmarkt-hueckelhoven/fachberatung-hero.webp',
    bildAlt: 'Fachberater von Bodenjäger berät eine Kundin',
    bildPosition: '50% 38%',
    aufgaben: [
      'Kunden im Fachmarkt, am Telefon und schriftlich beraten',
      'Angebote erstellen und bis zum Abschluss begleiten',
      'Verkaufsflächen und Warenpräsentation gestalten',
      'Leistungsprämien für gute Verkaufsergebnisse',
    ],
    anforderung:
      'Freude an Menschen und am Verkaufen. Fachwissen über Böden ist keine Voraussetzung, Quereinsteiger sind ausdrücklich willkommen.',
    cta: 'Als Verkäufer bewerben',
  },
  {
    id: 'content-creator',
    titel: 'Content Creator & Mediengestalter (m/w/d)',
    umfang: 'Teilzeit',
    joinUrl:
      'https://join.com/companies/bodenjaeger/16874176-content-creator-und-mediengestalter-digital-print-m-w-d-in-teilzeit',
    aktiv: true,
    headline: 'Du gibst Bodenjäger ein Gesicht.',
    bild: '/images/jobs/content-creator.webp',
    bildAlt: 'Collage aus Smartphone beim Filmen, Foto und Flyer von Bodenjäger',
    bildPosition: '50% 50%',
    aufgaben: [
      'Reels, Shorts und Social-Media-Videos planen, drehen und schneiden',
      'Selbst vor die Kamera gehen und der Marke ein Gesicht geben',
      'Produkte, Team und Projekte fotografieren',
      'Social-Media-Posts, Anzeigen, Flyer und Plakate gestalten',
    ],
    anforderung:
      'Erfahrung mit Social-Media-Content, Video oder Design und Freude daran, vor der Kamera zu stehen. Eine Ausbildung ist von Vorteil, entscheidend sind Portfolio und Können.',
    cta: 'Als Content Creator bewerben',
  },
]

export const INITIATIV_URL = 'https://join.com/companies/bodenjaeger/spontaneous-application'

/** Team-Gesichter im Einstieg, Reihe für Reihe (3-4-3). Dateien: public/images/team/ */
export const TEAM_REIHEN = [
  [
    { foto: 'dominik-jaeger', alt: 'Dominik Jäger, Geschäftsführer' },
    { foto: 'mitarbeiterin', alt: 'Mitarbeiterin von Bodenjäger' },
    { foto: 'sascha-glogowskyj', alt: 'Sascha Glogowskyj, Fachberater' },
  ],
  [
    { foto: 'daniel-schulze', alt: 'Daniel Schulze, Projektleiter Verlegung' },
    { foto: 'mitarbeiter-cap', alt: 'Mitarbeiter von Bodenjäger' },
    { foto: 'hans-dieter-wittmers', alt: 'Hans-Dieter Wittmers, Fachberater' },
    { foto: 'mitarbeiter-bart', alt: 'Mitarbeiter von Bodenjäger' },
  ],
  [
    { foto: 'stephan-hallen', alt: 'Stephan Hallen, Fachberater' },
    { foto: 'mitarbeiter-tattoo', alt: 'Mitarbeiter von Bodenjäger' },
    { foto: 'julian-ritterbex', alt: 'Julian Ritterbex, Lagerist' },
  ],
] as const

export const LAUFBAND = [
  'Kein Anschreiben nötig',
  '30 Tage Urlaub',
  'Unbefristete Verträge',
  'JobRad',
  'Betriebliche Altersvorsorge',
  'Mitarbeiterrabatt, auch für die Familie',
  'Leistungsprämien',
  'Team-Events',
]

export const BENEFITS = [
  { titel: '30 Tage Urlaub', text: 'Pro Jahr bei einer Fünf-Tage-Woche.' },
  { titel: 'Leistungsprämien', text: 'Für individuellen Erfolg und den des Teams.' },
  { titel: 'JobRad', text: 'Fahrrad oder E-Bike über den Arbeitgeber leasen.' },
  { titel: 'Mitarbeiterrabatt', text: 'Auf das gesamte Bodensortiment, auch für deine Familie.' },
  { titel: 'Betriebliche Altersvorsorge', text: 'Du sorgst mit uns früh für später vor.' },
  { titel: 'Weiterentwicklung', text: 'Schulungen und regelmäßige Feedback-Gespräche.' },
]

export const WEG = [
  { titel: 'Stelle anklicken', text: 'E-Mail bestätigen und bewerben. Ein Anschreiben ist keine Pflicht.' },
  { titel: 'Wir melden uns', text: 'Du bekommst eine persönliche Antwort.' },
  { titel: 'Wir lernen uns kennen', text: 'Im Fachmarkt in Hückelhoven, mit dem Team vor Ort.' },
]

export const KARRIERE_MAIL = 'personal@bodenjaeger.de'
