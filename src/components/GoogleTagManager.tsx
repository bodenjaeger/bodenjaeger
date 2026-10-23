'use client';

import Script from 'next/script';

const GTM_ID = 'GTM-MW5G8DXD';

// Consent Mode v2:
// 1) Default + Update aus der gespeicherten Entscheidung sitzen als inline-<script>
//    im <head> von app/layout.tsx und laufen beim HTML-Parse — also vor jedem next/script.
// 2) `gtm-init` (afterInteractive) lädt GTM unabhängig vom Cookie-Status —
//    Tags warten intern via Consent Mode auf das Update-Signal.
// 3) Banner-Klicks schicken das Update direkt (CookieConsentContext → persist).
export default function GoogleTagManager() {
  return (
    <>
      <Script id="gtm-init" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
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
