import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import KarrierePage from '@/components/KarrierePage';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Karriere & Jobs bei Bodenjäger',
  description: 'Werde Teil des Bodenjäger-Teams: offene Stellen und dein Weg zur Bewerbung beim Bodenbelags-Fachhandel aus Hückelhoven.',
};

export const revalidate = 300;

export default async function KarrierePageRoute() {
  const page = await wordPressClient.getPageBySlug('karriere');

  if (!page) {
    notFound();
  }

  return <KarrierePage page={page} />;
}
