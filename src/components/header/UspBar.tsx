'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CalendarDays, Gift, Package, Truck, type LucideIcon } from 'lucide-react'
import { USP_INTERVAL_MS, USP_ITEMS, type NavIcon } from '@/content/shopNav'
import { STANDORT } from '@/content/fachmarkt'
import { oeffnungsstatus, type Oeffnungsstatus } from '@/lib/oeffnungsstatus'

export type HeaderBereich = 'shop' | 'fachmarkt'

/**
 * Öffnungsstatus erst nach dem Laden berechnen: Server und Browser hätten sonst
 * unterschiedliche Uhrzeiten und React meldet einen Hydration-Fehler. Danach
 * jede Minute neu.
 */
export function useOeffnungsstatus(): Oeffnungsstatus | null {
  const [status, setStatus] = useState<Oeffnungsstatus | null>(null)
  useEffect(() => {
    const update = () => setStatus(oeffnungsstatus())
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [])
  return status
}

/** Umschalter Onlineshop / Fachmarkt Hückelhoven. Beide Seiten nutzen denselben Kopf. */
export function BereichUmschalter({ bereich, kurz = false }: { bereich: HeaderBereich; kurz?: boolean }) {
  const pill = (aktiv: boolean) =>
    `flex h-7 items-center whitespace-nowrap rounded-full px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      aktiv
        ? 'bg-white font-[family-name:var(--font-poppins-bold)] text-dark'
        : 'text-white/85 hover:text-white'
    }`
  return (
    <nav aria-label="Bereich wählen" className="flex items-center gap-1">
      <Link href="/" aria-current={bereich === 'shop' ? 'page' : undefined} className={pill(bereich === 'shop')}>
        Onlineshop
      </Link>
      <Link
        href="/fachmarkt-hueckelhoven"
        aria-current={bereich === 'fachmarkt' ? 'page' : undefined}
        className={pill(bereich === 'fachmarkt')}
      >
        {kurz ? 'Fachmarkt' : 'Fachmarkt Hückelhoven'}
      </Link>
    </nav>
  )
}

/** Weißer Punkt + Status. Geschlossen: nur Ring statt Punkt. */
export function StatusAnzeige({ status, kurz = false }: { status: Oeffnungsstatus | null; kurz?: boolean }) {
  return (
    <span className="flex items-center gap-2 whitespace-nowrap text-xs text-white/85">
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-shrink-0 rounded-full ${status?.offen ? 'bg-white' : 'ring-[1.5px] ring-white/70 ring-inset'}`}
      />
      {/* Platzhalter in gleicher Breite verhindert ein Springen nach dem Laden. */}
      <span className={status ? undefined : 'invisible'}>
        {status ? (kurz ? status.kurz : status.text) : kurz ? 'Offen bis 18:30' : 'Jetzt geöffnet · bis 18:30 Uhr'}
      </span>
    </span>
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
 * Desktop (ab lg): Umschalter Onlineshop/Fachmarkt, USP (ab xl) und rechts der
 * Öffnungsstatus mit Telefon. Höhe fest 48px — der Header schiebt die Leiste ab lg per
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
  const status = useOeffnungsstatus()

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
      {/* Desktop: links Umschalter Shop/Fachmarkt, Mitte USP (ab xl),
          rechts Öffnungsstatus und Telefon. Höhe bleibt fest 48px. */}
      <div className="hidden border-b border-hdr-line lg:block">
        <div className="content-container">
          <div className="flex h-[48px] items-center justify-between gap-6">
            <BereichUmschalter bereich={bereich} />

            {/* Neben Umschalter und Öffnungsstatus reicht der Platz ab xl für zwei,
                ab 1400px für drei Punkte. Der vierte steht im mobilen Ticker. */}
            <ul className="hidden min-w-0 items-center gap-6 xl:flex">
              {USP_ITEMS.map((item, i) => {
                const Icon = ICONS[item.icon]
                const sichtbar = i < 2 ? 'flex' : i === 2 ? 'hidden min-[1400px]:flex' : 'hidden'
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

            <div className="flex items-center gap-5">
              <Link href="/fachmarkt-hueckelhoven#kontakt" className="rounded-md hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <StatusAnzeige status={status} />
              </Link>
              <a
                href={STANDORT.telefonLink}
                className="whitespace-nowrap text-xs text-white/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Telefon <span className="font-[family-name:var(--font-poppins-bold)] text-white">{STANDORT.telefonAnzeige}</span>
              </a>
            </div>
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
