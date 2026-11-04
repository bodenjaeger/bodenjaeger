/**
 * Prüft serverseitig, ob eine JOIN-Anzeige noch online ist.
 *
 * Der kostenlose JOIN-Tarif hat keine API. Die öffentliche Anzeigenseite enthält
 * aber den Status der Stelle, z. B. "status":"ONLINE" oder "status":"ARCHIVED".
 * Der sichtbare Hinweistext taugt nicht als Merkmal: Er steht als Übersetzung
 * auch im HTML aktiver Anzeigen.
 *
 * Ist der Status nicht lesbar oder JOIN gestört, gilt die Stelle als aktiv, damit
 * eine Störung nicht alle Stellen von der Seite entfernt.
 */
const PRUEF_INTERVALL_SEK = 3600

export async function isJoinStelleOnline(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { next: { revalidate: PRUEF_INTERVALL_SEK } })
    if (res.status === 404 || res.status === 410) return false
    if (!res.ok) return true
    const status = (await res.text()).match(/"status":"([A-Z_]+)"/)?.[1]
    return !status || status === 'ONLINE'
  } catch {
    return true
  }
}
