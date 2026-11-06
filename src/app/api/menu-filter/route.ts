import { NextResponse } from 'next/server';
import { wooCommerceClient } from '@/lib/woocommerce';
import { filterAttributesFor } from '@/lib/category-filters';
import { loadFilterIndex } from '@/lib/category-filters-server';
import { DEFAULT_SORT } from '@/lib/category-listing';

/**
 * Filterdaten für den Boden-Finder im Mega-Menü (MegaMenu.tsx).
 *
 * Liefert je Produkt nur die Filterwerte (keine Namen, keine Preise), damit
 * der Finder vor dem Klick zeigen kann, wie viele Böden passen, und leere
 * Kombinationen gar nicht erst anbietet. Gleiche Quelle wie die Filter der
 * Kategorieseiten, Cache 5 Minuten.
 */

const ERLAUBT = new Set(['vinylboden', 'laminat']);

export const revalidate = 300;

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('kategorie') ?? '';
  const attributes = filterAttributesFor(slug);
  if (!ERLAUBT.has(slug) || !attributes) {
    return NextResponse.json({ error: 'Unbekannte Kategorie' }, { status: 400 });
  }

  try {
    const category = await wooCommerceClient.getCategoryBySlug(slug);
    if (!category) return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 404 });
    const index = await loadFilterIndex(category.id, DEFAULT_SORT, attributes);
    return NextResponse.json(
      { produkte: index.map((product) => product.attributes) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ error: 'Filterdaten nicht verfügbar' }, { status: 503 });
  }
}
