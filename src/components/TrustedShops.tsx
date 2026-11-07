'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { isFachmarktRoute } from '@/lib/landingRoutes';

const TRUSTBADGE_ID = 'XC194F1E7AC0A4EF1D2945E1A065D9618';
const SCRIPT_ID = 'trustedshops-trustbadge';
const CONTENT_MAX_WIDTH = 1400;
const PADDING = 10;
const EXTRA_LEFT_OFFSET = 60;
const MOBILE_BREAKPOINT = 768;

const DATA_ATTRS: Record<string, string> = {
  'data-desktop-y-offset': '100',
  'data-mobile-y-offset': '80',
  'data-desktop-disable-reviews': 'false',
  'data-desktop-enable-custom': 'false',
  'data-desktop-position': 'left',
  'data-desktop-custom-width': '156',
  'data-desktop-enable-fadeout': 'false',
  'data-disable-mobile': 'true', // auf dem Handy aus: überdeckt Inhalte, Note steht dort im Footer und auf der Startseite
  'data-disable-trustbadge': 'false',
  'data-mobile-custom-width': '156',
  'data-mobile-disable-reviews': 'false',
  'data-mobile-enable-custom': 'false',
  'data-mobile-position': 'left',
  'data-mobile-enable-topbar': 'false',
  'data-mobile-enable-fadeout': 'true',
  'data-color-scheme': 'light',
};

function computeLeftOffset(viewport: number): number | null {
  if (viewport < MOBILE_BREAKPOINT) return null;
  if (viewport >= CONTENT_MAX_WIDTH + 2 * PADDING) {
    return (viewport - CONTENT_MAX_WIDTH) / 2 - PADDING + EXTRA_LEFT_OFFSET;
  }
  return PADDING + EXTRA_LEFT_OFFSET;
}

/**
 * Trusted-Shops-Trustbadge
 *
 * Wird bewusst OHNE Cookie-Consent geladen — das Badge soll auf jeder Seite
 * sofort sichtbar sein, auch vor einer Entscheidung im Cookie-Banner.
 * (Vorher hinter isAllowed('functional') gated.)
 */
export default function TrustedShops() {
  const pathname = usePathname();
  const onFachmarkt = isFachmarktRoute(pathname);

  useEffect(() => {
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.charset = 'UTF-8';
      script.src = `https://widgets.trustedshops.com/js/${TRUSTBADGE_ID}.js`;
      for (const [key, value] of Object.entries(DATA_ATTRS)) {
        script.setAttribute(key, value);
      }
      document.body.appendChild(script);
    }

    let container: HTMLElement | null = null;
    let observer: MutationObserver | null = null;

    const applyPosition = () => {
      if (!container) return;
      const viewport = window.innerWidth;
      // Auf dem Handy ausblenden (zusätzlich zu data-disable-mobile, falls das Widget eine andere Grenze nutzt)
      if (viewport < MOBILE_BREAKPOINT) {
        container.style.setProperty('display', 'none', 'important');
      } else {
        container.style.removeProperty('display');
      }
      const offset = computeLeftOffset(viewport);
      container.style.removeProperty('right');
      if (offset === null) {
        container.style.removeProperty('left');
      } else {
        container.style.setProperty('left', `${offset}px`, 'important');
      }
      // Fachmarkt-Mobile: Badge über die fixierte StickyBottomBar (~56px) heben,
      // damit es Vorteilsliste/Aktionsleiste nicht überlagert. Shop unverändert.
      if (onFachmarkt && viewport < MOBILE_BREAKPOINT) {
        container.style.setProperty('bottom', '84px', 'important');
      } else {
        container.style.removeProperty('bottom');
      }
    };

    const tryAttach = (): boolean => {
      const found = document.querySelector<HTMLElement>('[id^="trustbadge-container-"]');
      if (!found) return false;
      container = found;
      applyPosition();
      return true;
    };

    if (!tryAttach()) {
      observer = new MutationObserver(() => {
        if (tryAttach()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('resize', applyPosition);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', applyPosition);
    };
  }, [onFachmarkt]);

  return null;
}
