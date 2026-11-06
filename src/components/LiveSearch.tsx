'use client';

import { klickVinylName } from '@/lib/klick-vinyl';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { SEARCH_PLACEHOLDER } from '@/content/shopNav';

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
}

/**
 * Suchfeld des Shop-Headers mit Live-Ergebnissen.
 *
 * Aufbau nach Mockup: dunkles Eingabefeld (#0C0C0C) und direkt anschließend
 * rechts ein roter Button mit weißer Lupe. Auf Mobile steht das Feld dauerhaft
 * in einer eigenen Header-Zeile — das frühere Such-Overlay entfällt.
 */
export default function LiveSearch({ size = 'lg', className = '' }: LiveSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const heightClass = size === 'lg' ? 'h-[52px]' : 'h-[48px]';
  const buttonWidthClass = size === 'lg' ? 'w-[65px]' : 'w-[56px]';
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

  // Highlight search term in text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className={`flex w-full items-stretch ${heightClass}`}>
        <input
          ref={inputRef}
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
          // Fokusring weiß statt Markenrot: Rot auf dem Feld ergibt nur 2,49:1
          // und verfehlt die 3:1, die ein Fokusindikator braucht. Weiß liegt bei
          // 10,9:1 — und alle übrigen Header-Bedienelemente ringen ohnehin weiß.
          className={`min-w-0 flex-1 rounded-l-md bg-hdr-field px-4 text-white placeholder:text-white focus:outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-white ${textClass} [&::-webkit-search-cancel-button]:hidden`}
        />
        {/* Lupenfeld trägt denselben Grauton wie das Eingabefeld — Feld und
            Button bilden zusammen eine durchgehende Fläche. Der Trennstrich
            links hält die Schaltfläche trotzdem als solche erkennbar. */}
        <button
          type="submit"
          aria-label="Suchen"
          className={`flex flex-shrink-0 items-center justify-center rounded-r-md border-l border-hdr-line bg-hdr-field transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${buttonWidthClass}`}
        >
          <Search className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
        </button>
      </form>

      {/* Dropdown with results */}
      {isOpen && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Keine Ergebnisse gefunden
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              {/* Categories Section */}
              {uniqueCategories.length > 0 && (
                <div className="border-b border-gray-100">
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                    Kategorien
                  </div>
                  <div className="py-2">
                    {uniqueCategories.slice(0, 3).map((category, index) => (
                      <Link
                        key={index}
                        href={`/category/${categorySlug(category)}`}
                        onClick={() => setIsOpen(false)}
                        className="block px-4 py-2 hover:bg-gray-50 text-sm text-dark"
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Products Section */}
              <div>
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                  Produkte
                </div>
                <div className="py-2">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {product.images.length > 0 ? (
                          <Image
                            src={product.images[0].src}
                            alt={klickVinylName(product.images[0].alt || product.name)}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Kein Bild
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow min-w-0">
                        <div className="text-sm font-medium text-dark">
                          {highlightText(klickVinylName(product.name), searchQuery.trim())}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {product.categories && product.categories.length > 0 && (
                            <span>{klickVinylName(product.categories[0].name)}</span>
                          )}
                          {product.sku && (
                            <span className="ml-2">
                              {product.categories && product.categories.length > 0 && ' • '}
                              SKU: {highlightText(product.sku, searchQuery.trim())}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0 text-sm font-semibold text-dark">
                        {parseFloat(product.price).toFixed(2)} €
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* View all results link */}
              <div className="border-t border-gray-100">
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-center text-sm font-medium text-brand hover:bg-gray-50"
                >
                  {results.length >= 50
                    ? `Alle Ergebnisse anzeigen (${results.length}+)`
                    : `Alle ${results.length} Ergebnisse anzeigen`}
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
