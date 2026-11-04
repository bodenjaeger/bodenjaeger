'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { type StoreApiProduct } from '@/lib/woocommerce';
import { PRODUCTS_PER_PAGE, SORT_OPTIONS } from '@/lib/category-listing';
import {
  PROMO_BODENART_TABS,
  getPromoBodenart,
  getPromoDiscount,
  type PromoBodenart,
} from '@/lib/black-weeks';

const DISCOUNT_SORT = 'discount-desc';

/** Bestehende Sortierungen plus „Höchster Rabatt“ als Standard. */
const PROMO_SORT_OPTIONS = [{ value: DISCOUNT_SORT, label: 'Höchster Rabatt' }, ...SORT_OPTIONS];

/**
 * Sortiert im Browser — die Aktionsseite hat alle Produkte schon geladen,
 * und die Plugin-API kennt keine Rabatt-Sortierung. Ausgangsreihenfolge ist
 * „Beliebteste“ (so lädt der Server); bei Gleichstand bleibt sie erhalten.
 */
function sortProducts(products: StoreApiProduct[], sort: string): StoreApiProduct[] {
  const list = [...products];
  switch (sort) {
    case DISCOUNT_SORT:
      return list.sort((a, b) => getPromoDiscount(b) - getPromoDiscount(a));
    case 'price-asc':
      return list.sort((a, b) => (a.price || 0) - (b.price || 0));
    case 'price-desc':
      return list.sort((a, b) => (b.price || 0) - (a.price || 0));
    case 'title-asc':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    case 'title-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name, 'de'));
    // Die Listen-API liefert kein Anlagedatum — WooCommerce-IDs steigen mit
    // dem Anlegen, deshalb dienen sie als Ersatz.
    case 'date-desc':
      return list.sort((a, b) => b.id - a.id);
    case 'date-asc':
      return list.sort((a, b) => a.id - b.id);
    default:
      return list;
  }
}

interface BlackWeeksListingProps {
  products: StoreApiProduct[];
}

/**
 * Produktliste der Aktionsseite: Bodenart-Tabs, Sortierung und Blättern im
 * Browser. Grid, Karte und Paginierungs-Optik wie CategoryPageClient —
 * ohne Aktionskachel, die gehört nicht auf die Aktionsseite selbst.
 */
export default function BlackWeeksListing({ products }: BlackWeeksListingProps) {
  const [art, setArt] = useState<PromoBodenart | 'alle'>('alle');
  const [sort, setSort] = useState(DISCOUNT_SORT);
  const [page, setPage] = useState(1);
  const [addonProductsMap, setAddonProductsMap] = useState<Map<number, StoreApiProduct>>(new Map());
  const gridTopRef = useRef<HTMLDivElement>(null);

  // Batch-fetch Dämmung + Sockelleiste für Set-Angebot Preisvergleich (wie CategoryPageClient)
  useEffect(() => {
    const addonIds = new Set<number>();
    products.forEach((p) => {
      if (p.show_setangebot) {
        if (p.daemmung_id) addonIds.add(p.daemmung_id);
        if (p.sockelleisten_id) addonIds.add(p.sockelleisten_id);
      }
    });
    if (addonIds.size === 0) return;

    fetch('/api/products/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(addonIds) }),
    })
      .then(r => r.ok ? r.json() : [])
      .then((addonProducts: StoreApiProduct[]) => {
        const map = new Map<number, StoreApiProduct>();
        addonProducts.forEach(p => map.set(p.id, p));
        setAddonProductsMap(map);
      })
      .catch(() => {});
  }, [products]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { alle: products.length };
    products.forEach((p) => {
      const a = getPromoBodenart(p);
      if (a) result[a] = (result[a] || 0) + 1;
    });
    return result;
  }, [products]);

  const filtered = useMemo(() => {
    const byArt = art === 'alle' ? products : products.filter((p) => getPromoBodenart(p) === art);
    return sortProducts(byArt, sort);
  }, [products, art, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const goToPage = (next: number) => {
    setPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Tabs ohne Produkte ausblenden — „Alle“ bleibt immer.
  const tabs = PROMO_BODENART_TABS.filter((t) => t.value === 'alle' || counts[t.value]);

  // Fenster wie im Kategorie-Listing: Seite 1 + letzte + aktuelle ±1, dazwischen „…“
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages > 1) {
    const left = Math.max(2, currentPage - 1);
    const right = Math.min(totalPages - 1, currentPage + 1);
    pages.push(1);
    if (left > 2) pages.push('ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }
  const navClass = 'px-3 py-2 rounded-lg border border-gray-300 text-gray-500 transition-colors shrink-0';

  return (
    <div ref={gridTopRef} className="scroll-mt-48">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Bodenart-Tabs */}
        <div role="group" aria-label="Nach Bodenart filtern" className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = art === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setArt(tab.value);
                  setPage(1);
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  active ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label} ({counts[tab.value] || 0})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          <p className="text-gray-600">
            {filtered.length} {filtered.length === 1 ? 'Produkt' : 'Produkte'} gefunden
            {totalPages > 1 && ` (Seite ${currentPage} von ${totalPages})`}
          </p>
          <select
            value={sort}
            aria-label="Sortierung"
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {PROMO_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {visible.map((product) => (
          <UnifiedProductCard
            key={product.id}
            product={product}
            daemmungProduct={product.daemmung_id ? (addonProductsMap.get(product.daemmung_id) ?? null) : null}
            sockelleisteProduct={product.sockelleisten_id ? (addonProductsMap.get(product.sockelleisten_id) ?? null) : null}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav aria-label="Seitennavigation" className="flex justify-center items-center gap-1 sm:gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Vorherige Seite"
            className={`${navClass} hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
          >
            <span className="hidden sm:inline">Zurück</span>
            <span className="sm:hidden" aria-hidden="true">‹</span>
          </button>

          {pages.map((p, index) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-1 sm:px-2 py-2 text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                aria-label={`Seite ${p}`}
                aria-current={currentPage === p ? 'page' : undefined}
                className={`px-3 py-2 rounded-lg border transition-colors shrink-0 ${
                  currentPage === p
                    ? 'bg-brand text-white border-brand'
                    : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Nächste Seite"
            className={`${navClass} hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
          >
            <span className="hidden sm:inline">Weiter</span>
            <span className="sm:hidden" aria-hidden="true">›</span>
          </button>
        </nav>
      )}
    </div>
  );
}
