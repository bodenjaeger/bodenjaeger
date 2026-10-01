/**
 * Set Calculations for Floor Product Bundles
 *
 * ✅ NUR MENGENBERECHNUNG - KEINE PREISE!
 * Preise kommen DIREKT aus der Datenbank (product.jaeger_meta.setangebot_*)
 *
 * Berechnet nur:
 * - Floor packages (Boden-Pakete)
 * - Insulation packages (Dämmungs-Pakete)
 * - Baseboard packages (Sockelleisten-Pakete)
 */

import type { StoreApiProduct } from './woocommerce';
import { KLEBEVINYL_SPARPAKET, type SparpaketItemType } from '@/content/klebevinyl-sparpaket';

/**
 * Calculate required packages for a given area and package content
 * @param isFree - true = KOSTENLOS (Math.floor), false = AUFPREIS (Math.ceil)
 */
export function calculatePackages(
  targetM2: number,
  paketinhalt: number,
  isFree: boolean = false
): number {
  if (isFree) {
    // KOSTENLOS: ABRUNDEN → drunter bleiben (kundenfreundlich)
    // Minimum 1 Paket wenn Menge > 0 (Produkt wurde ausgewählt)
    return targetM2 > 0 ? Math.max(1, Math.floor(targetM2 / paketinhalt)) : 0;
  } else {
    // AUFPREIS oder BODEN: AUFRUNDEN → drüber gehen (Kunde bekommt mehr)
    return Math.ceil(targetM2 / paketinhalt);
  }
}

/**
 * Calculate required linear meters for baseboards
 * Formula: m² × 1.0 = lfm
 *
 * Rationale: For typical room proportions, the perimeter (in meters)
 * approximately equals the floor area (in m²). This is a practical
 * rule of thumb used in the flooring industry.
 *
 * Example: A 26.7 m² room requires ~26.4 m of baseboard
 * (verified in Berechnung_Hintergund_Warenkorb_1_.xlsx)
 */
export function calculateBaseboard_lfm(floorM2: number): number {
  return floorM2 * 1.0;
}

/**
 * Calculate floor quantity with Verschnitt (waste factor)
 */
export interface FloorQuantityCalculation {
  wantedM2: number;          // User input
  verschnitt: number;        // Waste percentage
  targetM2: number;          // With waste
  paketinhalt: number;       // Package content
  packages: number;          // Packages needed
  actualM2: number;          // Actual m² after packages
}

export function calculateFloorQuantity(
  wantedM2: number,
  verschnitt: number,
  paketinhalt: number
): FloorQuantityCalculation {
  // Verschnitt wird NICHT automatisch angewendet (Excel-Logik).
  // Verschnitt ist nur ein Hinweis für den Kunden - er bestellt selbst mehr.
  const targetM2 = wantedM2;

  // BODEN immer AUFRUNDEN (isFree = false)
  const packages = calculatePackages(targetM2, paketinhalt, false);
  const actualM2 = packages * paketinhalt;

  return {
    wantedM2,
    verschnitt,
    targetM2,
    paketinhalt,
    packages,
    actualM2,
  };
}

/**
 * Calculate insulation (Dämmung) quantity
 * Can use either user-specified m² or default to floor m²
 */
export interface InsulationQuantityCalculation {
  requiredM2: number;        // User-specified or floor m²
  paketinhalt: number;       // Insulation package content
  packages: number;          // Packages needed
  actualM2: number;          // Actual m² after packages
  isFree: boolean;           // KOSTENLOS oder AUFPREIS
}

export function calculateInsulationQuantity(
  wantedM2: number,
  insulationPaketinhalt: number,
  isFree: boolean = false
): InsulationQuantityCalculation {
  // KOSTENLOS: ABRUNDEN, AUFPREIS: AUFRUNDEN
  const packages = calculatePackages(wantedM2, insulationPaketinhalt, isFree);
  const actualM2 = packages * insulationPaketinhalt;

  return {
    requiredM2: wantedM2,
    paketinhalt: insulationPaketinhalt,
    packages,
    actualM2,
    isFree,
  };
}

/**
 * Calculate baseboard (Sockelleisten) quantity
 * Can use either user-specified lfm or default calculated from floor m²
 */
export interface BaseboardQuantityCalculation {
  requiredLfm: number;       // User-specified or calculated from floor m²
  paketinhalt: number;       // Baseboard package content in lfm
  packages: number;          // Packages needed
  actualLfm: number;         // Actual lfm after packages
  isFree: boolean;           // KOSTENLOS oder AUFPREIS
}

