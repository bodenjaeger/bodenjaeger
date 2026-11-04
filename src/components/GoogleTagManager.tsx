'use client';

import Script from 'next/script';
import { useEffect } from 'react';

const GTM_ID = 'GTM-MW5G8DXD';

// Schalter: GTM erst bei der ersten Interaktion bzw. spätestens nach GTM_DELAY_MS laden
// (senkt die Main-Thread-Blockierung beim Seitenaufbau, ca. 800 ms TBT).
// false = bisheriges Verhalten (afterInteractive). Erst nach Abstimmung mit Ads aktivieren.
const GTM_DELAYED_LOAD = false;
const GTM_DELAY_MS = 3000;
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

const GTM_SNIPPET = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

// Consent Mode v2:
// 1) Default + Update aus der gespeicherten Entscheidung sitzen als inline-<script>
//    im <head> von app/layout.tsx und laufen beim HTML-Parse — also vor jedem next/script.
// 2) `gtm-init` (afterInteractive) lädt GTM unabhängig vom Cookie-Status —
//    Tags warten intern via Consent Mode auf das Update-Signal.
// 3) Banner-Klicks schicken das Update direkt (CookieConsentContext → persist).
export default function GoogleTagManager() {
  useEffect(() => {
    if (!GTM_DELAYED_LOAD) return;

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      cleanup();
      const script = document.createElement('script');
      script.id = 'gtm-init';
      script.text = GTM_SNIPPET;
      document.head.appendChild(script);
    };
    const timer = window.setTimeout(load, GTM_DELAY_MS);
    const cleanup = () => {
      window.clearTimeout(timer);
      INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, load));
    };
    INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, load, { once: true, passive: true }));

    return cleanup;
  }, []);

  return (
    <>
      {!GTM_DELAYED_LOAD && (
        <Script id="gtm-init" strategy="afterInteractive">
          {GTM_SNIPPET}
        </Script>
      )}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
