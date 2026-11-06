'use client';

import { klickVinylName } from '@/lib/klick-vinyl';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { SEARCH_PLACEHOLDER } from '@/content/shopNav';
import { formatPrice } from '@/lib/cart-utils';

interface SearchResult {
  id: number;
  name: string;
  slug: string;
  price: string;
  sku?: string;
  images: { src: string; alt?: string }[];
  categories?: { id: number; name: string; slug: string }[];
}

interface GroupedResults {
  products: SearchResult[];
  categories: Set<string>;
}

interface LiveSearchProps {
  /**
   * `lg` = Desktop-Hauptzeile (60px hoch, 65px breiter Button),
   * `md` = mobile Suchzeile (48px hoch, 56px breiter Button).
   */
  size?: 'md' | 'lg';
  /** Breite/Sichtbarkeit steuert die aufrufende Header-Zeile. */
  className?: string;
  /** Beim Aufklappen der Suche (Header) direkt ins Feld springen. */
  autoFocus?: boolean;
}

/**
 * Suchfeld des Shop-Headers mit Live-Ergebnissen.
 *
 * Aufbau: Suchfeld als Pille (weiche helle Fläche auf dem dunklen Kopf, beim
 * Fokus nur ein dezenter Ring), rechts ein runder Suchen-Button. Treffer als
 * weiße Karte mit Kategorie-Chips, Produktbildern und Preisen. Im Header klappt die Suche über das
 * Lupen-Symbol auf (Desktop als Leiste unter der Hauptzeile, mobil als Fenster).
 */
export default function LiveSearch({ size = 'lg', className = '', autoFocus = false }: LiveSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const heightClass = size === 'lg' ? 'h-[52px]' : 'h-[46px]';
  const buttonWidthClass = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  // Mobil bewusst 16px: iOS Safari zoomt beim Fokus in jedes Eingabefeld mit
  // kleinerer Schrift hinein. 16px verhindert das ohne `user-scalable=no`,
  // das das Zoomen auf der ganzen Seite abschalten würde.
  const textClass = size === 'lg' ? 'text-[15px]' : 'text-base';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data); // Show all results from API (up to 50)
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Group results by category
  const groupedResults: GroupedResults = results.reduce((acc, product) => {
    acc.products.push(product);
    if (product.categories && product.categories.length > 0) {
      product.categories.forEach(cat => acc.categories.add(cat.name));
    }
    return acc;
  }, { products: [], categories: new Set<string>() } as GroupedResults);

  const uniqueCategories = Array.from(groupedResults.categories);

  // Link über den echten Slug: Der Anzeigename kann vom Slug abweichen (Klick-Vinyl → rigid-vinyl).
  const categorySlug = (name: string) =>
    groupedResults.products.flatMap((p) => p.categories ?? []).find((c) => c.name === name)?.slug
    ?? name.toLowerCase().replace(/\s+/g, '-');

  // Suchbegriff fett hervorheben (kein gelber Marker: Gelb ist kein Shop-Akzent)
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <span key={index} className="font-[family-name:var(--font-poppins-bold)]">{part}</span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  const query = searchQuery.trim();
  const kicker = 'px-5 pt-4 pb-2 text-[11px] font-[family-name:var(--font-poppins-bold)] uppercase tracking-[0.12em] text-mid';

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Pillenform wie die Chips: weiche Fläche, beim Fokus nur ein dezenter Ring */}
      <form
        onSubmit={handleSubmit}
        className={`flex w-full items-center gap-1 rounded-full bg-hdr-field pr-1 pl-4 ring-1 ring-white/10 transition-shadow focus-within:ring-white/35 ${heightClass}`}
      >
        <Search className="h-5 w-5 flex-shrink-0 text-white/70" strokeWidth={2} aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="search"
          placeholder={SEARCH_PLACEHOLDER}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          aria-label="Produktsuche"
          autoComplete="off"
          className={`h-full min-w-0 flex-1 bg-transparent px-2 text-white placeholder:text-white/60 focus:outline-none ${textClass} [&::-webkit-search-cancel-button]:hidden`}
        />
        <button
          type="submit"
          aria-label="Suchen"
          className={`flex flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${buttonWidthClass}`}
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          ) : (
            <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </form>

      {/* Trefferliste */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full right-0 left-0 z-[100] mt-3 max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl bg-white text-dark shadow-[0_20px_50px_rgba(0,0,0,0.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!loading && results.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-mid">
              Keine Treffer für „{query}“. Probier einen anderen Begriff oder ruf uns an: 02433 938884
            </div>
          )}

          {results.length > 0 && (
            <div className="pb-2">
              {uniqueCategories.length > 0 && (
                <div>
                  <p className={kicker}>Kategorien</p>
                  <div className="flex flex-wrap gap-2 px-5 pb-2">
                    {uniqueCategories.slice(0, 4).map((category) => (
                      <Link
                        key={category}
                        href={`/category/${categorySlug(category)}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex min-h-9 items-center rounded-full border border-ash px-3.5 text-[13px] text-dark transition-colors hover:border-mid"
                      >
                        {klickVinylName(category)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p className={kicker}>Produkte</p>
              <ul>
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-5 py-2 transition-colors hover:bg-pale"
                    >
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-pale">
                        {product.images.length > 0 && (
                          <Image
                            src={product.images[0].src}
                            alt={klickVinylName(product.images[0].alt || product.name)}
                            width={56}
                            height={56}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-dark">{highlightText(klickVinylName(product.name), query)}</p>
                        {product.categories && product.categories.length > 0 && (
                          <p className="truncate text-xs text-mid">{klickVinylName(product.categories[0].name)}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-sm font-[family-name:var(--font-poppins-bold)] text-dark tabular-nums">
                        {formatPrice(parseFloat(product.price))} €
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="px-5 pt-2">
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-11 items-center justify-center rounded-lg bg-pale text-sm font-[family-name:var(--font-poppins-bold)] text-dark transition-colors hover:bg-ash"
                >
                  {results.length >= 50 ? `Alle Ergebnisse anzeigen (${results.length}+)` : `Alle ${results.length} Ergebnisse anzeigen`}
                </Link>
              </div>
            </div>
          )}

          {loading && results.length === 0 && (
            <div className="flex justify-center px-5 py-6">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-ash border-t-brand" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
