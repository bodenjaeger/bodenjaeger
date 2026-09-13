/**
 * Zentrale Inhalte der Fachmarkt-Landingpage Hückelhoven.
 *
 * Variante A (pragmatisch): Redaktionelle Fließtexte kommen aus der
 * WordPress-Seite `filiale-hueckelhoven`; die strukturierten Werte
 * (Kennzahlen, Timeline-Schritte, Vergleichspunkte …) leben hier im Code
 * und sind an einer Stelle pflegbar. Kein Text hart in JSX.
 *
 * Werte, die vom Kunden final bestätigt/geliefert werden müssen, sind mit
 * `TODO(kunde)` markiert.
 */
import type { FilialBanner } from '@/types/fachmarkt'
// Aktionsmotiv „Jedes 7. Paket gratis" — Bildpfade, Rotton und Linkziel liegen
// dort zentral, damit Startseiten-Slider und Angebote-Banner beim nächsten
// Motivwechsel nicht auseinanderlaufen.
import { AKTION_BANNER } from '@/content/aktion-banner'
// Cta-Typ ist jetzt zentral in src/types/cta.ts (geteilt mit der Service-Seite).
// Re-Export für Abwärtskompatibilität bestehender Importe aus diesem Modul.
import type { Cta, CtaVariant } from '@/types/cta'
export type { Cta, CtaVariant }

// ── Stammdaten (NAP) ────────────────────────────────────────────────────────
export const STANDORT = {
  name: 'Bodenjäger Fachmarkt Hückelhoven',
  strasse: 'Neckarstraße 9',
  plz: '41836',
  ort: 'Hückelhoven',
  land: 'DE',
  telefonAnzeige: '02433 938884',
  telefonLink: 'tel:+492433938884',
  email: 'info@bodenjaeger.de',
  geo: { lat: 51.0526, lng: 6.2231 }, // TODO(kunde): exakte Koordinaten verifizieren
} as const

export const OEFFNUNGSZEITEN = [
  { tag: 'Mo. – Fr.', zeit: '9:00 – 18:30 Uhr' },
  { tag: 'Samstag', zeit: '9:00 – 14:00 Uhr' },
  { tag: 'Sonntag', zeit: '12:00 – 16:00 Uhr', hinweis: 'nicht jeden Sonntag' },
] as const

/** Google-Maps-Route-Deeplink auf die Zieladresse */
export const MAPS_ROUTE_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' +
  encodeURIComponent('Bodenjäger Neckarstraße 9, 41836 Hückelhoven')

/** Eingebettete Karte (Standort-Sektion) */
export const MAPS_EMBED_URL =
  'https://maps.google.com/maps?q=' +
  encodeURIComponent('Bodenjäger Neckarstraße 9, 41836 Hückelhoven') +
  '&t=m&z=15&output=embed&iwloc=near'

// Wiederkehrende CTAs
const CTA_ROUTE: Cta = { label: 'Route planen', href: MAPS_ROUTE_URL, variant: 'primary', external: true }
const CTA_ANRUFEN: Cta = { label: 'Jetzt anrufen', href: STANDORT.telefonLink, variant: 'secondary', external: true }
const CTA_BERATUNG: Cta = { label: 'Beratung vereinbaren', href: '/kontakt', variant: 'secondary' }

// ── Sektion 1: Hero ───────────────────────────────────────────────────────────
export const HERO = {
  kicker: 'Bodenfachmarkt Hückelhoven',
  headline: 'Böden erleben. Nicht nur ansehen.',
  subline:
    'Entdecke über 1.000 Bodenmuster, erhalte eine persönliche Fachberatung und finde den passenden Boden für dein Zuhause – direkt in unserem Fachmarkt in Hückelhoven.',
  image: '/images/fachmarkt-hueckelhoven/fachmarkt-hero.webp',
  imageAlt: 'Ausstellung des Bodenjäger Fachmarkts in Hückelhoven',
  ctas: [CTA_ROUTE, CTA_ANRUFEN, CTA_BERATUNG] as Cta[],
  checks: [
    'Über 250 Böden sofort zum Mitnehmen',
    'Faire Festpreise',
    'Persönliche Fachberatung',
    'Erfahrene Bodenleger',
  ],
}

