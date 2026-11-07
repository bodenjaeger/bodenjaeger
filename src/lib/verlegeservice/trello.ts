/**
 * Trello-Karten für das Verlegeservice-Formular mit drei Wegen (nur Server).
 *
 * Nutzt dieselben Zugangsdaten wie die bisherige Anbindung:
 *   TRELLO_KEY, TRELLO_TOKEN, TRELLO_LIST_ID           (Liste „Neu")
 *   TRELLO_LIST_ID_TERMIN                              (optional, sonst Liste mit „Termin Fachmarkt“ im Namen)
 *   TRELLO_LIST_ID_AUFMASS_BEZAHLT                     (nach Zahlung, siehe lib/aufmass.ts)
 * Labels werden per Name gesucht und bei Bedarf auf dem Board angelegt.
 */

const API = 'https://api.trello.com/1'

interface Zugang {
  key: string
  token: string
  listeNeu: string
}

function zugang(): Zugang | null {
  const key = process.env.TRELLO_KEY?.trim()
  const token = process.env.TRELLO_TOKEN?.trim()
  const listeNeu = process.env.TRELLO_LIST_ID?.trim()
  if (!key || !token || !listeNeu) return null
  return { key, token, listeNeu }
}

const auth = (z: Zugang) => `key=${encodeURIComponent(z.key)}&token=${encodeURIComponent(z.token)}`

export type LabelFarbe = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'blue' | 'sky' | 'lime' | 'pink' | 'black'
export interface KartenLabel {
  name: string
  farbe: LabelFarbe
}

let boardLabels: { boardId: string; labels: Map<string, string> } | null = null

async function labelIds(z: Zugang, gewuenscht: KartenLabel[]): Promise<string[]> {
  if (!gewuenscht.length) return []
  try {
    if (!boardLabels) {
      const b = await fetch(`${API}/lists/${z.listeNeu}/board?fields=id&${auth(z)}`).then((r) => r.json() as Promise<{ id: string }>)
      const liste = await fetch(`${API}/boards/${b.id}/labels?fields=name&limit=1000&${auth(z)}`).then(
        (r) => r.json() as Promise<Array<{ id: string; name: string }>>,
      )
      boardLabels = { boardId: b.id, labels: new Map(liste.filter((l) => l.name).map((l) => [l.name.toLowerCase(), l.id])) }
    }
    const ids: string[] = []
    for (const l of gewuenscht) {
      let id = boardLabels.labels.get(l.name.toLowerCase())
      if (!id) {
        const res = await fetch(`${API}/labels?${auth(z)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: l.name, color: l.farbe, idBoard: boardLabels.boardId }),
        })
        if (res.ok) {
          id = ((await res.json()) as { id: string }).id
          boardLabels.labels.set(l.name.toLowerCase(), id)
        }
      }
      if (id) ids.push(id)
    }
    return ids
  } catch (e) {
    console.error('[verlegeservice/trello] Labels fehlgeschlagen:', e)
    return []
  }
}

/**
 * Liste auf dem Board per Namen finden (ohne Emoji, Groß/klein egal). So muss
 * keine Listen-ID in Vercel stehen; eine gesetzte Variable hat aber Vorrang.
 */
let listenCache: Array<{ id: string; name: string }> | null = null
async function listeNachName(z: Zugang, teil: string): Promise<string | null> {
  try {
    const laden = async (): Promise<Array<{ id: string; name: string }>> => {
      const l = (await fetch(`${API}/lists/${z.listeNeu}?fields=idBoard&${auth(z)}`).then((r) => r.json())) as { idBoard: string }
      return (await fetch(`${API}/boards/${l.idBoard}/lists?fields=name&filter=open&${auth(z)}`).then((r) => r.json())) as Array<{ id: string; name: string }>
    }
    const listen = listenCache ?? (await laden())
    listenCache = listen
    const t = teil.toLowerCase()
    return listen.find((x) => x.name.toLowerCase().includes(t))?.id ?? null
  } catch (e) {
    console.error('[verlegeservice/trello] Listen nicht lesbar:', e)
    return null
  }
}

async function zielListe(z: Zugang, art?: 'neu' | 'termin'): Promise<string> {
  if (art !== 'termin') return z.listeNeu
  return process.env.TRELLO_LIST_ID_TERMIN?.trim() || (await listeNachName(z, 'termin fachmarkt')) || z.listeNeu
}

export interface NeueKarte {
  titel: string
  beschreibung: string
  /** „termin" = TRELLO_LIST_ID_TERMIN, sonst Liste „Neu" */
  liste?: 'neu' | 'termin'
  /** Fälligkeit als ISO-Zeitpunkt (z. B. Beratungstermin) */
  faellig?: string | null
  labels?: KartenLabel[]
  checklisten?: Array<{ name: string; punkte: string[] }>
}

/** Legt die Karte an. Gibt die Karten-ID zurück oder null. */
export async function karteAnlegen(k: NeueKarte): Promise<string | null> {
  const z = zugang()
  if (!z) {
    console.error('[verlegeservice/trello] TRELLO_KEY/TRELLO_TOKEN/TRELLO_LIST_ID fehlt')
    return null
  }
  const liste = await zielListe(z, k.liste)
  const idLabels = await labelIds(z, k.labels ?? [])
  try {
    const res = await fetch(`${API}/cards?${auth(z)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idList: liste,
        name: k.titel.slice(0, 250),
        desc: k.beschreibung.slice(0, 16000),
        pos: 'top',
        ...(k.faellig ? { due: k.faellig } : {}),
        ...(idLabels.length ? { idLabels: idLabels.join(',') } : {}),
      }),
    })
    if (!res.ok) {
      console.error('[verlegeservice/trello] Karte fehlgeschlagen:', res.status, await res.text().catch(() => ''))
      return null
    }
    const karte = (await res.json()) as { id: string }
    await checklistenAnlegen(z, karte.id, k.checklisten ?? [])
    return karte.id
  } catch (e) {
    console.error('[verlegeservice/trello] Netzwerkfehler:', e)
    return null
  }
}

