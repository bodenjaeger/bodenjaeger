/**
 * Aktionsleiste im Shop-Header (`SaleBanner`).
 *
 * Für eine neue Aktion nur diese Datei anpassen: Texte, Farben, Link und
 * An/Aus. Die Komponente selbst muss dafür nicht angefasst werden.
 *
 * `onlyWhilePaketAktion`: Koppelt die Leiste an die Laufzeit aus
 * `src/lib/promo.ts` (`isAktionActive()`). Endet „Jedes 7. Paket gratis",
 * verschwindet die Leiste automatisch — Werbung und Rabatt laufen damit nicht
 * auseinander. Für Aktionen ohne Bezug zur Paket-Aktion auf `false` setzen.
 */
export interface SaleBannerConfig {
  /** Leiste anzeigen? `false` blendet sie überall aus. */
  enabled: boolean;
  /** Nur anzeigen, solange die Paket-Aktion aus `promo.ts` läuft. */
  onlyWhilePaketAktion: boolean;
  /** Kurzer, einzeiliger Text für Mobilgeräte. */
  textMobile: string;
  /** Vollständiger Text ab `md`. */
  textDesktop: string;
  /** Optionales Linkziel — `null` = Leiste ist nicht klickbar. */
  href: string | null;
  backgroundColor: string;
  textColor: string;
}

export const SALE_BANNER: SaleBannerConfig = {
  enabled: true,
  onlyWhilePaketAktion: true,
  textMobile: '🎁 Jedes 7. Paket gratis – automatisch sparen!',
  textDesktop: '🎁 Jedes 7. Paket gratis – automatisch sparen!',
  href: '/sale',
  // Jäger-Gelb / Jäger-Schwarz, wie im bisherigen SummerSALE-Balken.
  backgroundColor: '#fff301',
  textColor: '#2e2d32',
};