export function calculateBaseboardQuantity(
  wantedLfm: number,
  baseboardPaketinhalt: number,
  isFree: boolean = false
): BaseboardQuantityCalculation {
  // KOSTENLOS: ABRUNDEN, AUFPREIS: AUFRUNDEN
  const packages = calculatePackages(wantedLfm, baseboardPaketinhalt, isFree);
  const actualLfm = packages * baseboardPaketinhalt;

  return {
    requiredLfm: wantedLfm,
    paketinhalt: baseboardPaketinhalt,
    packages,
    actualLfm,
    isFree,
  };
}

/**
 * Complete set quantity calculation
 */
export interface SetQuantityCalculation {
  floor: FloorQuantityCalculation;
  insulation: InsulationQuantityCalculation | null;
  baseboard: BaseboardQuantityCalculation | null;
}

export function calculateSetQuantities(
  wantedM2: number,
  floorProduct: StoreApiProduct,
  insulationProduct: StoreApiProduct | null,
  baseboardProduct: StoreApiProduct | null,
  customInsulationM2?: number,
  customBaseboardLfm?: number,
  standardInsulationProduct?: StoreApiProduct | null,
  standardBaseboardProduct?: StoreApiProduct | null
): SetQuantityCalculation {
  console.log('🔧 calculateSetQuantities INPUT:', {
    wantedM2,
    customInsulationM2,
    customBaseboardLfm,
    floorProduct: floorProduct.name,
    insulationProduct: insulationProduct?.name,
    baseboardProduct: baseboardProduct?.name
  });

  // Floor calculation - ✅ USE ROOT-LEVEL FIELDS
  const verschnitt = floorProduct.verschnitt || 0;
  const floorPaketinhalt = floorProduct.paketinhalt || 1;
  const floor = calculateFloorQuantity(wantedM2, verschnitt, floorPaketinhalt);

  console.log('🔧 Floor calculation:', floor);

  // Insulation calculation (if product exists) - ✅ USE ROOT-LEVEL FIELDS
  let insulation: InsulationQuantityCalculation | null = null;
  if (insulationProduct && insulationProduct.paketinhalt) {
    // Calculate verrechnung (use backend value or calculate difference from standard)
    const insulationPrice = insulationProduct.price || 0;
    const standardInsulationPrice = standardInsulationProduct?.price || 0;
    const calculatedVerrechnung = insulationProduct.verrechnung ?? Math.max(0, insulationPrice - standardInsulationPrice);

    // Check if insulation is FREE (verrechnung = 0)
    const insulationIsFree = calculatedVerrechnung === 0;

    // Use custom m² if provided, otherwise default to floor.actualM2 (Excel-Logik)
    // Excel: Dämmung basiert auf tatsächlich gekaufter Bodenfläche (26,7m²), nicht auf wantedM2
    const insulationM2 = customInsulationM2 !== undefined ? customInsulationM2 : floor.actualM2;

    console.log('🔧 Insulation calculation INPUT:', {
      customInsulationM2,
      'floor.actualM2': floor.actualM2,
      insulationM2,
      paketinhalt: insulationProduct.paketinhalt,
      isFree: insulationIsFree,
      calculatedVerrechnung
    });

    insulation = calculateInsulationQuantity(
      insulationM2,
      insulationProduct.paketinhalt,
      insulationIsFree
    );

    console.log('🔧 Insulation calculation OUTPUT:', insulation);
  }

  // Baseboard calculation (if product exists) - ✅ USE ROOT-LEVEL FIELDS
  let baseboard: BaseboardQuantityCalculation | null = null;
  if (baseboardProduct && baseboardProduct.paketinhalt) {
    // Calculate verrechnung (use backend value or calculate difference from standard)
    const baseboardPrice = baseboardProduct.price || 0;
    const standardBaseboardPrice = standardBaseboardProduct?.price || 0;
    const calculatedVerrechnung = baseboardProduct.verrechnung ?? Math.max(0, baseboardPrice - standardBaseboardPrice);

    // Check if baseboard is FREE (verrechnung = 0)
    const baseboardIsFree = calculatedVerrechnung === 0;

    // Use custom lfm if provided, otherwise calculate from floor.actualM2 (Excel-Logik)
    // Excel: Sockelleiste basiert auf tatsächlich gekaufter Bodenfläche (26,7m²), nicht auf wantedM2
    const baseboardLfm = customBaseboardLfm !== undefined
      ? customBaseboardLfm
      : calculateBaseboard_lfm(floor.actualM2);
    baseboard = calculateBaseboardQuantity(
      baseboardLfm,
      baseboardProduct.paketinhalt,
      baseboardIsFree
    );
  }

  return {
    floor,
    insulation,
    baseboard,
  };
}

// ========================================
// KLEBE-VINYL SPARPAKET (src/content/klebevinyl-sparpaket.ts)
// ========================================

export interface SparpaketPosition {
  typ: SparpaketItemType;
  product: StoreApiProduct;
  packages: number;          // Gebinde (0 = dieses Gebinde wird nicht gebraucht)
  amount: number;            // packages × paketinhalt (kg bzw. Stk.)
}

