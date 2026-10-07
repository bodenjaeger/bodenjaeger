'use client';

import { useEffect, useState } from 'react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { KLEBEVINYL_SPARPAKET, SPARPAKET_PRODUKT_IDS } from '@/content/klebevinyl-sparpaket';

/**
 * Normalpreis des Klebe-Vinyl Sparpakets pro m² Boden — für den Streichpreis
 * auf den Produktkarten der Übersichten.
 *
 * Gleiche Rechnung wie die Gesamt-Zeile der Produktseite (ProductPageContent,
 * `sparpaketAnzeige`): je angezeigtem Bestandteil Verbrauch/m² × Preis des
 * größten Gebindes. Der Zahnspachtel zählt dort nicht mit, hier auch nicht.
 */
function berechneRegularProM2(products: StoreApiProduct[]): number {
  return KLEBEVINYL_SPARPAKET.bestandteile
    .filter((b) => b.imSetAnzeigen)
    .reduce((sum, b) => {
      const gebinde = products.filter((p) => b.produktIds.includes(p.id) && (p.paketinhalt || 0) > 0);
      if (gebinde.length === 0) return sum;
      const gross = gebinde.reduce((a, p) => ((p.paketinhalt || 0) > (a.paketinhalt || 0) ? p : a));
      return sum + b.verbrauchProM2 * (gross.price || 0);
    }, 0);
}

// Ein Request pro Seitenaufruf, egal wie viele Karten den Wert brauchen.
let cache: Promise<number> | null = null;

function ladeRegularProM2(): Promise<number> {
  cache ??= fetch('/api/products/by-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: SPARPAKET_PRODUKT_IDS }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<StoreApiProduct[]>;
    })
    .then(berechneRegularProM2)
    .catch((error) => {
      // Fallback 0 → Karte zeigt den Backend-Streichpreis; nächster Aufruf versucht es neu
      console.error('[Sparpaket] Preise konnten nicht geladen werden:', error);
      cache = null;
      return 0;
    });
  return cache;
}

/** Liefert 0, solange nicht geladen, bei Fehler oder wenn `aktiv` false ist. */
export function useSparpaketRegularProM2(aktiv: boolean): number {
  const [wert, setWert] = useState(0);

  useEffect(() => {
    if (!aktiv) return;
    let abgebrochen = false;
    ladeRegularProM2().then((v) => {
      if (!abgebrochen) setWert(v);
    });
    return () => {
      abgebrochen = true;
    };
  }, [aktiv]);

  return aktiv ? wert : 0;
}
