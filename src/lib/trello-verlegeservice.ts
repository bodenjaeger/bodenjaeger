/**
 * Trello-Anbindung für Verlegeservice-Leads.
 *
 * Ablauf laut Spezifikation: Karte anlegen → Karten-ID aus der API → jede Datei
 * einzeln als echten Anhang übertragen → Ergebnis in der Karte dokumentieren.
 *
 * Grundsatz: Eine Anfrage darf NIE an einem fehlgeschlagenen Datei-Upload
 * scheitern. Die Karte entsteht zuerst, Anhänge werden danach einzeln versucht
 * und Fehlschläge nur als Hinweis vermerkt.
 *
 * Zugangsdaten ausschließlich aus Environment Variables (TRELLO_KEY,
 * TRELLO_TOKEN, TRELLO_LIST_ID) — niemals im Frontend.
 */
import { formatEntfernung, type AreaStatus } from '@/lib/servicegebiet'
import {
  labelAltbodenBelag,
  labelAltbodenEntfernen,
  labelBodenarten,
  labelErreichbarkeit,
  labelFlaeche,
  labelKontaktart,
  labelVerlegeart,
  labelZeitraum,
} from '@/lib/verlegeservice-validierung'
import { VS_BELAG_SONSTIGER, VS_RAUM_SONSTIGER } from '@/content/verlegeservice-anfrage'
import type { VsAnfrage, VsDatei } from '@/types/verlegeservice-anfrage'

const TRELLO_API = 'https://api.trello.com/1'

export interface TrelloErgebnis {
  cardId: string | null
  dateienUebertragen: number
  dateienGesamt: number
}

interface TrelloConfig {
  key: string
  token: string
  idList: string
}

function config(): TrelloConfig | null {
  const key = process.env.TRELLO_KEY?.trim()
  const token = process.env.TRELLO_TOKEN?.trim()
  const idList = process.env.TRELLO_LIST_ID?.trim()
  if (!key || !token || !idList) return null
  return { key, token, idList }
}

/** „In Area" / „Out of Area" für die menschenlesbare Anzeige. */
function areaLabel(status: AreaStatus): string {
  return status === 'in_area' ? 'In Area' : 'Out of Area'
}

/** „67 m²" bzw. „Fläche offen", wenn keine Zahl vorliegt. */
function flaecheKurz(a: VsAnfrage): string {
  return a.qm && a.qm > 0 ? `${a.qm} m²` : 'Fläche offen'
}

export function kartenTitel(
  a: VsAnfrage,
  areaStatus: AreaStatus,
): string {
  const name = `${a.vorname} ${a.nachname}`.trim()
  return `Verlegeservice – ${name} – ${a.plz} – ${flaecheKurz(a)} – ${areaLabel(areaStatus)}`
}

/** Räume inklusive Freitext für „Sonstiger Raum". */
function raeumeText(a: VsAnfrage): string {
  return a.raeume
    .map((r) =>
      r === VS_RAUM_SONSTIGER && a.raumSonstiger.trim()
        ? `${r} (${a.raumSonstiger.trim()})`
        : r,
    )
    .join(', ')
}

/**
 * Baut die Kartenbeschreibung. Leere optionale Abschnitte fallen komplett weg —
 * ohne Preisvorstellung erscheint der Abschnitt gar nicht.
 */
