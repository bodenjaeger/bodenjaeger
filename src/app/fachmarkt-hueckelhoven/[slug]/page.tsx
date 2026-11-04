import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getWordPressPage } from '@/lib/wordpress'
import FachmarktSubpage from '@/components/FachmarktSubpage'
import { buildMetadata } from '@/lib/seo'

export const revalidate = 30

/**
 * Mapping: Next.js route slug → WordPress page slug
 * Next.js URLs bleiben kurz und SEO-freundlich,
 * WordPress-Slugs werden intern aufgelöst.
 */
// Nur noch die NICHT umgezogenen Fachmarkt-Unterseiten.
// Die Service-Seiten (fachberatung, set-angebote, lieferservice→lieferung-abholung,
// warenlagerung→einlagerung, werkzeugverleih, verlegeservice) liegen jetzt unter
// /fachmarkt-hueckelhoven/service/* — alte Pfade per 301-Redirect (next.config.ts).
const SLUG_MAP: Record<string, { wpSlug: string; label: string }> = {
  'anhaengerverleih': { wpSlug: 'kostenloser-anhaengerverleih', label: 'Anhängerverleih' },
  'schausonntag': { wpSlug: 'schausonntag', label: 'Schausonntag' },
}

export async function generateStaticParams() {
  return Object.keys(SLUG_MAP).map((slug) => ({ slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const entry = SLUG_MAP[slug]
  if (!entry) {
    return { title: 'Seite nicht gefunden | Bodenjäger' }
  }

  const page = await getWordPressPage(entry.wpSlug)
  const title = page
    ? `${page.title.rendered.replace(/&#038;/g, '&').replace(/&#8211;/g, '–')} | Fachmarkt Hückelhoven | Bodenjäger`
    : `${entry.label} | Fachmarkt Hückelhoven | Bodenjäger`

  return buildMetadata({
    path: `/fachmarkt-hueckelhoven/${slug}`,
    title,
    description: `${entry.label} – Service im Fachmarkt Hückelhoven bei Bodenjäger`,
  })
}

export default async function FachmarktSubpagePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const entry = SLUG_MAP[slug]

  if (!entry) notFound()

  const page = await getWordPressPage(entry.wpSlug)

  if (!page) notFound()

  return <FachmarktSubpage page={page} />
}
