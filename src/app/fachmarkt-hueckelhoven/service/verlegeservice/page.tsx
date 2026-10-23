import type { Metadata } from 'next'
import { JsonLd } from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/site'
import { VERLEGE_META, VERLEGE_FAQ } from '@/content/verlegeservice'

import VerlegeHero from '@/components/verlegeservice/VerlegeHero'
import ProblemNutzen from '@/components/verlegeservice/ProblemNutzen'
import BodenartenSection from '@/components/verlegeservice/BodenartenSection'
import VerlegeAblauf from '@/components/verlegeservice/VerlegeAblauf'
import AufmassCheckliste from '@/components/verlegeservice/AufmassCheckliste'
import LeistungenListe from '@/components/verlegeservice/LeistungenListe'
import ReferenzGalerie from '@/components/verlegeservice/ReferenzGalerie'
import VertrauenSection from '@/components/verlegeservice/VertrauenSection'
import PasstZuDir from '@/components/verlegeservice/PasstZuDir'
import Einwandbehandlung from '@/components/verlegeservice/Einwandbehandlung'
import KontaktAlternative from '@/components/verlegeservice/KontaktAlternative'
import VerlegeFaq from '@/components/verlegeservice/VerlegeFaq'
import FinalerCta from '@/components/verlegeservice/FinalerCta'
import { DEFAULT_OG_IMAGE } from '@/lib/seo'

const PAGE_URL = `${SITE_URL}/fachmarkt-hueckelhoven/service/verlegeservice`

export const metadata: Metadata = {
  title: VERLEGE_META.title,
  description: VERLEGE_META.description,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: VERLEGE_META.title,
    description: VERLEGE_META.description,
    url: PAGE_URL,
    type: 'website',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function VerlegeservicePage() {
  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Startseite', url: SITE_URL },
    { name: 'Fachmarkt Hückelhoven', url: `${SITE_URL}/fachmarkt-hueckelhoven` },
    { name: 'Verlegeservice', url: PAGE_URL },
  ])

  // FAQPage-Schema AKTIV — Antworten sind kundengeliefert (keine Platzhalter).
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: VERLEGE_FAQ.items.map((i) => ({
      '@type': 'Question',
      name: i.frage,
      acceptedAnswer: { '@type': 'Answer', text: i.antwort },
    })),
  }

  return (
    <main className="pb-24 md:pb-0">
      <JsonLd data={breadcrumb} />
      <JsonLd data={faqSchema} />

      <VerlegeHero />
      <ProblemNutzen />
      <BodenartenSection />
      <VerlegeAblauf />
      <AufmassCheckliste />
      <LeistungenListe />
      <ReferenzGalerie />
      <VertrauenSection />
      <PasstZuDir />
      <Einwandbehandlung />
      <KontaktAlternative />
      <VerlegeFaq />
      <FinalerCta />
    </main>
  )
}
