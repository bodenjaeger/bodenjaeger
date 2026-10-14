import type { Metadata } from 'next';
import { wordPressClient } from '@/lib/wordpress';
import KontaktPage from '@/components/KontaktPage';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Kontakt & Fachberatung | Bodenjäger',
  description: 'Fragen zu Vinyl, Laminat oder Parkett? Kontaktiere Bodenjäger per Telefon, E-Mail oder Formular – oder komm zur Fachberatung in den Fachmarkt.',
};

export const revalidate = 300;

export default async function KontaktPageRoute() {
  const page = await wordPressClient.getPageBySlug('beratung');

  if (!page) {
    notFound();
  }

  return <KontaktPage page={page} />;
}
