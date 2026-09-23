/**
 * Zentrale Datenquelle für den globalen Footer.
 *
 * EINZIGE Stelle für Footer-Spalten, Links, Social-Profile, Zahlungs- und
 * Versand-Badges. Die Komponenten unter `components/footer/` rendern nur noch
 * — sie enthalten keine hartverdrahteten Link-Listen.
 *
 * Ziele werden, wo vorhanden, aus bestehenden Quellen importiert
 * (`content/service.ts`, `content/fachmarkt.ts`) statt neu getippt.
 */
import { SERVICE_LINKS } from '@/content/service'
import { OEFFNUNGSZEITEN, STANDORT } from '@/content/fachmarkt'

// ── Stammdaten ───────────────────────────────────────────────────────────────

/**
 * Vollständige Firmierung.
 * Quelle: Impressum (WordPress-Seite `impressum`) — „Bodenjäger GmbH & Co. KG",
 * Amtsgericht Mönchengladbach, HRA 10101. Am 09.08.2026 dort verifiziert.
 * Einzige Definition im Frontend — nicht duplizieren.
 */
export const FIRMIERUNG = 'Bodenjäger GmbH & Co. KG'

export const FOOTER_ADRESSE = {
  strasse: STANDORT.strasse,
  plzOrt: `${STANDORT.plz} ${STANDORT.ort}`,
} as const

export const FOOTER_TELEFON = {
  anzeige: STANDORT.telefonAnzeige,
  href: STANDORT.telefonLink,
} as const

/**
 * Öffnungszeiten im Footer: nur Mo.–Fr. und Sa.
 * Der Sonntag aus OEFFNUNGSZEITEN ("nicht jeden Sonntag") wird hier bewusst
 * ausgelassen — Quelle bleibt trotzdem content/fachmarkt.ts.
 */
export const FOOTER_OEFFNUNGSZEITEN = OEFFNUNGSZEITEN.filter(
  (zeile) => zeile.tag !== 'Sonntag'
)

// ── Typen ────────────────────────────────────────────────────────────────────

/** Icon-Schlüssel für Links mit Symbol (nur Kontaktspalte). Mapping: FooterLinkList. */
export type FooterIconKey = 'phone' | 'route' | 'mail'

export interface FooterLink {
  label: string
  /** Zielpfad. Entfällt bei `kind: 'cookie'`. */
  href?: string
  /** 'cookie' rendert einen <button>, der das Consent-Layer öffnet (kein <a>). */
  kind?: 'cookie'
  /** Externes Ziel (tel:, Google Maps) → kein next/link, target/rel gesetzt. */
  external?: boolean
  icon?: FooterIconKey
}

export interface FooterColumn {
  /** Stabile ID für aria-controls/aria-labelledby im Mobile-Accordion. */
  id: string
  title: string
  /** Beschriftung des <nav>-Landmarks dieser Spalte. */
  ariaLabel: string
  links: FooterLink[]
}

export interface FooterBadge {
  /** Sichtbarer Text bei Textbadges und zugleich Screenreader-Label. */
  label: string
  /**
   * Lokales SVG unter public/. Fehlt der Wert, rendert BadgeGrid denselben
   * Badge als Textbadge — identische Hülle, Höhe und Schriftgröße.
   * Ein späteres Logo aktiviert man durch Setzen von `src`, ohne Codeänderung.
   */
  src?: string
  /**
   * Zweite, kleinere Zeile unter `label` — nur für Textbadges. Trennt die
   * Marke von der Zahlungsart („PayPal" / „Später Bezahlen"), damit beides
   * nicht als ein Fließtext in der schmalen Kachel umbricht. Fließt mit ins
   * Screenreader-Label ein.
   */
  sublabel?: string
  /**
   * false = vorbereitet, aber nicht gerendert. Genutzt für Zahlarten, die der
   * Checkout (noch) nicht anbietet — Footer und Checkout bleiben deckungsgleich.
   */
  enabled: boolean
  /** Sondermarke vor dem Text: roter Kreis mit „J" (eigene Lieferung). */
  mark?: 'bodenjaeger'
}

// ── Social ───────────────────────────────────────────────────────────────────

export type SocialKey = 'facebook' | 'instagram' | 'tiktok' | 'youtube'

export interface SocialProfile {
  key: SocialKey
  /** Accessible Name des Links. */
  label: string
  href: string
}

