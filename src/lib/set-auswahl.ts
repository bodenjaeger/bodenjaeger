/**
 * Merkt sich die Set-Auswahl je Produkt, damit sie das Neuladen übersteht.
 * Nur für diesen Tab: Beim nächsten Besuch startet die Seite wieder mit der Standardauswahl.
 */
export interface SetAuswahl {
  m2?: number;
  daemmungId?: number;
  sockelleisteId?: number;
}

const keyFor = (productId: number) => `set-auswahl-${productId}`;

export function readSetAuswahl(productId: number): SetAuswahl {
  try {
    return JSON.parse(sessionStorage.getItem(keyFor(productId)) || '{}') as SetAuswahl;
  } catch {
    return {};
  }
}

export function writeSetAuswahl(productId: number, update: SetAuswahl): void {
  try {
    sessionStorage.setItem(keyFor(productId), JSON.stringify({ ...readSetAuswahl(productId), ...update }));
  } catch {
    // Speicher nicht verfügbar: Auswahl gilt nur bis zum Neuladen
  }
}
