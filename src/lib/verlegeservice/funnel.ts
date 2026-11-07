/**
 * Gemeinsame Typen und Regeln des Verlegeservice-Formulars mit drei Wegen
 * (Aufmaß, Preisrahmen, Erstberatung). Läuft im Browser und auf dem Server.
 */
import type { AltbodenKey, BodenartKey } from './montage'
import type { VsTracking } from '@/types/verlegeservice-anfrage'

export type WegKey = 'aufmass' | 'preis' | 'beratung'
export type BesitzKey = 'nein' | 'bj' | 'fremd'
export type KlasseKey = 'guenstig' | 'mittel' | 'premium' | 'empfehlung'
export type ZeitraumKey = 'asap' | '1-3' | '3-6' | 'offen'
export type BeratungKey = 'telefon' | 'fachmarkt' | 'whatsapp'
export type RueckrufKey = 'egal' | 'vormittags' | 'mittags' | 'nachmittags'
export type ZahlartKey = 'paypal' | 'stripe' | 'klarna'
export type LeadStufe = 'A' | 'B' | 'C'

export const WEG_NAME: Record<WegKey, string> = { aufmass: 'Aufmaß', preis: 'Preisrahmen', beratung: 'Erstberatung' }
export const BESITZ_NAME: Record<BesitzKey, string> = {
  nein: 'Nein, noch nicht',
  bj: 'Bei Bodenjäger ausgesucht oder gekauft',
  fremd: 'Woanders gekauft – Hinweis gezeigt, will bei uns aussuchen',
}
export const KLASSE_NAME: Record<KlasseKey, string> = { guenstig: 'Günstig', mittel: 'Mittelklasse', premium: 'Premium', empfehlung: 'Empfehlung gewünscht' }
export const ZEITRAUM_NAME: Record<ZeitraumKey, string> = { asap: 'So schnell wie möglich', '1-3': 'In 1–3 Monaten', '3-6': 'In 3–6 Monaten', offen: 'Noch offen' }
export const BERATUNG_NAME: Record<BeratungKey, string> = { telefon: 'Rückruf', fachmarkt: 'Termin im Fachmarkt', whatsapp: 'WhatsApp' }
export const RUECKRUF_NAME: Record<RueckrufKey, string> = { egal: 'Egal', vormittags: 'Vormittags', mittags: 'Mittags', nachmittags: 'Nachmittags' }
export const ZAHLART_NAME: Record<ZahlartKey, string> = { paypal: 'PayPal', stripe: 'Karte, Apple Pay, Google Pay', klarna: 'Klarna' }

export interface ProduktWahl {
  id: number
  name: string
}

/** Was das Formular an /api/verlegeservice/funnel sendet. */
export interface FunnelAnfrage {
  weg: WegKey
  plz: string
  besitz: BesitzKey | null
  produkt: ProduktWahl | null
  produktText: string
  bodenart: BodenartKey | null
  flaeche: number
  altboden: AltbodenKey | null
  sockelleisten: boolean
  stufen: number
  tueren: number
  klasse: KlasseKey | null
  zeitraum: ZeitraumKey | null
  wunschboeden: ProduktWahl[]
  empfehlung: boolean
  beratung: BeratungKey | null
  rueckruf: RueckrufKey | null
  /** Kunde erlaubt Kontakt per WhatsApp (bei Beratung per WhatsApp automatisch) */
  whatsapp: boolean
  /** „YYYY-MM-DDTHH:MM", Ortszeit Hückelhoven */
  termin: string | null
  vorname: string
  nachname: string
  telefon: string
  email: string
  strasse: string
  hausnummer: string
  zahlart: ZahlartKey | null
  widerruf: boolean
  datenschutz: boolean
  tracking: VsTracking
  turnstileToken?: string
  /** Vorgang aus einer früheren Anfrage im selben Besuch */
  vorgang?: string
  /** Honeypot */
  website?: string
}

export interface FunnelErfolg {
  success: true
  leadId: string
  leadStufe: LeadStufe
  preisrahmen?: { min: number; max: number; enthalten: string[]; hinweise: string[]; boden: string }
  zahlungUrl?: string
  zahlungFehler?: boolean
  /** Für eine weitere Anfrage im selben Besuch (aktualisiert dieselbe Karte) */
  vorgang?: string
}
export interface FunnelFehler {
  success: false
  error: string
  felder?: Record<string, string>
}
export type FunnelAntwort = FunnelErfolg | FunnelFehler

