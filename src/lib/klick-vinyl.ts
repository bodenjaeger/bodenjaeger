/**
 * Anzeige-Begriff „Klick-Vinyl“ statt „Rigid-Vinyl“.
 *
 * Nur für sichtbare Texte. Slugs, URLs, Kategorien-Logik, Warenkorb und
 * Bestelldaten bleiben unverändert, bis die Umstellung nach den Black Weeks
 * auch in WooCommerce erfolgt ist. Danach kann diese Datei entfallen.
 */
const RIGID_VINYL = /Rigid[- ]Vinyl/g;

/** Produkt- oder Kategorienamen für die Anzeige umbenennen. */
export function klickVinylName(name: string): string {
  return name.replace(RIGID_VINYL, 'Klick-Vinyl');
}

/** Kategorietext: Nur für `rigid-vinyl`, andere Texte unterscheiden die Begriffe teils bewusst. */
export function klickVinylKategorietext(slug: string, text: string | null): string | null {
  if (slug !== 'rigid-vinyl' || !text) return text;
  return klickVinylName(text).replace(
    'Er vereint die besten Eigenschaften von Klick-Vinyl mit den Vorteilen',
    'Er verbindet die einfache Klickverlegung mit den Vorteilen',
  );
}

/**
 * Kategorietext aus dem Backend aufbereiten. WordPress erlaubt in Kategoriebeschreibungen
 * nur wenige Tags (u. a. <strong>, keine Listen), deshalb:
 * - ganze Zeile fett → H3
 * - Zeilen mit „- “, „– “ oder „• “ am Anfang → Liste (WordPress macht aus „- “ einen Gedankenstrich)
 */
export function fetteZeilenAlsUeberschrift(text: string): string {
  return text
    // WordPress speichert Windows-Zeilenumbrüche und Striche als HTML-Zeichen (&#8211;)
    .replace(/\r\n?/g, '\n')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8226;|&bull;/g, '•')
    .replace(/^[ \t]*(?:<p>)?<strong>([^<]+)<\/strong>(?:<\/p>)?[ \t]*$/gm, '<h3>$1</h3>')
    .replace(/(?:^[ \t]*[-–—•][ \t]+.+(?:\n|$))+/gm, (block) => {
      const items = block
        .split('\n')
        .map((line) => line.replace(/^[ \t]*[-–—•][ \t]+/, '').trim())
        .filter(Boolean)
        .map((line) => `<li>${line}</li>`)
        .join('');
      return `<ul>${items}</ul>\n`;
    })
    // Zeilenumbrüche direkt an Überschriften und Listen würden sonst als Leerzeile erscheinen
    .replace(/\s*(<h3>|<ul>)/g, '\n$1')
    .replace(/(<\/h3>|<\/ul>)\s*/g, '$1');
}

/** Erster Absatz ohne Zwischenüberschriften, als reiner Text für den Kategorie-Kopf. */
export function kategorieIntro(text: string): string {
  const absaetze = fetteZeilenAlsUeberschrift(text)
    .replace(/<h3>[^<]*<\/h3>/g, '\n\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split(/\n\s*\n/)
    .map((absatz) => absatz.trim())
    .filter(Boolean);
  return absaetze.find((absatz) => absatz.length > 60) ?? absaetze[0] ?? '';
}
