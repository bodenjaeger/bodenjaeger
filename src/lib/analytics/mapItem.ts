import type { StoreApiProduct } from '@/lib/woocommerce';
import type { CartItem } from '@/contexts/CartContext';
import type { GA4Item } from './types';

export interface MapItemOptions {
  variant?: string;
  pricePerUnitOverride?: number;
  category?: string;
}

// price = €/Paket (für GA4 gilt: value = sum(price * quantity)).
// Bei paketweise verkauften Produkten ist quantity = packages, also
// muss price der Paketpreis sein, nicht der €/m²-Preis.
export function mapProductToItem(
  product: StoreApiProduct,
  quantity: number,
  options?: MapItemOptions
): GA4Item {
  const item: GA4Item = {
    item_id: String(product.id),
    item_name: product.name,
    price: options?.pricePerUnitOverride ?? Number(product.price ?? 0),
    quantity,
    item_brand: 'Bodenjäger',
  };

  const category = options?.category ?? product.categories?.[0]?.name;
  if (category) item.item_category = category;
  if (options?.variant) item.item_variant = options.variant;

  return item;
}

const SET_VARIANT: Record<NonNullable<CartItem['setItemType']>, string> = {
  floor: 'Set: Boden',
  insulation: 'Set: Dämmung',
  baseboard: 'Set: Sockelleiste',
  primer: 'Set: Sparpaket',
  leveler: 'Set: Sparpaket',
  adhesive: 'Set: Sparpaket',
  trowel: 'Set: Sparpaket',
};

export function mapCartItemToGA4Item(item: CartItem): GA4Item {
  if (item.isSample) {
    return {
      item_id: String(item.id),
      item_name: item.product.name,
      price: 0,
      quantity: item.quantity,
      item_brand: 'Bodenjäger',
      item_category: 'Muster',
      item_variant: 'Muster',
    };
  }

  const paketinhalt = item.product.paketinhalt || 1;

  if (
    item.isSetItem &&
    item.setPricePerUnit !== undefined &&
    item.actualM2 !== undefined
  ) {
    // setPricePerUnit ist €/m² (bzw. €/lfm). Wir pushen €/Paket, damit
    // price * quantity = item-Total und damit value = setTotal.
    return {
      item_id: String(item.id),
      item_name: item.product.name,
      price: Number(item.setPricePerUnit) * paketinhalt,
      quantity: item.quantity,
      item_brand: 'Bodenjäger',
      item_category: item.product.categories?.[0]?.name,
      item_variant: SET_VARIANT[item.setItemType ?? 'floor'],
    };
  }

  return {
    item_id: String(item.id),
    item_name: item.product.name,
    price: Number(item.product.price ?? 0) * paketinhalt,
    quantity: item.quantity,
    item_brand: 'Bodenjäger',
    item_category: item.product.categories?.[0]?.name,
  };
}

export function cartItemsToGA4Items(items: CartItem[]): GA4Item[] {
  return items.filter((it) => it.quantity > 0).map(mapCartItemToGA4Item);
}
