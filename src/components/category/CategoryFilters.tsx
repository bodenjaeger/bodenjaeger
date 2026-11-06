'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import StickyColumn from '@/components/product/StickyColumn';
import { listingHref } from '@/lib/category-listing';
import { filtersToQuery, hasActiveFilters, type ActiveFilters, type FilterState } from '@/lib/category-filters';

/** So viele Filter sind unter dem Preis zu Beginn aufgeklappt. */
const INITIAL_OPEN = 3;

const FARBEN: Record<string, string> = { hell: '#e6d9c3', mittel: '#ae8a60', dunkel: '#54402f' };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const formatPrice = (value: number) => String(value).replace('.', ',');

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-3.5 w-3.5 flex-none transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface FilterProps {
  state: FilterState;
  apply: (next: ActiveFilters) => void;
  pending?: boolean;
}

/** Filterwahl über die Adresse, für die serverseitig gefilterten Kategorieseiten. */
export function useFilterNavigation(sort: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const apply = (next: ActiveFilters) => {
    const href = listingHref(pathname, 1, sort, filtersToQuery(next));
    startTransition(() => router.push(href, { scroll: false }));
  };
  return { apply, pending };
}

function FilterPanel({ state, apply, pending, onClose }: FilterProps & { onClose?: () => void }) {
  const { active } = state;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [from, setFrom] = useState(active.priceFrom === null ? '' : formatPrice(active.priceFrom));
  const [to, setTo] = useState(active.priceTo === null ? '' : formatPrice(active.priceTo));

  useEffect(() => {
    setFrom(active.priceFrom === null ? '' : formatPrice(active.priceFrom));
    setTo(active.priceTo === null ? '' : formatPrice(active.priceTo));
  }, [active.priceFrom, active.priceTo]);

  const isOpen = (key: string, position: number) => open[key] ?? position < INITIAL_OPEN;
  const toggle = (key: string, current: boolean) => setOpen((o) => ({ ...o, [key]: !current }));

  const toggleValue = (key: string, slug: string, checked: boolean) => {
    const current = active.values[key] ?? [];
    const updated = checked ? [...current, slug] : current.filter((s) => s !== slug);
    const values = { ...active.values };
    if (updated.length > 0) values[key] = updated;
    else delete values[key];
    apply({ ...active, values });
  };

  const applyPrice = () => {
    const parse = (text: string) => {
      const value = parseFloat(text.replace(',', '.'));
      return Number.isFinite(value) && value >= 0 ? value : null;
    };
    const priceFrom = parse(from);
    const priceTo = parse(to);
    if (priceFrom !== active.priceFrom || priceTo !== active.priceTo) apply({ ...active, priceFrom, priceTo });
  };

  const priceOpen = open.preis ?? true;

  return (
    <div className={pending ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      <div className="flex items-center justify-between py-3">
        <span className="text-base font-bold text-dark">Filter</span>
        {hasActiveFilters(active) && (
          <button type="button" onClick={() => apply({ values: {}, priceFrom: null, priceTo: null })} className="cursor-pointer text-[13px] font-medium text-[#d11820] underline">
            Alle löschen
          </button>
        )}
      </div>

      <div className="border-t border-ash">
        <button type="button" aria-expanded={priceOpen} onClick={() => toggle('preis', priceOpen)} className="flex w-full cursor-pointer items-center justify-between py-3 text-left font-semibold text-dark">
          Preis pro {state.unit} <Chevron open={priceOpen} />
        </button>
        {priceOpen && (
          <form
            className="grid grid-cols-2 gap-2.5 pb-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              applyPrice();
            }}
          >
            <label className="grid gap-1 text-xs text-mid">
              von
              <input value={from} onChange={(e) => setFrom(e.target.value)} onBlur={applyPrice} inputMode="decimal" placeholder={`${state.priceMin} €`} className="w-full rounded-xl border border-ash px-2.5 py-2 text-base md:text-sm text-dark" />
            </label>
            <label className="grid gap-1 text-xs text-mid">
              bis
              <input value={to} onChange={(e) => setTo(e.target.value)} onBlur={applyPrice} inputMode="decimal" placeholder={`${state.priceMax} €`} className="w-full rounded-xl border border-ash px-2.5 py-2 text-base md:text-sm text-dark" />
            </label>
            <button type="submit" className="sr-only">Preis anwenden</button>
          </form>
        )}
      </div>

      {state.facets.map((facet, position) => {
        const expanded = isOpen(facet.key, position);
        return (
          <div key={facet.key} className="border-t border-ash">
            <button type="button" aria-expanded={expanded} onClick={() => toggle(facet.key, expanded)} className="flex w-full cursor-pointer items-center justify-between py-3 text-left font-semibold text-dark">
              {facet.label} <Chevron open={expanded} />
            </button>
            {expanded && (
              <div className="grid gap-0.5 pb-3">
                {facet.values.map((value) => {
                  const disabled = value.count === 0 && !value.selected;
                  return (
                    <label key={value.slug} className={`flex items-center gap-2.5 rounded-md px-0.5 py-1.5 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-pale'}`}>
                      <input
                        type="checkbox"
                        checked={value.selected}
                        disabled={disabled}
                        onChange={(e) => toggleValue(facet.key, value.slug, e.target.checked)}
                        className="filter-check"
                      />
                      {facet.key === 'farbgebung' && FARBEN[value.slug] && (
                        <span className="h-[18px] w-[18px] flex-none rounded-full border border-black/15" style={{ background: FARBEN[value.slug] }} />
                      )}
                      <span className="min-w-0 flex-1 text-sm text-dark">{capitalize(value.label)}</span>
                      <span className="text-[12.5px] tabular-nums text-mid">{value.count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {onClose && (
        <div className="sticky bottom-0 border-t border-ash bg-white pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3">
          <button type="button" onClick={onClose} className="w-full cursor-pointer rounded-xl bg-brand py-3.5 font-semibold text-white hover:bg-[#d11820]">
            {state.total} {state.total === 1 ? 'Produkt' : 'Produkte'} anzeigen
          </button>
        </div>
      )}
    </div>
  );
}

/** Mitlaufende Spalte ab Desktop-Breite. */
export function CategoryFilterSidebar(props: FilterProps) {
  return (
    <StickyColumn className="hidden lg:sticky lg:block lg:self-start">
      <aside aria-label="Filter" className="rounded-2xl bg-white px-[18px] pb-3 shadow-[0_2px_14px_rgba(46,45,50,0.06)]">
        <FilterPanel {...props} />
      </aside>
    </StickyColumn>
  );
}

/** Button und Fenster von unten auf kleinen Bildschirmen. Fenster liegt per Portal über allen Ebenen. */
export function CategoryFilterButton(props: FilterProps) {
  const { state } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const count = Object.values(state.active.values).reduce((sum, v) => sum + v.length, 0) + (state.active.priceFrom !== null ? 1 : 0) + (state.active.priceTo !== null ? 1 : 0);

  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sheetOpen]);

  return (
    <>
      <button type="button" onClick={() => setSheetOpen(true)} className="h-11 w-full cursor-pointer rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-[#d11820] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:hidden">
        {count > 0 ? `Filtern (${count})` : 'Filtern'}
      </button>
      {sheetOpen && createPortal(
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Filter">
          <button type="button" aria-label="Filter schließen" onClick={() => setSheetOpen(false)} className="absolute inset-0 cursor-pointer bg-dark/50" />
          <div className="absolute inset-x-0 bottom-0 max-h-[86%] overflow-y-auto rounded-t-3xl bg-white px-[18px] shadow-[0_-6px_30px_rgba(0,0,0,0.2)]">
            <FilterPanel {...props} onClose={() => setSheetOpen(false)} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/** Aktive Auswahl über den Produkten, einzeln entfernbar. */
export function CategoryFilterChips({ state, apply }: FilterProps) {
  const { active } = state;
  if (!hasActiveFilters(active)) return null;

  const chipClass = 'inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-[13px] text-white hover:bg-[#d11820] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
  const cross = <span aria-hidden="true" className="font-bold">×</span>;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {state.facets.flatMap((facet) =>
        facet.values.filter((v) => v.selected).map((value) => (
          <button
            key={`${facet.key}-${value.slug}`}
            type="button"
            className={chipClass}
            onClick={() => {
              const rest = (active.values[facet.key] ?? []).filter((s) => s !== value.slug);
              const values = { ...active.values };
              if (rest.length > 0) values[facet.key] = rest;
              else delete values[facet.key];
              apply({ ...active, values });
            }}
          >
            {facet.label}: {capitalize(value.label)} {cross}
          </button>
        ))
      )}
      {active.priceFrom !== null && (
        <button type="button" className={chipClass} onClick={() => apply({ ...active, priceFrom: null })}>ab {formatPrice(active.priceFrom)} € {cross}</button>
      )}
      {active.priceTo !== null && (
        <button type="button" className={chipClass} onClick={() => apply({ ...active, priceTo: null })}>bis {formatPrice(active.priceTo)} € {cross}</button>
      )}
      <button type="button" onClick={() => apply({ values: {}, priceFrom: null, priceTo: null })} className="cursor-pointer text-[13px] font-medium text-[#d11820] underline">
        Alle löschen
      </button>
    </div>
  );
}

const COLLAPSE_KEY = 'filter-eingeklappt';

/** Merkt sich, ob die Filterspalte am Desktop eingeklappt ist. */
export function useFilterCollapse() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
    } catch {
      // Speicher nicht verfügbar: Spalte bleibt offen
    }
  }, []);
  const toggle = () => {
    setCollapsed((current) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, current ? '0' : '1');
      } catch {
        // Speicher nicht verfügbar: gilt nur für diesen Besuch
      }
      return !current;
    });
  };
  return { collapsed, toggle };
}

/** Ein- und Ausblenden der Filterspalte, nur ab Desktop-Breite. */
export function CategoryFilterToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-expanded={!collapsed} onClick={onToggle} className="hidden h-11 cursor-pointer whitespace-nowrap rounded-xl border border-ash bg-white px-4 text-sm font-semibold text-dark hover:border-mid focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:inline-block">
      {collapsed ? 'Filter einblenden' : 'Filter ausblenden'}
    </button>
  );
}

interface ListingToolbarProps {
  filterControls?: React.ReactNode;
  count: string;
  sort: string;
  sortOptions: ReadonlyArray<{ value: string; label: string }>;
  onSortChange: (value: string) => void;
}

/** Leiste über den Produkten: Filter, Trefferzahl und Sortierung in einer Höhe. */
export function ListingToolbar({ filterControls, count, sort, sortOptions, onSortChange }: ListingToolbarProps) {
  return (
    <div className="mb-5 grid grid-cols-2 items-center gap-3 lg:flex lg:justify-between">
      <div className={`flex items-center gap-4 ${filterControls ? '' : 'hidden lg:flex'}`}>
        {filterControls}
        <p className="hidden text-sm font-medium text-mid lg:block">{count}</p>
      </div>
      <div className={`relative ${filterControls ? '' : 'col-span-2 lg:col-span-1'}`}>
        <select
          value={sort}
          aria-label="Sortierung"
          onChange={(e) => onSortChange(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-ash bg-white pl-4 pr-9 text-sm font-semibold text-dark hover:border-mid focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:w-auto"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dark"><Chevron open={false} /></span>
      </div>
      <p className="col-span-2 text-sm font-medium text-mid lg:hidden">{count}</p>
    </div>
  );
}
