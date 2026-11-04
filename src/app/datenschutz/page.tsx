import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import WordPressPage from '@/components/WordPressPage';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/datenschutz',
  title: 'Datenschutzerklärung | Bodenjäger',
  description: 'Wie Bodenjäger personenbezogene Daten im Onlineshop verarbeitet, welche Cookies wir nutzen und welche Rechte du hast.',
});

export const revalidate = 300;

export default async function DatenschutzPage() {
  const page = await wordPressClient.getPageBySlug('datenschutzerklaerung-2');

  if (!page) {
    notFound();
  }

  return <WordPressPage page={page} />;
}
