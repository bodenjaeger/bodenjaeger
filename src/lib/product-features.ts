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
