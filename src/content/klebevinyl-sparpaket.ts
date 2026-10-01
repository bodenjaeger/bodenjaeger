/**
 * Klebe-Vinyl Sparpaket
 *
 * Alle Böden der Kategorie `klebe-vinyl` bekommen ab 5 Paketen Grundierung,
 * Spachtelmasse, Kleber und Zahnspachtel kostenlos dazu. Unter 5 Paketen
 * bleibt nur die Sockelleiste im Set (wie bei den anderen Böden).
 *
 * Gebindegrößen kommen aus `paketinhalt` der Produkte, hier stehen nur die IDs.
 * Mengenberechnung: `calculateSparpaketQuantities()` in setCalculations.ts.
 * Konzept und Kundenentscheidungen: KLEBEVINYL_SPARPAKET.md
 */

export type SparpaketItemType = 'primer' | 'leveler' | 'adhesive' | 'trowel';

export interface SparpaketBestandteil {
  typ: SparpaketItemType;
  label: string;
  /** Verbrauch pro m² Boden in der Einheit des Produkts (kg bzw. Stk.) */
  verbrauchProM2: number;
  /** Alle Gebinde dieses Bestandteils (Produkt-IDs) */
  produktIds: number[];
  /** false = nicht im Set auf der Produktseite zeigen, aber in den Warenkorb legen */
  imSetAnzeigen: boolean;
}

export const KLEBEVINYL_SPARPAKET = {
  kategorie: 'klebe-vinyl',
  mindestPakete: 5,
  bestandteile: [
    { typ: 'primer', label: 'Grundierung', verbrauchProM2: 0.1, produktIds: [11968, 1681], imSetAnzeigen: true },
    { typ: 'leveler', label: 'Spachtelmasse', verbrauchProM2: 3, produktIds: [1685], imSetAnzeigen: true },
    { typ: 'adhesive', label: 'Kleber', verbrauchProM2: 0.3, produktIds: [11973, 11970], imSetAnzeigen: true },
    // 1 Stück pro angefangene 50 m²
    { typ: 'trowel', label: 'Zahnspachtel', verbrauchProM2: 1 / 50, produktIds: [11978], imSetAnzeigen: false },
  ] as SparpaketBestandteil[],
};

export const SPARPAKET_PRODUKT_IDS = KLEBEVINYL_SPARPAKET.bestandteile.flatMap((b) => b.produktIds);

export const SPARPAKET_LABELS: Record<SparpaketItemType, string> = {
  primer: 'Grundierung',
  leveler: 'Spachtelmasse',
  adhesive: 'Kleber',
  trowel: 'Zahnspachtel',
};

export function isSparpaketItemType(typ: string | undefined): typ is SparpaketItemType {
  return typ !== undefined && typ in SPARPAKET_LABELS;
}
