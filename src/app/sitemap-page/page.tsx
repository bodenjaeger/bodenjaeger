import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMetadata({
  path: '/sitemap-page',
  title: 'Sitemap | Bodenjäger',
  description: 'Übersicht aller Seiten auf bodenjäger.de',
})

export default function SitemapPage() {
  const pages = [
    {
      category: 'Hauptseiten',
      links: [
        { title: 'Startseite', url: '/' },
        { title: 'Produkte', url: '/products' },
        { title: 'Warenkorb', url: '/cart' },
        { title: 'Kontakt', url: '/kontakt' },
        { title: 'Blog', url: '/blog' },
      ],
    },
    {
      category: 'Fachmarkt Hückelhoven',
      links: [
        { title: 'Fachmarkt Hückelhoven - Übersicht', url: '/fachmarkt-hueckelhoven' },
        { title: 'Service - Übersicht', url: '/fachmarkt-hueckelhoven/service' },
        { title: 'Verlegeservice', url: '/fachmarkt-hueckelhoven/service/verlegeservice' },
        { title: 'Fachberatung', url: '/fachmarkt-hueckelhoven/service/fachberatung' },
        { title: 'Musterservice', url: '/fachmarkt-hueckelhoven/service/musterservice' },
        { title: 'Set-Angebote', url: '/fachmarkt-hueckelhoven/service/set-angebote' },
        { title: 'Lieferung & Abholung', url: '/fachmarkt-hueckelhoven/service/lieferung-abholung' },
        { title: 'Einlagerung', url: '/fachmarkt-hueckelhoven/service/einlagerung' },
        { title: 'Werkzeugverleih', url: '/fachmarkt-hueckelhoven/service/werkzeugverleih' },
        { title: 'Anhängerverleih', url: '/fachmarkt-hueckelhoven/anhaengerverleih' },
        { title: 'Schausonntag', url: '/fachmarkt-hueckelhoven/schausonntag' },
      ],
    },
    {
      category: 'Service & Information',
      links: [
        { title: 'Servicebereich', url: '/fachmarkt-hueckelhoven/service' },
        { title: 'Versand & Lieferzeit', url: '/versand-lieferzeit' },
        { title: 'Widerrufsbelehrung & Widerrufsformular', url: '/widerruf' },
        { title: 'Jobs & Karriere', url: '/karriere' },
      ],
    },
    {
      category: 'Rechtliches',
      links: [
        { title: 'Impressum', url: '/impressum' },
        { title: 'Datenschutzerklärung', url: '/datenschutz' },
        { title: 'AGB', url: '/agb' },
      ],
    },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <h1 className="text-4xl lg:text-5xl font-bold text-dark mb-4">
          Sitemap
        </h1>
        <p className="text-gray-700 mb-12 text-lg">
          Übersicht aller Seiten auf bodenjäger.de
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {pages.map((section) => (
            <div key={section.category} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-dark mb-4 border-b-2 border-brand pb-2">
                {section.category}
              </h2>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.url}>
                    <Link
                      href={link.url}
                      className="text-gray-700 hover:text-brand hover:underline flex items-center group"
                    >
                      <span className="mr-2 text-brand group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-pale border-l-4 border-brand p-6 rounded">
          <h3 className="text-xl font-semibold text-dark mb-2">
            Seite nicht gefunden?
          </h3>
          <p className="text-gray-700 mb-4">
            Falls Sie eine bestimmte Seite nicht finden, nutzen Sie gerne unsere Suche
            oder kontaktieren Sie uns direkt.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/kontakt"
              className="inline-block bg-brand text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#d11820] transition-colors"
            >
              Kontakt
            </Link>
            <Link
              href="/"
              className="inline-block border-2 border-dark text-dark px-6 py-2 rounded-lg font-semibold hover:bg-dark hover:text-white transition-colors"
            >
              Zur Startseite
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Letzte Aktualisierung: April 2025
          </p>
        </div>
      </div>
    </main>
  )
}