// ── Sektion 2: Trust-Kennzahlen (Count-up) ─────────────────────────────────────
// TODO(kunde): Zahlen final bestätigen.
// Google-Bewertung (4,7★) vorerst STATISCH — Sync mit Google Business folgt separat.
export const TRUST_STATS = [
  { value: 1000, suffix: '+', label: 'Bodenmuster zum Erleben' },
  { value: 250, suffix: '+', label: 'Böden sofort zum Mitnehmen' },
  { value: 40, suffix: '+', label: 'Jahre Erfahrung' },
  { value: 4.7, suffix: '★', label: 'Google-Bewertung', decimals: 1 },
  { value: 10000, suffix: '+', label: 'Zufriedene Kunden' },
  { value: 100, suffix: '%', label: 'Eigene Bodenleger' },
] as const

// ── Sektion 3: Ausstellung erleben ─────────────────────────────────────────────
export const AUSSTELLUNG = {
  kicker: 'Ausstellung',
  headline: 'Sehen, fühlen, entscheiden – in unserer Ausstellung',
  text: 'Vergleiche Farben, Oberflächen und Formate direkt vor Ort und lass dich persönlich beraten.',
  image: '/images/fachmarkt-hueckelhoven/ausstellung/ausstellung.webp',
  imageAlt: 'Kundin fühlt einen Teppichboden in der Ausstellung',
  // Video-Slot: `video` bleibt null, bis die Quelle geliefert wird. Bei
  // gesetzter URL rendert die Komponente ein <video> mit `poster` (= image)
  // und lazy preload; sonst wird nur das Bild gezeigt.
  video: null as string | null, // TODO(kunde): MP4/WebM-Quelle liefern
  // TODO(360): Panolocal-Panoramen — Embed/CTA-Slot bleibt vorbereitet, Inhalte folgen.
  cta: { label: '360° Rundgang starten', href: '#', variant: 'primary', external: true } as Cta,
}

// ── Sektion 4: Warum Bodenjäger ─────────────────────────────────────────────────
export const WARUM = {
  kicker: 'Warum Bodenjäger',
  headline: 'Kein Baumarkt. Ein Fachmarkt mit Handwerks-Wurzeln.',
  image: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF1968-scaled-1-1024x683.jpg',
  imageAlt: 'Persönliche Beratung im Bodenjäger Fachmarkt',
  vorteile: [
    { titel: 'Persönliche Fachberatung', text: 'Praxisnahe Beratung von Fachberatern mit Verlegeerfahrung.' },
    { titel: 'Hoher Lagerbestand', text: 'Viele Böden sofort verfügbar – kein wochenlanges Warten.' },
    { titel: 'Faire Festpreise', text: 'Transparente Preise inklusive passender Sockelleisten und Dämmung.' },
    { titel: 'Rundum-Sorglos-Service', text: 'Von der Auswahl über Lieferung bis zur professionellen Verlegung.' },
    { titel: 'Über 40 Jahre Erfahrung', text: 'Vier Jahrzehnte Kompetenz rund um Bodenbeläge.' },
    { titel: 'Nur geprüfte Qualität', text: 'Wir führen ausschließlich Produkte, die wir selbst verwenden würden.' },
  ],
}

// ── Sektion 5: Besuchs-Ablauf (Timeline) ───────────────────────────────────────
export const BESUCHS_ABLAUF = {
  kicker: 'So läuft dein Besuch',
  headline: 'In fünf entspannten Schritten zum neuen Boden',
  schritte: [
    { nr: 1, titel: 'Ankommen', text: 'Kostenlos parken direkt vor der Tür.' },
    { nr: 2, titel: 'Ausstellung erleben', text: 'Dekore und Verlegemuster in Ruhe vergleichen.' },
    { nr: 3, titel: 'Beratung', text: 'Wir kalkulieren deinen Bedarf – ehrlich und genau.' },
    { nr: 4, titel: 'Angebot', text: 'Festpreis inklusive Zubehör, ohne Überraschungen.' },
    { nr: 5, titel: 'Lieferung & Verlegung', text: 'Auf Wunsch liefern und verlegen wir alles für dich.' },
  ],
}

