import type { StoreApiProduct } from '@/lib/woocommerce'
import { SITE_URL, productUrl } from '@/lib/site'

/**
 * Paketpreise (das real Kaufbare) — Single Source of Truth für Feed UND JSON-LD,
 * damit g:price und der strukturierte Seitenpreis nie auseinanderdriften.
 *
 * - `regular`   = regulärer Brutto-Paketpreis (`paketpreis`), Fallback: `price`
 *                 (für Zubehör-Stückartikel ohne separaten Paketpreis).
 * - `sale`      = Aktions-Brutto-Paketpreis (`paketpreis_s`), nur bei aktiver
 *                 Aktion und nur wenn günstiger als `regular`, sonst `null`.
 * - `effective` = was der Kunde aktuell zahlt (`sale ?? regular`).
 *
 * Es wird NICHTS neu berechnet — es werden ausschließlich die vom Backend
 * vorberechneten Felder verwendet.
 */
export function getPackagePrices(product: StoreApiProduct): {
  regular: number
  sale: number | null
  effective: number
} {
  const regular = product.paketpreis ?? product.price ?? 0
  const saleRaw = product.paketpreis_s ?? null
  const onSale =
    !!product.on_sale && saleRaw !== null && saleRaw > 0 && saleRaw < regular
  const sale = onSale ? saleRaw : null
  return { regular, sale, effective: sale ?? regular }
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Kategorien, die keine Produktart beschreiben (Muster-Box, Aktionen)
const NON_TYPE_CATEGORIES = ['musterbox', 'sale']

/**
 * Meta-Title pro Produkt. Die Produktart wird nur angehängt, wenn sie nicht
 * schon im Namen steht („Klebe-Vinyl Pulse Grey“ braucht kein „| Klebe-Vinyl“).
 */
export function buildProductMetaTitle(product: StoreApiProduct): string {
  const category = product.categories?.find(
    (c) => !NON_TYPE_CATEGORIES.includes(c.slug)
  )?.name
  const showCategory =
    category && !product.name.toLowerCase().includes(category.toLowerCase())
  return showCategory
    ? `${product.name} | ${category} kaufen | Bodenjäger`
    : `${product.name} kaufen | Bodenjäger`
}

/**
 * Meta-Description pro Produkt aus der individuellen Artikelbeschreibung.
 * Die Kurzbeschreibung ist innerhalb einer Produktlinie identisch und
 * taugt deshalb nur noch als Fallback.
 */
export function buildProductMetaDescription(
  product: StoreApiProduct,
  maxLength = 158
): string {
  const source = product.artikelbeschreibung
    ? product.artikelbeschreibung
        // Überschriften/Absätze als Satzende, damit Headline und Text nicht verschmelzen
        .replace(/<\/(h[1-6]|p|li)>/gi, '. ')
        .replace(/<br\s*\/?>/gi, '. ')
        .replace(/\r?\n\s*\r?\n/g, '. ')
    : product.short_description || ''
  const text = stripHtml(source)
    .replace(/\s*\.(\s*\.)+/g, '.')
    .replace(/([!?:])\s*\./g, '$1')
    .replace(/^[.\s]+/, '')

  if (!text) return `${product.name} bei Bodenjäger kaufen`
  if (text.length <= maxLength) return text

  const cut = text.slice(0, maxLength - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.–\-\s]+$/, '')}…`
}

export function buildProductSchema(product: StoreApiProduct): object {
  const url = productUrl(product.slug)
  const description = buildProductMetaDescription(product, 500) || undefined
  const image = product.images?.[0]?.src || undefined

  const additionalProperty: object[] = []

  if (product.einheit) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Einheit',
      value: product.einheit,
    })
  }

  if (product.paketinhalt && product.einheit_short) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Paketinhalt',
      value: `${product.paketinhalt} ${product.einheit_short}`,
    })
  }

  if (product.verschnitt) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Verschnitt',
      value: `${product.verschnitt}%`,
    })
  }

  if (product.verpackungsart) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Verpackungsart',
      value: product.verpackungsart,
    })
  }

  if (product.show_lieferzeit && product.lieferzeit) {
    additionalProperty.push({
      '@type': 'PropertyValue',
      name: 'Lieferzeit',
      value: product.lieferzeit,
    })
  }

  const priceValidUntil = new Date()
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1)
  const priceValidUntilStr = priceValidUntil.toISOString().split('T')[0]

  // Preis = Paketpreis (das real Kaufbare), identisch zur Feed-Logik (g:price).
  // Die menschlich sichtbare €/m²-Anzeige in der UI bleibt davon unberührt.
  const { effective: packagePrice } = getPackagePrices(product)
  const offers =
    packagePrice > 0
      ? {
          '@type': 'Offer',
          price: packagePrice,
          priceCurrency: 'EUR',
          priceValidUntil: priceValidUntilStr,
          availability:
            product.stock_status === 'instock'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          url,
          seller: { '@type': 'Organization', name: 'Bodenjäger' },
        }
      : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku || undefined,
    url,
    image,
    description: description || undefined,
    brand: { '@type': 'Brand', name: 'Bodenjäger' },
    category: product.categories?.[0]?.name || undefined,
    offers,
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
  }
}

export function buildOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Bodenjäger',
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo/logo-bodenjaeger-fff.svg`,
    description:
      'Premium Bodenbeläge online kaufen – Vinyl, Laminat und Parkett von Bodenjäger.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'DE',
    },
    areaServed: 'DE',
  }
}

export function buildWebSiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Bodenjäger',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * FlooringStore (Subtyp von LocalBusiness) für den Fachmarkt Hückelhoven.
 * aggregateRating wird bewusst NICHT gesetzt, bis die Google-Review-Einbindung
 * geklärt ist (siehe content/fachmarkt.ts → GOOGLE_REVIEWS TODO).
 */
export function buildFlooringStoreSchema(input: {
  name: string
  street: string
  postalCode: string
  city: string
  country: string
  telephone: string
  email: string
  url: string
  geo?: { lat: number; lng: number }
  openingHours?: { days: string[]; opens: string; closes: string }[]
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FlooringStore',
    name: input.name,
    url: input.url,
    telephone: input.telephone,
    email: input.email,
    image: `${SITE_URL}/images/logo/logo-bodenjaeger-fff.svg`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.street,
      postalCode: input.postalCode,
      addressLocality: input.city,
      addressCountry: input.country,
    },
    ...(input.geo
      ? { geo: { '@type': 'GeoCoordinates', latitude: input.geo.lat, longitude: input.geo.lng } }
      : {}),
    ...(input.openingHours
      ? {
          openingHoursSpecification: input.openingHours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: h.days,
            opens: h.opens,
            closes: h.closes,
          })),
        }
      : {}),
  }
}

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
