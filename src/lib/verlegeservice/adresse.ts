/**
 * Straßenvorschläge für die Aufmaß-Adresse (nur Server).
 *
 * Mit GOOGLE_MAPS_API_KEY (Places API „New") kommen die Vorschläge von Google,
 * sonst aus OpenStreetMap über Photon (photon.komoot.io, ohne Schlüssel). In
 * beiden Fällen nur Straßen in der eingegebenen PLZ bzw. dem Ort — so landet
 * keine erfundene Adresse auf der Trello-Karte.
 */

export interface StrassenVorschlag {
  strasse: string
  plz: string
  ort: string
}

const eindeutig = (liste: StrassenVorschlag[]) =>
  liste.filter((v, i) => liste.findIndex((x) => x.strasse.toLowerCase() === v.strasse.toLowerCase()) === i)

async function googleVorschlaege(q: string, plz: string, ort: string, key: string): Promise<StrassenVorschlag[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input: `${q}, ${plz} ${ort}`,
      includedRegionCodes: ['de'],
      languageCode: 'de',
      includedPrimaryTypes: ['route'],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Places ${res.status}`)
  const json = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: { structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } }
    }>
  }
  const liste: StrassenVorschlag[] = []
  for (const s of json.suggestions ?? []) {
    const main = s.placePrediction?.structuredFormat?.mainText?.text
    const sek = s.placePrediction?.structuredFormat?.secondaryText?.text ?? ''
    if (!main) continue
    // Nur Treffer in dieser PLZ bzw. diesem Ort
    if (!sek.includes(plz) && !sek.toLowerCase().includes(ort.toLowerCase())) continue
    liste.push({ strasse: main, plz, ort })
  }
  return eindeutig(liste).slice(0, 6)
}

async function photonVorschlaege(q: string, plz: string, ort: string): Promise<StrassenVorschlag[]> {
  const params = new URLSearchParams({ q: `${q} ${plz} ${ort}`, lang: 'de', limit: '20' })
  params.append('osm_tag', 'highway')
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { 'User-Agent': 'Bodenjaeger-Verlegeservice/1.0 (bodenjaeger.de)' },
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const json = (await res.json()) as {
    features?: Array<{ properties?: { name?: string; postcode?: string; city?: string; district?: string; locality?: string } }>
  }
  const begriff = q.trim().toLowerCase()
  const liste: StrassenVorschlag[] = []
  for (const f of json.features ?? []) {
    const p = f.properties ?? {}
    if (!p.name) continue
    const passtPlz = p.postcode ? p.postcode.split(/[;,]/).map((x) => x.trim()).includes(plz) : false
    const passtOrt = !p.postcode && [p.city, p.district, p.locality].some((x) => x && x.toLowerCase() === ort.toLowerCase())
    if (!passtPlz && !passtOrt) continue
    if (!p.name.toLowerCase().includes(begriff.split(/\s+/)[0])) continue
    liste.push({ strasse: p.name, plz, ort })
  }
  return eindeutig(liste).slice(0, 6)
}

export async function strassenVorschlaege(q: string, plz: string, ort: string): Promise<StrassenVorschlag[]> {
  const begriff = q.trim().slice(0, 80)
  if (begriff.length < 2 || !/^\d{5}$/.test(plz)) return []
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (key) {
    try {
      return await googleVorschlaege(begriff, plz, ort, key)
    } catch (e) {
      console.error('[verlegeservice/adresse] Google fehlgeschlagen, nehme OpenStreetMap:', e)
    }
  }
  try {
    return await photonVorschlaege(begriff, plz, ort)
  } catch (e) {
    console.error('[verlegeservice/adresse] Photon fehlgeschlagen:', e)
    return []
  }
}