export function kartenBeschreibung(
  a: VsAnfrage,
  opts: {
    leadId: string
    areaStatus: AreaStatus
    distanceKm: number | null
    ort: string
    eingang: Date
  },
): string {
  const abschnitte: string[] = ['**VERLEGESERVICE-ANFRAGE**']

  abschnitte.push(`**LEAD**\nLead-ID: ${opts.leadId}`)

  const status = [`Servicegebiet: ${areaLabel(opts.areaStatus)}`]
  if (opts.distanceKm !== null) {
    status.push(`Entfernung: ca. ${formatEntfernung(opts.distanceKm)}`)
  }
  abschnitte.push(`**STATUS**\n${status.join('\n')}`)

  const kontakt = [
    `Name: ${a.vorname} ${a.nachname}`.trim(),
    `Telefon: ${a.telefon}`,
    `E-Mail: ${a.email}`,
  ]
  const kontaktart = labelKontaktart(a.kontaktart)
  if (kontaktart) kontakt.push(`Bevorzugte Kontaktart: ${kontaktart}`)
  const erreichbar = labelErreichbarkeit(a.erreichbarkeit)
  if (erreichbar) kontakt.push(`Beste Erreichbarkeit: ${erreichbar}`)
  abschnitte.push(`**KONTAKT**\n${kontakt.join('\n')}`)

  const standort = [`PLZ: ${a.plz}`]
  const ort = a.ort?.trim() || opts.ort
  if (ort) standort.push(`Ort: ${ort}`)
  abschnitte.push(`**STANDORT**\n${standort.join('\n')}`)

  const projekt: string[] = []
  const staffel = labelFlaeche(a.flaecheStaffel)
  if (staffel) projekt.push(`Flächenstaffel: ${staffel}`)
  if (a.qm && a.qm > 0) projekt.push(`Genaue Fläche: ca. ${a.qm} m²`)
  if (a.raeume.length) projekt.push(`Räume: ${raeumeText(a)}`)
  const bodenarten = labelBodenarten(a.bodenarten)
  if (bodenarten) projekt.push(`Gewünschte Bodenart: ${bodenarten}`)
  const zeitraum = labelZeitraum(a.zeitraum)
  if (zeitraum) {
    const detail = a.zeitraumDetail.trim()
    projekt.push(`Gewünschter Zeitraum: ${zeitraum}${detail ? ` (${detail})` : ''}`)
  }
  if (projekt.length) abschnitte.push(`**PROJEKT**\n${projekt.join('\n')}`)

  // Altboden: bedingte Angaben nur, wenn sie überhaupt relevant sind.
  const altboden: string[] = []
  const entfernen = labelAltbodenEntfernen(a.altbodenEntfernen)
  if (entfernen) altboden.push(`Altboden entfernen: ${entfernen}`)
  if (a.altbodenEntfernen === 'ja') {
    const belag = labelAltbodenBelag(a.altbodenBelag)
    if (belag) {
      const zusatz =
        a.altbodenBelag === VS_BELAG_SONSTIGER && a.altbodenBelagSonstiger.trim()
          ? ` (${a.altbodenBelagSonstiger.trim()})`
          : ''
      altboden.push(`Vorhandener Boden: ${belag}${zusatz}`)
    }
    const verlegeart = labelVerlegeart(a.altbodenVerlegeart)
    if (verlegeart) altboden.push(`Verlegeart: ${verlegeart}`)
  }
  if (altboden.length) abschnitte.push(`**ALTBODEN**\n${altboden.join('\n')}`)

  if (a.preisvorstellung.trim()) {
    abschnitte.push(`**PREISVORSTELLUNG**\n${a.preisvorstellung.trim()}`)
  }
  if (a.freitext.trim()) {
    abschnitte.push(`**ANMERKUNGEN**\n${a.freitext.trim()}`)
  }
  if (a.dateien.length) {
    abschnitte.push(`**DATEIEN**\n${a.dateien.length} Dateien hochgeladen`)
  }

  const t = a.tracking ?? {}
  const tracking = [
    'Quelle: Verlegeservice-Formular Fachmarkt',
    `Area-Status: ${opts.areaStatus}`,
  ]
  const trackingFelder: [string, string | undefined][] = [
    ['UTM Source', t.utmSource],
    ['UTM Medium', t.utmMedium],
    ['UTM Campaign', t.utmCampaign],
    ['UTM Content', t.utmContent],
    ['UTM Term', t.utmTerm],
    ['GCLID', t.gclid],
    ['GBRAID', t.gbraid],
    ['WBRAID', t.wbraid],
    ['FBCLID', t.fbclid],
    ['Landingpage', t.landingpage],
    ['Referrer', t.referrer],
    ['Gerät', t.deviceKategorie],
    ['Browser', t.browser],
  ]
  for (const [bez, wert] of trackingFelder) {
    if (wert && wert.trim()) tracking.push(`${bez}: ${wert.trim()}`)
  }
  abschnitte.push(`**TRACKING**\n${tracking.join('\n')}`)

  abschnitte.push(
    `**EINGANG**\n${opts.eingang.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })}`,
  )

  return abschnitte.join('\n\n')
}

