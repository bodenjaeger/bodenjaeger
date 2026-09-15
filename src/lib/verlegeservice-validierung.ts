/**
 * Validierung des Verlegeservice-Formulars — geteilt von Client und Server.
 *
 * Reine Funktionen, kein DOM, keine Node-APIs: dadurch prüft der Server exakt
 * dieselben Regeln, die der Nutzer im Formular sieht. Der Server ist die
 * verbindliche Instanz; die Client-Prüfung dient nur der schnellen Rückmeldung.
 */
import {
  VS_BELAG_SONSTIGER,
  VS_BODENARTEN,
  VS_FEHLER,
  VS_FLAECHE_STAFFELN,
  VS_RAEUME,
  VS_RAUM_SONSTIGER,
  VS_UPLOAD,
  VS_ZEITRAEUME,
  VS_ALTBODEN_BELAG,
  VS_ALTBODEN_ENTFERNEN,
  VS_ALTBODEN_VERLEGEART,
  VS_ERREICHBARKEIT,
  VS_KONTAKTART,
  type VsFlaecheKey,
} from '@/content/verlegeservice-anfrage'
import { istPlzFormat } from '@/lib/servicegebiet'
import type { VsAnfrage, VsDatei } from '@/types/verlegeservice-anfrage'

/** Feldname → Fehlermeldung. Leeres Objekt = alles in Ordnung. */
export type Feldfehler = Record<string, string>

const staffel = (key: string | null) =>
  VS_FLAECHE_STAFFELN.find((s) => s.key === key) ?? null

const istKey = (liste: readonly { key: string }[], wert: unknown) =>
  typeof wert === 'string' && liste.some((e) => e.key === wert)

/**
 * E-Mail-Prüfung: bewusst pragmatisch. Sie soll Tippfehler abfangen, nicht
 * RFC 5322 nachbauen — zu strenge Muster weisen gültige Adressen ab.
 */
export function istEmail(wert: string): boolean {
  const v = wert.trim()
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v) && v.length <= 254
}

/**
 * Telefonprüfung: erlaubt Ziffern, Leerzeichen, +, -, /, Klammern und verlangt
 * mindestens 6 Ziffern. Deutsche Rufnummern werden sehr unterschiedlich
 * geschrieben, deshalb wird nur die Ziffernmenge geprüft.
 */
export function istTelefon(wert: string): boolean {
  const v = wert.trim()
  if (!/^[+0-9 ()/.-]+$/.test(v)) return false
  return (v.match(/\d/g) ?? []).length >= 6
}

/** Prüft Schritt 1. */
export function pruefeStandort(a: Pick<VsAnfrage, 'plz'>): Feldfehler {
  const f: Feldfehler = {}
  if (!a.plz?.trim()) f.plz = VS_FEHLER.plzPflicht
  else if (!istPlzFormat(a.plz)) f.plz = VS_FEHLER.plzFormat
  return f
}

/** Prüft Schritt 2 inklusive der Staffel-/Quadratmeter-Kopplung. */
export function pruefeProjekt(
  a: Pick<
    VsAnfrage,
    'flaecheStaffel' | 'qm' | 'raeume' | 'raumSonstiger' | 'bodenarten' | 'zeitraum'
  >,
): Feldfehler {
  const f: Feldfehler = {}

  const s = staffel(a.flaecheStaffel)
  if (!s) {
    f.flaecheStaffel = VS_FEHLER.flaechePflicht
  } else if (
    s.min !== null &&
    s.max !== null &&
    a.qm !== null &&
    a.qm !== undefined &&
    !Number.isNaN(a.qm)
  ) {
    // Die Quadratmeterzahl ist freiwillig — leer ist in Ordnung. Wird sie
    // angegeben, muss sie aber plausibel sein und zur gewählten Staffel
    // passen, sonst widerspricht die Anfrage sich selbst.
    if (!Number.isFinite(a.qm) || a.qm <= 0) {
      f.qm = VS_FEHLER.qmZahl
    } else if (a.qm < s.min || a.qm > s.max) {
      f.qm = VS_FEHLER.qmStaffel(s.label)
    }
  }

  const raeume = Array.isArray(a.raeume) ? a.raeume : []
  const gueltigeRaeume = raeume.filter((r) =>
    (VS_RAEUME as readonly string[]).includes(r),
  )
  if (gueltigeRaeume.length === 0) f.raeume = VS_FEHLER.raeumePflicht
  if (gueltigeRaeume.includes(VS_RAUM_SONSTIGER) && !a.raumSonstiger?.trim()) {
    f.raumSonstiger = VS_FEHLER.raumSonstigerPflicht
  }

  // Mehrfachauswahl: mindestens ein gültiger Key muss dabei sein. Unbekannte
  // Werte werden ignoriert, nicht als Fehler gemeldet — der Server bereinigt
  // die Liste ohnehin.
  const bodenarten = Array.isArray(a.bodenarten) ? a.bodenarten : []
  if (!bodenarten.some((b) => istKey(VS_BODENARTEN, b))) {
    f.bodenarten = VS_FEHLER.bodenartPflicht
  }

  if (!istKey(VS_ZEITRAEUME, a.zeitraum)) f.zeitraum = VS_FEHLER.zeitraumPflicht

  return f
}

