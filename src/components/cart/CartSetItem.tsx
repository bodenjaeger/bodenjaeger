'use client';

import React from 'react';
import Image from 'next/image';
import { CartSetItem as CartSetItemType, CartItemBase } from '@/types/cart-drawer';
import { formatPrice, formatUnitValue } from '@/lib/cart-utils';
import { isSparpaketItemType, SPARPAKET_LABELS } from '@/content/klebevinyl-sparpaket';

interface CartSetItemProps {
  setItem: CartSetItemType;
  onQuantityChange: (newQuantity: number) => void;
  onRemove: () => void;
}

export default function CartSetItem({ setItem, onQuantityChange, onRemove }: CartSetItemProps) {
  const { mainProduct, bundleProducts, setTotal } = setItem;

  // Calculate total content for main product (m², lfm, etc.)
  const totalM2 = mainProduct.quantity * mainProduct.unitValue;
  const mainContentUnit = mainProduct.contentUnit || 'm²';
  const mainPackageUnit = mainProduct.unit || 'Pak.';

  return (
    <div className="bg-pale rounded-md p-3 mb-3">
      {/* Main Product (Boden) */}
      <div className="flex flex-col gap-0.5 pb-2 border-b border-ash">
        {/* Zeile 1: Bild + "Boden • Produktname" + X */}
        <div className="flex flex-row items-start gap-2">
          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden">
            {mainProduct.image ? (
              <Image
                src={mainProduct.image}
                alt={mainProduct.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <span className="flex-1 text-sm font-semibold text-dark">
            Boden • {mainProduct.name}
          </span>
          <button
            onClick={onRemove}
            className="text-mid hover:text-brand text-xl font-bold leading-none transition-colors"
            title="Set entfernen"
          >
            ×
          </button>
        </div>

        {/* Zeile 2: X Pak. = Y m² */}
        <div className="ml-14 text-xs text-gray-500">
          {mainProduct.quantity} {mainPackageUnit} = {formatUnitValue(totalM2)} {mainContentUnit}
        </div>

        {/* Zeile 3: ~~Alt€~~ Neu€/m² (mittig) + Gesamt€ (rechts) */}
        <div className="ml-14 flex items-center justify-end gap-4">
          <div className="flex items-center gap-2 flex-1 justify-center">
            {mainProduct.originalPricePerUnit && mainProduct.originalPricePerUnit !== mainProduct.pricePerUnit && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(mainProduct.originalPricePerUnit)}
              </span>
            )}
            <span className="text-sm font-semibold text-brand">
              {formatPrice(mainProduct.pricePerUnit)} €/m²
            </span>
          </div>
          <span className="text-sm font-semibold text-dark">
            {formatPrice(mainProduct.total)} €
          </span>
        </div>

        {/* Zeile 4: [- Menge +] Pak. + [X] rechtsbündig (schon oben) */}
        <div className="ml-14 flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-ash rounded">
              <button
                onClick={() => onQuantityChange(mainProduct.quantity - 1)}
                disabled={mainProduct.quantity <= 1}
                className="px-2 py-0.5 text-mid hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                −
              </button>
              <span className="px-2 py-0.5 text-sm text-dark min-w-[2rem] text-center">
                {mainProduct.quantity}
              </span>
              <button
                onClick={() => onQuantityChange(mainProduct.quantity + 1)}
                className="px-2 py-0.5 text-mid hover:bg-gray-50 text-sm"
              >
                +
              </button>
            </div>
            <span className="text-xs text-mid">{mainPackageUnit}</span>
          </div>
        </div>
      </div>

      {/* Bundle Products (Dämmung, Sockelleiste) */}
      {bundleProducts.map((bundleProduct) => (
        <BundleProductItem key={bundleProduct.id} product={bundleProduct} />
      ))}

      {/* Set Total */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-ash">
        <span className="font-bold text-sm text-dark">Gesamt:</span>
        <span className="text-base font-bold text-dark">{formatPrice(setTotal)} €</span>
      </div>
    </div>
  );
}

// Bundle Product Component (Dämmung, Sockelleiste)
function BundleProductItem({ product }: { product: CartItemBase }) {
  // Determine product type label from itemType (preferred) or fallback to unit
  const getTypeLabel = () => {
    if (isSparpaketItemType(product.itemType)) {
      return SPARPAKET_LABELS[product.itemType];
    }
    if (product.itemType === 'baseboard') {
      return 'Sockelleiste';
    } else if (product.itemType === 'insulation') {
      return 'Dämmung';
    }
    // Fallback: unit-basierte Erkennung
    if (product.unit === 'Stk.' || product.unit === 'lfm' || product.unit === 'm') {
      return 'Sockelleiste';
    }
    return 'Dämmung';
  };

  const typeLabel = getTypeLabel();

  // Calculate total quantity × unitValue - handle invalid values
  const totalValue = (product.quantity && product.unitValue)
    ? product.quantity * product.unitValue
    : 0;

  // Use backend units from product, with sensible fallbacks
  const packageUnit = product.unit || (product.itemType === 'baseboard' ? 'Stk.' : 'Pak.');
  const unitDisplay = product.contentUnit || (product.itemType === 'baseboard' ? 'lfm' : 'm²');

  // Debug log
  console.log('🔧 BundleProduct:', {
    name: product.name,
    type: typeLabel,
    quantity: product.quantity,
    unitValue: product.unitValue,
    totalValue,
    unit: product.unit,
    packageUnit
  });

  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-ash last:border-b-0">
      {/* Zeile 1: Bild + "Dämmung" / "Sockelleiste" */}
      <div className="flex flex-row items-start gap-2">
        <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <span className="flex-1 text-sm font-semibold text-dark">
          {typeLabel}
        </span>
      </div>

      {/* Zeile 2: Produktname */}
      <div className="ml-14 text-xs text-dark">
        {product.name}
      </div>

      {/* Zeile 3: X Pak./Stk. = Y m²/m */}
      <div className="ml-14 text-xs text-gray-500">
        {product.quantity} {packageUnit} = {formatUnitValue(totalValue)} {unitDisplay}
      </div>

      {/* Zeile 4: ~~Alt€~~ Neu€/Einheit (mittig) + Gesamt€ (rechts) */}
      <div className="ml-14 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2 flex-1 justify-center">
          {product.originalPricePerUnit && product.originalPricePerUnit !== product.pricePerUnit && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.originalPricePerUnit)}
            </span>
          )}
          <span className="text-sm font-semibold text-brand">
            {formatPrice(product.pricePerUnit)} €/{unitDisplay}
          </span>
        </div>
        <span className="text-sm font-semibold text-dark">
          {formatPrice(product.total)} €
        </span>
      </div>
    </div>
  );
}
