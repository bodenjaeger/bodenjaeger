'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import { type StoreApiProduct } from '@/lib/woocommerce';
import { PRODUCTS_PER_PAGE, SORT_OPTIONS } from '@/lib/category-listing';
import {
  NO_FILTERS,
  PROMO_FILTER_ATTRIBUTES,
  buildFilterState,
  filterSlug,
  filtersToQuery,
  hasActiveFilters,
  matchesFilters,
  parseActiveFilters,
  type ActiveFilters,
  type FilterIndexProduct,
} from '@/lib/category-filters';
import { CategoryFilterButton, CategoryFilterChips, CategoryFilterSidebar, CategoryFilterToggle, ListingToolbar, useFilterCollapse } from '@/components/category/CategoryFilters';
import { PROMO_BODENART_TABS, getPromoBodenart, getPromoDiscount } from '@/lib/black-weeks';

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
  filterIndex?: FilterIndexProduct[];
}

/**
 * Produktliste der Aktionsseite: Bodenart-Tabs, Sortierung und Blättern im
 * Browser. Grid, Karte und Paginierungs-Optik wie CategoryPageClient —
 * ohne Aktionskachel, die gehört nicht auf die Aktionsseite selbst.
 */
export default function BlackWeeksListing({ products, filterIndex = [] }: BlackWeeksListingProps) {
  const [sort, setSort] = useState(DISCOUNT_SORT);
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(NO_FILTERS);
  const { collapsed, toggle } = useFilterCollapse();

  // Seite, Reiter und Sortierung stehen in der URL, damit „Zurück“ vom Produkt hierher führt
  const [urlGelesen, setUrlGelesen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Ältere Links nutzen noch ?art=vinyl
    const urlArt = params.get('art');
    const urlSort = params.get('sort');
    const urlPage = parseInt(params.get('page') || '', 10);
    if (urlSort) setSort(urlSort);
    if (urlPage > 1) setPage(urlPage);
    const fromUrl = parseActiveFilters(Object.fromEntries(params.entries()), PROMO_FILTER_ATTRIBUTES);
    if (urlArt && !fromUrl.values.bodenart) fromUrl.values.bodenart = [urlArt];
    setActiveFilters(fromUrl);
    setUrlGelesen(true);
  }, []);
  useEffect(() => {
    if (!urlGelesen) return;
    const params = new URLSearchParams(window.location.search);
    const setzen = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    params.delete('art');
    setzen('sort', sort === DISCOUNT_SORT ? null : sort);
    setzen('page', page > 1 ? String(page) : null);
    for (const attribute of [...PROMO_FILTER_ATTRIBUTES.map(filterSlug), 'preis-von', 'preis-bis']) params.delete(attribute);
    new URLSearchParams(filtersToQuery(activeFilters)).forEach((value, key) => params.set(key, value));
    const query = params.toString();
    window.history.replaceState(window.history.state, '', query ? `?${query}` : window.location.pathname);
  }, [sort, page, urlGelesen, activeFilters]);
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

  // Bodenart kommt aus den Kategorien des Produkts, alles andere aus den Attributen
  const entries = useMemo<FilterIndexProduct[]>(() => {
    const byId = new Map(filterIndex.map((entry) => [entry.id, entry]));
    return products.map((p) => {
      const art = getPromoBodenart(p);
      const label = PROMO_BODENART_TABS.find((t) => t.value === art)?.label;
      const entry = byId.get(p.id);
      return {
        id: p.id,
        price: entry?.price ?? p.price ?? 0,
        attributes: { ...entry?.attributes, ...(label ? { bodenart: [label] } : {}) },
      };
    });
  }, [products, filterIndex]);
  const filterState = useMemo(() => {
    const state = buildFilterState(entries, PROMO_FILTER_ATTRIBUTES, activeFilters, 'm²');
    return state.facets.length > 0 ? state : null;
  }, [entries, activeFilters]);
  const bodenartFacet = filterState?.facets.find((f) => f.key === 'bodenart');
  const applyFilters = (next: ActiveFilters) => {
    setActiveFilters(next);
    setPage(1);
  };
  const showSidebar = Boolean(filterState) && !collapsed;

  const filtered = useMemo(() => {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const matching = hasActiveFilters(activeFilters)
      ? products.filter((p) => {
          const entry = byId.get(p.id);
          return entry ? matchesFilters(entry, activeFilters) : false;
        })
      : products;
    return sortProducts(matching, sort);
  }, [products, entries, activeFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  const goToPage = (next: number) => {
    setPage(next);
    gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleBodenart = (slug: string | null) => {
    const current = activeFilters.values.bodenart ?? [];
    const updated = slug === null ? [] : current.includes(slug) ? current.filter((v) => v !== slug) : [...current, slug];
    const values = { ...activeFilters.values };
    if (updated.length > 0) values.bodenart = updated;
    else delete values.bodenart;
    applyFilters({ ...activeFilters, values });
  };
  const quickClass = (active: boolean) =>
    `h-9 shrink-0 cursor-pointer rounded-xl border px-4 text-sm font-semibold transition-colors ${
      active ? 'border-brand bg-brand text-white' : 'border-ash bg-white text-dark hover:border-mid'
    }`;

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
      <ListingToolbar
        filterControls={filterState ? (
          <>
            <CategoryFilterButton state={filterState} apply={applyFilters} />
            <CategoryFilterToggle collapsed={collapsed} onToggle={toggle} />
          </>
        ) : undefined}
        count={`${filtered.length} ${filtered.length === 1 ? 'Produkt' : 'Produkte'}${totalPages > 1 ? ` (Seite ${currentPage} von ${totalPages})` : ''}`}
        sort={sort}
        sortOptions={PROMO_SORT_OPTIONS}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
      />

      {/* Schnellauswahl: am Handy und bei eingeklappter Spalte, derselbe Stand wie im Filter */}
      {bodenartFacet && (
        <div role="group" aria-label="Nach Bodenart filtern" className={`mb-4 flex gap-2 overflow-x-auto pb-1 ${collapsed ? '' : 'lg:hidden'}`}>
          <button type="button" aria-pressed={!activeFilters.values.bodenart} onClick={() => toggleBodenart(null)} className={quickClass(!activeFilters.values.bodenart)}>
            Alle
          </button>
          {bodenartFacet.values.map((value) => (
            <button key={value.slug} type="button" aria-pressed={value.selected} onClick={() => toggleBodenart(value.slug)} className={quickClass(value.selected)}>
              {value.label} ({value.count})
            </button>
          ))}
        </div>
      )}

      <div className={showSidebar ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-7' : ''}>
      {filterState && showSidebar && <CategoryFilterSidebar state={filterState} apply={applyFilters} />}
      <div className="min-w-0">
      {filterState && <CategoryFilterChips state={filterState} apply={applyFilters} />}
      {filtered.length === 0 && (
        <p className="mb-12 rounded-2xl bg-white p-8 text-center text-gray-600">Für diese Auswahl gibt es keine Aktionsprodukte. Entferne einen Filter oder lösche alle.</p>
      )}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 ${showSidebar ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
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
      </div>
    </div>
  );
}
