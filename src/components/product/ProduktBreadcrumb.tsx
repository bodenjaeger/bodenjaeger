import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';

// Die Jäger-API liefert die Kategorien alphabetisch, categories[0] ist daher
// oft eine Sammelkategorie („Kostenlose Bodenmuster bestellen“, Marken).
// Für Label und Breadcrumb zählt die erste echte Bodenkategorie –
// spezifische Kategorien vor `vinylboden`. Das JSON-LD in page.tsx bleibt davon unberührt.
const BODEN_KATEGORIEN = ['klebe-vinyl', 'rigid-vinyl', 'laminat', 'parkett', 'vinylboden'];

export function getBodenKategorie(product: StoreApiProduct) {
  const categories = product.categories || [];
  for (const slug of BODEN_KATEGORIEN) {
    const match = categories.find((cat) => cat.slug.toLowerCase() === slug);
    if (match) return match;
  }
  return null;
}

export default function ProduktBreadcrumb({ product }: { product: StoreApiProduct }) {
  const kategorie = getBodenKategorie(product);

  return (
    <nav aria-label="Breadcrumb" className="hidden md:block mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-mid">
        <li>
          <Link href="/" className="hover:text-dark transition-colors">Startseite</Link>
        </li>
        {kategorie && (
          <li className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
            <Link href={`/category/${kategorie.slug}`} className="hover:text-dark transition-colors">
              {kategorie.name}
            </Link>
          </li>
        )}
        <li className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" aria-hidden="true" />
          <span className="font-bold text-dark" aria-current="page">{product.name}</span>
        </li>
      </ol>
    </nav>
  );
}
