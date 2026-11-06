'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Store } from 'lucide-react'
import { MEGA_NAV, angeboteHref } from '@/content/megaMenu'
import { LANDING_NAV, primaryNavCta } from '@/content/fachmarkt'
import CtaButton from '@/components/shared/CtaButton'
import MegaMenu from './MegaMenu'
import { useOeffnungsstatus, type HeaderBereich } from './UspBar'

const FM = '/fachmarkt-hueckelhoven'

/**
 * Zeile 3 des Headers (nur ab lg), Höhe fest 64px.
 *
 * Shop: Kategorien mit Mega-Menü (Inhalte in `src/content/megaMenu.ts`), rechts
 * der Fachmarkt mit eigenem Mega-Menü. Fachmarkt-Seiten: dieselbe Zeile zeigt
 * das Fachmarkt-Menü, „Leistungen“ öffnet das Fachmarkt-Panel.
 *
 * Das Label bleibt ein Link auf die Kategorie. Geöffnet wird per Hover (mit
 * kurzer Verzögerung, damit beim Überfahren nichts aufflackert) oder per Klick
 * auf den Pfeil. Escape schließt und gibt den Fokus an den Pfeil zurück.
 *
 * Der abdunkelnde Hintergrund liegt bewusst außerhalb des Hover-Bereichs,
 * damit das Menü schließt, sobald die Maus Kopf und Panel verlässt.
 */
export default function HeaderNav({
  promoActive = false,
  bereich = 'shop',
}: {
  promoActive?: boolean
  bereich?: HeaderBereich
}) {
  const pathname = usePathname()
  const status = useOeffnungsstatus()
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

  // Escape, Klick außerhalb und Scrollen schließen das Menü.
  useEffect(() => {
    if (!openId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerRefs.current[openId]?.focus()
        close()
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) close()
    }
    const onResize = () => rowRef.current && setBackdropTop(rowRef.current.getBoundingClientRect().bottom)
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
  }, [openId, close])

  // Seitenwechsel schließt das Menü.
  useEffect(() => {
    close()
  }, [pathname, close])

  useEffect(() => clearTimers, [clearTimers])

  const hoverOpen = (id: string) => {
    if (!window.matchMedia('(hover: hover)').matches) return
    clearTimers()
    openTimer.current = setTimeout(() => open(id), openId ? 60 : 150)
  }

  const toggle = (id: string) => (openId === id ? close() : open(id))

  const chevron = (id: string, label: string) => (
    <button
      type="button"
      ref={(el) => {
        triggerRefs.current[id] = el
      }}
      onClick={() => toggle(id)}
      aria-expanded={openId === id}
      aria-controls="mega-menu"
      aria-label={`Menü ${label} ${openId === id ? 'schließen' : 'öffnen'}`}
      className="-ml-2 flex h-11 w-7 items-center justify-center rounded-md text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <ChevronDown className={`h-4 w-4 transition-transform ${openId === id ? 'rotate-180' : ''}`} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  const itemCls = (aktiv: boolean) =>
    `relative flex h-11 items-center whitespace-nowrap rounded-md px-2.5 text-[15px] text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      aktiv ? 'after:absolute after:inset-x-2.5 after:-bottom-[10px] after:h-[3px] after:rounded-full after:bg-hdr-red' : ''
    }`

  const onServiceRoute = pathname?.startsWith(`${FM}/service`) ?? false

  return (
    <>
      <div
        ref={wrapRef}
        className="hidden lg:block"
        onMouseLeave={() => {
          if (openTimer.current) clearTimeout(openTimer.current)
          if (!openId) return
          closeTimer.current = setTimeout(close, 220)
        }}
        onMouseEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current)
        }}
      >
        <div className="content-container relative">
          <div ref={rowRef} className="flex h-[64px] items-center justify-between gap-4">
            {bereich === 'shop' ? (
              <nav aria-label="Hauptnavigation">
                <ul className="flex items-center gap-1">
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
                          {item.label}
                        </Link>
                        {chevron(item.id, item.label)}
                      </span>
                    </li>
                  ))}
                  <li>
                    <Link href={angeboteHref(promoActive)} className={itemCls(false)}>
                      Angebote
                      {promoActive && (
                        <span className="ml-2 rounded-md bg-hdr-red px-2 py-0.5 text-[11px] font-[family-name:var(--font-poppins-bold)] text-white">
                          Black Weeks
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
              </nav>
            ) : (
              <nav aria-label="Fachmarkt">
                <ul className="flex items-center gap-1">
                  {/* Übersicht und Bewertungen erst ab xl, sonst passt die Zeile
                      mit dem Button rechts zwischen 1024 und 1280px nicht. */}
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

            {bereich === 'shop' ? (
              <div className="flex items-center" onMouseEnter={() => hoverOpen('fachmarkt')}>
                <Link
                  href={FM}
                  onClick={close}
                  className={`${itemCls(openId === 'fachmarkt')} gap-2`}
                >
                  <Store className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  <span className="xl:hidden">Fachmarkt</span>
                  <span className="hidden xl:inline">Fachmarkt Hückelhoven</span>
                </Link>
                {chevron('fachmarkt', 'Fachmarkt')}
              </div>
            ) : (
              <CtaButton cta={primaryNavCta(pathname ?? FM)} size="md" className="min-h-11! rounded-lg! py-2.5! text-sm!" />
            )}
          </div>

          {openId && (
            <div
              id="mega-menu"
              className="absolute inset-x-4 top-full z-10 mt-2 overflow-y-auto overscroll-contain rounded-xl bg-white text-dark shadow-[0_24px_60px_rgba(0,0,0,0.28)] [scrollbar-width:none] sm:inset-x-6 [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: `calc(100vh - ${Math.round(backdropTop)}px - 24px)` }}
            >
              <MegaMenu id={openId} onNavigate={close} status={status} promoActive={promoActive} />
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
