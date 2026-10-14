import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '2025.bodenjaeger.de',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'bodenjaeger.de',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'plan-dein-ding.de',
        port: '',
        pathname: '/wp-content/uploads/**',
      },
    ],
    // Optimize image formats - Next.js will automatically serve AVIF/WebP where supported
    formats: ['image/avif', 'image/webp'],
    // Define device breakpoints for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimize layout shift with placeholder support
    minimumCacheTTL: 60,
  },

  // 301-Redirects für Migrations-404er (alter WordPress/WooCommerce-Shop → neuer Next.js-Shop)
  // ⚠️ Reihenfolge wichtig: Next.js nutzt FIRST MATCH — spezifische Regeln zuerst.
  async redirects() {
    return [
      // ============================================================
      // PRODUKTE
      // ============================================================
      // Victoria XL — Hauptprodukt fehlt im Backend, temporär in die Kategorie.
      // 302 (permanent: false) — sobald das Produkt wieder existiert, kann diese Regel raus.
      {
        source: '/product/victoria-xl',
        destination: '/category/parkett',
        permanent: false,
      },

      // ----- Spezifische Slug-Mappings (Middleware findet diese nicht, weil
      //       die WC-Suche Umlaute im Titel hat, die Slugs aber transliteriert
      //       sind: 'ä' → 'ae', 'ö' → 'oe', 'ß' → 'ss'). 301 = permanent. -----
      {
        source: '/product/oelschiefer',
        destination: '/products/laminat-oelschiefer',
        permanent: true,
      },
      {
        source: '/product/aussenecken-ahorn-58mm',
        destination: '/products/aussenecken-ahorn-58mm',
        permanent: true,
      },
      {
        source: '/product/vinylboden-rigid-vinyl-coretec-regina-fischgraet',
        destination: '/products/rigid-vinyl-coretec-regina-fischgraet',
        permanent: true,
      },
      {
        source: '/product/wm78-weimarer-sockelleiste-78mm-weiss',
        destination: '/products/wm78-sockelleiste-78mm-weiss',
        permanent: true,
      },
      {
        source: '/product/wild-west-oak-orca',
        destination: '/products/laminat-wild-west-oak',
        permanent: true,
      },
      {
        source: '/product/muster-atlas-oak-weiss',
        destination: '/products/laminat-atlas-oak-weiss',
        permanent: true,
      },
      {
        source: '/product/sichtestrich-weiss',
        destination: '/products/laminat-sichtestrich-weiss',
        permanent: true,
      },

      // Lumber Fischgrät existiert im Backend nicht. Ohne diese Regel greift der
      // Kategorie-Fallback in products/[slug]/page.tsx — der kommt wegen Streaming
      // (loading.tsx) aber nur als Meta-Refresh mit Status 200 an, nicht als 301.
      {
        source: '/products/rigid-vinyl-coretec-lumber-fischgraet',
        destination: '/category/rigid-vinyl',
        statusCode: 301, // ausdrücklich 301 (permanent: true liefert 308)
      },

      // ----- Gelöschte Produkte (existieren im Backend nicht mehr).
      //       302 (temporär), damit bei Re-Listing nichts permanent verfälscht ist. -----
      // Grande-Serie → Rigid-Vinyl Kategorie
      {
        source: '/product/rigid-vinyl-grande-lumiere',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      {
        source: '/product/rigid-vinyl-grande-silvan',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      {
        source: '/product/muster-rigid-vinyl-grande-lumiere',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      {
        source: '/product/muster-rigid-vinyl-grande-silvan',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      {
        source: '/product/muster-rigid-vinyl-grande-terra',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      {
        source: '/product/muster-rigid-vinyl-bath',
        destination: '/category/rigid-vinyl',
        permanent: false,
      },
      // Eiche-Serie → Laminat Kategorie
      {
        source: '/product/eiche-banchor',
        destination: '/category/laminat',
        permanent: false,
      },
      {
        source: '/product/eiche-cowgill',
        destination: '/category/laminat',
        permanent: false,
      },
      {
        source: '/product/eiche-daltra',
        destination: '/category/laminat',
        permanent: false,
      },
      {
        source: '/product/muster-eiche-derry',
        destination: '/category/laminat',
        permanent: false,
      },
      {
        source: '/product/muster-eiche-kingstep',
        destination: '/category/laminat',
        permanent: false,
      },
      {
        source: '/product/muster-eiche-mount',
        destination: '/category/laminat',
        permanent: false,
      },

      // /product/:slug → wird von src/middleware.ts behandelt (smarter Backend-Lookup
      // mit Präfix-Stripping für migrierte Slugs). Eine generische next.config-Regel
      // würde die Middleware shadowen, da next.config-redirects in Next.js VOR der
      // Middleware laufen. Nicht wieder reinpacken — sonst bekommen User wieder 404er
      // auf migrierte Slugs (z. B. /product/vinylboden-rigid-vinyl-coretec-forest).

      // ============================================================
      // VERSCHACHTELTE PRODUKT-KATEGORIEN (WP hatte Subkategorien-Pfade)
      // → letzter Slug = konkretere Subkategorie. Reihenfolge: längere Pfade zuerst.
      // ============================================================
      {
        source: '/product-category/zubehoer/zubehoer-fuer-sockelleisten/werkzeug',
        destination: '/category/werkzeug',
        permanent: true,
      },
      {
        source: '/product-category/zubehoer/zubehoer-fuer-sockelleisten',
        destination: '/category/zubehoer-fuer-sockelleisten',
        permanent: true,
      },
      {
        source: '/product-category/zubehoer/montagekleber-silikon-und-acryl',
        destination: '/category/montagekleber-silikon',
        permanent: true,
      },
      {
        source: '/product-category/parkett/fertigparkett',
        destination: '/category/fertigparkett',
        permanent: true,
      },
      {
        source: '/product-category/vinylboden/rigid-vinyl',
        destination: '/category/rigid-vinyl',
        permanent: true,
      },
      {
        source: '/product-category/vinylboden/klebe-vinyl',
        destination: '/category/klebe-vinyl',
        permanent: true,
      },
      {
        source: '/product-category/teppichboden/sedna-teppichboden',
        destination: '/category/teppichboden',
        permanent: true,
      },

      // ============================================================
      // PAGINATION (alte WP-Kategorie-/Shop-Pagination existiert nicht)
      // ============================================================
      // /product-category/<slug>/page/<n>/ → /category/<slug> (Pagination weg)
      {
        source: '/product-category/:slug/page/:n*',
        destination: '/category/:slug',
        permanent: true,
      },
      // /shop/page/<n>/ (auch mit ?add-to-cart=…) → Homepage
      {
        source: '/shop/page/:n*',
        destination: '/',
        permanent: true,
      },

      // ============================================================
      // KATEGORIEN (generisch — muss NACH den verschachtelten Spezial-Regeln stehen)
      // ============================================================
      // WooCommerce-Default war /product-category/{slug}, neue Route ist /category/{slug}
      {
        source: '/product-category/:slug*',
        destination: '/category/:slug*',
        permanent: true,
      },
      // Alte WordPress-Marketing-Landingpage → passende Kategorie
      {
        source: '/klebe-vinyl-sparpaket',
        destination: '/category/klebe-vinyl',
        permanent: true,
      },

      // ============================================================
      // KONTO
      // ============================================================
      {
        source: '/my-account',
        destination: '/konto',
        permanent: true,
      },
      {
        source: '/mein-konto',
        destination: '/konto',
        permanent: true,
      },

      // ============================================================
      // SHOP
      // ============================================================
      {
        source: '/shop',
        destination: '/',
        permanent: true,
      },

      // ============================================================
      // SERVICE-UMZUG unter den Fachmarkt (Paket B)
      // Alte Pfade → neue /fachmarkt-hueckelhoven/service/*-Struktur.
      // Zwei Slugs wurden umbenannt (lieferservice → lieferung-abholung,
      // warenlagerung → einlagerung). verlegeservice ist bereits umgezogen.
      // anhaengerverleih + schausonntag ziehen NICHT um (kein Redirect).
      // ============================================================
      {
        source: '/service',
        destination: '/fachmarkt-hueckelhoven/service',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/verlegeservice',
        destination: '/fachmarkt-hueckelhoven/service/verlegeservice',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/fachberatung',
        destination: '/fachmarkt-hueckelhoven/service/fachberatung',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/set-angebote',
        destination: '/fachmarkt-hueckelhoven/service/set-angebote',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/lieferservice',
        destination: '/fachmarkt-hueckelhoven/service/lieferung-abholung',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/warenlagerung',
        destination: '/fachmarkt-hueckelhoven/service/einlagerung',
        permanent: true,
      },
      {
        source: '/fachmarkt-hueckelhoven/werkzeugverleih',
        destination: '/fachmarkt-hueckelhoven/service/werkzeugverleih',
        permanent: true,
      },

      // ============================================================
      // SERVICEBEREICH (alte WP-Subseiten). Ziele direkt auf die FINALEN
      // Pfade — KEINE Redirect-Ketten (Doppel-Hop vermieden).
      // ============================================================
      {
        source: '/servicebereich/lagerservice',
        destination: '/fachmarkt-hueckelhoven/service/einlagerung',
        permanent: true,
      },
      {
        source: '/servicebereich/schausonntag',
        destination: '/fachmarkt-hueckelhoven/schausonntag',
        permanent: true,
      },
      // Catch-all für unbekannte Servicebereich-Subseiten → Service-Übersicht
      {
        source: '/servicebereich/:slug*',
        destination: '/fachmarkt-hueckelhoven/service',
        permanent: true,
      },

      // ============================================================
      // FILIALANGEBOTE (alte URL-Struktur)
      // ============================================================
      {
        source: '/filialangebote/:slug*',
        destination: '/fachmarkt-hueckelhoven',
        permanent: true,
      },

      // ============================================================
      // AKTIONSSEITEN
      // ============================================================
      {
        source: '/aktion-premium-boeden-inkl-verlegung',
        destination: '/sale',
        permanent: true,
      },

      // ============================================================
      // RATGEBER-ARTIKEL ("vor-und-nachteile")
      // Blog existiert aktuell nicht — leiten auf jeweilige Kategorie um.
      // Wenn der Blog später kommt, hier auf /blog/<slug> umstellen.
      // ============================================================
      {
        source: '/laminat-vor-und-nachteile',
        destination: '/category/laminat',
        permanent: true,
      },
      {
        source: '/rigid-vinyl-vor-und-nachteile',
        destination: '/category/rigid-vinyl',
        permanent: true,
      },
      {
        source: '/klebe-vinyl-vor-und-nachteile',
        destination: '/category/klebe-vinyl',
        permanent: true,
      },

      // ============================================================
      // RSS-FEEDS (existieren im Headless-Shop nicht mehr)
      // → Homepage als Fallback. Pragmatisch ok; korrekt wäre 410 Gone via Middleware.
      // ============================================================
      {
        source: '/:path*/feed',
        destination: '/',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
