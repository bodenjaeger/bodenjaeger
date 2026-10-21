'use client';

import { useEffect, useRef } from 'react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { OPENAI_PIXEL_ID, openaiPixel } from '@/lib/analytics/openai-pixel';

/**
 * OpenAI Measurement Pixel (ChatGPT Ads) - DSGVO-konform
 *
 * - Laedt das Pixel-Script NUR, nachdem der Nutzer in der Kategorie
 *   "marketing" eingewilligt hat (CookieConsentContext.isAllowed('marketing')).
 *   Vor dem init wird oaiq("consent", true) gesetzt, damit eine frueher
 *   gespeicherte Ablehnung die neue Einwilligung nicht blockiert.
 * - Bei Widerruf nach erfolgter Einwilligung: oaiq("consent", false) — stoppt
 *   alle Messungen und loescht die Pixel-Cookies (__oppref, __obref).
 * - Bei erneuter Einwilligung nach Widerruf: oaiq("consent", true).
 * - Das Pixel zaehlt nichts automatisch. Die Events (page_viewed,
 *   items_added, checkout_started, order_created ...) kommen ueber
 *   `track.*` in src/lib/analytics/track.ts. Den Seitenaufruf, auf dem das
 *   Script geladen wird, meldet diese Komponente selbst — der PageViewTracker
 *   hat zu dem Zeitpunkt schon gefeuert.
 * - `debug` nur ausserhalb der Produktion (Preview/lokal): Logs in der Konsole.
 * - Das Script wird nur ein einziges Mal eingefuegt (idempotent ueber Ref).
 */
export default function OpenAIPixel() {
  const { isAllowed } = useCookieConsent();
  const marketingAllowed = isAllowed('marketing');
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Erstmaliges Laden: nur wenn Marketing erlaubt und noch nicht geladen
    if (marketingAllowed && !isLoadedRef.current) {
      if (document.getElementById('openai-pixel-base')) {
        isLoadedRef.current = true;
        return;
      }

      const debug = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production';
      const script = document.createElement('script');
      script.id = 'openai-pixel-base';
      // Einrichtungscode aus dem OpenAI Ads Manager, ergaenzt um consent.
      script.innerHTML = `
!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
oaiq("consent",true);
oaiq("init",{pixelId:"${OPENAI_PIXEL_ID}",debug:${debug ? 'true' : 'false'}});
      `;
      document.head.appendChild(script);
      isLoadedRef.current = true;

      // Aktuellen Seitenaufruf nachmelden (siehe Doc-Kommentar).
      openaiPixel.pageViewed(window.location.pathname, document.title);
      return;
    }

    // Folgeaenderungen nach erstem Laden: grant / revoke
    if (isLoadedRef.current && typeof window.oaiq === 'function') {
      window.oaiq('consent', marketingAllowed);
    }
  }, [marketingAllowed]);

  return null;
}
