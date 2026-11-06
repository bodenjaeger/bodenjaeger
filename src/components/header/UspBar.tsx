'use client'

import Link from 'next/link'
import { CalendarDays, Gift, Package, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react'
import { USP_ITEMS, type NavIcon } from '@/content/shopNav'

export type HeaderBereich = 'shop' | 'fachmarkt'

/**
 * Umschalter Onlineshop / Fachmarkt Hückelhoven. Beide Seiten nutzen denselben Kopf.
 *
 * Gestaltung wie die Schnellwahl-Chips im Shop: `rounded-full`, die aktive Seite
 * in `bg-[#d11820]` mit weißer Schrift. `hell` für helle Flächen (Mobile-Menü).
 */
export function BereichUmschalter({
  bereich,
  hell = false,
  kurz = false,
  onWechsel,
}: {
  bereich: HeaderBereich
  hell?: boolean
  kurz?: boolean
  /** Wird beim Klick auf den jeweils anderen Bereich aufgerufen (Mobile-Menü bleibt offen). */
  onWechsel?: () => void
}) {
  const pill = (aktiv: boolean) =>
    `flex h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
      hell ? 'focus-visible:outline-brand' : 'focus-visible:outline-white'
    } ${
      aktiv
        ? 'bg-[#d11820] font-[family-name:var(--font-poppins-bold)] text-white'
        : hell
          ? 'text-dark hover:bg-white'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`
  return (
    <nav
      aria-label="Bereich wählen"
      className={`flex items-center gap-1 rounded-full p-1 ${hell ? 'bg-pale ring-1 ring-ash ring-inset' : 'bg-white/10'}`}
    >
      <Link
        href="/"
        aria-current={bereich === 'shop' ? 'page' : undefined}
        onClick={bereich === 'shop' ? undefined : onWechsel}
        className={pill(bereich === 'shop')}
      >
        <ShoppingBag className="h-3.5 w-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
        Onlineshop
      </Link>
      <Link
        href="/fachmarkt-hueckelhoven"
        aria-current={bereich === 'fachmarkt' ? 'page' : undefined}
        onClick={bereich === 'fachmarkt' ? undefined : onWechsel}
        className={pill(bereich === 'fachmarkt')}
      >
        <Store className="h-3.5 w-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
        {kurz ? 'Fachmarkt' : 'Fachmarkt Hückelhoven'}
      </Link>
    </nav>
  )
}

const ICONS: Record<NavIcon, LucideIcon> = {
  package: Package,
  truck: Truck,
  calendar: CalendarDays,
  gift: Gift,
}

/** Ein Durchlauf der Vorteile. Zweimal hintereinander ergibt das nahtlose Band. */
function UspListe({ kopie }: { kopie: boolean }) {
  return (
    <ul aria-hidden={kopie || undefined} className="flex shrink-0 items-center gap-20 pr-20">
      {USP_ITEMS.map((item) => {
        const Icon = ICONS[item.icon]
        return (
          <li key={item.id} className="flex items-center gap-2 whitespace-nowrap">
            <Icon className="h-4 w-4 flex-shrink-0 text-white" strokeWidth={1.75} aria-hidden="true" />
            {/* leading-5: sonst schneidet die Zeile Unterlängen ab („g“, „j“). */}
            <span className="text-xs leading-5 text-white">{item.label}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Laufband mit weich ausgeblendeten Rändern. */
function UspLaufband({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-48px),transparent)] ${className}`}
    >
      <div className="usp-laufband flex w-max">
        <UspListe kopie={false} />
        <UspListe kopie />
      </div>
    </div>
  )
}

/**
 * Zeile 1 des Shop-Headers.
 *
 * Desktop (ab lg): links der Umschalter Onlineshop/Fachmarkt, rechts daneben
 * mit deutlichem Abstand (ml-12) die Vorteile als langsam durchlaufendes Band.
 * Höhe fest 48px — der Header schiebt die Leiste ab lg per `lg:top-[-48px]`
 * aus dem Bild (Header.tsx). Höhe hier ändern heißt Offset dort mitändern.
 *
 * Mobile: dasselbe Laufband über die ganze Breite, darunter ein 1px-Strich in
 * `--hdr-line`. Höhe fest 40px (39px + 1px); der Header schiebt die Leiste
 * mobil per `top-[-40px]` aus dem Bild.
 *
 * Das Band läuft ohne Pause (`.usp-laufband` in globals.css), hält beim
 * Überfahren an und steht bei `prefers-reduced-motion: reduce` still.
 * Screenreader bekommen die Punkte einmal als normale Liste.
 */
export default function UspBar({ bereich = 'shop' }: { bereich?: HeaderBereich }) {
  return (
    <div className="w-full bg-hdr-bg">
      <ul className="sr-only">
        {USP_ITEMS.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>

      <div className="hidden border-b border-hdr-line lg:block">
        <div className="content-container">
          <div className="flex h-[48px] items-center">
            <BereichUmschalter bereich={bereich} />
            <UspLaufband className="ml-12 flex-1" />
          </div>
        </div>
      </div>

      <div className="border-b border-hdr-line lg:hidden" aria-hidden="true">
        <div className="flex h-[39px] items-center">
          <UspLaufband className="w-full" />
        </div>
      </div>
    </div>
  )
}
