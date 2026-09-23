import { Star } from 'lucide-react'

/**
 * Gold der gefüllten Sterne — abgestimmt auf den gelben Kern des
 * Trustmark-Siegels daneben, damit beide als ein Element gelesen werden.
 */
const GOLD = '#ffc72c'

/** Grundfarbe der ungefüllten Sterne: gedämpftes Weiß auf `bg-dark`. */
const LEER = 'rgba(255,255,255,0.22)'

interface StarRatingProps {
  /** Note, z.B. 4.6 */
  note: number
  /** Skalenmaximum, üblicherweise 5 */
  maximum: number
  className?: string
}

function Sterne({ anzahl, farbe }: { anzahl: number; farbe: string }) {
  return (
    <div className="flex w-max gap-0.5">
      {Array.from({ length: anzahl }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 shrink-0" fill={farbe} stroke="none" />
      ))}
    </div>
  )
}

/**
 * Sternebewertung als exakte Teilfüllung.
 *
 * Zwei identische Sternreihen liegen übereinander: unten die leere, darüber
 * die goldene, horizontal auf `note / maximum` beschnitten. Dadurch zeigt 4,6
 * auch wirklich 92% — kein Aufrunden auf fünf volle Sterne, was die Bewertung
 * zu gut darstellen würde. Das innere `w-max` verhindert, dass die goldene
 * Reihe im beschnittenen Container mitschrumpft, statt abgeschnitten zu werden.
 *
 * Die Sterne sind rein dekorativ; die Note steht als Text daneben und im
 * aria-label des umgebenden Blocks.
 */
export default function StarRating({ note, maximum, className = '' }: StarRatingProps) {
  const anteil = Math.max(0, Math.min(1, note / maximum))

  return (
    <div aria-hidden="true" className={`relative w-max ${className}`}>
      <Sterne anzahl={maximum} farbe={LEER} />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${anteil * 100}%` }}
      >
        <Sterne anzahl={maximum} farbe={GOLD} />
      </div>
    </div>
  )
}
