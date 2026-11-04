'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { FACHMARKT_LINK, MUSTER_LINK, SHOP_NAV, getNavHref } from '@/content/shopNav'

/**
 * Zeile 3 des Shop-Headers (nur ab lg): Kategorienavigation mit Dropdowns,
 * roter Muster-Link und Outline-Button zum Fachmarkt. Höhe fest 64px — knapp
 * über den 44px-Zielflächen der Links, damit die Zeile nicht aufgeblasen wirkt.
 *
 * Dropdowns öffnen per Hover UND per Klick auf den Chevron. Das Label selbst
 * bleibt ein normaler Link auf die Kategorie — so ist die Kategorieseite mit
 * einem Klick erreichbar, ohne dass das Dropdown im Weg steht.
 *
 * Einen Chevron erhalten nur Punkte mit Unterpunkten. „Parkett" hat im Bestand
 * keine Unterkategorien und steht daher — anders als im Mockup — ohne Chevron.
 */
export default function HeaderNav({ promoActive = false }: { promoActive?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // Escape schließt und gibt den Fokus an den Auslöser zurück,
  // Klick außerhalb schließt still.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openId) {
        triggerRefs.current[openId]?.focus()
        setOpenId(null)
      }
    }
    const onMouseDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [openId])

  return (
    <div className="hidden lg:block">
      <div className="content-container">
        <div ref={navRef} className="flex h-[64px] items-center justify-between gap-6">
          {/* Kategorien + Muster-Link */}
          <nav aria-label="Hauptnavigation">
            <ul className="flex items-center gap-1">
              {SHOP_NAV.map((item) => {
                const hasChildren = Boolean(item.children?.length)
                const isOpen = openId === item.id

                return (
                  <li
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => hasChildren && setOpenId(item.id)}
                    onMouseLeave={() => hasChildren && setOpenId(null)}
                  >
                    <span className="flex items-center">
                      <Link
                        href={getNavHref(item, promoActive)}
                        className="flex h-11 items-center rounded-md px-2.5 text-[15px] text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {item.label}
                      </Link>
                      {hasChildren && (
                        <button
                          type="button"
                          ref={(el) => {
                            triggerRefs.current[item.id] = el
                          }}
                          onClick={() => setOpenId(isOpen ? null : item.id)}
                          aria-expanded={isOpen}
                          aria-controls={`nav-dropdown-${item.id}`}
                          aria-label={`Unterkategorien von ${item.label} ${isOpen ? 'schließen' : 'anzeigen'}`}
                          className="-ml-2 flex h-11 w-7 items-center justify-center rounded-md text-white transition-colors hover:text-hdr-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </span>

                    {hasChildren && (
                      <div
                        id={`nav-dropdown-${item.id}`}
                        hidden={!isOpen}
                        className="absolute left-0 top-full z-10 min-w-[250px] rounded-md border border-ash bg-white py-2 shadow-xl"
                      >
                        {item.children?.map((child) =>
                          child.isGroupLabel ? (
                            <div
                              key={child.id}
                              className="border-t border-gray-100 px-4 pt-3 pb-1 text-xs font-bold tracking-wider text-gray-400 uppercase first:border-t-0"
                            >
                              {child.label}
                            </div>
                          ) : (
                            <Link
                              key={child.id}
                              href={child.href}
                              onClick={() => setOpenId(null)}
                              className="block px-4 py-2 text-sm text-dark transition-colors hover:bg-gray-100"
                            >
                              {child.label}
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </li>
                )
              })}

              <li>
                <Link
                  href={MUSTER_LINK.href}
                  className="ml-3 flex h-11 items-center rounded-md px-3 text-[15px] font-[family-name:var(--font-poppins-bold)] whitespace-nowrap text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {MUSTER_LINK.label}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Fachmarkt-Button. Breite richtet sich nach dem Text statt fester
              300px, und bis xl steht die Kurzform im Button — sonst passen
              Kategorien, „Kostenlose Bodenmuster bestellen" und Button
              zwischen 1024px und 1180px nicht mehr in eine Zeile. */}
          <Link
            href={FACHMARKT_LINK.href}
            className="flex h-11 flex-shrink-0 items-center justify-center gap-2.5 rounded-lg border border-hdr-outline px-5 text-sm whitespace-nowrap text-white transition-colors hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MapPin className="h-[18px] w-[18px] flex-shrink-0 text-white" strokeWidth={1.75} aria-hidden="true" />
            <span className="xl:hidden">{FACHMARKT_LINK.linkLabel}</span>
            <span className="hidden xl:inline">{FACHMARKT_LINK.label}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
