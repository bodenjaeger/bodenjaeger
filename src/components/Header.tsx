'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import CartDrawer from './cart/CartDrawer';
import LiveSearch from './LiveSearch';
import HeaderActions from './header/HeaderActions';
import HeaderLogo from './header/HeaderLogo';
import HeaderNav from './header/HeaderNav';
import ShopMobileMenu from './header/ShopMobileMenu';
import UspBar from './header/UspBar';
import SaleBanner from './SaleBanner';

/**
 * Shop-Header.
 *
 * Desktop (ab lg) drei Zeilen: USP-Leiste 48px, Hauptzeile 96px, Navigation
 * 64px — zusammen 208px. Mobile drei Zeilen: USP-Ticker 40px, Header-Zeile
 * 56px, Suchzeile 60px. Alle Höhen sind fest, damit beim Laden nichts springt.
 * Darüber optional die Aktionsleiste (SaleBanner, gesteuert über
 * `src/content/sale-banner.ts`), die beim Scrollen stehen bleibt.
 *
 * Sticky-Verhalten: Die USP-Leiste scrollt weg, Hauptzeile und Navigation
 * bleiben oben stehen. Umgesetzt über einen negativen Sticky-Offset in Höhe der
 * USP-Leiste (mobil -40px, ab lg -48px) — `position: sticky` auf einer inneren
 * Zeile würde am Rand des Headers enden und mit ihm wegscrollen. Der Offset
 * muss exakt der USP-Höhe in UspBar.tsx entsprechen.
 *
 * Bei offenem Mobile-Menü wechselt der Header auf `fixed top-0`, USP-Leiste und
 * Suchzeile werden ausgeblendet. Die Header-Zeile selbst bleibt unverändert
 * bedienbar; das Menü-Panel beginnt darunter (siehe ShopMobileMenu).
 *
 * Z-Index: Der Header liegt auf z-50, innerhalb davon Backdrop z-[1],
 * Panel z-[2], Header-Zeilen z-[3]. Vollständige Staffelung ist in
 * globals.css dokumentiert.
 */
export default function Header() {
  const { isCartDrawerOpen, closeCartDrawer } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    burgerRef.current?.focus();
  }, []);

  // Scroll-Lock + Body-Klasse, über die Floating-Buttons und das
  // Trusted-Shops-Badge ausgeblendet werden (globals.css).
  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('nav-menu-open');

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('nav-menu-open');
    };
  }, [isMenuOpen]);

  // ESC schließt das Menü und setzt den Fokus zurück auf den Burger.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen, closeMenu]);

  // Fokus-Falle über den gesamten Header: Die Header-Zeile bleibt bei offenem
  // Menü bedienbar und gehört deshalb mit in den Zyklus. Ausgeblendete Zeilen
  // (display: none) fallen über die offsetParent-Prüfung heraus.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !headerRef.current) return;

      const focusable = Array.from(
        headerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !headerRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !headerRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  // Beim Wechsel auf Desktop schließen — dort gibt es keinen Burger mehr.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsMenuOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`w-full bg-hdr-bg ${
        isMenuOpen
          ? 'fixed inset-x-0 top-0 z-50 lg:sticky lg:top-[-48px]'
          : 'sticky top-[-40px] z-50 lg:top-[-48px]'
      }`}
    >
      <div className="relative z-[3] bg-hdr-bg">
        {/* Zeile 0 — Aktionsleiste (SaleBanner). Eigenes `sticky top-0`: Beim
            Scrollen rutscht der Header um die USP-Höhe nach oben, die Leiste
            bleibt am Viewport-Rand stehen und deckt die ausgeblendete
            USP-Zeile ab (z-[1], USP ist nicht positioniert). Funktioniert
            unabhängig von der Leistenhöhe. Bei offenem Mobile-Menü aus. */}
        <div className={`sticky top-0 z-[1] ${isMenuOpen ? 'hidden lg:block' : ''}`}>
          <SaleBanner />
        </div>

        {/* Zeile 1 — USP-Leiste (Desktop statisch, mobil Ticker) */}
        <div className={isMenuOpen ? 'hidden lg:block' : undefined}>
          <UspBar />
        </div>

        {/* Zeile 2 — Hauptzeile Desktop: Logo, Suche, Aktionen */}
        <div className="hidden border-b border-hdr-line lg:block">
          <div className="content-container">
            <div className="flex h-[96px] items-center">
              <HeaderLogo />
              <div className="flex flex-1 justify-center px-8">
                <LiveSearch size="lg" className="w-[586px]" />
              </div>
              <HeaderActions variant="desktop" />
            </div>
          </div>
        </div>

        {/* Zeile 2 — Header-Zeile Mobile: Burger links, Logo, Aktionen rechts */}
        <div className="lg:hidden">
          {/* 56px: `top-14` in ShopMobileMenu muss dieser Höhe entsprechen,
              sonst klafft eine Lücke über dem Menü-Panel. */}
          <div className="flex h-14 items-center gap-2 px-4">
            <button
              type="button"
              ref={burgerRef}
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-expanded={isMenuOpen}
              aria-controls="shop-mobile-menu"
              aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </button>

            <HeaderLogo />

            <div className="ml-auto">
              <HeaderActions variant="mobile" />
            </div>
          </div>
        </div>

        {/* Zeile 3 — Navigation (nur Desktop) */}
        <HeaderNav />

        {/* Zeile 3 — Suchzeile Mobile, dauerhaft sichtbar außer bei offenem Menü */}
        <div className={`px-4 pb-3 lg:hidden ${isMenuOpen ? 'hidden' : ''}`}>
          <LiveSearch size="md" className="w-full" />
        </div>
      </div>

      <ShopMobileMenu isOpen={isMenuOpen} onClose={closeMenu} />

      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} />
    </header>
  );
}
