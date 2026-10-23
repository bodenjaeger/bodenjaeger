import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import VersandLieferzeitPage from '@/components/VersandLieferzeitPage';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/versand-lieferzeit',
  title: 'Versand & Lieferzeit | Bodenjäger',
  description: 'Versandkosten, Lieferzeiten und Ablauf der Speditionslieferung bei Bodenjäger – inklusive Abholung im Fachmarkt.',
});

export const revalidate = 300;

export default async function VersandLieferzeitPageRoute() {
  const page = await wordPressClient.getPageBySlug('versandkosten-lieferzeit');

  if (!page) {
    notFound();
  }

  return <VersandLieferzeitPage page={page} />;
}
