'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import CartDrawer from './cart/CartDrawer';
import HeaderActions from './header/HeaderActions';
import HeaderLogo from './header/HeaderLogo';
import HeaderNav from './header/HeaderNav';
import ShopMobileMenu from './header/ShopMobileMenu';
import UspBar, { type HeaderBereich } from './header/UspBar';
import KopfSuche from './header/KopfSuche';
import SaleBanner from './SaleBanner';
import BlackWeeksBanner, { type BlackWeeksBannerProps } from './black-weeks/BlackWeeksBanner';

/**
 * Shop-Header.
 *
 * Desktop (ab lg) zwei Zeilen: USP-Leiste mit Umschalter Shop/Fachmarkt 48px,
 * Hauptzeile 80px mit Logo, allen Reitern, Suche und Aktionen (HeaderNav).
 * Mobile zwei Zeilen: USP-Ticker 40px, Header-Zeile 56px. Die Suche ist auf
 * beiden ein Symbol und klappt erst beim Klick auf. Alle Höhen sind fest, damit
 * beim Laden nichts springt.
 * Darüber optional die Aktionsleiste (SaleBanner, gesteuert über
 * `src/content/sale-banner.ts`), die beim Scrollen stehen bleibt.
 *
 * Sticky-Verhalten: Die USP-Leiste scrollt weg, Hauptzeile und Navigation
 * bleiben oben stehen. Umgesetzt über einen negativen Sticky-Offset in Höhe der
 * USP-Leiste (mobil -40px, ab lg -48px) — `position: sticky` auf einer inneren
 * Zeile würde am Rand des Headers enden und mit ihm wegscrollen. Der Offset
 * muss exakt der USP-Höhe in UspBar.tsx entsprechen.
 *
 * Die Suche schiebt sich auf Desktop und Mobil gleich in der Kopfzeile auf
 * (KopfSuche). Mobile-Menü und Warenkorb (mobil) öffnen unter der Kopfzeile
 * mit Titel und dem einheitlichen X (FensterKopf); Logo und Lupe bleiben sichtbar.
 * Die Aktionsleiste darüber ist eine eigene klebende Zeile (z-[51]); der
 * Warenkorb beginnt auf Desktop deshalb unter ihr (`desktopTop`).
 *
 * Z-Index: Der Header liegt auf z-50, innerhalb davon Backdrop z-[1],
 * Panel z-[2], Header-Zeilen z-[3]. Vollständige Staffelung ist in
 * globals.css dokumentiert.
 */