// ── Termine im Fachmarkt ──────────────────────────────────────────────────────

export const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONAT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
export const TERMIN_TAGE = 12

const pad = (n: number) => String(n).padStart(2, '0')
export const datumKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Die nächsten Öffnungstage ab morgen (Mo–Sa). */
export function termintage(heute: Date = new Date(), anzahl = TERMIN_TAGE): Date[] {
  const tage: Date[] = []
  const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate())
  while (tage.length < anzahl) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0) tage.push(new Date(d))
  }
  return tage
}

/** Beratungsbeginn im 30-Minuten-Takt: Mo–Fr 9:00–18:00, Sa 9:00–13:30. */
export function terminSlots(tag: Date): string[] {
  const ende = tag.getDay() === 6 ? 13.5 : 18
  const slots: string[] = []
  for (let h = 9; h <= ende; h += 0.5) slots.push(`${pad(Math.floor(h))}:${h % 1 ? '30' : '00'}`)
  return slots
}

export function tagKurz(d: Date): { wt: string; tag: number; monat: string } {
  return { wt: WOCHENTAG[d.getDay()], tag: d.getDate(), monat: MONAT[d.getMonth()] }
}

/** „Di, 10.11. um 15:00 Uhr" */
export function terminText(termin: string | null): string {
  if (!termin) return ''
  const [datum, zeit] = termin.split('T')
  const [j, m, t] = datum.split('-').map(Number)
  const d = new Date(j, m - 1, t)
  return `${WOCHENTAG[d.getDay()]}, ${t}.${m}. um ${zeit} Uhr`
}

/** Liegt der Termin in den nächsten Öffnungstagen und auf einem gültigen Slot? */
export function istGueltigerTermin(termin: string | null, heute: Date): boolean {
  if (!termin) return false
  const [datum, zeit] = termin.split('T')
  const tag = termintage(heute, TERMIN_TAGE + 2).find((d) => datumKey(d) === datum)
  return !!tag && terminSlots(tag).includes(zeit)
}

// ── Lead-Stufe ───────────────────────────────────────────────────────────────

export function leadStufe(a: Pick<FunnelAnfrage, 'weg' | 'zeitraum' | 'flaeche' | 'telefon' | 'besitz' | 'beratung'>, imKreis1bis4: boolean, imGebiet: boolean): LeadStufe {
  if (a.weg === 'aufmass') return 'A'
  let p = 0
  if (imGebiet) p += imKreis1bis4 ? 2 : 1
  if (a.zeitraum === 'asap' || a.zeitraum === '1-3') p += 2
  else if (a.zeitraum === '3-6') p += 1
  if (a.weg === 'preis' && a.flaeche >= 25) p += 1
  if (istTelefon(a.telefon)) p += 1
  if (a.besitz === 'bj') p += 1
  if (a.beratung === 'fachmarkt') p += 2
  return p >= 5 ? 'A' : p >= 3 ? 'B' : 'C'
}

// ── Prüfung der Kontakt- und Zahlungsdaten ───────────────────────────────────

export const istEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

// ── Telefonnummern ───────────────────────────────────────────────────────────
// Eingabe beginnt mit „+49 ". Gespeichert und weitergegeben wird immer E.164
// (+491701234567), damit Trello, WooCommerce, Meta und WhatsApp dieselbe
// Nummer bekommen.

export const TELEFON_START = '+49 '

/** WhatsApp-Nummer von Bodenjäger (ohne +) */
export const BJ_WHATSAPP = '4915567017510'

