'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { MEGA_NAV, angeboteHref } from '@/content/megaMenu'
import { LANDING_NAV } from '@/content/fachmarkt'
import LiveSearch from '@/components/LiveSearch'
import SchliessenButton from '@/components/shared/SchliessenButton'
import MegaMenu from './MegaMenu'
import HeaderLogo from './HeaderLogo'
import type { HeaderBereich } from './UspBar'

const FM = '/fachmarkt-hueckelhoven'
const SUCHE = 'suche'

/**
 * Hauptzeile des Desktop-Headers (ab lg), Höhe fest 80px:
 * Logo · Reiter · Suche + Konto/Wunschliste/Warenkorb (`actions`).
 *
 * Shop: Reiter mit Mega-Menü (Inhalte in `src/content/megaMenu.ts`).
 * Fachmarkt-Seiten: dieselbe Zeile zeigt das Fachmarkt-Menü, „Leistungen“ öffnet
 * das Fachmarkt-Panel. Zum Wechseln dient der Umschalter in der Zeile darüber.
 *
 * Die Suche steht als Symbol neben den Aktionen und klappt darunter als Leiste
 * auf. Mega-Menüs und Suche teilen sich denselben Platz unter der Zeile; es ist
 * immer nur eines offen. Schließen: X, Escape, Klick daneben oder Seitenwechsel.
 *
 * Mega-Menüs öffnen per Hover (kurze Verzögerung gegen Flackern) oder per Klick
 * auf den Pfeil; das Label bleibt ein Link auf die Kategorie.
 *
 * Der abdunkelnde Hintergrund liegt bewusst außerhalb des Hover-Bereichs,
 * damit das Menü schließt, sobald die Maus Kopf und Panel verlässt.
 */