async function checklistenAnlegen(z: Zugang, cardId: string, checklisten: Array<{ name: string; punkte: string[] }>): Promise<void> {
  // Listen und Punkte parallel anlegen; die Reihenfolge halten feste Positionen
  await Promise.all(
    checklisten.map(async (cl, i) => {
      try {
        const c = await fetch(`${API}/cards/${cardId}/checklists?${auth(z)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cl.name, pos: i + 1 }),
        }).then((r) => r.json() as Promise<{ id: string }>)
        await Promise.all(
          cl.punkte.map((punkt, j) =>
            fetch(`${API}/checklists/${c.id}/checkItems?${auth(z)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: punkt.slice(0, 500), pos: (j + 1) * 1024 }),
            }),
          ),
        )
      } catch (e) {
        console.error('[verlegeservice/trello] Checkliste fehlgeschlagen:', e)
      }
    }),
  )
}

/**
 * Bestehende Karte mit neuen Angaben überschreiben (z. B. Kunde wechselt vom
 * Preisrahmen zum Aufmaß). Titel, Beschreibung, Labels, Liste, Fälligkeit und
 * Checklisten werden ersetzt, dazu ein Kommentar. true = geklappt.
 */
export async function karteAktualisieren(cardId: string, k: NeueKarte, kommentar: string): Promise<boolean> {
  const z = zugang()
  if (!z || !/^[a-f0-9]{24}$/.test(cardId)) return false
  const liste = await zielListe(z, k.liste)
  const idLabels = await labelIds(z, k.labels ?? [])
  try {
    const res = await fetch(`${API}/cards/${cardId}?${auth(z)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idList: liste,
        name: k.titel.slice(0, 250),
        desc: k.beschreibung.slice(0, 16000),
        pos: 'top',
        due: k.faellig ?? null,
        idLabels: idLabels.join(','),
        closed: false,
      }),
    })
    if (!res.ok) {
      console.error('[verlegeservice/trello] Karte aktualisieren fehlgeschlagen:', res.status, await res.text().catch(() => ''))
      return false
    }
    // Alte Checklisten ersetzen
    const alt = await fetch(`${API}/cards/${cardId}/checklists?fields=id&${auth(z)}`).then((r) =>
      r.ok ? (r.json() as Promise<Array<{ id: string }>>) : [],
    )
    await Promise.all(alt.map((c) => fetch(`${API}/checklists/${c.id}?${auth(z)}`, { method: 'DELETE' })))
    await checklistenAnlegen(z, cardId, k.checklisten ?? [])
    await fetch(`${API}/cards/${cardId}/actions/comments?${auth(z)}&text=${encodeURIComponent(kommentar)}`, { method: 'POST' })
    return true
  } catch (e) {
    console.error('[verlegeservice/trello] Karte aktualisieren Netzwerkfehler:', e)
    return false
  }
}

/** Nur die Beschreibung einer Karte ersetzen. */
export async function beschreibungSetzen(cardId: string, beschreibung: string): Promise<void> {
  const z = zugang()
  if (!z) return
  try {
    await fetch(`${API}/cards/${cardId}?${auth(z)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desc: beschreibung.slice(0, 16000) }),
    })
  } catch (e) {
    console.error('[verlegeservice/trello] Beschreibung setzen fehlgeschlagen:', e)
  }
}
