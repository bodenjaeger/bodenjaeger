import type { Metadata } from "next";
import localFont from "next/font/local";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import HeaderWrapper from "@/components/HeaderWrapper";
import Footer from "@/components/Footer";
import FloatingContactButton from "@/components/FloatingContactButton";
import CookieConsent from "@/components/CookieConsent";
import GoogleTagManager from "@/components/GoogleTagManager";
import PageViewTracker from "@/components/PageViewTracker";
import AttributionTracker from "@/components/AttributionTracker";
import TrustedShops from "@/components/TrustedShops";
import TikTokPixel from "@/components/TikTokPixel";
import Roomvo from "@/components/Roomvo";
import { JsonLd } from "@/components/JsonLd";
import { buildOrganizationSchema, buildWebSiteSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";
import { CONSENT_HEAD_SCRIPT } from "@/lib/analytics/track";
import "./globals.css";

const poppinsRegular = localFont({
  src: "./fonts/Poppins-Regular.woff",
  variable: "--font-poppins-regular",
  weight: "400",
  display: "swap",
});

const poppinsBold = localFont({
  src: "./fonts/Poppins-Bold.woff",
  variable: "--font-poppins-bold",
  weight: "700",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Bodenjäger - Premium Bodenbeläge Online",
  description: "Hochwertige Vinyl-, Laminat- und Parkettböden von COREtec, primeCORE und mehr. Fachhandel mit großem Lagerbestand und persönlicher Beratung.",
  keywords: "Bodenbelag, Vinyl, Laminat, Parkett, COREtec, primeCORE, Rigid-Vinyl, Klebe-Vinyl",
  authors: [{ name: "Bodenjäger" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        {/* Consent Mode v2 default + gespeicherte Entscheidung — MUSS vor gtm.js laufen.
            Synchroner inline-Script im <head> wird beim HTML-Parse
            ausgeführt, also lange vor jedem next/script (afterInteractive). */}
        <script
          id="gtm-consent-default"
          dangerouslySetInnerHTML={{ __html: CONSENT_HEAD_SCRIPT }}
        />

        {/* Preconnect to WooCommerce backend for faster API calls */}
        <link rel="preconnect" href="https://2025.bodenjaeger.de" />
        <link rel="dns-prefetch" href="https://2025.bodenjaeger.de" />

        {/* Preconnect to external image sources */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        <JsonLd data={buildOrganizationSchema()} />
        <JsonLd data={buildWebSiteSchema()} />
      </head>
      <body
        className={`${poppinsRegular.variable} ${poppinsBold.variable} antialiased`}
      >
        <CookieConsentProvider>
          <GoogleTagManager />
          <PageViewTracker />
          <AttributionTracker />
          <TrustedShops />
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <TikTokPixel />
                <Roomvo />
                <CookieConsent />
                {/* Gelbes SummerSALE-Banner entfernt — die Aktion läuft jetzt
                    über den Nav-Punkt „Angebote" (/sale). */}
                <HeaderWrapper />
                <FloatingContactButton />
                {children}
                <Footer />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </CookieConsentProvider>
      </body>
    </html>
  );
}