/** Prüft Schritt 3. Die Verlegeart bleibt absichtlich optional. */
export function pruefeAltboden(
  a: Pick<
    VsAnfrage,
    'altbodenEntfernen' | 'altbodenBelag' | 'altbodenBelagSonstiger'
  >,
): Feldfehler {
  const f: Feldfehler = {}

  if (!istKey(VS_ALTBODEN_ENTFERNEN, a.altbodenEntfernen)) {
    f.altbodenEntfernen = VS_FEHLER.altbodenPflicht
    return f
  }

  // Bedingte Felder gelten nur bei „Ja".
  if (a.altbodenEntfernen === 'ja') {
    if (!istKey(VS_ALTBODEN_BELAG, a.altbodenBelag)) {
      f.altbodenBelag = VS_FEHLER.belagPflicht
    } else if (
      a.altbodenBelag === VS_BELAG_SONSTIGER &&
      !a.altbodenBelagSonstiger?.trim()
    ) {
      f.altbodenBelagSonstiger = VS_FEHLER.belagSonstigerPflicht
    }
  }

  return f
}

/** Prüft Schritt 4 ohne die Dateien (die haben eine eigene Prüfung). */
export function pruefeKontakt(
  a: Pick<
    VsAnfrage,
    'vorname' | 'nachname' | 'telefon' | 'email' | 'datenschutz'
  >,
): Feldfehler {
  const f: Feldfehler = {}

  if (!a.vorname?.trim()) f.vorname = VS_FEHLER.vornamePflicht
  if (!a.nachname?.trim()) f.nachname = VS_FEHLER.nachnamePflicht

  if (!a.telefon?.trim()) f.telefon = VS_FEHLER.telefonPflicht
  else if (!istTelefon(a.telefon)) f.telefon = VS_FEHLER.telefonFormat

  if (!a.email?.trim()) f.email = VS_FEHLER.emailPflicht
  else if (!istEmail(a.email)) f.email = VS_FEHLER.emailFormat

  if (!a.datenschutz) f.datenschutz = VS_FEHLER.datenschutzPflicht

  return f
}

/** Ungefähre Byte-Größe eines Base64-Strings (ohne dataURL-Präfix). */
export function base64Bytes(b64: string): number {
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

/** Prüft Anzahl, MIME-Typ und Größe der Anhänge. */
export function pruefeDateien(dateien: VsDatei[]): Feldfehler {
  const f: Feldfehler = {}
  if (!Array.isArray(dateien)) return f

  if (dateien.length > VS_UPLOAD.maxFiles) {
    f.dateien = VS_FEHLER.dateiAnzahl
    return f
  }
  for (const d of dateien) {
    if (!d?.dataBase64 || !d.mime || !(VS_UPLOAD.acceptMime as readonly string[]).includes(d.mime)) {
      f.dateien = VS_FEHLER.dateiFormat
      return f
    }
    if (base64Bytes(d.dataBase64) > VS_UPLOAD.maxFileBytes) {
      f.dateien = VS_FEHLER.dateiGroesse
      return f
    }
  }
  return f
}

/** Vollständige Prüfung — genau das führt der Server vor dem Speichern aus. */
export function pruefeAnfrage(a: VsAnfrage): Feldfehler {
  return {
    ...pruefeStandort(a),
    ...pruefeProjekt(a),
    ...pruefeAltboden(a),
    ...pruefeKontakt(a),
    ...pruefeDateien(a.dateien ?? []),
  }
}

/** Label zu einem Key — für Trello, E-Mail und die Zusammenfassung. */
export function label(
  liste: readonly { key: string; label: string }[],
  key: string | null | undefined,
): string | null {
  if (!key) return null
  return liste.find((e) => e.key === key)?.label ?? null
}

export const labelFlaeche = (k: VsFlaecheKey | null) => label(VS_FLAECHE_STAFFELN, k)

/**
 * Labels der gewählten Bodenarten als ein Text, in der Reihenfolge der
 * Optionsliste statt der Klickreihenfolge — so steht in Trello, in der Mail und
 * in der Zusammenfassung immer dieselbe Abfolge.
 */
export const labelBodenarten = (keys: readonly string[] | null | undefined) => {
  if (!keys?.length) return null
  const gewaehlt = VS_BODENARTEN.filter((b) => keys.includes(b.key)).map((b) => b.label)
  return gewaehlt.length ? gewaehlt.join(', ') : null
}
export const labelZeitraum = (k: string | null) => label(VS_ZEITRAEUME, k)
export const labelAltbodenEntfernen = (k: string | null) => label(VS_ALTBODEN_ENTFERNEN, k)
export const labelAltbodenBelag = (k: string | null) => label(VS_ALTBODEN_BELAG, k)
export const labelVerlegeart = (k: string | null) => label(VS_ALTBODEN_VERLEGEART, k)
export const labelKontaktart = (k: string | null) => label(VS_KONTAKTART, k)
export const labelErreichbarkeit = (k: string | null) => label(VS_ERREICHBARKEIT, k)
