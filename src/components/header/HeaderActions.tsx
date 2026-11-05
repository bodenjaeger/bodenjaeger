'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Heart, ShoppingCart, User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { useWishlist } from '@/contexts/WishlistContext'

interface HeaderActionsProps {
  /**
   * `desktop` = Icon mit Label darunter (Hauptzeile ab lg),
   * `mobile`  = nur Icons (mobile Header-Zeile).
   */
  variant: 'desktop' | 'mobile'
}

/** Roter Zähler-Badge oben rechts am Icon. */
function Badge({ value, label }: { value: number; label: string }) {
  return (
    <span className="pointer-events-none absolute -top-1 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-hdr-red px-[3px] text-[10px] leading-none font-[family-name:var(--font-poppins-bold)] text-white">
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{`${value} ${label}`}</span>
    </span>
  )
}

/**
 * Konto / Wunschliste / Warenkorb rechts in der Header-Hauptzeile.
 *
 * Alle Ziele sind mindestens 44×44px groß. Der Warenkorb-Badge wird immer
 * gerendert (Default „0"), damit beim Nachladen des localStorage-Warenkorbs
 * keine Layout-Verschiebung entsteht.
 */
export default function HeaderActions({ variant }: HeaderActionsProps) {
  const { wishlistCount } = useWishlist()
  const { itemCount, openCartDrawer } = useCart()
  const { user, isLoggedIn, logout } = useAuth()
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isDesktop = variant === 'desktop'

  // Vor dem Mount 0 anzeigen: Warenkorb und Wunschliste kommen aus dem
  // localStorage und wären sonst nicht hydrations-sicher.
  const cartCount = mounted ? itemCount : 0
  const favCount = mounted ? wishlistCount : 0

  // Gemeinsames Layout für alle drei Aktionen.
  const itemClass = isDesktop
    ? 'group relative flex h-[52px] min-w-[72px] flex-col items-center justify-center gap-1 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
    : 'group relative flex h-11 w-11 items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

  const iconClass = isDesktop ? 'h-6 w-6 text-white' : 'h-[22px] w-[22px] text-white'
  const labelClass = 'text-[11px] leading-none text-white'

  return (
    <div className={`flex flex-shrink-0 items-center ${isDesktop ? 'gap-2' : 'gap-0.5'}`}>
      {/* Konto */}
      <div className="relative" ref={accountMenuRef}>
        {isLoggedIn ? (
          <>
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              className={itemClass}
              aria-label="Kundenkonto"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
            >
              <span className="relative">
                <User className={iconClass} strokeWidth={1.75} aria-hidden="true" />
              </span>
              {isDesktop && <span className={labelClass}>Konto</span>}
            </button>
            {isAccountMenuOpen && (
              <div
                className="absolute right-0 z-10 mt-2 w-52 rounded-lg border border-ash bg-white shadow-lg"
                role="menu"
              >
                <div className="border-b border-ash px-4 py-3">
                  <p className="truncate text-sm font-semibold text-dark">
                    {user?.firstName || user?.displayName}
                  </p>
                  <p className="truncate text-xs text-mid">{user?.email}</p>
                </div>
                <Link
                  href="/konto"
                  role="menuitem"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-dark transition-colors hover:bg-gray-50"
                >
                  Mein Konto
                </Link>
                <Link
                  href="/konto/bestellungen"
                  role="menuitem"
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-dark transition-colors hover:bg-gray-50"
                >
                  Bestellungen
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setIsAccountMenuOpen(false)
                    await logout()
                  }}
                  className="w-full border-t border-ash px-4 py-2.5 text-left text-sm text-mid transition-colors hover:bg-gray-50"
                >
                  Abmelden
                </button>
              </div>
            )}
          </>
        ) : (
          <Link href="/login" className={itemClass} aria-label="Anmelden">
            <User className={iconClass} strokeWidth={1.75} aria-hidden="true" />
            {isDesktop && <span className={labelClass}>Konto</span>}
          </Link>
        )}
      </div>

      {/* Wunschliste */}
      <Link href="/favoriten" className={`${itemClass} max-[339px]:hidden`} aria-label="Wunschliste">
        <span className="relative">
          <Heart className={iconClass} strokeWidth={1.75} aria-hidden="true" />
          {favCount > 0 && <Badge value={favCount} label="Artikel auf der Wunschliste" />}
        </span>
        {isDesktop && <span className={labelClass}>Wunschliste</span>}
      </Link>

      {/* Warenkorb */}
      <button type="button" onClick={openCartDrawer} className={itemClass} aria-label="Warenkorb öffnen">
        <span className="relative">
          <ShoppingCart className={iconClass} strokeWidth={1.75} aria-hidden="true" />
          <Badge value={cartCount} label="Artikel im Warenkorb" />
        </span>
        {isDesktop && <span className={labelClass}>Warenkorb</span>}
      </button>
    </div>
  )
}