/**
 * Aktive Social-Profile — alle vier Kanäle sind freigeschaltet. Die Icons sind
 * in FooterSocial.tsx gemappt; ein weiterer Kanal bräuchte dort einen Eintrag
 * und in SocialBrandIcons.tsx die Marken-Glyphe.
 *
 * Die YouTube-URL steht prozentkodiert (`%C3%A4` = „ä"), wie YouTube den
 * Handle selbst ausliefert.
 */
export const FOOTER_SOCIAL: SocialProfile[] = [
  {
    key: 'facebook',
    label: 'Bodenjäger auf Facebook',
    href: 'https://www.facebook.com/p/Bodenj%C3%A4ger-100057406151090/?locale=de_DE',
  },
  {
    key: 'instagram',
    label: 'Bodenjäger auf Instagram',
    href: 'https://www.instagram.com/bodenjager/',
  },
  {
    key: 'tiktok',
    label: 'Bodenjäger auf TikTok',
    href: 'https://www.tiktok.com/@bodenjaeger_',
  },
  {
    key: 'youtube',
    label: 'Bodenjäger auf YouTube',
    href: 'https://www.youtube.com/@Bodenj%C3%A4ger',
  },
]

// ── Spalten 2–4 ──────────────────────────────────────────────────────────────

/**
 * Es existiert genau EINE Widerrufsseite (/widerruf). Der Link „Widerruf &
 * Rücksendung" in der Kundenservice-Spalte, der Button darunter und der
 * Eintrag in der Bottom-Bar zeigen deshalb auf dasselbe Ziel.
 */
const WIDERRUF_HREF = '/widerruf'

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: 'kundenservice',
    title: 'Kundenservice',
    ariaLabel: 'Kundenservice',
    links: [
      { label: 'Kontakt', href: SERVICE_LINKS.kontakt },
      { label: 'Muster bestellen', href: SERVICE_LINKS.musterBestellen },
      { label: 'Versand & Lieferzeit', href: '/versand-lieferzeit' },
      { label: 'Widerruf & Rücksendung', href: WIDERRUF_HREF },
      { label: 'AGB', href: '/agb' },
      { label: 'Datenschutz', href: '/datenschutz' },
      { label: 'Impressum', href: '/impressum' },
    ],
  },
  {
    id: 'ueber-bodenjaeger',
    title: 'Über Bodenjäger',
    ariaLabel: 'Über Bodenjäger',
    links: [
      { label: 'Jobs & Karriere', href: '/karriere' },
      { label: 'Blog', href: '/blog' },
      { label: 'Cookie-Einstellungen', kind: 'cookie' },
    ],
  },
  {
    id: 'fachmarkt',
    title: 'Fachmarkt Hückelhoven',
    ariaLabel: 'Fachmarkt Hückelhoven',
    links: [
      { label: 'Fachmarkt Übersicht', href: SERVICE_LINKS.fachmarkt },
      { label: 'Fachberatung', href: SERVICE_LINKS.fachberatung },
      { label: 'Musterservice', href: SERVICE_LINKS.musterservice },
      { label: 'Verlegeservice', href: SERVICE_LINKS.verlegeservice },
      { label: 'Verlegeservice anfragen', href: SERVICE_LINKS.verlegeserviceAnfrage },
      { label: 'Set-Angebote', href: SERVICE_LINKS.setKaufen },
      { label: 'Lieferung & Abholung', href: SERVICE_LINKS.lieferung },
      { label: 'Einlagerung', href: SERVICE_LINKS.einlagerung },
      { label: 'Werkzeugverleih', href: SERVICE_LINKS.verlegewerkzeug },
    ],
  },
]

/** Ruhiger Outline-Button unter der Kundenservice-Spalte. Kein CTA-Look. */
export const WIDERRUF_BUTTON = {
  label: 'Vertrag widerrufen',
  href: WIDERRUF_HREF,
} as const

// ── Trust-/Zahlungs-/Lieferzone ──────────────────────────────────────────────

/**
 * Zahlungsarten. Reihenfolge und Auswahl folgen der Designvorlage
 * „Footer_2026" (Stand 23.09.2026, liegt nicht im Repo).
 *
 * Harte Regel: Angezeigt wird nur, was der Checkout auch anbietet
 * (src/app/checkout/page.tsx). Ein Logo für eine nicht wählbare Zahlart wäre
 * eine falsche Werbeaussage.
 * - Visa/Mastercard/Amex/Apple Pay laufen über die Stripe-Kachel
 * - „PayPal Später Bezahlen" ist Teil der PayPal-Kachel (30 Tage Rechnungskauf)
 * - „Ratenzahlung (Klarna)" ist Teil der Klarna-Kachel
 * - Vorkasse = BACS
 */
