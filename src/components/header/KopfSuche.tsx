'use client'

import { useEffect, useRef } from 'react'
import LiveSearch from '@/components/LiveSearch'
import SchliessenButton from '@/components/shared/SchliessenButton'

/**
 * Aufklappende Suche in der Kopfzeile (Desktop und Mobil gleich).
 *
 * Liegt über dem Bereich neben dem Logo (Reiter und Symbole) und schiebt sich
 * beim Öffnen aus der Mitte nach links und rechts auf (`.kopf-suche-auf` in
 * globals.css). Rechts das einheitliche X. Schließen außerdem per Escape und
 * Klick außerhalb; ein Seitenwechsel schließt über die aufrufende Zeile.
 *
 * Die Animation läuft ohne `forwards`: Danach ist kein `clip-path` mehr aktiv,
 * sonst würde die Trefferliste unter der Zeile abgeschnitten.
 */
export default function KopfSuche({
  offen,
  onClose,
  size,
}: {
  offen: boolean
  onClose: () => void
  size: 'md' | 'lg'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [offen, onClose])

  if (!offen) return null

  return (
    <div
      ref={ref}
      role="search"
      className="kopf-suche-auf absolute inset-y-0 right-0 left-0 z-20 flex items-center justify-center gap-2 bg-hdr-bg"
    >
      <div className="flex w-full max-w-[760px] items-center gap-2">
        <LiveSearch size={size} className="min-w-0 flex-1" autoFocus />
        <SchliessenButton onClick={onClose} label="Suche schließen" />
      </div>
    </div>
  )
}
