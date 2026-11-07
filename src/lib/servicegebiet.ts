/**
 * Servicegebiets-Prüfung für den Verlegeservice.
 *
 * SERVERSEITIG — der Datensatz (437 KB) darf nicht in den Browser gelangen und
 * dem Client wird ohnehin nicht getraut: Der Area-Status wird immer hier neu
 * bestimmt, egal was das Formular mitschickt.
 *
 * Datenquelle: src/data/plz-geo.json (GeoNames, CC BY 4.0), erzeugt von
 * scripts/build-plz-dataset.mjs.
 */
import { STANDORT } from '@/content/fachmarkt'
import plzGeo from '@/data/plz-geo.json'

/** Reguläres Verlegegebiet: Luftlinie um den Fachmarkt Hückelhoven. */
export const SERVICE_RADIUS_KM = 50

export type AreaStatus = 'in_area' | 'out_of_area'

export interface GebietsErgebnis {
  plz: string
  ort: string
  distanceKm: number
  areaStatus: AreaStatus
}

// TypeScript leitet aus dem JSON `(string | number)[]` ab und kennt die feste
// Tupel-Länge nicht — deshalb einmal bewusst über `unknown` eng ziehen.
const DATEN = (plzGeo as unknown as { plz: Record<string, [string, number, number]> }).plz

/** Deutsche PLZ: genau fünf Ziffern. */
export function istPlzFormat(plz: string): boolean {
  return /^\d{5}$/.test(plz.trim())
}

/** Luftlinie in Kilometern (Haversine). */
function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const ERDRADIUS_KM = 6371
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(bLat - aLat)
  const dLon = rad(bLon - aLon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2
  return 2 * ERDRADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * GeoNames führt auch Großempfänger-PLZ, die auf Firmen oder Behörden laufen
 * (z. B. 41833 „QVC eDistribution Inc. & Co.KG“). Als Ort zeigen wir dann den
 * Namen der nächstgelegenen normalen PLZ.
 */
const FIRMA = new RegExp(
  [
    String.raw`\b(GmbH|mbH|AG|KG|KGaA|OHG|SE|eG|Inc|Ltd|LLP|S\.A|b\.v)\b`,
    '&',
    String.raw`\be\.\s?V\b`,
    String.raw`\ba\.G\b`,
    String.raw`\bCo\.`,
    String.raw`(Bank|Banque|Sparkasse|Versicherung|Versicherer|Vers\.|Verlag|Versand|Finanzamt|Agentur|Amtsgericht|Gericht|Landrat|Bürgermeister|Verwaltung|Bezirksamt|Ministerium|Regierung|Senat|Berufsgenossenschaft|Krankenkasse|Vereinigung|Gesellschaft|Rechtsanw|Anwalt|Kanzlei|Steuerberat|Notar|Inkasso|Reklame|Fabrik|Institut|Stiftung|Holding|Konzern|Group|Service|Marketing|Support|Distribution|Universität|Hochschule|Klinik|Schule|Kaserne|Zentrum|Zentrale|Center|Direktion|Niederlassung|Geschäftsstelle|Jobcenter|Polizei|Studio|Redaktion|Büro|Pharma|Tiernahrung|Lotterie|Abrechnung|Dienst|Landesamt|Landesregierung|Landesbank|StädteRegion|Deutschland|Deutsche[rs]?\b|Rheinische Post|Anstalt|Behörde|\bKasse\b|\bmedia\b|versicherung|kasse\b|verband\b|\bBundes[a-zäöü]|Hospital|Krankenhaus|Krankenversorgung|Rundfunk|Telekom|Logistik|Großannahme|Feldpost|Finance|Samariter|krankenhaus|klinik|Feuerwehr|[Bb]etriebe\b|Stadtwerke|Wissoll)`,
    String.raw`(Zoll|Versorgungs|Integrations|Tiefbau|Landrats|Streitkräfte|Post|Präsidial|Kriminal|Standes|Gesundheits|Jugend|Sozial|Wohnungs|Vermessungs|Kataster)amt\b`,
    String.raw`^(Stadt|Kreis|Landkreis|Gemeinde|Erftkreis|Der|Die|Das|Dr\.)\s`,
    String.raw`\b[A-ZÄÖÜ]{3,}\b`,
    String.raw`\d`,
  ].join('|'),
)

const ortCache = new Map<string, string>()

/** Ortsname zur PLZ; bei Firmen-PLZ der Ort der nächstgelegenen normalen PLZ. */
function ortName(plz: string, eintrag: [string, number, number]): string {
  const [name, lat, lon] = eintrag
  if (!FIRMA.test(name)) return name
  const gemerkt = ortCache.get(plz)
  if (gemerkt) return gemerkt
  let bester = name
  let abstand = Infinity
  for (const [andere, [n, la, lo]] of Object.entries(DATEN)) {
    if (andere === plz || FIRMA.test(n)) continue
    const d = haversineKm(lat, lon, la, lo)
    if (d < abstand) {
      abstand = d
      bester = n
    }
  }
  ortCache.set(plz, bester)
  return bester
}

/**
 * Schlägt die PLZ nach und bestimmt Entfernung und Area-Status.
 * `null` = PLZ nicht im Datensatz (dann kann der Standort nicht geprüft werden).
 */
export function pruefeServicegebiet(plzEingabe: string): GebietsErgebnis | null {
  const plz = plzEingabe.trim()
  if (!istPlzFormat(plz)) return null

  const eintrag = DATEN[plz]
  if (!eintrag) return null

  const [, lat, lon] = eintrag
  const ort = ortName(plz, eintrag)
  const distanceKm = haversineKm(STANDORT.geo.lat, STANDORT.geo.lng, lat, lon)

  return {
    plz,
    ort,
    // Eine Dezimalstelle genügt und passt zur Anzeige "ca. 24,6 km".
    distanceKm: Math.round(distanceKm * 10) / 10,
    areaStatus: distanceKm <= SERVICE_RADIUS_KM ? 'in_area' : 'out_of_area',
  }
}

/** Nur der Ort zur PLZ — für die automatische Ergänzung in Schritt 1. */
export function ortZurPlz(plz: string): string | null {
  const eintrag = DATEN[plz.trim()]
  return eintrag ? ortName(plz.trim(), eintrag) : null
}

/** "24,6 km" in deutscher Schreibweise. */
export function formatEntfernung(distanceKm: number): string {
  return `${distanceKm.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`
}
