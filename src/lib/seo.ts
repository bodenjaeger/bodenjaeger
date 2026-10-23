import type { Metadata } from 'next';
import { SITE_URL } from './site';

interface PageMetadataInput {
  title: string;
  description: string;
  /** Pfad der Seite inkl. Query (z. B. `/category/laminat?page=2`) — wird zum Canonical. */
  path: string;
  robots?: Metadata['robots'];
}

/**
 * Einheitliche Seiten-Metadaten: Title, Description und selbstreferenzierendes
 * Canonical auf https://www.bodenjaeger.de.
 */
export function buildMetadata({ title, description, path, robots }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    ...(robots && { robots }),
  };
}
