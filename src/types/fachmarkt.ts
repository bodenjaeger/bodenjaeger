/**
 * Shared types für die Fachmarkt-Landingpage (Hückelhoven).
 *
 * FilialBanner beschreibt einen redaktionell pflegbaren Angebots-Banner
 * (Sektion 6 "Filialangebote"). Der Typ ist die Vertragsbasis zwischen
 * Frontend (Mock-Daten in Phase 1) und dem späteren WordPress-CPT
 * `filial_banner` (Phase 2, separater PHP-Task). Feldnamen sind bewusst
 * so gewählt, dass sie 1:1 auf ACF/REST-Felder abbildbar sind.
 */
export interface FilialBanner {
  id: number | string
  titel: string
  untertitel?: string
  /**
   * Voll-URL oder /-relativer Pfad zum Bild.
   * CMS-Hinweis (filial_banner): Banner werden als Slider im Format 7:3
   * ausgespielt — empfohlenes Motiv 2800 × 1200 px (JPG).
   */
  bild: string
  bildAlt?: string
  /**
   * Gesetzt = Motiv mit eingebrannter Schrift (Headline, Preise, Button).
   * Es wird dann per `object-contain` vollständig in die 7:3-Box eingepasst
   * statt beschnitten, und der Wert füllt die dabei frei bleibenden Ränder.
   * Muss exakt dem Hintergrundton des Motivs entsprechen, sonst ist die Kante
   * sichtbar. Ohne das Feld gilt wie bisher `object-cover` (Foto, Beschnitt
   * unkritisch) — und nur dann ist der Hover-Zoom aktiv, der ein eingepasstes
   * Motiv an den Rändern abschneiden würde.
   */
  hintergrund?: string
  ctaLabel?: string
  ctaUrl?: string
  /** Nur aktive Banner werden gerendert */
  aktiv: boolean
  /** Aufsteigend sortiert */
  reihenfolge: number
  /** ISO-Datum; ist es überschritten, gilt der Banner als abgelaufen */
  gueltigBis?: string | null
}
