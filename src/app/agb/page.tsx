import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import WordPressPage from '@/components/WordPressPage';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'AGB – Allgemeine Geschäftsbedingungen | Bodenjäger',
  description: 'Allgemeine Geschäftsbedingungen von Bodenjäger für Bestellungen im Onlineshop und im Fachmarkt Hückelhoven.',
};

export const revalidate = 300;

export default async function AgbPage() {
  const page = await wordPressClient.getPageBySlug('allgemeine-geschaeftsbedingungen');

  if (!page) {
    notFound();
  }

  return <WordPressPage page={page} />;
}
