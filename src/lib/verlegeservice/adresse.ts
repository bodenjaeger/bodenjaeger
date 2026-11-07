/**
 * Straßenvorschläge für die Aufmaß-Adresse (nur Server).
 *
 * Quelle ist das Straßenverzeichnis von OpenPLZ (openplzapi.org, ohne
 * Schlüssel): alle Straßen einer deutschen Postleitzahl. Damit landen nur
 * Straßen, die es in der eingegebenen PLZ wirklich gibt, auf der Trello-Karte.
 */

export interface StrassenVorschlag {
  strasse: string
  plz: string
  ort: string
}

const regexSicher = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Schreibweisen angleichen: „str." = „straße", ß = ss, Groß/klein egal */
const vergleich = (s: string) =>
  s.toLowerCase().replace(/ß/g, 'ss').replace(/str\.?(\s|$)/g, 'strasse$1').replace(/[^a-z0-9äöü]/g, '')

export async function strassenVorschlaege(q: string, plz: string, ort: string): Promise<StrassenVorschlag[]> {
  const begriff = q.trim().slice(0, 80)
  if (begriff.length < 2 || !/^\d{5}$/.test(plz)) return []
  // Groß-/Kleinschreibung egal, Treffer irgendwo im Namen
  const params = new URLSearchParams({
    postalCode: `^${plz}$`,
    name: `(?i)${regexSicher(begriff.replace(/str\.?$/i, 'str')).replace(/ss|ß/gi, '(ss|ß)')}`,
    page: '1',
    pageSize: '50',
  })
  try {
    const res = await fetch(`https://openplzapi.org/de/Streets?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) throw new Error(`OpenPLZ ${res.status}`)
    const json = (await res.json()) as Array<{ name?: string; postalCode?: string; locality?: string }>
    const b = vergleich(begriff)
    const namen = [...new Set(json.filter((x) => x.name && x.postalCode === plz).map((x) => x.name as string))]
      // Treffer am Wortanfang zuerst
      .sort((x, y) => Number(!vergleich(x).startsWith(b)) - Number(!vergleich(y).startsWith(b)) || x.localeCompare(y, 'de'))
    return namen.slice(0, 8).map((strasse) => ({ strasse, plz, ort: json.find((x) => x.name === strasse)?.locality || ort }))
  } catch (e) {
    console.error('[verlegeservice/adresse] OpenPLZ fehlgeschlagen:', e)
    return []
  }
}
