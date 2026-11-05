/**
 * Optionale Inhalte der Produktseite (PDFs, Video, externe Visualisierung).
 *
 * Gepflegt werden sie in WooCommerce am Produkt unter „Benutzerdefinierte
 * Felder“. Der Wert ist jeweils die vollständige URL, z. B. aus der Mediathek.
 * Ist ein Feld leer, blendet die Produktseite das zugehörige Element aus.
 */
export const PRODUCT_MEDIA_FIELDS = {
  datenblatt: 'bj_datenblatt_url',
  verlegeanleitung: 'bj_verlegeanleitung_url',
  pflegeanleitung: 'bj_pflegeanleitung_url',
  video: 'bj_video_url',
  visualizer: 'bj_visualizer_url',
} as const;

export type ProductMedia = Partial<Record<keyof typeof PRODUCT_MEDIA_FIELDS, string>>;

function asWebUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

export function parseProductMedia(
  metaData: ReadonlyArray<{ key: string; value: unknown }> | undefined
): ProductMedia {
  const media: ProductMedia = {};
  for (const [name, key] of Object.entries(PRODUCT_MEDIA_FIELDS) as [keyof ProductMedia, string][]) {
    const url = asWebUrl(metaData?.find((m) => m.key === key)?.value);
    if (url) media[name] = url;
  }
  return media;
}
