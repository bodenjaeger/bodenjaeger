import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/site'
import { VS_META } from '@/content/verlegeservice-anfrage'
import VerlegeFunnel from '@/components/verlegeservice/funnel/VerlegeFunnel'

const PAGE_URL = `${SITE_URL}/fachmarkt-hueckelhoven/service/verlegeservice-anfrage`

export const metadata: Metadata = {
  title: VS_META.title,
  description: VS_META.description,
  alternates: { canonical: PAGE_URL },
  // Anfrage-Funnel gehört nicht in den Index — die Info-Seite ist die SEO-Seite.
  robots: { index: false, follow: true },
  openGraph: {
    title: VS_META.title,
    description: VS_META.description,
    url: PAGE_URL,
    type: 'website',
  },
}

export default function VerlegeserviceAnfragePage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: SITE_URL },
    { name: 'Fachmarkt Hückelhoven', url: `${SITE_URL}/fachmarkt-hueckelhoven` },
    { name: 'Verlegeservice', url: `${SITE_URL}/fachmarkt-hueckelhoven/service/verlegeservice` },
    { name: 'Anfrage', url: PAGE_URL },
  ])

  return (
    <main className="min-h-screen bg-pale pt-6 md:pt-10">
      <JsonLd data={breadcrumb} />
      <h1 className="sr-only">Verlegeservice anfragen – Bodenjäger Hückelhoven</h1>
      <VerlegeFunnel />
    </main>
  )
}
