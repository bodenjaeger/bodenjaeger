'use client';

import { useEffect, useState } from 'react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { KLEBEVINYL_SPARPAKET, SPARPAKET_PRODUKT_IDS } from '@/content/klebevinyl-sparpaket';

/**
 * Streichpreis pro m² für Klebe-Vinyl auf den Produktkarten der Übersichten.
 *
 * Kundenvorgabe: Boden + Standard-Sockelleiste + Bauchemie (Verbrauch/m² × Preis
 * des größten Gebindes). Das ist derselbe Wert, den die Produktseite in der
 * Grundeinstellung (5 Pakete, Standard-Sockelleiste) in der Gesamt-Zeile zeigt –
 * dort bilden ProductPageContent (Boden, Sockelleiste) und `sparpaketAnzeige`
 * (Bauchemie) ihn. Der Zahnspachtel zählt dort nicht mit, hier auch nicht.
 * Klebe-Vinyl hat keine Dämmung, deshalb fehlt sie in der Summe.
 */
function berechneBauchemieProM2(products: StoreApiProduct[]): number {
  return KLEBEVINYL_SPARPAKET.bestandteile
    .filter((b) => b.imSetAnzeigen)
    .reduce((sum, b) => {
      const gebinde = products.filter((p) => b.produktIds.includes(p.id) && (p.paketinhalt || 0) > 0);
      if (gebinde.length === 0) return sum;
      const gross = gebinde.reduce((a, p) => ((p.paketinhalt || 0) > (a.paketinhalt || 0) ? p : a));
      return sum + b.verbrauchProM2 * (gross.price || 0);
    }, 0);
}

// Produkte einmal pro Seitenaufruf laden. Alle IDs, die die Karten eines
// Render-Durchlaufs anfragen, gehen gesammelt in einen Request.
const produktCache = new Map<number, Promise<StoreApiProduct | null>>();
let warteschlange: number[] = [];
let sammelAuftrag: Promise<Map<number, StoreApiProduct>> | null = null;

function ladeProdukt(id: number): Promise<StoreApiProduct | null> {
  const vorhanden = produktCache.get(id);
  if (vorhanden) return vorhanden;

  warteschlange.push(id);
  sammelAuftrag ??= Promise.resolve().then(() => {
    const ids = warteschlange;
    warteschlange = [];
    sammelAuftrag = null;
    return fetch('/api/products/by-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<StoreApiProduct[]>;
      })
      .then((list) => new Map(list.map((p) => [p.id, p])));
  });

  const auftrag = sammelAuftrag
    .then((map) => map.get(id) ?? null)
    .catch((error) => {
      // Fehler nicht cachen – der nächste Aufruf versucht es neu
      console.error('[Sparpaket] Produkt konnte nicht geladen werden:', id, error);
      produktCache.delete(id);
      return null;
    });
  produktCache.set(id, auftrag);
  return auftrag;
}

/**
 * Rabatt-Badge für Klebe-Vinyl (Kundenvorgabe): der höhere Wert aus Backend-Prozent
 * und der Ersparnis gegenüber dem Sparpaket-Streichpreis. Ohne Streichpreis (kein
 * Klebe-Vinyl / noch nicht geladen) bleibt der Backend-Wert.
 */
export function sparpaketRabattProzent(
  streichpreisProM2: number | null,
  preisProM2: number,
  backendProzent: number
): number {
  if (!streichpreisProM2 || streichpreisProM2 <= 0) return backendProzent;
  const berechnet = ((streichpreisProM2 - preisProM2) / streichpreisProM2) * 100;
  return Math.max(backendProzent, berechnet);
}

/**
 * Liefert den Streichpreis pro m² oder null – null bei Nicht-Klebe-Vinyl,
 * solange geladen wird oder wenn Preise fehlen. Die Karte zeigt dann ihren
 * bisherigen Streichpreis.
 *
 * @param sockelleisteProduct Standard-Sockelleiste, falls die Seite sie schon
 *   geladen hat (Kategorieseite); sonst wird sie über `sockelleisten_id` geholt.
 */
export function useSparpaketStreichpreisProM2(
  product: StoreApiProduct,
  sockelleisteProduct?: StoreApiProduct | null
): number | null {
  const isKlebeVinyl = product.categories?.some((c) => c.slug === KLEBEVINYL_SPARPAKET.kategorie) ?? false;
  const [wert, setWert] = useState<number | null>(null);

  useEffect(() => {
    if (!isKlebeVinyl) return;
    let abgebrochen = false;
    const sockelleisteId = product.sockelleisten_id || 0;

    Promise.all([
      Promise.all(SPARPAKET_PRODUKT_IDS.map(ladeProdukt)),
      sockelleisteProduct
        ? Promise.resolve(sockelleisteProduct)
        : sockelleisteId
          ? ladeProdukt(sockelleisteId)
          : Promise.resolve(null),
    ]).then(([bauchemie, sockelleiste]) => {
      if (abgebrochen) return;
      const geladen = bauchemie.filter((p): p is StoreApiProduct => p !== null);
      // Unvollständig → kein Wert, damit kein zu niedriger Streichpreis erscheint
      if (geladen.length === 0 || (sockelleisteId && !sockelleiste)) {
        setWert(null);
        return;
      }
      const boden = product.uvp || product.regular_price || product.price || 0;
      setWert(boden + (sockelleiste?.price || 0) + berechneBauchemieProM2(geladen));
    });

    return () => {
      abgebrochen = true;
    };
  }, [isKlebeVinyl, product, sockelleisteProduct]);

  return isKlebeVinyl ? wert : null;
}
