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
  labelWeg,
  labelZeitraum,
} from '@/lib/verlegeservice-validierung'
import { VS_BELAG_SONSTIGER, VS_RAUM_SONSTIGER, VS_WEG_AUFMASS } from '@/content/verlegeservice-anfrage'
import { formatEuro } from '@/lib/aufmass-kreise'
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

/** Angaben zum bezahlten Aufmaß, falls der Interessent es gebucht hat. */
export interface TrelloAufmassInfo {
  preis: number
  kreis: string
  sku: string
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
    aufmass?: TrelloAufmassInfo | null
  },
): string {
  const abschnitte: string[] = ['**VERLEGESERVICE-ANFRAGE**']

  abschnitte.push(`**LEAD**\nLead-ID: ${opts.leadId}`)

  const status = [`Servicegebiet: ${areaLabel(opts.areaStatus)}`]
  if (opts.distanceKm !== null) {
    status.push(`Entfernung: ca. ${formatEntfernung(opts.distanceKm)}`)
  }
  abschnitte.push(`**STATUS**\n${status.join('\n')}`)

  const weg = labelWeg(a.weg)
  if (weg) {
    const zeilen = [weg]
    if (a.weg === VS_WEG_AUFMASS && opts.aufmass) {
      zeilen.push(
        `Aufmaß: ${formatEuro(opts.aufmass.preis)} (${opts.aufmass.kreis}, Artikel ${opts.aufmass.sku})`,
        'Zahlung offen – nach erfolgreicher Zahlung wandert die Karte in die Liste „Aufmaß bezahlt".',
      )
    }
    abschnitte.push(`**NÄCHSTER SCHRITT**\n${zeilen.join('\n')}`)
  }

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
    aufmass?: TrelloAufmassInfo | null
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

/**
 * Nach bezahltem Aufmaß: Karte in die Liste „Aufmaß bezahlt – Termin
 * vereinbaren" verschieben (TRELLO_LIST_ID_AUFMASS_BEZAHLT) und die Zahlung als
 * Kommentar vermerken. Fehlt die Listen-ID, bleibt die Karte, wo sie ist, und
 * bekommt nur den Kommentar.
 */
export async function aufmassBezahltNachTrello(cardId: string, text: string): Promise<boolean> {
  const cfg = config()
  if (!cfg) {
    console.error('[trello] TRELLO_KEY/TRELLO_TOKEN/TRELLO_LIST_ID fehlt')
    return false
  }
  const zielListe = process.env.TRELLO_LIST_ID_AUFMASS_BEZAHLT?.trim()
  let ok = true
  if (zielListe) {
    try {
      const params = new URLSearchParams({ key: cfg.key, token: cfg.token, idList: zielListe, pos: 'top' })
      const res = await fetch(`${TRELLO_API}/cards/${cardId}?${params.toString()}`, { method: 'PUT' })
      if (!res.ok) {
        ok = false
        console.error('[trello] Karte verschieben fehlgeschlagen:', res.status, await res.text().catch(() => ''))
      }
    } catch (e) {
      ok = false
      console.error('[trello] Karte verschieben Netzwerkfehler:', e)
    }
  } else {
    console.warn('[trello] TRELLO_LIST_ID_AUFMASS_BEZAHLT fehlt — Karte bleibt in ihrer Liste.')
  }
  await zahlungsLabelUmstellen(cfg, cardId)
  await kommentar(cfg, cardId, text)
  return ok
}

/** Label „Zahlung offen“ entfernen, „Bezahlt“ (grün) setzen und den Checklistenpunkt abhaken. */
async function zahlungsLabelUmstellen(cfg: TrelloConfig, cardId: string): Promise<void> {
  const auth = `key=${encodeURIComponent(cfg.key)}&token=${encodeURIComponent(cfg.token)}`
  try {
    const kRes = await fetch(`${TRELLO_API}/cards/${cardId}?fields=idBoard,idLabels&${auth}`)
    if (!kRes.ok) throw new Error(`Karte ${kRes.status}`)
    const karte = (await kRes.json()) as { idBoard: string; idLabels: string[] }
    const lRes = await fetch(`${TRELLO_API}/boards/${karte.idBoard}/labels?fields=name&limit=1000&${auth}`)
    if (!lRes.ok) throw new Error(`Labels ${lRes.status}`)
    const labels = (await lRes.json()) as Array<{ id: string; name: string }>
    const name = (l: { name: string }) => l.name.trim().toLowerCase()

    for (const l of labels.filter((x) => name(x) === 'zahlung offen' && karte.idLabels.includes(x.id))) {
      await fetch(`${TRELLO_API}/cards/${cardId}/idLabels/${l.id}?${auth}`, { method: 'DELETE' })
    }
    let bezahlt = labels.find((x) => name(x) === 'bezahlt')?.id
    if (!bezahlt) {
      const neu = await fetch(`${TRELLO_API}/labels?${auth}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bezahlt', color: 'green', idBoard: karte.idBoard }),
      })
      if (neu.ok) bezahlt = ((await neu.json()) as { id: string }).id
    }
    if (bezahlt && !karte.idLabels.includes(bezahlt)) {
      await fetch(`${TRELLO_API}/cards/${cardId}/idLabels?value=${bezahlt}&${auth}`, { method: 'POST' })
    }
    // Checklistenpunkt „Bezahlt …“ abhaken
    const cRes = await fetch(`${TRELLO_API}/cards/${cardId}/checklists?checkItems=all&${auth}`)
    if (cRes.ok) {
      const listen = (await cRes.json()) as Array<{ checkItems: Array<{ id: string; name: string; state: string }> }>
      for (const punkt of listen.flatMap((l) => l.checkItems)) {
        if (punkt.state !== 'complete' && /^bezahlt\b/i.test(punkt.name.trim())) {
          await fetch(`${TRELLO_API}/cards/${cardId}/checkItem/${punkt.id}?state=complete&${auth}`, { method: 'PUT' })
        }
      }
    }
  } catch (e) {
    console.error('[trello] Zahlungs-Label umstellen fehlgeschlagen:', e)
  }
}

/** Kommentar an eine bestehende Karte, ohne sie zu verschieben. */
export async function kommentarAnKarte(cardId: string, text: string): Promise<void> {
  const cfg = config()
  if (!cfg) return
  await kommentar(cfg, cardId, text)
}