// ── Sektion 6: Filialangebote (CMS/Mock) ────────────────────────────────────────
// Phase 1: Mock-Daten mit identischem Typ. Phase 2: WordPress-CPT `filial_banner`.
export const FILIAL_BANNER_MOCK: FilialBanner[] = [
  {
    id: 3,
    titel: 'Jedes 7. Paket gratis',
    untertitel: 'Automatischer Rabatt im Warenkorb – für Laminat, Vinyl und Parkett',
    // Bewusst das QUERFORMAT auch auf dem Handy: die Box ist auf allen Geräten
    // 7:3, das Hochformat-Motiv würde darin zu einem Streifen schrumpfen.
    // Kundenentscheidung — gleiche Fläche wie das vorige Banner hat Vorrang vor
    // der Schriftgröße auf kleinen Displays.
    bild: AKTION_BANNER.imageDesktop,
    bildAlt: AKTION_BANNER.alt,
    // Verhältnis 2,07 gegen eine 7:3-Box (2,33): links und rechts bleiben je
    // knapp 6 % der Breite frei, gefüllt mit dem Rot des Motivs.
    hintergrund: AKTION_BANNER.bgColor,
    ctaLabel: AKTION_BANNER.linkLabel,
    ctaUrl: AKTION_BANNER.href,
    aktiv: true,
    reihenfolge: 1,
    gueltigBis: null,
  },
  {
    id: 1,
    titel: 'Aktuelle Filialangebote',
    untertitel: 'Ausgewählte Böden zum Sonderpreis – nur in der Filiale',
    bild: '/images/fachmarkt-hueckelhoven/aktionen/summersale-2026.webp',
    bildAlt: 'Summer SALE 2026 – Klick-Vinyl Pulse Nature zum Aktionspreis',
    ctaLabel: 'Angebote ansehen',
    ctaUrl: '/sale',
    // Ersetzt durch das Aktionsmotiv oben. Daten bleiben erhalten — zum
    // Reaktivieren nur aktiv auf true setzen, wie beim Banner darunter.
    aktiv: false,
    reihenfolge: 2,
    gueltigBis: null,
  },
  {
    id: 2,
    titel: 'Set-Angebote entdecken',
    untertitel: 'Boden + Dämmung + Sockelleiste – als geprüftes Komplettpaket',
    bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/IMG_1392-scaled-e1724846184644-853x1024.jpg',
    bildAlt: 'Set-Angebote im Fachmarkt',
    ctaLabel: 'Zu den Set-Angeboten',
    ctaUrl: '/fachmarkt-hueckelhoven/service/set-angebote',
    // Vorerst ausgeblendet (Kundenwunsch). Daten bleiben erhalten — zum
    // Reaktivieren nur aktiv auf true setzen. activeBanners() filtert darauf.
    aktiv: false,
    reihenfolge: 3,
    gueltigBis: null,
  },
]

/** Filtert Mock/CMS-Banner auf aktiv + nicht abgelaufen und sortiert nach Reihenfolge. */
export function activeBanners(
  banners: FilialBanner[],
  now: Date = new Date(),
): FilialBanner[] {
  return banners
    .filter((b) => b.aktiv)
    .filter((b) => !b.gueltigBis || new Date(b.gueltigBis) >= now)
    .sort((a, b) => a.reihenfolge - b.reihenfolge)
}

export const FILIAL_ANGEBOTE = {
  kicker: 'Nur in der Filiale',
  headline: 'Aktuelle Angebote aus unserem Fachmarkt',
}

