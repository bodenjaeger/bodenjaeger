// Cart Drawer Types for Mini-Warenkorb with Set-Angebote support

import type { SparpaketItemType } from '@/content/klebevinyl-sparpaket';

export type ProductUnit = 'Pak.' | 'Rol.' | 'Stk.' | 'm²' | 'm' | 'lfm';

/**
 * Helper function to safely convert string to ProductUnit
 */
export function toProductUnit(value: string | null | undefined, fallback: ProductUnit = 'm²'): ProductUnit {
  const validUnits: ProductUnit[] = ['Pak.', 'Rol.', 'Stk.', 'm²', 'm', 'lfm'];
  if (value && validUnits.includes(value as ProductUnit)) {
    return value as ProductUnit;
  }
  return fallback;
}

export interface CartItemBase {
  id: string;
  productId: number;
  name: string;
  image: string;
  quantity: number;
  unit: ProductUnit;       // package unit: Pak., Stk., Rol. (from verpackungsart_short)
  contentUnit?: string;    // content unit: m², lfm, m (from einheit_short)
  unitValue: number;       // content per package (paketinhalt), e.g. 2.22 m²/Pak
  pricePerUnit: number; // Current price per unit
  originalPricePerUnit?: number; // UVP (strikethrough)
  total: number;
  isFree?: boolean; // Free items in set
  itemType?: 'floor' | 'insulation' | 'baseboard' | SparpaketItemType; // Type for bundle products
  isSample?: boolean; // Sample products (locked to quantity 1)
}

export interface CartSetItem {
  type: 'set';
  setId: string; // Unique set ID
  mainProduct: CartItemBase; // Main product with quantity stepper
  bundleProducts: CartItemBase[]; // Accessories without quantity stepper
  setTotal: number; // Total price of the set
}

export interface CartSingleItem {
  type: 'single';
  product: CartItemBase;
}

export type CartDrawerItem = CartSetItem | CartSingleItem;

export interface CartDrawerData {
  items: CartDrawerItem[];
  subtotal: number;
  shipping: number;
  savings: number; // Savings/discount
  total: number;
  /** Rabatt einer laufenden Paket-Aktion in EUR (0 = keine Aktion/kein Anspruch). */
  aktionDiscount: number;
  /** Anzahl der Gratis-Pakete, aus denen sich `aktionDiscount` ergibt. */
  aktionFreePackages: number;
}

export interface CartDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}
