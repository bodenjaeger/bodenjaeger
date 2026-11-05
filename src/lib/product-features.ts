/** Vorteile eines Produkts aus der Kurzbeschreibung (Liste oder Zeilen). */
export function extractProductFeatures(html: string | null | undefined): string[] {
  if (!html) return [];
  const strip = (s: string) => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();

  const items = [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => strip(m[1]));
  const lines = items.length > 0
    ? items
    : html
        .split(/\r?\n|<br\s*\/?>|<\/p>/i)
        .map((line) => strip(line).replace(/^[\s•\-–]+/, ''));
  return lines.filter(Boolean);
}

/** Lieferzeit ohne den Abholhinweis, den die Seite selbst ergänzt (steht im Backend teils schon drin). */
export function formatLieferzeit(lieferzeit: string | null | undefined): string {
  return (lieferzeit || '3-7 Arbeitstage').replace(/\s*oder im Markt abholen\.?\s*$/i, '').trim();
}
