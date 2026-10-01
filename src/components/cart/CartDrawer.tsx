'use client';

import React, { useEffect, useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import {
  CartDrawerItem,
  CartSetItem as CartSetItemType,
  CartSingleItem as CartSingleItemType,
  CartItemBase,
  toProductUnit,
} from '@/types/cart-drawer';
import { calculateCartData } from '@/lib/cart-utils';
import { calculateSparpaketQuantities } from '@/lib/setCalculations';
import { isSparpaketItemType } from '@/content/klebevinyl-sparpaket';
import { track } from '@/lib/analytics/track';
import { cartItemsToGA4Items, mapCartItemToGA4Item } from '@/lib/analytics/mapItem';
import CartSetItemComponent from './CartSetItem';
import CartSingleItemComponent from './CartSingleItem';
import CartFooter from './CartFooter';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cartItems, totalPrice, updateQuantity, removeFromCart, removeSet, customerNote, setCustomerNote, deliveryNote, setDeliveryNote } = useCart();
  const [drawerItems, setDrawerItems] = useState<CartDrawerItem[]>([]);

  // GA4 view_cart — pro Öffnen des Drawers einmal feuern.
  useEffect(() => {
    if (!isOpen) return;
    const items = cartItemsToGA4Items(cartItems);
    if (items.length === 0) return;
    track.viewCart(items, totalPrice);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert CartContext items to CartDrawer format
  useEffect(() => {
    const convertedItems: CartDrawerItem[] = [];
    const processedSetIds = new Set<string>();

    cartItems.forEach((item) => {
      // Handle Set Items
      if (item.isSetItem && item.setId) {
        // Skip if we've already processed this set
        if (processedSetIds.has(item.setId)) {
          return;
        }

        // Find all items in this set
        const setItems = cartItems.filter((ci) => ci.setId === item.setId);

        // Find main product (floor)
        const mainItem = setItems.find((si) => si.setItemType === 'floor');
        if (!mainItem) return;

        // Convert main product to CartItemBase
        // ✅ USE SET PRICING FROM CART ITEM (setPricePerUnit, actualM2)
        const mainActualM2 = mainItem.actualM2 || 0;
        const mainSetPricePerUnit = mainItem.setPricePerUnit || 0;
        const mainRegularPricePerUnit = mainItem.regularPricePerUnit || mainSetPricePerUnit;

        const mainProduct: CartItemBase = {
          id: `main-${item.setId}`,
          productId: mainItem.id,
          name: mainItem.product.name,
          image: mainItem.product.images?.[0]?.src || '',
          quantity: mainItem.quantity,
          unit: toProductUnit(mainItem.product.verpackungsart_short, 'Pak.'),
          contentUnit: mainItem.product.einheit_short || 'm²',
          unitValue: mainActualM2 / mainItem.quantity, // content per package
          pricePerUnit: mainSetPricePerUnit,
          originalPricePerUnit: mainRegularPricePerUnit !== mainSetPricePerUnit ? mainRegularPricePerUnit : undefined,
          total: mainSetPricePerUnit * mainActualM2,
        };

        // Convert bundle products
        // Sparpaket-Gebinde mit 0 Stück bleiben im Warenkorb (für Neuberechnung), werden aber nicht angezeigt
        const bundleProducts: CartItemBase[] = setItems
          .filter((si) => si.setItemType !== 'floor')
          .filter((si) => !isSparpaketItemType(si.setItemType) || si.quantity > 0)
          .map((bundleItem) => {
            // ✅ USE SET PRICING FROM CART ITEM (setPricePerUnit, actualM2)
            const bundleActualM2 = bundleItem.actualM2 || 0;
            const bundleSetPricePerUnit = bundleItem.setPricePerUnit || 0;
            const bundleRegularPricePerUnit = bundleItem.regularPricePerUnit || bundleSetPricePerUnit;

            const isFree = bundleSetPricePerUnit === 0;

            // ⚠️ SAFETY: Avoid division by zero
            const bundleQuantity = bundleItem.quantity || 1;
            const unitValue = bundleActualM2 / bundleQuantity;

            return {
              id: `bundle-${bundleItem.id}`,
              productId: bundleItem.id,
              name: bundleItem.product.name,
              image: bundleItem.product.images?.[0]?.src || '',
              quantity: bundleItem.quantity,
              unit: toProductUnit(bundleItem.product.verpackungsart_short, bundleItem.setItemType === 'baseboard' ? 'Stk.' : 'Pak.'),
              contentUnit: bundleItem.product.einheit_short || (bundleItem.setItemType === 'baseboard' ? 'lfm' : 'm²'),
              unitValue,
              pricePerUnit: bundleSetPricePerUnit,
              originalPricePerUnit: bundleRegularPricePerUnit !== bundleSetPricePerUnit ? bundleRegularPricePerUnit : undefined,
              total: bundleSetPricePerUnit * bundleActualM2,
              isFree,
              itemType: bundleItem.setItemType,
            };
          });

        const setTotal = mainProduct.total + bundleProducts.reduce((sum, bp) => sum + bp.total, 0);

        const setItem: CartSetItemType = {
          type: 'set',
          setId: item.setId,
          mainProduct,
          bundleProducts,
          setTotal,
        };

        convertedItems.push(setItem);
        processedSetIds.add(item.setId);
      }
      // Handle Single Items
      else if (!item.isSetItem) {
        // Check if this is a sample (Muster) product
        if (item.isSample) {
          // Muster sind immer kostenlos; Fracht-Aufschlag erscheint im Checkout.
          const product: CartItemBase = {
            id: `single-${item.id}`,
            productId: item.id,
            name: item.product.name,
            image: item.product.images?.[0]?.src || '',
            quantity: item.quantity,
            unit: 'Stk.',
            unitValue: 1,
            pricePerUnit: 0,
            originalPricePerUnit: undefined,
            total: 0,
            isSample: true, // Mark as sample to lock quantity to 1
          };

          const singleItem: CartSingleItemType = {
            type: 'single',
            product,
          };

          convertedItems.push(singleItem);
        } else {
          // Regular product - use standard pricing
          const singlePaketinhalt = item.product.paketinhalt || 1;
          const unitPrice = item.product.price || 0;
          const regularUnitPrice = item.product.regular_price || undefined;
          const einheit = item.product.einheit_short || 'm²';
          const verpackungsart = toProductUnit(item.product.verpackungsart_short, 'Stk.');

          // Paketpreis = Einzelpreis × Paketinhalt (gilt für ALLE Einheiten: m², lfm, kg, Liter etc.)
          const paketpreis = unitPrice * singlePaketinhalt;

          const product: CartItemBase = {
            id: `single-${item.id}`,
            productId: item.id,
            name: item.product.name,
            image: item.product.images?.[0]?.src || '',
            quantity: item.quantity,
            unit: verpackungsart,
            contentUnit: einheit,
            unitValue: singlePaketinhalt,
            pricePerUnit: unitPrice,
            originalPricePerUnit: regularUnitPrice,
            total: paketpreis * item.quantity,
          };

          const singleItem: CartSingleItemType = {
            type: 'single',
            product,
          };

          convertedItems.push(singleItem);
        }
      }
    });

    setDrawerItems(convertedItems);
  }, [cartItems]);

  // Calculate cart data (pass cartItems for shipping rules)
  const cartData = calculateCartData(drawerItems, cartItems);

  // Handle quantity change for single items
  const handleSingleQuantityChange = (productId: number, newQuantity: number) => {
    updateQuantity(productId, newQuantity);
  };

  // Handle quantity change for set items
  // Uses same logic as setCalculations.ts: ceil/floor(newFloorM2 / bundlePaketinhalt)
  const handleSetQuantityChange = (setId: string, newQuantity: number) => {
    const setItem = drawerItems.find(
      (item): item is CartSetItemType => item.type === 'set' && item.setId === setId
    );
    if (!setItem) return;

    // New floor actualM2 = floor package size × new package count
    const newMainActualM2 = setItem.mainProduct.unitValue * newQuantity;
    updateQuantity(setItem.mainProduct.productId, newQuantity, newMainActualM2, setId);

    // Recalculate each bundle from scratch (identical to setCalculations.ts logic)
    // isFree → Math.floor (kostenlos: abrunden), premium → Math.ceil (aufpreis: aufrunden)
    setItem.bundleProducts.filter((bundleProduct) => !isSparpaketItemType(bundleProduct.itemType)).forEach((bundleProduct) => {
      const newBundleQuantity = bundleProduct.isFree
        ? Math.floor(newMainActualM2 / bundleProduct.unitValue)
        : Math.ceil(newMainActualM2 / bundleProduct.unitValue);
      const newBundleActualM2 = bundleProduct.unitValue * newBundleQuantity;

      updateQuantity(bundleProduct.productId, newBundleQuantity, newBundleActualM2, setId);
    });

    // Klebe-Vinyl Sparpaket: komplett neu berechnen (unter Mindestmenge alles 0)
    const sparpaketItems = cartItems.filter(
      (ci) => ci.setId === setId && isSparpaketItemType(ci.setItemType)
    );
    if (sparpaketItems.length > 0) {
      const sparpaket = calculateSparpaketQuantities(
        newQuantity,
        newMainActualM2,
        sparpaketItems.map((ci) => ci.product)
      );
      sparpaket.positionen.forEach((position) => {
        updateQuantity(position.product.id, position.packages, position.amount, setId);
      });
    }
  };

  // Handle remove single item
  const handleRemoveSingle = (productId: number) => {
    const target = cartItems.find((it) => it.id === productId && !it.isSetItem);
    if (target && target.quantity > 0) {
      track.removeFromCart([mapCartItemToGA4Item(target)]);
    }
    removeFromCart(productId);
  };

  // Handle remove set — ein Event mit allen Set-Bestandteilen.
  const handleRemoveSet = (setId: string) => {
    const setMembers = cartItems.filter((it) => it.setId === setId && it.quantity > 0);
    if (setMembers.length > 0) {
      track.removeFromCart(setMembers.map(mapCartItemToGA4Item));
    }
    removeSet(setId);
  };

  // Close drawer on checkout
  const handleCheckout = () => {
    onClose();
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          w-full md:w-[450px]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <h2 className="text-xl font-bold text-dark">Warenkorb</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Warenkorb schließen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {drawerItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-lg font-medium">Dein Warenkorb ist leer</p>
              <p className="text-sm mt-2">Füge Produkte hinzu, um fortzufahren</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drawerItems.map((item) => {
                if (item.type === 'set') {
                  return (
                    <CartSetItemComponent
                      key={item.setId}
                      setItem={item}
                      onQuantityChange={(newQty) => handleSetQuantityChange(item.setId, newQty)}
                      onRemove={() => handleRemoveSet(item.setId)}
                    />
                  );
                } else {
                  return (
                    <CartSingleItemComponent
                      key={item.product.id}
                      product={item.product}
                      onQuantityChange={(newQty) =>
                        handleSingleQuantityChange(item.product.productId, newQty)
                      }
                      onRemove={() => handleRemoveSingle(item.product.productId)}
                    />
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        {drawerItems.length > 0 && (
          <CartFooter
            subtotal={cartData.subtotal}
            shipping={cartData.shipping}
            savings={cartData.savings}
            total={cartData.total}
            aktionDiscount={cartData.aktionDiscount}
            aktionFreePackages={cartData.aktionFreePackages}
            onCheckout={handleCheckout}
            customerNote={customerNote}
            onCustomerNoteChange={setCustomerNote}
            deliveryNote={deliveryNote}
            onDeliveryNoteChange={setDeliveryNote}
          />
        )}
      </div>
    </>
  );
}
