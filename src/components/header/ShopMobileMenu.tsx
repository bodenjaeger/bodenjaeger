'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Heart, MapPin } from 'lucide-react'
import { FACHMARKT_LINK, MUSTER_LINK, SHOP_NAV, getNavHref } from '@/content/shopNav'
import { MOBILE_SCHNELLFILTER } from '@/content/megaMenu'
import { LANDING_NAV, LEISTUNGEN_DROPDOWN } from '@/content/fachmarkt'
import { FensterKopf } from '@/components/shared/SchliessenButton'
import { BereichUmschalter, type HeaderBereich } from './UspBar'

const FM = '/fachmarkt-hueckelhoven'

interface ShopMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  /** Black Weeks aktiv? „Angebote“ führt dann auf die Aktionsseite. */
  promoActive?: boolean
  /** Im Fachmarkt-Bereich stehen dessen Menüpunkte oben. */
  bereich?: HeaderBereich
  /** Oberkante in px = Unterkante der Header-Zeile; der Kopf mit Lupe bleibt sichtbar. */
  top: number
  /** Umschalter Shop/Fachmarkt angetippt: Menü bleibt offen. */
  onBereichWechsel: () => void
}

/** Drei feste Schriftstufen, damit das Menü ruhig und gut lesbar bleibt. */
const STUFE_1 = 'text-[17px] font-[family-name:var(--font-poppins-bold)] text-dark'
const STUFE_2 = 'text-base font-[family-name:var(--font-poppins-regular)] font-normal text-dark'
const KICKER = 'text-xs font-[family-name:var(--font-poppins-bold)] uppercase tracking-[0.1em] text-mid'

/**
 * Mobiles Menü des Shop-Headers: helle Fläche über die volle Breite, öffnet
 * UNTER der Header-Zeile (wie die Mega-Menüs auf Desktop), damit Logo und Lupe
 * sichtbar bleiben. Titel und einheitliches X oben (FensterKopf).
 *
 * Wechsel Shop/Fachmarkt im Umschalter lässt das Menü offen; es schließt nur
 * über das X, Escape oder wenn ein Eintrag gewählt wird.
 *
 * Aufbau: Umschalter Onlineshop/Fachmarkt · (im Fachmarkt-Bereich dessen
 * Menü) · Sortiment als Akkordeon · Muster-Button · Wunschliste · Fachmarkt.
 *
 * Drei Schriftstufen: Hauptpunkte 17px fett, Unterpunkte 16px normal,
 * Zwischenüberschriften 12px Versalien grau. Alle Zeilen mindestens 48px hoch.
 *
 * Tippen auf eine Zeile mit Unterpunkten klappt sie auf; die Kategorieseite
 * selbst steht darin als erster Eintrag (`allLabel` in shopNav.ts).
 *
 * Bleibt dauerhaft im DOM und wird geschlossen über `invisible` ausgeblendet:
 * das erlaubt die Slide-Animation und nimmt die Inhalte gleichzeitig aus
 * Tab-Reihenfolge und Screenreader-Baum.
 */
