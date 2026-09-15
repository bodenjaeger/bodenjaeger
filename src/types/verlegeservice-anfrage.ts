/**
 * Datenvertrag des Formulars „Verlegeservice anfragen".
 *
 * Wird von Client (Formular) und Server (/api/verlegeservice) geteilt, damit
 * beide Seiten dieselbe Struktur kennen. Der Server validiert trotzdem alles
 * erneut — dem Client wird nicht getraut.
 */
import type {
  VsAltbodenBelagKey,
  VsAltbodenEntfernenKey,
  VsBodenartKey,
  VsErreichbarkeitKey,
  VsFlaecheKey,
  VsKontaktartKey,
  VsVerlegeartKey,
  VsZeitraumKey,
} from '@/content/verlegeservice-anfrage'
import type { AreaStatus } from '@/lib/servicegebiet'

/** Eine hochgeladene Datei als Base64 (Bilder + PDF). */
export interface VsDatei {
  filename: string
  mime: string
  dataBase64: string
}

/**
 * Marketing-/Kampagnendaten. Alle Felder optional — was nicht vorhanden ist,
 * wird später in Trello und im Tracking einfach weggelassen.
 */
export interface VsTracking {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  /** Meta-Browser-Cookies — für die Conversions API zur Zuordnung nötig. */
  fbp?: string
  fbc?: string
  landingpage?: string
  referrer?: string
  deviceKategorie?: 'mobile' | 'tablet' | 'desktop'
  browser?: string
  /** ISO-Zeitstempel, wann der Nutzer das Formular begonnen hat. */
  formularStart?: string
}

/** Was das Formular an /api/verlegeservice sendet. */
export interface VsAnfrage {
  // Schritt 1 — Standort
  plz: string
  ort: string

  // Schritt 2 — Projekt
  flaecheStaffel: VsFlaecheKey | null
  /**
   * Freiwillig. Bei „unbekannt" immer null, bei den vier konkreten Staffeln
   * nur gesetzt, wenn der Interessent eine Zahl eingetragen hat.
   */
  qm: number | null
  raeume: string[]
  raumSonstiger: string
  /** Mehrfachauswahl; mindestens ein Eintrag ist Pflicht. */
  bodenarten: VsBodenartKey[]
  zeitraum: VsZeitraumKey | null
  /** Freitext, nur bei Zeitraum „Später". */
  zeitraumDetail: string

  // Schritt 3 — Altboden
  altbodenEntfernen: VsAltbodenEntfernenKey | null
  /** Nur bei „Ja" relevant. */
  altbodenBelag: VsAltbodenBelagKey | null
  altbodenBelagSonstiger: string
  /** Optional, auch bei „Ja" — viele Kunden kennen die Verlegeart nicht. */
  altbodenVerlegeart: VsVerlegeartKey | null

  // Schritt 4 — Kontakt und Unterlagen
  vorname: string
  nachname: string
  telefon: string
  email: string
  kontaktart: VsKontaktartKey | null
  erreichbarkeit: VsErreichbarkeitKey | null
  preisvorstellung: string
  freitext: string
  datenschutz: boolean

  // Technik
  dateien: VsDatei[]
  tracking: VsTracking
  turnstileToken?: string
  /** Honeypot — muss leer bleiben. */
  website?: string
}

/** Antwort des Endpunkts bei Erfolg. */
export interface VsAnfrageErfolg {
  success: true
  leadId: string
  areaStatus: AreaStatus
  distanceKm: number | null
  ort: string
  /** Wie viele Dateien tatsächlich an Trello übertragen wurden. */
  dateienUebertragen: number
  dateienGesamt: number
}

export interface VsAnfrageFehler {
  success: false
  error: string
  /** Feldbezogene Fehler, damit das Formular sie am Feld anzeigen kann. */
  felder?: Record<string, string>
}

export type VsAnfrageAntwort = VsAnfrageErfolg | VsAnfrageFehler