export interface SparpaketQuantityCalculation {
  aktiv: boolean;            // false = unter Mindestmenge, alle packages = 0
  positionen: SparpaketPosition[];
}

/**
 * Kleinste Gesamtmenge aus den Gebinden, die den Bedarf deckt.
 * Bei gleicher Menge gewinnt die Kombination mit weniger Gebinden.
 * Liefert die Anzahl je Gebinde in der Reihenfolge von `sizes`.
 */
function combineGebinde(bedarf: number, sizes: number[]): number[] {
  // FP-sicher: 16,7 × 3 = 50,100000000000001 soll nicht auf ein Gebinde mehr springen
  const need = bedarf - 1e-9;
  type Kandidat = { counts: number[]; total: number; packs: number };
  const result: { best: Kandidat | null } = { best: null };

  const search = (index: number, counts: number[], covered: number) => {
    if (index === sizes.length - 1) {
      const last = Math.max(0, Math.ceil((need - covered) / sizes[index]));
      const finalCounts = [...counts, last];
      const total = covered + last * sizes[index];
      const packs = finalCounts.reduce((a, b) => a + b, 0);
      const best = result.best;
      if (!best || total < best.total - 1e-9 || (Math.abs(total - best.total) < 1e-9 && packs < best.packs)) {
        result.best = { counts: finalCounts, total, packs };
      }
      return;
    }
    const max = Math.max(0, Math.ceil((need - covered) / sizes[index]));
    for (let n = 0; n <= max; n++) {
      search(index + 1, [...counts, n], covered + n * sizes[index]);
    }
  };

  search(0, [], 0);
  return result.best?.counts ?? sizes.map(() => 0);
}

/**
 * Sparpaket-Mengen für eine Bodenfläche. NUR MENGEN, keine Preise.
 * Basis ist die tatsächliche Bodenfläche nach Aufrunden auf ganze Pakete.
 * Jedes geladene Gebinde bekommt eine Position (ggf. mit 0), damit der
 * Warenkorb bei Mengenänderung zwischen den Gebinden wechseln kann.
 */
export function calculateSparpaketQuantities(
  floorPackages: number,
  floorM2: number,
  sparpaketProducts: StoreApiProduct[]
): SparpaketQuantityCalculation {
  const aktiv = floorPackages >= KLEBEVINYL_SPARPAKET.mindestPakete;
  const positionen: SparpaketPosition[] = [];

  for (const bestandteil of KLEBEVINYL_SPARPAKET.bestandteile) {
    const products = bestandteil.produktIds
      .map((id) => sparpaketProducts.find((p) => p.id === id))
      .filter((p): p is StoreApiProduct => p !== undefined && (p.paketinhalt || 0) > 0);
    if (products.length === 0) continue;

    const sizes = products.map((p) => p.paketinhalt as number);
    const counts = aktiv
      ? combineGebinde(floorM2 * bestandteil.verbrauchProM2, sizes)
      : sizes.map(() => 0);

    products.forEach((product, i) => {
      positionen.push({
        typ: bestandteil.typ,
        product,
        packages: counts[i],
        amount: counts[i] * sizes[i],
      });
    });
  }

  return { aktiv, positionen };
}

// ========================================
// PREISBERECHNUNG ENTFERNT
// ========================================
// Preise kommen DIREKT aus der Datenbank:
// - product.jaeger_meta.setangebot_einzelpreis
// - product.jaeger_meta.setangebot_gesamtpreis
// - product.jaeger_meta.setangebot_ersparnis_euro
// - product.jaeger_meta.setangebot_ersparnis_prozent ✅
//
// Keine Frontend-Berechnung mehr nötig!

/**
 * Cart item for set bundle
 */
export interface SetCartItem {
  floor: {
    product: StoreApiProduct;
    packages: number;
  };
  insulation: {
    product: StoreApiProduct;
    packages: number;
  } | null;
  baseboard: {
    product: StoreApiProduct;
    packages: number;
  } | null;
}

/**
 * Prepare set for cart
 */
export function prepareSetForCart(
  quantities: SetQuantityCalculation,
  floorProduct: StoreApiProduct,
  insulationProduct: StoreApiProduct | null,
  baseboardProduct: StoreApiProduct | null
): SetCartItem {
  return {
    floor: {
      product: floorProduct,
      packages: quantities.floor.packages,
    },
    insulation: insulationProduct && quantities.insulation ? {
      product: insulationProduct,
      packages: quantities.insulation.packages,
    } : null,
    baseboard: baseboardProduct && quantities.baseboard ? {
      product: baseboardProduct,
      packages: quantities.baseboard.packages,
    } : null,
  };
}
