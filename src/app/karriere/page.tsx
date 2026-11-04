import type { Metadata } from 'next';
import KarrierePage from '@/components/KarrierePage';
import { STELLEN } from '@/content/karriere';
import { isJoinStelleOnline } from '@/lib/join-status';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/karriere',
  title: 'Karriere & Jobs bei Bodenjäger',
  description: 'Werde Teil des Bodenjäger-Teams: offene Stellen und dein Weg zur Bewerbung beim Bodenbelags-Fachhandel aus Hückelhoven.',
});

export const revalidate = 3600;

export default async function KarrierePageRoute() {
  const kandidaten = STELLEN.filter((stelle) => stelle.aktiv);
  const online = await Promise.all(kandidaten.map((stelle) => isJoinStelleOnline(stelle.joinUrl)));
  const stellen = kandidaten.filter((_, index) => online[index]);

  return <KarrierePage stellen={stellen} />;
}
