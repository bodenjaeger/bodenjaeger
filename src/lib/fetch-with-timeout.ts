/**
 * `fetch` mit eigenem Timeout (AbortController).
 *
 * Hintergrund: Live-Test 21.10.2026 — der fetch zum WordPress-Proxy hing,
 * bis Vercel die Funktion per maxDuration beendet hat. Danach lief kein
 * einziger Fehlerpfad mehr. Mit eigenem Timeout deutlich unter maxDuration
 * bekommt der Aufrufer die Kontrolle zurück und kann reagieren.
 */

export class FetchTimeoutError extends Error {
  constructor(
    public readonly url: string,
    public readonly timeoutMs: number
  ) {
    super(`Timeout nach ${timeoutMs} ms: ${url}`);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