// ── Sektion 7: Boden-Kategorien ─────────────────────────────────────────────────
export const BODEN_KATEGORIEN = {
  kicker: 'Sortiment',
  headline: 'Für jeden Raum der passende Boden',
  // Reihenfolge lt. Kundenfeedback. `href: null` = Karte bewusst NICHT klickbar
  // (kein Link/Hover/Pointer). Teppichboden + PVC/CV vorerst ohne Verlinkung.
  kategorien: [
    { titel: 'Klick-Vinyl', href: '/category/rigid-vinyl', image: '/images/fachmarkt-hueckelhoven/sortiment/klick-vinyl.webp' }, // Kunde: Klick-Vinyl = rigid-vinyl
    { titel: 'Klebe-Vinyl', href: '/category/klebe-vinyl', image: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF1946-scaled-1-1024x683.jpg' },
    { titel: 'Parkett', href: '/category/parkett', image: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF1962-scaled-1-1024x683.jpg' },
    { titel: 'Laminat', href: '/category/laminat', image: '/images/fachmarkt-hueckelhoven/sortiment/laminat.webp' },
    { titel: 'Teppichboden', href: null, image: '/images/fachmarkt-hueckelhoven/sortiment/teppichboden.webp' }, // vorerst keine Verlinkung
    { titel: 'PVC / CV-Belag', href: null, image: '/images/fachmarkt-hueckelhoven/sortiment/cv-boden.webp' }, // vorerst keine Verlinkung
  ] as { titel: string; href: string | null; image: string }[],
  cta: { label: 'Gesamtes Sortiment ansehen', href: '/', variant: 'outline' } as Cta,
}

// ── Sektion 8: Baumarkt-Vergleich ───────────────────────────────────────────────
export const VERGLEICH = {
  kicker: 'Der Unterschied',
  headline: 'Fachmarkt statt Baumarkt',
  bodenjaeger: {
    titel: 'Bodenjäger Fachmarkt',
    punkte: [
      'Praxisnahe Beratung von Fachberatern mit Verlegeerfahrung.',
      'Sockelleisten & Dämmung immer kostenlos dabei.',
      'Hoher Lagerbestand, sofort verfügbar',
      'Lieferung und professionelle Verlegung möglich',
      'Ehrliche und faire Festpreise.',
    ],
  },
  baumarkt: {
    titel: 'Klassischer Baumarkt',
    punkte: [
      'Selbstbedienung, kaum Fachberatung',
      'Zubehör muss einzeln zusammengesucht werden',
      'Häufig nur Bestellware',
      'Verlegung ist deine Sache',
      'Preise wirken günstig, Zubehör kommt obendrauf',
    ],
  },
}

// ── Sektion 9: Leistungen (Bild + Titel + 1 Satz) ────────────────────────────────
// `bild` = Interim-Foto aus dem WP-Bestand, bis finale Motive geliefert werden
// (8 Motive in BILDER-BEDARF.md gelistet). `icon` bleibt als Fallback erhalten.
// TODO: Kundenfreigabe — Beschreibungstexte final bestätigen.
export const LEISTUNGEN = {
  kicker: 'Unsere Leistungen',
  headline: 'Rundum-Sorglos – alles aus einer Hand',
  // Aktuell nur 4 Leistungen sichtbar (Kundenwunsch). Reihenfolge lt. Brief.
  items: [
    { icon: 'Users', titel: 'Fachberatung', text: 'Persönliche Beratung vor Ort und am Telefon.', href: '/fachmarkt-hueckelhoven/service/fachberatung', bild: '/images/fachmarkt-hueckelhoven/leistungen/fachberatung.png' },
    { icon: 'Package', titel: 'Großmuster', text: 'Nimm deine Favoriten einfach mit und teste sie in Ruhe zuhause.', href: '/fachmarkt-hueckelhoven/service/musterservice', bild: '/images/fachmarkt-hueckelhoven/leistungen/grossmuster.png' },
    // Einlagerung = frühere „Warenlagerung", nur anders benannt.
    { icon: 'Warehouse', titel: 'Einlagerung', text: 'Wir lagern deinen neuen Boden kostenfrei ein.', href: '/fachmarkt-hueckelhoven/service/einlagerung', bild: '/images/fachmarkt-hueckelhoven/leistungen/einlagerung.png' },
    { icon: 'Hammer', titel: 'Verlegeservice', text: 'Professionelle Verlegung durch erfahrene Handwerker.', href: '/fachmarkt-hueckelhoven/service/verlegeservice', bild: '/images/fachmarkt-hueckelhoven/leistungen/verlegeservice.png' },
    // ── Vorerst ausgeblendet (Daten bleiben erhalten, nicht löschen) ──
    // { icon: 'Truck', titel: 'Lieferservice', text: 'Lieferung zum Wunschtermin bis vor die Tür.', href: '/fachmarkt-hueckelhoven/service/lieferung-abholung', bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF2046-scaled-1-1024x683.jpg' },
    // { icon: 'Caravan', titel: 'Anhängerverleih', text: 'Kostenloser Anhänger für den Selbsttransport.', href: '/fachmarkt-hueckelhoven/anhaengerverleih', bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF2104-scaled-1-683x1024.jpg' },
    // { icon: 'Package', titel: 'Set-Angebote', text: 'Boden, Dämmung und Sockelleiste als Komplettpaket.', href: '/fachmarkt-hueckelhoven/service/set-angebote', bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/IMG_1392-scaled-e1724846184644-853x1024.jpg' },
    // { icon: 'Wrench', titel: 'Werkzeugverleih', text: 'Das passende Werkzeug für dein Projekt.', href: '/fachmarkt-hueckelhoven/service/werkzeugverleih', bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF2201-scaled-1-683x1024.jpg' },
    // { icon: 'CalendarDays', titel: 'Schausonntag', text: 'An ausgewählten Sonntagen geöffnet.', href: '/fachmarkt-hueckelhoven/schausonntag', bild: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF2023-scaled-1-1024x683.jpg' },
  ],
  // Button unter den Leistungen → Service-Übersicht (jetzt unter dem Fachmarkt).
  cta: { label: 'Alle Fachmarkt-Leistungen entdecken', href: '/fachmarkt-hueckelhoven/service', variant: 'secondary' } as Cta,
}

// ── Sektion 10: Google-Bewertungen ──────────────────────────────────────────────
export const GOOGLE_REVIEWS = {
  kicker: 'Das sagen unsere Kunden',
  headline: 'Ausgezeichnet bewertet',
  rating: 4.8, // TODO(kunde): finalen Wert bestätigen
  count: 180, // TODO(kunde): finale Anzahl bestätigen
  countSuffix: '+',
  hinweis: 'Bewertungen bei Google',
  // Kuratierte Original-Rezensionen aus src/data/google-reviews.json (per id,
  // Reihenfolge = Anzeigereihenfolge). Auswahl bewusst mit Fachmarkt-Bezug:
  // Beratung vor Ort, Muster mitnehmen, Auswahl, Verlege-Kompetenz.
  // Priorität: die jüngsten Rezensionen des Datensatzes.
  // Keine Texte hier duplizieren — die JSON bleibt die einzige Quelle.
  reviewIds: [33, 1, 7, 3, 10, 32],
}

// ── Sektion 11: Team ────────────────────────────────────────────────────────────
export const TEAM = {
  kicker: 'Dein Team vor Ort',
  headline: 'Menschen, die Böden lieben',
  // Kein Gruppenfoto mehr — die Mitarbeiter werden einzeln mit Porträt vorgestellt.
  mitglieder: [
    { name: 'Dominik Jäger', funktion: 'Geschäftsführer', foto: '/images/fachmarkt-hueckelhoven/team/dominik-jaeger.png', telefon: STANDORT.telefonLink },
    { name: 'Hans-Dieter Wittmers', funktion: 'Fachberater', foto: '/images/fachmarkt-hueckelhoven/team/hans-dieter-wittmers.png', telefon: STANDORT.telefonLink },
    { name: 'Sascha Glogowskyj', funktion: 'Fachberater', foto: '/images/fachmarkt-hueckelhoven/team/sascha-glogowskyj.png', telefon: STANDORT.telefonLink },
    { name: 'Stephan Hallen', funktion: 'Fachberater', foto: '/images/fachmarkt-hueckelhoven/team/stephan-hallen.png', telefon: STANDORT.telefonLink },
    { name: 'Daniel Schulze', funktion: 'Verlegeservice', foto: '/images/fachmarkt-hueckelhoven/team/daniel-schulze.png', telefon: STANDORT.telefonLink },
    { name: 'Julian Ritterbex', funktion: 'Lagerist', foto: '/images/fachmarkt-hueckelhoven/team/julian-ritterbex.png', telefon: STANDORT.telefonLink },
  ],
  // Gleiche Zielstrecke wie „Beratung vereinbaren"
  cta: { label: 'Kontakt aufnehmen', href: '/kontakt', variant: 'secondary' } as Cta,
}

// ── Sektion 12 + 13 zusammengeführt: Abschluss-CTA inkl. Standort ────────────────
// StandortSection wurde entfernt; Adresse/Öffnungszeiten/Telefon/Maps leben jetzt
// im dunklen Abschluss-Block (Komponente AbschlussCta).
export const ABSCHLUSS = {
  headline: 'Wir freuen uns auf deinen Besuch.',
  subline: 'Erlebe über 1.000 Bodenmuster, persönliche Fachberatung und professionelle Unterstützung – von der Auswahl bis zur Verlegung.',
  // Hintergrundbild des dunklen Abschluss-Bands
  image: 'https://2025.bodenjaeger.de/wp-content/uploads/2024/08/DSCF2046-scaled-1-1024x683.jpg',
  imageAlt: 'Ausstellungsfläche im Bodenjäger Fachmarkt Hückelhoven',
  ctas: [CTA_ROUTE, CTA_BERATUNG] as Cta[],
}

// ── Landingpage-Navigation ────────────────────────────────────────────────────────
// Anker-Items springen auf die Sektions-ids der Landingpage; "Leistungen" ist ein
// Dropdown auf die echten Service-Routen. Reihenfolge lt. Kundenvorgabe.
const FM = '/fachmarkt-hueckelhoven'

/** Kompakte Öffnungszeiten für die Header-Infozeile. */
export const OEFFNUNGSZEITEN_KURZ = 'Mo.–Fr. 9:00–18:30 Uhr · Sa. 9:00–14:00 Uhr'

/** Einträge des "Leistungen"-Dropdowns (Desktop) bzw. -Akkordeons (Mobil). */
export const LEISTUNGEN_DROPDOWN = [
  { label: 'Alle Leistungen anzeigen', href: `${FM}/service` },
  { label: 'Fachberatung', href: `${FM}/service/fachberatung` },
  { label: 'Musterservice', href: `${FM}/service/musterservice` },
  { label: 'Verlegeservice', href: `${FM}/service/verlegeservice` },
  { label: 'Set-Angebote', href: `${FM}/service/set-angebote` },
  { label: 'Lieferung & Abholung', href: `${FM}/service/lieferung-abholung` },
  { label: 'Einlagerung', href: `${FM}/service/einlagerung` },
  { label: 'Werkzeugverleih', href: `${FM}/service/werkzeugverleih` },
] as const

/**
 * Ordnete Nav-Items. `kind: 'anchor'` → Sprung auf Landingpage-Sektion,
 * `kind: 'leistungen'` → Dropdown (Items aus LEISTUNGEN_DROPDOWN).
 */
export const LANDING_NAV = {
  items: [
    { kind: 'anchor', label: 'Ausstellung', href: '#ausstellung' },
    { kind: 'anchor', label: 'Böden', href: '#bodenkategorien' },
    { kind: 'anchor', label: 'Angebote', href: '#angebote' },
    { kind: 'leistungen', label: 'Leistungen' },
    { kind: 'anchor', label: 'Bewertungen', href: '#bewertungen' },
    { kind: 'anchor', label: 'Team', href: '#team' },
    { kind: 'anchor', label: 'Kontakt', href: '#kontakt' },
  ],
  shopCta: { label: 'Zum Shop', href: '/' },
} as const

/**
 * Dynamisches Primär-CTA je Route. Auf bestimmten Service-Seiten passendes
 * Label/Ziel, sonst „Beratung vereinbaren". Auswahl in FachmarktLandingNav.
 */
export function primaryNavCta(pathname: string): Cta {
  // verlegeservice-anfrage selbst → Default (nicht auf sich selbst verlinken)
  if (
    pathname.startsWith(`${FM}/service/verlegeservice`) &&
    !pathname.startsWith(`${FM}/service/verlegeservice-anfrage`)
  ) {
    return { label: 'Verlegeservice anfragen', href: `${FM}/service/verlegeservice-anfrage`, variant: 'primary' }
  }
  if (pathname.startsWith(`${FM}/service/musterservice`)) {
    return { label: 'Muster anfragen', href: '/kontakt', variant: 'primary' }
  }
  if (pathname.startsWith(`${FM}/service/set-angebote`)) {
    return { label: 'Set-Angebot sichern', href: '/kontakt', variant: 'primary' }
  }
  return { label: 'Beratung vereinbaren', href: '/kontakt', variant: 'primary' }
}

// ── Sticky Bottom Bar (mobil) ───────────────────────────────────────────────────
export const STICKY = {
  route: CTA_ROUTE,
  anrufen: CTA_ANRUFEN,
  beratung: CTA_BERATUNG,
}
