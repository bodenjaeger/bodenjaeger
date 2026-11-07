/**
 * Straßenvorschläge für die Aufmaß-Adresse (nur Server).
 *
 * 1. Straßenverzeichnis von OpenPLZ (openplzapi.org, ohne Schlüssel): alle
 *    Straßen einer PLZ werden einmal geladen und einen Tag gecacht. Gesucht
 *    wird danach lokal und tolerant („venloerstr" findet „Venloer Straße").
 * 2. Antwortet OpenPLZ nicht, sucht Photon (OpenStreetMap), streng auf
 *    Deutschland und genau diese PLZ begrenzt.
 */
import { unstable_cache } from 'next/cache'

export interface StrassenVorschlag {
  strasse: string
  plz: string
  ort: string
}

export interface StrassenErgebnis {
  vorschlaege: StrassenVorschlag[]
  /** false = kein Verzeichnis erreichbar, Eingabe kann nicht geprüft werden */
  verzeichnis: boolean
}

/** Schreibweisen angleichen: Groß/klein, ß/ss, Umlaute, Leerzeichen, Bindestriche, Punkte */
export function strassenSchluessel(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/[^a-z0-9]/g, '')
}

/** Suchbegriff ohne angehängte Hausnummer („Venloer Str. 12" → „venloerstr") */
function suchSchluessel(q: string): string {
  return strassenSchluessel(q.trim().replace(/\s+\d+\s*[a-zA-Z]?$/, ''))
}

interface Strasse {
  name: string
  ort: string
}

const OPENPLZ = 'https://openplzapi.org/de/Streets'

const strassenDerPlz = unstable_cache(
  async (plz: string): Promise<Strasse[]> => {
    const alle: Strasse[] = []
    for (let page = 1; page <= 30; page++) {
      const params = new URLSearchParams({ postalCode: plz, page: String(page), pageSize: '50' })
      const res = await fetch(`${OPENPLZ}?${params.toString()}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw new Error(`OpenPLZ ${res.status}`)
      const teil = (await res.json()) as Array<{ name?: string; postalCode?: string; locality?: string }>
      for (const s of teil) if (s.name && s.postalCode === plz) alle.push({ name: s.name, ort: s.locality ?? '' })
      if (teil.length < 50) break
    }
    if (!alle.length) throw new Error(`OpenPLZ: keine Straßen für ${plz}`)
    return alle.filter((s, i) => alle.findIndex((x) => x.name === s.name) === i)
  },
  ['verlegeservice-strassen-openplz'],
  { revalidate: 7 * 86400 },
)

async function photon(q: string, plz: string): Promise<Strasse[]> {
  const params = new URLSearchParams({ q: `${q} ${plz}`, lang: 'de', limit: '30' })
  params.append('osm_tag', 'highway')
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { 'User-Agent': 'Bodenjaeger-Verlegeservice/1.0 (bodenjaeger.de)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const json = (await res.json()) as {
    features?: Array<{ properties?: { name?: string; postcode?: string; city?: string; countrycode?: string } }>
  }
  const liste: Strasse[] = []
  for (const f of json.features ?? []) {
    const p = f.properties ?? {}
    if (!p.name || p.countrycode?.toUpperCase() !== 'DE') continue
    if (!p.postcode?.split(/[;,]/).map((x) => x.trim()).includes(plz)) continue
    liste.push({ name: p.name, ort: p.city ?? '' })
  }
  return liste
}

function treffer(liste: Strasse[], q: string, plz: string, ort: string): StrassenVorschlag[] {
  const b = suchSchluessel(q)
  if (b.length < 2) return []
  const mitSchluessel = liste.map((s) => ({ s, k: strassenSchluessel(s.name) }))
  const passend = mitSchluessel
    .filter((x) => x.k.includes(b))
    .sort((x, y) => Number(!x.k.startsWith(b)) - Number(!y.k.startsWith(b)) || x.s.name.localeCompare(y.s.name, 'de'))
  const gesehen = new Set<string>()
  const ergebnis: StrassenVorschlag[] = []
  for (const { s } of passend) {
    if (gesehen.has(s.name)) continue
    gesehen.add(s.name)
    ergebnis.push({ strasse: s.name, plz, ort: s.ort || ort })
    if (ergebnis.length >= 8) break
  }
  return ergebnis
}

export async function strassenSuche(q: string, plz: string, ort: string): Promise<StrassenErgebnis> {
  const begriff = q.trim().slice(0, 80)
  if (begriff.length < 2 || !/^\d{5}$/.test(plz)) return { vorschlaege: [], verzeichnis: true }
  try {
    return { vorschlaege: treffer(await strassenDerPlz(plz), begriff, plz, ort), verzeichnis: true }
  } catch (e) {
    console.error('[verlegeservice/adresse] OpenPLZ fehlgeschlagen, nehme Photon:', e)
  }
  try {
    return { vorschlaege: treffer(await photon(begriff, plz), begriff, plz, ort), verzeichnis: true }
  } catch (e) {
    console.error('[verlegeservice/adresse] Photon fehlgeschlagen:', e)
    return { vorschlaege: [], verzeichnis: false }
  }
}

/** Gibt es die Straße in der PLZ? null = kein Verzeichnis erreichbar */
export async function strasseBekannt(strasse: string, plz: string, ort: string): Promise<boolean | null> {
  const { vorschlaege, verzeichnis } = await strassenSuche(strasse, plz, ort)
  if (!verzeichnis) return null
  const k = strassenSchluessel(strasse)
  return vorschlaege.some((v) => strassenSchluessel(v.strasse) === k)
}