export const PAYMENT_BADGES: FooterBadge[] = [
  { label: 'Visa', src: '/images/zahlungslogos/visa.svg', enabled: true },
  { label: 'Mastercard', src: '/images/zahlungslogos/mastercard.svg', enabled: true },
  { label: 'PayPal', src: '/images/zahlungslogos/paypal.svg', enabled: true },
  { label: 'Apple Pay', src: '/images/zahlungslogos/apple-pay.svg', enabled: true },
  { label: 'American Express', src: '/images/zahlungslogos/amex.svg', enabled: true },
  { label: 'Klarna', src: '/images/zahlungslogos/klarna.svg', enabled: true },
  { label: 'PayPal', sublabel: 'Später Bezahlen', enabled: true },
  { label: 'Ratenzahlung', sublabel: '(Klarna)', enabled: true },
  { label: 'Vorkasse', enabled: true },

  // Google Pay: im Checkout über Stripe verfügbar, im Footer aber auf
  // Kundenwunsch ausgeblendet — die Vorlage zeigt es nicht. Das SVG liegt
  // bereit, `enabled: true` genügt zum Wiedereinblenden.
  { label: 'Google Pay', src: '/images/zahlungslogos/google-pay.svg', enabled: false },

  // Amazon Pay: steht in der Designvorlage, ist im Checkout aber NICHT
  // implementiert (weder Gateway noch Auswahl). Erst einblenden, wenn die
  // Zahlart dort tatsächlich wählbar ist. Das SVG liegt bereit.
  { label: 'Amazon Pay', src: '/images/zahlungslogos/amazon-pay.svg', enabled: false },

  // Vom Checkout nicht angeboten → nicht anzeigen.
  { label: 'Ratenzahlung PayPal', enabled: false },
]

/**
 * Versanddienstleister. DHL liegt als lokales SVG vor, Raben nicht — dafür
 * findet sich in keiner der freien Icon-Sammlungen eine Marke, und
 * Hotlinking ist ausgeschlossen. Raben und Bodenjäger bleiben deshalb
 * Textbadges; sobald ein Logo unter public/ liegt, reicht `src`.
 */
export const SHIPPING_BADGES: FooterBadge[] = [
  { label: 'DHL', src: '/images/versandlogos/dhl.svg', enabled: true },
  { label: 'Raben', enabled: true },
  { label: 'Bodenjäger', enabled: true, mark: 'bodenjaeger' },
]

/**
 * Shop-Bewertung bei Trusted Shops, wie sie im Footer steht.
 *
 * ACHTUNG — manuell gepflegt. Es gibt im Projekt keine Anbindung an die
 * eTrusted-API; der Wert wird NICHT automatisch aktualisiert. Er muss mit der
 * tatsächlichen Note im Trusted-Shops-Profil übereinstimmen, sonst ist die
 * Angabe eine falsche Werbeaussage. Die aktuelle Note liefert daneben das
 * Floating-Trustbadge (components/TrustedShops.tsx) — dort gegenprüfen.
 *
 * Herkunft des aktuellen Werts: Designvorlage „Footer_2026"
 * (Stand 23.09.2026), NOCH NICHT gegen das echte Profil verifiziert.
 */
export const TRUSTED_SHOPS_BEWERTUNG = {
  note: 4.6,
  maximum: 5,
} as const

export const TRUST_ZONE_TEXTE = {
  trustedShops: {
    titel: 'Trusted Shops',
    text: 'Käuferschutz',
  },
  zahlung: {
    titel: 'Sichere Zahlung',
  },
  lieferung: {
    titel: 'Schnelle Lieferung',
    zusatz: 'oder Abholung im Fachmarkt',
  },
  fachmarkt: {
    titel: 'Fachmarkt vor Ort',
    text: 'Persönliche Beratung, große Auswahl und viele Services rund um deinen Boden.',
  },
} as const

// ── Bottom-Bar ───────────────────────────────────────────────────────────────

export const FOOTER_COPYRIGHT = `© 2026 ${FIRMIERUNG}`

export const FOOTER_PREISHINWEIS =
  '* alle Preise inkl. MwSt. und ggf. zzgl. Versandkosten'

export const FOOTER_BOTTOM_LINKS: FooterLink[] = [
  { label: 'Impressum', href: '/impressum' },
  { label: 'Datenschutz', href: '/datenschutz' },
  { label: 'AGB', href: '/agb' },
  { label: 'Widerruf', href: WIDERRUF_HREF },
  { label: 'Cookie-Einstellungen', kind: 'cookie' },
]
