import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/site'
import {
  SERVICE_META,
  SERVICE_FAQ,
  SERVICE_FAQ_SCHEMA_ENABLED,
} from '@/content/service'

import ServiceHero from '@/components/service/ServiceHero'
import TrustBadges from '@/components/service/TrustBadges'
import ProjektEntscheidung from '@/components/service/ProjektEntscheidung'
import ServiceGrid from '@/components/service/ServiceGrid'
import VerlegeserviceAblauf from '@/components/service/VerlegeserviceAblauf'
import ServiceOrientierung from '@/components/service/ServiceOrientierung'
import ServiceFaq from '@/components/service/ServiceFaq'
import ServiceKontaktCta from '@/components/service/ServiceKontaktCta'
import { DEFAULT_OG_IMAGE } from '@/lib/seo'

// Umgezogen von /service (Kundenentscheidung: Service unter den Fachmarkt).
const PAGE_URL = `${SITE_URL}/fachmarkt-hueckelhoven/service`

export const metadata: Metadata = {
  title: SERVICE_META.title,
  description: SERVICE_META.description,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: SERVICE_META.title,
    description: SERVICE_META.description,
    url: PAGE_URL,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function ServiceUebersichtRoute() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: SITE_URL },
    { name: 'Fachmarkt Hückelhoven', url: `${SITE_URL}/fachmarkt-hueckelhoven` },
    { name: 'Service', url: PAGE_URL },
  ])

  // FAQPage-Schema vorbereitet, aber per Flag deaktiviert, bis die
  // FAQ-Antworten kundenfreigegeben sind (sonst würden Platzhalter als
  // Rich-Result ausgespielt). TODO(kunde): SERVICE_FAQ_SCHEMA_ENABLED aktivieren.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SERVICE_FAQ.items.map((i) => ({
      '@type': 'Question',
      name: i.frage,
      acceptedAnswer: { '@type': 'Answer', text: i.antwort },
    })),
  }

  return (
    <main>
      <JsonLd data={breadcrumb} />
      {SERVICE_FAQ_SCHEMA_ENABLED && <JsonLd data={faqSchema} />}

      <ServiceHero />
      <TrustBadges />
      <ProjektEntscheidung />
      <ServiceGrid />
      <VerlegeserviceAblauf />

      {/* Orientierung + FAQ: Desktop nebeneinander (Orientierung links, FAQ rechts),
          mobil FAQ unter Orientierung. */}
      <section className="py-24 md:py-32">
        <div className="content-container grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ServiceOrientierung />
          <ServiceFaq />
        </div>
      </section>

      <ServiceKontaktCta />
    </main>
  )
}
