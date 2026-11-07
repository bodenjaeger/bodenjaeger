/**
 * Aufmaß-Kreise laut Montageliste (Stand 03/2026).
 *
 * Der Preis für „Aufmaß + Beratung + Angebot" hängt von der Entfernung zum
 * Fachmarkt ab. Die Montageliste zeigt dafür vier Kreise auf einer Karte, nennt
 * aber keine Kilometer. Die Grenzen unten sind aus der Karte geschätzt und
 * passen zu den Orten, die dort in den Kreisen liegen (Erkelenz in Kreis 2,
 * Wegberg und Heinsberg in Kreis 3, Niederkrüchten in Kreis 4,
 * Mönchengladbach außerhalb von Kreis 4). Gemessen wird Luftlinie von der
 * PLZ-Mitte zum Fachmarkt, genau wie bei der Prüfung des Verlegegebiets.
 *
 * Die Preise stehen hier bewusst NICHT: Sie kommen aus den WooCommerce-Produkten
 * mit der jeweiligen Artikelnummer (SKU = SAP-Artikelnummer), damit es nur eine
 * Stelle gibt, an der sie gepflegt werden.
 */

export interface AufmassKreis {
  /** Obergrenze in km (einschließlich). */
  bisKm: number
  /** Anzeigename, z. B. „Kreis 3". */
  name: string
  /** SKU des WooCommerce-Produkts = SAP-Artikelnummer. */
  sku: string
}

export const AUFMASS_KREISE: readonly AufmassKreis[] = [
  { bisKm: 5, name: 'Kreis 1', sku: 'A0001' },
  { bisKm: 10, name: 'Kreis 2', sku: 'A0002' },
  { bisKm: 15, name: 'Kreis 3', sku: 'A0003' },
  { bisKm: 20, name: 'Kreis 4', sku: 'A0004' },
  // Bis zum Rand des Verlegegebiets (SERVICE_RADIUS_KM = 50).
  { bisKm: 50, name: 'über Kreis 4', sku: 'A0005' },
] as const

/** Kreis zur Entfernung, oder `null` außerhalb des Verlegegebiets. */
export function aufmassKreis(distanceKm: number): AufmassKreis | null {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null
  return AUFMASS_KREISE.find((k) => distanceKm <= k.bisKm) ?? null
}

/** „69 €" bzw. „69,50 €" in deutscher Schreibweise. */
export function formatEuro(betrag: number): string {
  const ganz = Number.isInteger(betrag)
  return `${betrag.toLocaleString('de-DE', {
    minimumFractionDigits: ganz ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}