export default function HeaderNav({
  promoActive = false,
  bereich = 'shop',
  actions,
}: {
  promoActive?: boolean
  bereich?: HeaderBereich
  actions: ReactNode
}) {
  const pathname = usePathname()
  const [openId, setOpenId] = useState<string | null>(null)
  const [backdropTop, setBackdropTop] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current)
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const open = useCallback((id: string) => {
    if (rowRef.current) setBackdropTop(rowRef.current.getBoundingClientRect().bottom)
    setOpenId(id)
  }, [])

  const close = useCallback(() => {
    clearTimers()
    setOpenId(null)
  }, [clearTimers])

  /** Schließen per X oder Escape: Fokus zurück auf den Auslöser. */
  const closeAndFocus = useCallback(() => {
    const id = openId
    close()
    if (id) triggerRefs.current[id]?.focus()
  }, [openId, close])

  // Escape, Klick außerhalb und Größenänderung.
  useEffect(() => {
    if (!openId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAndFocus()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    const onResize = () => {
      if (rowRef.current) setBackdropTop(rowRef.current.getBoundingClientRect().bottom)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, { passive: true })
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize)
    }
  }, [openId, close, closeAndFocus])

  // Seitenwechsel schließt das Menü.
  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => clearTimers, [clearTimers])

  const hoverOpen = (id: string) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (openId === SUCHE) return // Suche bleibt offen, bis man sie schließt
    clearTimers()
    openTimer.current = setTimeout(() => open(id), openId ? 60 : 150)
  }

  const toggle = (id: string) => (openId === id ? close() : open(id))
  const setTrigger = (id: string) => (el: HTMLButtonElement | null) => {
    triggerRefs.current[id] = el
  }

  const chevron = (id: string, label: string) => (
    <button
      type="button"
      ref={setTrigger(id)}
      onClick={() => toggle(id)}
      aria-expanded={openId === id}
      aria-controls="mega-menu"
      aria-label={`Menü ${label} ${openId === id ? 'schließen' : 'öffnen'}`}
      className="-ml-1.5 flex h-11 w-6 items-center justify-center rounded-md text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${openId === id ? 'rotate-180' : ''}`} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  const itemCls = (aktiv: boolean) =>
    `relative flex h-11 items-center whitespace-nowrap rounded-md px-2 text-sm text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:px-2.5 xl:text-[15px] ${
      aktiv ? 'after:absolute after:inset-x-2 after:-bottom-[18px] after:h-[3px] after:rounded-full after:bg-hdr-red' : ''
    }`

  const onServiceRoute = pathname?.startsWith(`${FM}/service`) ?? false

  return (
    <>
      <div
        ref={wrapRef}
        className="hidden border-b border-hdr-line lg:block"
        onMouseLeave={() => {
          if (openTimer.current) clearTimeout(openTimer.current)
          if (!openId || openId === SUCHE) return
          closeTimer.current = setTimeout(close, 220)
        }}
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current)
        }}
      >
        <div className="content-container relative">
          <div ref={rowRef} className="flex h-[80px] items-center gap-6 xl:gap-8">
            <HeaderLogo />

            {bereich === 'shop' ? (
              <nav aria-label="Hauptnavigation" className="min-w-0 flex-1">
                <ul className="flex items-center gap-0.5 xl:gap-1">
                  {MEGA_NAV.map((item) => (
                    <li
                      key={item.id}
                      onMouseEnter={() => hoverOpen(item.id)}
                      onMouseLeave={() => {
                        if (openTimer.current) clearTimeout(openTimer.current)
                      }}
                    >
                      <span className="flex items-center">
                        <Link href={item.href} onClick={close} className={itemCls(openId === item.id)}>
                          {item.id === 'verlegen' ? (
                            <>
                              <span className="xl:hidden">Verlegen</span>
                              <span className="hidden xl:inline">{item.label}</span>
                            </>
                          ) : (
                            item.label
                          )}
                        </Link>
                        {chevron(item.id, item.label)}
                      </span>
                    </li>
                  ))}
                  <li>
                    <Link href={angeboteHref(promoActive)} className={itemCls(false)}>
                      Angebote
                      {promoActive && (
                        <span className="ml-2 hidden rounded-md bg-hdr-red px-2 py-0.5 text-[11px] font-[family-name:var(--font-poppins-bold)] text-white 2xl:inline">
                          Black Weeks
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
              </nav>
            ) : (
              <nav aria-label="Fachmarkt" className="min-w-0 flex-1">
                <ul className="flex items-center gap-0.5 xl:gap-1">
                  {/* Übersicht und Bewertungen erst ab xl, sonst passt die Zeile
                      zwischen 1024 und 1280px nicht. */}
                  <li className="hidden xl:block">
                    <Link href={FM} className={itemCls(pathname === FM)}>
                      Übersicht
                    </Link>
                  </li>
                  {LANDING_NAV.items.map((item) =>
                    item.kind === 'leistungen' ? (
                      <li key="leistungen" onMouseEnter={() => hoverOpen('fachmarkt')}>
                        <span className="flex items-center">
                          <Link href={`${FM}/service`} onClick={close} className={itemCls(onServiceRoute || openId === 'fachmarkt')}>
                            {item.label}
                          </Link>
                          {chevron('fachmarkt', item.label)}
                        </span>
                      </li>
                    ) : (
                      <li key={item.href} className={item.label === 'Bewertungen' ? 'hidden xl:block' : undefined}>
                        <Link href={`${FM}${item.href}`} className={itemCls(false)}>
                          {item.label}
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </nav>
            )}

            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                type="button"
                ref={setTrigger(SUCHE)}
                onClick={() => toggle(SUCHE)}
                aria-expanded={openId === SUCHE}
                aria-controls="kopf-suche"
                aria-label={openId === SUCHE ? 'Suche schließen' : 'Suche öffnen'}
                title="Suche"
                className={`flex h-11 w-11 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  openId === SUCHE ? 'bg-white/10' : ''
                }`}
              >
                <Search className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
              </button>
              {actions}
            </div>
          </div>

          {openId === SUCHE && (
            <div id="kopf-suche" className="absolute inset-x-4 top-full z-10 mt-2 rounded-xl bg-hdr-bg p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] ring-1 ring-hdr-line sm:inset-x-6">
              <div className="mx-auto flex max-w-[860px] items-center gap-3">
                <LiveSearch size="lg" className="min-w-0 flex-1" autoFocus />
                <SchliessenButton onClick={closeAndFocus} label="Suche schließen" />
              </div>
            </div>
          )}

          {openId && openId !== SUCHE && (
            <div
              id="mega-menu"
              className="absolute inset-x-4 top-full z-10 mt-2 overflow-y-auto overscroll-contain rounded-xl bg-white text-dark shadow-[0_24px_60px_rgba(0,0,0,0.28)] [scrollbar-width:none] sm:inset-x-6 [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: `calc(100vh - ${Math.round(backdropTop)}px - 24px)` }}
            >
              <MegaMenu id={openId} onNavigate={close} onClose={closeAndFocus} promoActive={promoActive} />
            </div>
          )}
        </div>
      </div>

      {openId && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-x-0 bottom-0 z-0 hidden bg-dark/45 lg:block"
          style={{ top: backdropTop }}
        />
      )}
    </>
  )
}
