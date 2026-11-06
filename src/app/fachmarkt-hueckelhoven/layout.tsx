import StickyBottomBar from '@/components/fachmarkt/StickyBottomBar'

/**
 * Layout für den Fachmarkt-Bereich.
 *
 * Der Kopf kommt wie im Shop aus HeaderWrapper (Header mit `bereich="fachmarkt"`):
 * gleiche Zeilen für Logo, Suche, Muster und Warenkorb, Zeile 3 zeigt das
 * Fachmarkt-Menü. Eine eigene Fachmarkt-Navigation gibt es nicht mehr.
 *
 * `fachmarkt-bereich` sorgt dafür, dass Sprungziele (#team, #kontakt …) nicht
 * unter dem höheren Kopf verschwinden (globals.css).
 */
export default function FachmarktLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fachmarkt-bereich">
      {children}
      {/* Platz für die fixierte mobile Aktionsleiste (verhindert Überdecken) */}
      <div aria-hidden className="h-14 md:hidden" />
      <StickyBottomBar />
    </div>
  )
}
