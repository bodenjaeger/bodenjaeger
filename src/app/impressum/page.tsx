import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import WordPressPage from '@/components/WordPressPage';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/impressum',
  title: 'Impressum | Bodenjäger',
  description: 'Impressum und Anbieterkennzeichnung von Bodenjäger mit Anschrift, Kontaktdaten und rechtlichen Angaben.',
});

export const revalidate = 300;

export default async function ImpressumPage() {
  const page = await wordPressClient.getPageBySlug('impressum');

  if (!page) {
    notFound();
  }

  return <WordPressPage page={page} />;
}
