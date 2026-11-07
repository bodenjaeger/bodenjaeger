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
  VsWegKey,
  VsZahlartKey,
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

  // Schritt 4 — Ablauf
  /** Gewünschter nächster Schritt: Aufmaß (kostenpflichtig), Telefon, Preiseinschätzung. */
  weg: VsWegKey | null

  // Schritt 5 — Kontakt und Unterlagen
  vorname: string
  nachname: string
  telefon: string
  email: string
  kontaktart: VsKontaktartKey | null
  erreichbarkeit: VsErreichbarkeitKey | null
  preisvorstellung: string
  freitext: string
  datenschutz: boolean

  // Schritt 6 — Zahlung, nur bei weg === 'aufmass'
  aufmass?: VsAufmassBuchung

  // Technik
  dateien: VsDatei[]
  tracking: VsTracking
  turnstileToken?: string
  /** Honeypot — muss leer bleiben. */
  website?: string
}

/** Angaben aus dem Zahlungsschritt. Der Preis kommt nie vom Client. */
export interface VsAufmassBuchung {
  strasse: string
  zahlart: VsZahlartKey | null
  /** Ausdrücklicher Wunsch nach Beginn vor Ablauf der Widerrufsfrist. */
  widerruf: boolean
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
  /** Nur bei Aufmaß: Weiterleitung zu Stripe bzw. PayPal. */
  zahlungUrl?: string
  /**
   * Nur bei Aufmaß: Die Anfrage ist angekommen, die Zahlung konnte aber nicht
   * gestartet werden. Das Formular zeigt dann die Bestätigung mit Hinweis.
   */
  zahlungFehler?: boolean
}

export interface VsAnfrageFehler {
  success: false
  error: string
  /** Feldbezogene Fehler, damit das Formular sie am Feld anzeigen kann. */
  felder?: Record<string, string>
}

export type VsAnfrageAntwort = VsAnfrageErfolg | VsAnfrageFehler
