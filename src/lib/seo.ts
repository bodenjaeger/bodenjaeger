import type { Metadata } from 'next';
import { SITE_URL } from './site';

export const SITE_NAME = 'Bodenjäger';

/** Standard-Teilbild (Hero-Motiv, 1200×630) für Seiten ohne eigenes Bild. */
export const DEFAULT_OG_IMAGE = {
  url: '/og-default.jpg',
  width: 1200,
  height: 630,
  alt: 'Bodenjäger – Vinyl, Laminat & Parkett',
};

interface PageMetadataInput {
  title: string;
  description: string;
  /** Pfad der Seite inkl. Query (z. B. `/category/laminat?page=2`) — wird zum Canonical. */
  path: string;
  /** Eigenes Teilbild (z. B. Produktbild); sonst DEFAULT_OG_IMAGE. */
  image?: string | null;
  robots?: Metadata['robots'];
}

/**
 * Einheitliche Seiten-Metadaten: Title, Description, selbstreferenzierendes
 * Canonical auf https://www.bodenjaeger.de sowie Open Graph und Twitter Card
 * mit denselben Texten. (Next übernimmt og:title/og:url nicht automatisch
 * aus Title/Canonical — ohne diese Funktion fehlen sie.)
 */
export function buildMetadata({ title, description, path, image, robots }: PageMetadataInput): Metadata {
  const url = `${SITE_URL}${path}`;
  const images = image ? [{ url: image }] : [DEFAULT_OG_IMAGE];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'de_DE',
      url,
      title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
    },
    ...(robots && { robots }),
  };
}
