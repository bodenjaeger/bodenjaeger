import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import WordPressPage from '@/components/WordPressPage';
import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/widerruf',
  title: 'Widerrufsbelehrung | Bodenjäger',
  description: 'Informationen zum Widerrufsrecht und zur Rücksendung bei Bestellungen im Bodenjäger-Onlineshop.',
});

export const revalidate = 300;

export default async function WiderrufPage() {
  const page = await wordPressClient.getPageBySlug('widerrufsbelehrung-widerrufsformular');

  if (!page) {
    notFound();
  }

  return <WordPressPage page={page} />;
}
