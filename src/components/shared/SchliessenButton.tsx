'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Einheitliches X zum Schließen aller Fenster, Menüs und Seitenleisten
 * (Mega-Menü, Suche, Mobile-Menü, Warenkorb, Kontakt, Filter, Auswahlfenster,
 * Großansicht). Kundenvorgabe: überall gleich, damit man es sofort findet.
 *
 * Aussehen wie die Slider-Pfeile der Produktseite: 44×44px, `rounded-lg`,
 * weiße Fläche mit `border-ash`, dunkles X. Funktioniert auf hellem und dunklem
 * Hintergrund.
 */
export default function SchliessenButton({
  onClick,
  label = 'Schließen',
  className = '',
  autoFocus = false,
}: {
  onClick: () => void
  label?: string
  className?: string
  autoFocus?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      autoFocus={autoFocus}
      className={`flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:border-mid hover:bg-pale focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
    >
      <X className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

/**
 * Kopfzeile für Fenster und Seitenleisten: Titel links, X rechts.
 * Gleiche Höhe (64px) und Abstände in allen Fenstern.
 */
export function FensterKopf({
  titel,
  titelId,
  onClose,
  schliessenLabel,
  children,
  className = '',
}: {
  titel: ReactNode
  titelId?: string
  onClose: () => void
  schliessenLabel?: string
  /** Optional zwischen Titel und X, z. B. ein Link */
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex min-h-16 flex-none items-center justify-between gap-3 border-b border-ash bg-white px-4 py-2.5 sm:px-6 ${className}`}>
      <h2 id={titelId} className="min-w-0 truncate text-lg font-[family-name:var(--font-poppins-bold)] text-dark sm:text-xl">
        {titel}
      </h2>
      <div className="flex items-center gap-3">
        {children}
        <SchliessenButton onClick={onClose} label={schliessenLabel} />
      </div>
    </div>
  )
}