/** wa.me-Link mit fertigem Text. Klammern & Co. werden kodiert, damit Markdown-Links heil bleiben. */
export function whatsappLink(nummerOhnePlus: string, text: string): string {
  const kodiert = encodeURIComponent(text).replace(/[()'!*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
  return `https://wa.me/${nummerOhnePlus}?text=${kodiert}`
}

/** „max mustermann“ → „Max Mustermann“ */
export const grossAnfang = (s: string) =>
  s.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export type TelefonPruefung = { ok: true; e164: string } | { ok: false; fehler: string }

export function pruefeTelefon(eingabe: string): TelefonPruefung {
  let t = eingabe.trim().replace(/[\s/().\-–]/g, '')
  if (!t || t === '+49' || t === '+') return { ok: false, fehler: 'Bitte gib deine Telefonnummer ein.' }
  if (t.startsWith('00')) t = `+${t.slice(2)}`
  if (!/^\+?\d+$/.test(t)) return { ok: false, fehler: 'Bitte nur Ziffern eingeben.' }
  let national: string
  if (t.startsWith('+49')) national = t.slice(3).replace(/^0+/, '')
  else if (t.startsWith('+')) {
    // Ausland: 7–15 Ziffern nach E.164
    const ziffern = t.slice(1)
    return ziffern.length >= 7 && ziffern.length <= 15
      ? { ok: true, e164: `+${ziffern}` }
      : { ok: false, fehler: 'Bitte prüfe die Telefonnummer.' }
  } else national = t.replace(/^0+/, '')
  if (!/^[1-9]/.test(national)) return { ok: false, fehler: 'Bitte prüfe die Telefonnummer.' }
  // Handy (015x, 016x, 017x): 10–11 Ziffern ohne die 0; Festnetz: 7–11
  const handy = /^1[5-7]/.test(national)
  const min = handy ? 10 : 7
  if (national.length < min) return { ok: false, fehler: handy ? 'Die Handynummer ist zu kurz. Bitte prüfe sie.' : 'Die Telefonnummer ist zu kurz. Bitte prüfe sie.' }
  if (national.length > 11) return { ok: false, fehler: 'Die Telefonnummer ist zu lang. Bitte prüfe sie.' }
  return { ok: true, e164: `+49${national}` }
}

export const istTelefon = (s: string) => pruefeTelefon(s).ok

/** Lesbare Form: „+49 170 1234567" (Handy) bzw. „+49 2433938884" (Festnetz) */
export function telefonAnzeige(e164: string): string {
  if (!e164.startsWith('+49')) return e164
  const n = e164.slice(3)
  return /^1[5-7]/.test(n) ? `+49 ${n.slice(0, 3)} ${n.slice(3)}` : `+49 ${n}`
}

export function pruefeKontakt(a: Pick<FunnelAnfrage, 'weg' | 'beratung' | 'vorname' | 'nachname' | 'telefon' | 'email' | 'datenschutz'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (a.vorname.trim().length < 2) e.vorname = 'Bitte gib deinen Vornamen ein.'
  if (a.nachname.trim().length < 2) e.nachname = 'Bitte gib deinen Nachnamen ein.'
  const telefonPflicht = a.weg === 'aufmass' || (a.weg === 'beratung' && a.beratung !== 'fachmarkt')
  const telefonLeer = a.telefon.replace(/\s/g, '') === '' || a.telefon.replace(/\s/g, '') === '+49'
  if (telefonPflicht || !telefonLeer) {
    const t = pruefeTelefon(a.telefon)
    if (!t.ok) e.telefon = t.fehler
  }
  const emailPflicht = a.weg !== 'beratung' || a.beratung === 'fachmarkt'
  if ((emailPflicht || a.email.trim()) && !istEmail(a.email)) e.email = 'Bitte prüfe deine E-Mail-Adresse.'
  if (!a.datenschutz) e.datenschutz = 'Bitte stimme zu, damit wir dich kontaktieren dürfen.'
  return e
}

export function pruefeZahlung(a: Pick<FunnelAnfrage, 'strasse' | 'hausnummer' | 'zahlart' | 'widerruf'>): Record<string, string> {
  const e: Record<string, string> = {}
  if (a.strasse.trim().length < 3) e.strasse = 'Bitte wähle deine Straße aus den Vorschlägen.'
  else if (!/\d/.test(a.hausnummer)) e.hausnummer = 'Bitte gib deine Hausnummer an.'
  if (!a.zahlart) e.zahlart = 'Bitte wähle eine Zahlungsart.'
  if (!a.widerruf) e.widerruf = 'Bitte bestätige den Hinweis zum Widerrufsrecht.'
  return e
}
