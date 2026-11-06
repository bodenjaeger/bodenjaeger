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
