import Image from 'next/image'
import type { FooterBadge } from '@/lib/footer-nav'

interface BadgeGridProps {
  badges: FooterBadge[]
}

/**
 * Höhe jeder Kachel, Logo wie Text. 36px ist die Zeilenhöhe aus der
 * Designvorlage; bei 2:1-Karten sind das 72px Breite.
 */
const TILE_HEIGHT = 'h-9'

/**
 * Radius der Textkacheln. Die Logo-SVGs tragen ihren Radius selbst
 * (`rx="6"` bei 128px Breite); auf 36px Höhe skaliert entspricht das rund
 * 3,4px. 4px ist der nächste glatte Wert — dadurch sitzen Text- und
 * Logokacheln mit derselben Kantenrundung nebeneinander.
 */
const TILE_RADIUS = 'rounded-[4px]'

/**
 * Die Badge-Reihen für Zahlungsarten und Versanddienstleister.
 *
 * Layout: freier Flex-Umbruch statt festem Spaltenraster. Die Kacheln sind
 * unterschiedlich breit — Logokarten einheitlich 72px, Textkacheln so breit
 * wie ihr Inhalt — und sollen dicht gepackt umbrechen, wie in der Vorlage.
 * Ein Grid würde die schmalen Kacheln auf Spaltenbreite aufblasen.
 *
 * Zwei Badge-Sorten:
 *
 * 1. Badge MIT `src` — offizielle Brand-Karten (128x64, also 2:1, mit eigener
 *    Fläche: weiß, bei Klarna rosa, bei Amex blau, bei DHL gelb). Sie bekommen
 *    KEINE Hülle und KEINE Border — ein zusätzlicher Rahmen läge sichtbar
 *    neben der bereits gerundeten Kartenkante.
 * 2. Badge OHNE `src` — Textkachel auf Weiß mit dunkler Schrift, damit sie
 *    dasselbe Gewicht hat wie die weißen Logokarten daneben. Sobald für eine
 *    Marke ein SVG unter /public liegt, stellt allein das `src`-Feld sie um.
 *
 * `unoptimized` ist Pflicht: Der Next-Image-Optimizer lehnt SVG mit 400 ab,
 * solange `images.dangerouslyAllowSVG` nicht gesetzt ist — ohne das Flag
 * blieben alle Zahlungslogos leer. Die Dateien liegen lokal in /public,
 * Optimierung bringt bei ~1-5 KB SVG ohnehin nichts.
 */
export default function BadgeGrid({ badges }: BadgeGridProps) {
  const visible = badges.filter((badge) => badge.enabled)

  return (
    <ul className="flex flex-wrap gap-1.5">
      {visible.map((badge) => (
        // „PayPal" kommt zweimal vor (Logokarte und „Später Bezahlen"),
        // der Key braucht deshalb das sublabel.
        <li key={`${badge.label}-${badge.sublabel ?? ''}`}>
          {badge.src ? (
            <Image
              src={badge.src}
              alt={badge.label}
              width={128}
              height={64}
              unoptimized
              className={`${TILE_HEIGHT} w-auto`}
            />
          ) : (
            <div
              className={`flex ${TILE_HEIGHT} items-center justify-center gap-1 ${TILE_RADIUS} bg-white px-2.5`}
            >
              {badge.mark === 'bodenjaeger' && (
                <span
                  aria-hidden="true"
                  className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold leading-none text-white"
                >
                  J
                </span>
              )}
              {/* Zweizeilig, sobald ein sublabel da ist: Marke oben, Zahlungsart
                  darunter eine Stufe kleiner und etwas zurückgenommen. Beides
                  zusammen bleibt in den 36px Kachelhöhe. */}
              <span className="flex flex-col items-center text-center leading-tight text-dark">
                <span className="text-[12px] font-bold">{badge.label}</span>
                {badge.sublabel && (
                  <span className="text-[9px] font-bold text-mid">{badge.sublabel}</span>
                )}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
