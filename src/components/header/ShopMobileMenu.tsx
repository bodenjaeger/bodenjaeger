'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight, MapPin } from 'lucide-react'
import { FACHMARKT_LINK, MUSTER_LINK, SHOP_NAV, getNavHref } from '@/content/shopNav'

interface ShopMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  /** Black Weeks aktiv? „Angebote“ führt dann auf die Aktionsseite. */
  promoActive?: boolean
}

/**
 * Mobiles Menü des Shop-Headers.
 *
 * Layout: Drawer von links über 85% der Breite, rechts daneben und darunter ein
 * abdunkelnder Backdrop. Das Panel beginnt unterhalb der Header-Zeile
 * (`top-14` = 56px, muss zur Höhe der Header-Zeile in Header.tsx passen), damit
 * Burger, Logo und Icons unverändert sichtbar und bedienbar bleiben.
 *
 * Kein Suchfeld — die Suche steht im geschlossenen Zustand in der eigenen
 * Header-Zeile. Unterkategorien öffnen als Akkordeon, damit die Header-Zeile
 * ohne Zurück-Pfeil auskommt.
 *
 * Tippen auf eine Zeile: Hat die Kategorie Unterpunkte, klappt die gesamte Zeile
 * (Text und Pfeil) das Akkordeon auf; die Kategorieseite selbst liegt darin als
 * erster Eintrag. Dessen Text kommt aus `allLabel` in shopNav.ts und ist pro
 * Kategorie ausformuliert („Alle Vinylböden anzeigen") — ohne Angabe steht dort
 * „Alles anzeigen". Ohne Unterpunkte navigiert die Zeile direkt.
 *
 * Bleibt dauerhaft im DOM und wird geschlossen über `invisible` ausgeblendet:
 * das erlaubt die Slide-Animation und nimmt die Inhalte gleichzeitig aus
 * Tab-Reihenfolge und Screenreader-Baum.
 */
export default function ShopMobileMenu({ isOpen, onClose, promoActive = false }: ShopMobileMenuProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Aufgeklappte Unterliste beim Schließen zurücksetzen.
  useEffect(() => {
    if (!isOpen) setExpandedId(null)
  }, [isOpen])

  return (
    <div className="lg:hidden">
      {/* Backdrop – deckt die Fläche rechts vom Drawer und darunter ab */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-x-0 top-14 bottom-0 z-[1] bg-black/70 transition-opacity duration-300 ${
          isOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />

      {/* Panel */}
      <div
        id="shop-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Hauptnavigation"
        className={`fixed top-14 bottom-0 left-0 z-[2] w-[85%] max-w-[420px] overflow-y-auto overscroll-contain bg-hdr-bg transition-transform duration-300 ease-in-out ${
          isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <nav aria-label="Kategorien">
          <ul>
            {SHOP_NAV.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              const isExpanded = expandedId === item.id

              return (
                <li key={item.id} className="border-b border-hdr-line">
                  {hasChildren ? (
                    <>
                      {/* Ganze Zeile klappt auf — Text und Pfeil dürfen nicht
                          unterschiedliche Ziele haben. Die Kategorieseite selbst
                          steht als erster Eintrag im Untermenü. */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`mobile-sub-${item.id}`}
                        className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left text-[15px] text-white"
                      >
                        {item.label}
                        {/* Geschlossen zeigt der Pfeil nach rechts, aufgeklappt
                            dreht er um 90° nach unten. */}
                        <ChevronRight
                          className={`h-5 w-5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </button>

                      <ul id={`mobile-sub-${item.id}`} hidden={!isExpanded} className="bg-hdr-panel">
                        <li>
                          <Link
                            href={getNavHref(item, promoActive)}
                            onClick={onClose}
                            className="flex min-h-11 items-center px-4 text-sm text-white/90"
                          >
                            {item.allLabel ?? 'Alles anzeigen'}
                          </Link>
                        </li>
                        {item.children?.map((child) =>
                          child.isGroupLabel ? (
                            <li
                              key={child.id}
                              className="px-4 pt-3 pb-1 text-[11px] font-bold tracking-wider text-hdr-muted uppercase"
                            >
                              {child.label}
                            </li>
                          ) : (
                            <li key={child.id}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className="flex min-h-11 items-center px-4 text-sm text-white/90"
                              >
                                {child.label}
                              </Link>
                            </li>
                          )
                        )}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={getNavHref(item, promoActive)}
                      onClick={onClose}
                      className="flex min-h-14 items-center justify-between px-4 text-[15px] text-white"
                    >
                      {item.label}
                      <ChevronRight className="h-5 w-5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Muster-Link, abgesetzt */}
        <Link
          href={MUSTER_LINK.href}
          onClick={onClose}
          className="mt-6 flex min-h-11 items-center px-4 text-[15px] font-[family-name:var(--font-poppins-bold)] text-white"
        >
          {MUSTER_LINK.label}
        </Link>

        {/* Fachmarkt-Block, abgesetzt. Der gesamte Block ist EIN Link —
            Überschrift, Zeile darunter und „Zum Fachmarkt" führen alle zum
            selben Ziel, also gibt es keinen Grund, nur den Schlusssatz
            anklickbar zu machen. Das „→" bleibt deshalb ein <span>: ein Link im
            Link ist ungültiges HTML. */}
        <div className="mt-6 mb-8 border-t border-hdr-line pt-6">
          <Link
            href={FACHMARKT_LINK.href}
            onClick={onClose}
            className="flex gap-3 px-4 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-white" strokeWidth={2} aria-hidden="true" />
            <div>
              <p className="font-[family-name:var(--font-poppins-bold)] text-[15px] text-white">
                {FACHMARKT_LINK.title}
              </p>
              <p className="mt-1 text-xs text-hdr-muted">{FACHMARKT_LINK.subline}</p>
              <span className="mt-3 inline-flex items-center text-sm font-[family-name:var(--font-poppins-bold)] text-hdr-link">
                {FACHMARKT_LINK.linkLabel} <span aria-hidden="true">&nbsp;→</span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
