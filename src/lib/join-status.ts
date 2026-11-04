/**
 * Prüft serverseitig, ob eine JOIN-Anzeige noch online ist.
 *
 * Der kostenlose JOIN-Tarif hat keine API. Archivierte Anzeigen zeigen aber
 * öffentlich den Text unten. Bei Netzwerkfehlern gilt die Stelle als aktiv,
 * damit eine JOIN-Störung nicht alle Stellen von der Seite entfernt.
 */
const ARCHIVIERT_TEXT = 'Diese Stelle ist nicht mehr verfügbar'
const PRUEF_INTERVALL_SEK = 3600

export async function isJoinStelleOnline(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { next: { revalidate: PRUEF_INTERVALL_SEK } })
    if (res.status === 404 || res.status === 410) return false
    if (!res.ok) return true
    return !(await res.text()).includes(ARCHIVIERT_TEXT)
  } catch {
    return true
  }
}
