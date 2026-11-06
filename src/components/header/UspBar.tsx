'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CalendarDays, Gift, Package, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react'
import { USP_INTERVAL_MS, USP_ITEMS, type NavIcon } from '@/content/shopNav'

export type HeaderBereich = 'shop' | 'fachmarkt'

/**
 * Umschalter Onlineshop / Fachmarkt Hückelhoven. Beide Seiten nutzen denselben Kopf.
 *
 * Gestaltung wie die Schnellwahl-Chips im Shop: `rounded-full`, die aktive Seite
 * in `bg-[#d11820]` mit weißer Schrift. `hell` für helle Flächen (Mobile-Menü).
 */
export function BereichUmschalter({ bereich, hell = false, kurz = false }: { bereich: HeaderBereich; hell?: boolean; kurz?: boolean }) {
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
      <Link href="/" aria-current={bereich === 'shop' ? 'page' : undefined} className={pill(bereich === 'shop')}>
        <ShoppingBag className="h-3.5 w-3.5 flex-none" strokeWidth={2} aria-hidden="true" />
        Onlineshop
      </Link>
      <Link
        href="/fachmarkt-hueckelhoven"
        aria-current={bereich === 'fachmarkt' ? 'page' : undefined}
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

/**
 * Zeile 1 des Shop-Headers.
 *
 * Desktop (ab lg): links Umschalter Onlineshop/Fachmarkt, rechts die USP
 * (so viele, wie in die Breite passen). Höhe fest 48px — der Header schiebt die Leiste ab lg per
 * `lg:top-[-48px]` aus dem Bild (Header.tsx). Höhe hier ändern heißt Offset
 * dort mitändern.
 *
 * Mobile: Ticker mit genau einem USP, der automatisch durchrotiert, darunter
 * ein ruhender 1px-Trennstrich in `--hdr-line` — derselbe Strich, der die
 * Zeilen im übrigen Header und im Footer trennt. Kein Fortschrittsbalken: die
 * mitlaufende Animation zog das Auge in eine Nebenzeile.
 *
 * Höhe fest 40px (39px Zeile + 1px Strich). Diese Zahl ist gesetzt — der
 * Header schiebt die Leiste mobil per `top-[-40px]` aus dem Bild
 * (Header.tsx). Ändert sich die Höhe hier, muss der Offset dort mitwandern.
 *
 * Bei `prefers-reduced-motion: reduce` bleibt der erste USP stehen.
 */
export default function UspBar({ bereich = 'shop' }: { bereich?: HeaderBereich }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % USP_ITEMS.length)
    }, USP_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const current = USP_ITEMS[index]
  const CurrentIcon = ICONS[current.icon]

  return (
    <div className="w-full bg-hdr-bg">
      {/* Desktop: links Umschalter, rechts USP. Höhe bleibt fest 48px. */}
      <div className="hidden border-b border-hdr-line lg:block">
        <div className="content-container">
          <div className="flex h-[48px] items-center justify-between gap-6">
            <BereichUmschalter bereich={bereich} />

            {/* Neben dem Umschalter passen ab lg zwei, ab xl drei, ab 1400px alle vier Punkte. */}
            <ul className="flex min-w-0 items-center justify-end gap-6">
              {USP_ITEMS.map((item, i) => {
                const Icon = ICONS[item.icon]
                const sichtbar = i < 2 ? 'flex' : i === 2 ? 'hidden xl:flex' : 'hidden min-[1400px]:flex'
                return (
                  <li key={item.id} className={`${sichtbar} items-center gap-2 whitespace-nowrap`}>
                    <Icon className="h-4 w-4 flex-shrink-0 text-white" strokeWidth={1.75} aria-hidden="true" />
                    {/* Bewusst kleiner als die Hauptnavigation: die USP-Zeile ist
                        Beiwerk und soll die Marke darunter nicht überstimmen. */}
                    <span className="text-xs leading-tight text-white">{item.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile: rotierender Ticker, darunter der ruhende Trennstrich */}
      <div className="border-b border-hdr-line lg:hidden">
        {/* Für Screenreader alle Punkte einmal als Liste – der Ticker selbst
            ist ausgeblendet, damit die Rotation nicht wiederholt vorgelesen wird. */}
        <ul className="sr-only">
          {USP_ITEMS.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>

        <div
          className="flex h-[39px] items-center justify-center gap-2 px-4"
          aria-hidden="true"
        >
          <CurrentIcon className="h-4 w-4 flex-shrink-0 text-white" strokeWidth={1.75} />
          {/* leading-5 statt leading-none: `truncate` schneidet mit line-height 1
              die Unterlängen ab („g", „j", „ä"). */}
          <span className="truncate text-xs leading-5 text-white">{current.label}</span>
        </div>
      </div>
    </div>
  )
}