export default function ShopMobileMenu({
  isOpen,
  onClose,
  promoActive = false,
  bereich = 'shop',
  top,
  onBereichWechsel,
}: ShopMobileMenuProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Aufgeklappte Unterliste beim Schließen zurücksetzen.
  useEffect(() => {
    if (!isOpen) setExpandedId(null)
  }, [isOpen])

  const unterLink = 'flex min-h-12 items-center justify-between gap-3 px-5 ' + STUFE_2

  return (
    <div
      id="shop-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-mobile-menu-titel"
      style={{ top }}
      className={`fixed inset-x-0 bottom-0 z-[4] flex flex-col bg-white shadow-[0_-1px_0_rgba(0,0,0,0.08)] transition-[opacity,transform] duration-300 ease-out lg:hidden ${
        isOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'
      }`}
    >
      <FensterKopf titel="Menü" titelId="shop-mobile-menu-titel" onClose={onClose} schliessenLabel="Menü schließen" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
        <div className="flex flex-col gap-3 px-4 pt-4 pb-2">
          <BereichUmschalter bereich={bereich} hell kurz onWechsel={onBereichWechsel} />
        </div>

        {bereich === 'fachmarkt' && (
          <nav aria-label="Fachmarkt" className="pt-2">
            <p className={`px-5 pt-3 pb-1 ${KICKER}`}>Fachmarkt Hückelhoven</p>
            <ul className="divide-y divide-ash border-b border-ash">
              {LANDING_NAV.items.map((item) =>
                item.kind === 'leistungen' ? (
                  LEISTUNGEN_DROPDOWN.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} onClick={onClose} className={unterLink}>
                        {l.label}
                        <ChevronRight className="h-5 w-5 flex-shrink-0 text-mid" strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </li>
                  ))
                ) : (
                  <li key={item.href}>
                    <Link href={`${FM}${item.href}`} onClick={onClose} className={unterLink}>
                      {item.label}
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-mid" strokeWidth={2} aria-hidden="true" />
                    </Link>
                  </li>
                )
              )}
            </ul>
          </nav>
        )}

        <nav aria-label="Sortiment" className="pt-2">
          <p className={`px-5 pt-3 pb-1 ${KICKER}`}>Sortiment</p>
          <ul className="border-b border-ash">
            {SHOP_NAV.map((item) => {
              const hasChildren = Boolean(item.children?.length)
              const isExpanded = expandedId === item.id
              const istAngebot = item.id === 'angebote'

              return (
                <li key={item.id} className="border-t border-ash">
                  {hasChildren ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`mobile-sub-${item.id}`}
                        className={`flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left ${STUFE_1}`}
                      >
                        {item.label}
                        <ChevronDown
                          className={`h-5 w-5 flex-shrink-0 text-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          strokeWidth={2.25}
                          aria-hidden="true"
                        />
                      </button>

                      <ul id={`mobile-sub-${item.id}`} hidden={!isExpanded} className="bg-pale pb-3">
                        <li>
                          <Link
                            href={getNavHref(item, promoActive)}
                            onClick={onClose}
                            className={`flex min-h-12 items-center justify-between gap-3 px-5 text-base font-[family-name:var(--font-poppins-bold)] text-brand`}
                          >
                            {item.allLabel ?? 'Alles anzeigen'}
                            <ChevronRight className="h-5 w-5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                          </Link>
                        </li>
                        {item.children?.map((child) =>
                          child.isGroupLabel ? (
                            <li key={child.id} className={`px-5 pt-4 pb-1 ${KICKER}`}>
                              {child.label}
                            </li>
                          ) : (
                            <li key={child.id}>
                              <Link href={child.href} onClick={onClose} className={unterLink}>
                                {child.label}
                                <ChevronRight className="h-5 w-5 flex-shrink-0 text-mid" strokeWidth={2} aria-hidden="true" />
                              </Link>
                            </li>
                          )
                        )}
                        {MOBILE_SCHNELLFILTER[item.id] && (
                          <li className="px-5 pt-4">
                            <p className={`pb-2 ${KICKER}`}>Schnell filtern</p>
                            <div className="flex flex-wrap gap-2">
                              {MOBILE_SCHNELLFILTER[item.id].map((chip) => (
                                <Link
                                  key={chip.href}
                                  href={chip.href}
                                  onClick={onClose}
                                  className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border border-ash bg-white px-4 text-sm text-dark"
                                >
                                  {chip.swatch && (
                                    <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full border border-black/15" style={{ background: chip.swatch }} />
                                  )}
                                  {chip.label}
                                </Link>
                              ))}
                            </div>
                          </li>
                        )}
                      </ul>
                    </>
                  ) : (
                    <Link
                      href={getNavHref(item, promoActive)}
                      onClick={onClose}
                      className={`flex min-h-14 items-center justify-between gap-3 px-5 ${STUFE_1} ${istAngebot ? 'text-brand' : ''}`}
                    >
                      {item.label}
                      <ChevronRight className="h-5 w-5 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 px-4 pt-6">
          {/* Gleiche Optik wie der Muster-Button der Produktseite (grün, Musterbox-Symbol) */}
          <Link
            href={MUSTER_LINK.href}
            onClick={onClose}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cta px-4 text-base font-[family-name:var(--font-poppins-bold)] text-white transition-colors hover:bg-cta-dark"
          >
            <Image src="/images/Icons/musterbox-weiss.png" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
            {MUSTER_LINK.label}
          </Link>
          <Link
            href="/favoriten"
            onClick={onClose}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-ash px-4 text-base font-[family-name:var(--font-poppins-bold)] text-dark"
          >
            <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            Wunschliste
          </Link>

          {/* Fachmarkt-Block: der ganze Block ist EIN Link */}
          <Link href={FACHMARKT_LINK.href} onClick={onClose} className="mt-2 flex gap-3 rounded-xl bg-pale p-4">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" strokeWidth={2} aria-hidden="true" />
            <div>
              <p className={STUFE_1}>{FACHMARKT_LINK.title}</p>
              <p className="mt-1 text-sm text-mid">{FACHMARKT_LINK.subline}</p>
              <span className="mt-3 inline-flex items-center text-sm font-[family-name:var(--font-poppins-bold)] text-brand">
                {FACHMARKT_LINK.linkLabel} <span aria-hidden="true">&nbsp;→</span>
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