/** Legt die Karte an und gibt die Karten-ID zurück. */
async function karteAnlegen(
  cfg: TrelloConfig,
  name: string,
  desc: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    idList: cfg.idList,
    key: cfg.key,
    token: cfg.token,
    name,
    desc,
    pos: 'top',
  })
  const res = await fetch(`${TRELLO_API}/cards?${params.toString()}`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[trello] Karte anlegen fehlgeschlagen:', res.status, text)
    return null
  }
  const json = (await res.json()) as { id?: string }
  return json.id ?? null
}

/** Hängt eine einzelne Datei an die Karte. Dateiname bleibt erhalten. */
async function dateiAnhaengen(
  cfg: TrelloConfig,
  cardId: string,
  datei: VsDatei,
): Promise<boolean> {
  try {
    const bytes = Buffer.from(datei.dataBase64, 'base64')
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(bytes)], { type: datei.mime }), datei.filename)
    form.append('name', datei.filename)

    const params = new URLSearchParams({ key: cfg.key, token: cfg.token })
    const res = await fetch(
      `${TRELLO_API}/cards/${cardId}/attachments?${params.toString()}`,
      { method: 'POST', body: form },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[trello] Anhang fehlgeschlagen:', datei.filename, res.status, text)
      return false
    }
    return true
  } catch (e) {
    console.error('[trello] Anhang-Fehler:', datei.filename, e)
    return false
  }
}

/** Ergänzt einen Kommentar auf der Karte (für Upload-Hinweise). */
async function kommentar(cfg: TrelloConfig, cardId: string, text: string): Promise<void> {
  try {
    const params = new URLSearchParams({ key: cfg.key, token: cfg.token, text })
    await fetch(`${TRELLO_API}/cards/${cardId}/actions/comments?${params.toString()}`, {
      method: 'POST',
    })
  } catch (e) {
    console.error('[trello] Kommentar fehlgeschlagen:', e)
  }
}

/**
 * Legt Karte plus Anhänge an.
 * Gibt `cardId: null` zurück, wenn Trello nicht konfiguriert ist oder die Karte
 * nicht angelegt werden konnte — der Aufrufer entscheidet dann, ob die Anfrage
 * über den anderen Kanal (E-Mail) trotzdem als erfolgreich gilt.
 */
export async function leadNachTrello(
  a: VsAnfrage,
  opts: {
    leadId: string
    areaStatus: AreaStatus
    distanceKm: number | null
    ort: string
    eingang: Date
  },
): Promise<TrelloErgebnis> {
  const gesamt = a.dateien.length
  const cfg = config()
  if (!cfg) {
    console.error('[trello] TRELLO_KEY/TRELLO_TOKEN/TRELLO_LIST_ID fehlt')
    return { cardId: null, dateienUebertragen: 0, dateienGesamt: gesamt }
  }

  const cardId = await karteAnlegen(
    cfg,
    kartenTitel(a, opts.areaStatus),
    kartenBeschreibung(a, opts),
  )
  if (!cardId) {
    return { cardId: null, dateienUebertragen: 0, dateienGesamt: gesamt }
  }

  // Anhänge einzeln und nacheinander — Trello mag keine Parallelflut, und so
  // lässt sich pro Datei sauber protokollieren, was gelungen ist.
  let uebertragen = 0
  for (const datei of a.dateien) {
    if (await dateiAnhaengen(cfg, cardId, datei)) uebertragen++
  }

  if (gesamt > 0 && uebertragen < gesamt) {
    await kommentar(
      cfg,
      cardId,
      `Technischer Hinweis: ${gesamt - uebertragen} von ${gesamt} Dateien konnte nicht an Trello übertragen werden.`,
    )
  }

  return { cardId, dateienUebertragen: uebertragen, dateienGesamt: gesamt }
}