export default function Header({
  promoBanner = null,
  bereich = 'shop',
}: {
  /** Black-Weeks-Leiste — vom Server entschieden (layout.tsx), `null` = aus. */
  promoBanner?: BlackWeeksBannerProps | null;
  /** `fachmarkt` = gleicher Kopf, Zeile 3 zeigt das Fachmarkt-Menü. */
  bereich?: HeaderBereich;
}) {
  const { isCartDrawerOpen, closeCartDrawer } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  // Höhe der Aktionsleiste: Der Kopfbereich klebt so weit oben, dass die USP-Zeile darunter verschwindet
  const leisteRef = useRef<HTMLDivElement>(null);
  const [leisteHoehe, setLeisteHoehe] = useState(36);
  useEffect(() => {
    const leiste = leisteRef.current;
    if (!leiste) return;
    const update = () => setLeisteHoehe(leiste.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(leiste);
    return () => observer.disconnect();
  }, []);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileRowRef = useRef<HTMLDivElement>(null);
  const [menuTop, setMenuTop] = useState(96);
  // Wechsel Shop/Fachmarkt im offenen Menü: der folgende Seitenwechsel soll das
  // Menü nicht schließen.
  const keepMenuOpenRef = useRef(false);

  const measureMenuTop = useCallback(() => {
    if (mobileRowRef.current) setMenuTop(Math.max(0, Math.round(mobileRowRef.current.getBoundingClientRect().bottom)));
  }, []);

  const openMenu = useCallback(() => {
    measureMenuTop();
    setIsSearchOpen(false);
    closeCartDrawer();
    setIsMenuOpen(true);
  }, [measureMenuTop, closeCartDrawer]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    burgerRef.current?.focus();
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    searchButtonRef.current?.focus();
  }, []);

  // Nur das Menü sperrt das Scrollen; die Suche bleibt Teil der Kopfzeile.
  const overlayOpen = isMenuOpen;

  // Seitenwechsel (z. B. Suchtreffer angetippt) schließt Menü und Suche.
  const pathname = usePathname();
  useEffect(() => {
    setIsSearchOpen(false);
    if (keepMenuOpenRef.current) {
      keepMenuOpenRef.current = false;
      requestAnimationFrame(measureMenuTop);
      return;
    }
    setIsMenuOpen(false);
  }, [pathname, measureMenuTop]);

  // Warenkorb öffnet mobil wie das Menü unter der Kopfzeile: Position messen,
  // offenes Menü bzw. Suche schließen.
  useEffect(() => {
    if (!isCartDrawerOpen) return;
    measureMenuTop();
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [isCartDrawerOpen, measureMenuTop]);

  useEffect(() => {
    if (!isMenuOpen) return;
    window.addEventListener('resize', measureMenuTop);
    return () => window.removeEventListener('resize', measureMenuTop);
  }, [isMenuOpen, measureMenuTop]);

  // Scroll-Lock + Body-Klasse, über die Floating-Buttons und das
  // Trusted-Shops-Badge ausgeblendet werden (globals.css).
  useEffect(() => {
    if (!overlayOpen) return;

    // Sperre am <html>, nicht am <body>: html hat overflow-x: clip, deshalb
    // würde overflow: hidden am body diesen zum eigenen Scrollbereich machen.
    // Der klebende Kopf hinge dann am body und wäre beim Scrollen verschwunden.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    document.body.classList.add('nav-menu-open');

    return () => {
      root.style.overflow = previousOverflow;
      document.body.classList.remove('nav-menu-open');
    };
  }, [overlayOpen]);

  // ESC schließt Menü bzw. Suche und setzt den Fokus zurück auf den Auslöser.
  useEffect(() => {
    if (!overlayOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [overlayOpen, closeMenu]);

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
      if (e.matches) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <>
    {/* Zeile 0 — Aktionsleiste. Eigene, oben klebende Zeile vor dem Kopfbereich:
        Verschachteltes sticky (Leiste im mitlaufenden Header) setzt Safari auf
        dem iPhone beim schnellen Scrollen nicht zuverlässig um, dann blitzte die
        USP-Zeile statt der Aktionsleiste auf. Bleibt auch bei offenem Menü
        stehen: Menü und Warenkorb öffnen unter der Kopfzeile. */}
    <div ref={leisteRef} className="sticky top-0 z-[51]">
      {promoBanner ? <BlackWeeksBanner {...promoBanner} /> : <SaleBanner />}
    </div>
    <header
      ref={headerRef}
      style={{ '--aktionsleiste-h': `${leisteHoehe}px` } as CSSProperties}
      className="sticky top-[calc(var(--aktionsleiste-h)-40px)] z-50 w-full bg-hdr-bg lg:top-[calc(var(--aktionsleiste-h)-48px)]"
    >
      <div className="relative z-[3] bg-hdr-bg">
        {/* Zeile 1 — USP-Leiste (Desktop statisch, mobil Ticker) */}
        <UspBar bereich={bereich} />

        {/* Zeile 2 — Hauptzeile Desktop: Logo, Reiter, Suche, Aktionen */}
        <HeaderNav
          promoActive={Boolean(promoBanner)}
          bereich={bereich}
          actions={<HeaderActions variant="desktop" />}
        />

        {/* Zeile 2 — Header-Zeile Mobile: Burger links, Logo, Aktionen rechts */}
        <div className="lg:hidden">
          <div ref={mobileRowRef} className="flex h-14 items-center gap-2 px-4">
            <button
              type="button"
              ref={burgerRef}
              onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
              aria-expanded={isMenuOpen}
              aria-controls="shop-mobile-menu"
              aria-label={isMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Menu className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </button>

            {/* Logo und Symbole; darüber schiebt sich die Suche auf */}
            <div className="relative flex h-full min-w-0 flex-1 items-center gap-2">
            <HeaderLogo href={bereich === 'fachmarkt' ? '/fachmarkt-hueckelhoven' : '/'} />

            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                ref={searchButtonRef}
                onClick={() => {
                  setIsMenuOpen(false);
                  closeCartDrawer();
                  setIsSearchOpen(true);
                }}
                aria-label="Suche öffnen"
                aria-expanded={isSearchOpen}
                aria-controls="mobile-suche"
                className="flex h-11 w-11 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Search className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
              <HeaderActions variant="mobile" />
            </div>

            <div id="mobile-suche" className="contents">
              <KopfSuche offen={isSearchOpen} onClose={closeSearch} size="md" />
            </div>
            </div>
          </div>
        </div>
      </div>


      <ShopMobileMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        promoActive={Boolean(promoBanner)}
        bereich={bereich}
        top={menuTop}
        onBereichWechsel={() => {
          keepMenuOpenRef.current = true;
        }}
      />

      <CartDrawer isOpen={isCartDrawerOpen} onClose={closeCartDrawer} mobileTop={menuTop} desktopTop={leisteHoehe} />
    </header>
    </>
  );
}
