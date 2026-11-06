/**
 * Zentrale Definition der Fachmarkt-Routen und ihrer Navigations-Logik.
 *
 * Im GESAMTEN Bereich `/fachmarkt-hueckelhoven` (Landingpage + alle
 * Unterseiten, Prefix-Match über `isFachmarktRoute`) zeigt der Shop-Kopf das
 * Fachmarkt-Menü (HeaderWrapper → Header mit `bereich="fachmarkt"`).
 *
 * `isLandingRoute` (exakter Match) bleibt als schmalere Prüfung erhalten,
 * falls einzelne Elemente NUR auf der exakten Landingpage gebraucht werden.
 */
export const LANDING_ROUTES = ['/fachmarkt-hueckelhoven'] as const

/** true nur bei exaktem Match einer Landing-Route (ohne Unterseiten). */
export function isLandingRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Trailing Slash tolerieren, sonst exakter Vergleich.
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return (LANDING_ROUTES as readonly string[]).includes(normalized)
}

/**
 * true für die Landingpage UND alle Unterseiten (Prefix-Match auf
 * `/fachmarkt-hueckelhoven`). Für Elemente, die im gesamten Fachmarkt-Bereich
 * ausgeblendet werden (z. B. die globalen Floating-Buttons).
 */
export function isFachmarktRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return pathname === '/fachmarkt-hueckelhoven' || pathname.startsWith('/fachmarkt-hueckelhoven/')
}
