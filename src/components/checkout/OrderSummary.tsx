'use client';

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { calculateShippingCost } from '@/lib/shippingConfig';
import { toValidationItems } from '@/lib/cart-utils';
import { PAKET_AKTION, calculatePaketAktion } from '@/lib/promo';
import { isSparpaketItemType } from '@/content/klebevinyl-sparpaket';
import type { AppliedCoupon } from '@/types/checkout';
import CouponInput from '@/components/checkout/CouponInput';

interface OrderSummaryProps {
  shippingMethod?: 'delivery' | 'pickup';
  appliedCoupon?: AppliedCoupon | null;
  couponNotice?: { type: 'replaced' | 'removed'; message: string } | null;
  onApplyCoupon?: (coupon: AppliedCoupon) => void;
  onRemoveCoupon?: () => void;
  onReplaceCoupon?: (oldCode: string, newCoupon: AppliedCoupon) => void;
  onDismissNotice?: () => void;
}

export default function OrderSummary({
  shippingMethod = 'delivery',
  appliedCoupon = null,
  couponNotice = null,
  onApplyCoupon,
  onRemoveCoupon,
  onReplaceCoupon,
  onDismissNotice,
}: OrderSummaryProps) {
  const { cartItems, totalPrice, itemCount } = useCart();

  // Pre-Discount Zwischensumme.
  const subtotal = totalPrice;

  // Paket-Aktion vor dem Gutschein: Der Aktionsrabatt ergibt sich aus den
  // Paketmengen im Warenkorb, der Gutschein aus dem Warenwert. Beide werden
  // addiert und gemeinsam gegen 0 geklemmt.
  const aktion = calculatePaketAktion(cartItems);
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const discountAmount = couponDiscount;
  const subtotalAfterDiscount = Math.max(0, subtotal - aktion.discount - couponDiscount);

  // Versandkosten-Schwelle (z.B. Free-Shipping ab 999€) wird auf den
  // diskontierten Subtotal angewendet — d.h. ein Coupon, der den Cart unter
  // die Schwelle drückt, verteuert den Versand.
  const baseShipping =
    shippingMethod === 'pickup'
      ? 0
      : calculateShippingCost(subtotalAfterDiscount, cartItems);
  const shipping = appliedCoupon?.freeShipping ? 0 : baseShipping;

  // Anzeige-Flags für Versandzeile.
  const showShippingStrikethrough =
    appliedCoupon?.freeShipping === true &&
    baseShipping > 0 &&
    shippingMethod === 'delivery';
  const showAlreadyFreeHint =
    appliedCoupon?.freeShipping === true &&
    baseShipping === 0 &&
    shippingMethod === 'delivery';

  const total = subtotalAfterDiscount + shipping;
  const mwst = total - total / 1.19;

  // Validation-Items für CouponInput (live aus aktuellem Cart).
  const validationItems = toValidationItems(cartItems);

  return (
    <div className="sticky top-6">
      {/* Notice (Coupon ersetzt / automatisch entfernt). Permanent für 'removed'
          (B4=b), Auto-Dismiss nach 5s für 'replaced' (im Parent gesteuert). */}
      {couponNotice && (
        <div
          className={`mb-4 p-3 rounded-lg border flex items-start gap-2 ${
            couponNotice.type === 'removed'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
          role="status"
        >
          <span className="text-sm flex-1">{couponNotice.message}</span>
          <button
            type="button"
            onClick={onDismissNotice}
            className="text-base leading-none hover:opacity-70"
            aria-label="Hinweis schließen"
          >
            ×
          </button>
        </div>
      )}

      {/* Produkt-Liste */}
      <div className="space-y-4 mb-6">
        {cartItems.filter((item) => !isSparpaketItemType(item.setItemType) || item.quantity > 0).map((item) => {
          const image = item.product.images?.[0]?.src || '/images/placeholder.jpg';
          const name = item.product.name;
          const einheit = item.product.einheit_short || 'm²';
          const priceUnit = einheit;

          // Preise berechnen - KORREKT für Set-Angebote
          let pricePerUnit: number;
          let totalItemPrice: number;
          let displayAmount: number;

          if (item.isSample) {
            // Muster sind immer kostenlos — Backend-Platzhalterpreis ignorieren.
            pricePerUnit = 0;
            displayAmount = item.quantity;
            totalItemPrice = 0;
          } else if (item.isSetItem && item.setPricePerUnit !== undefined && item.actualM2 !== undefined) {
            // Set-Item: Verwende Set-Preise (als Zahl konvertieren)
            pricePerUnit = Number(item.setPricePerUnit);
            displayAmount = Number(item.actualM2);
            totalItemPrice = pricePerUnit * displayAmount;
          } else {
            // Regular Item
            const rawPrice = item.product.price || 0;
            pricePerUnit = Number(rawPrice);
            const paketinhalt = item.product.paketinhalt || 1;
            // Paketpreis = Einzelpreis × Paketinhalt (gilt für ALLE Einheiten)
            displayAmount = item.quantity * paketinhalt;
            totalItemPrice = pricePerUnit * paketinhalt * item.quantity;
          }

          const isFree = pricePerUnit === 0 && (item.isSetItem || item.isSample);

          return (
            <div key={item.id} className="flex flex-row items-start gap-3">
              {/* Bild mit Badge */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover rounded"
                  sizes="64px"
                />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-mid text-white text-xs rounded-full flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-sm font-medium text-dark line-clamp-2">{name}</p>
                {!isFree && (
                  <p className="text-xs text-mid">
                    {pricePerUnit.toFixed(2).replace('.', ',')} €/{priceUnit}
                  </p>
                )}
                {item.isSetItem && (
                  <p className="text-xs text-mid italic">
                    (Set-Angebot)
                  </p>
                )}
              </div>

              {/* Preis */}
              {isFree ? (
                <span className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                  Kostenlos
                </span>
              ) : (
                <span className="text-sm font-medium text-dark">
                  {totalItemPrice.toFixed(2).replace('.', ',')} €
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Gutscheincode-Eingabe (klappbar, Phase B). */}
      {onApplyCoupon && onRemoveCoupon && onReplaceCoupon && (
        <CouponInput
          cartItems={validationItems}
          appliedCoupon={appliedCoupon}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
          onReplace={onReplaceCoupon}
        />
      )}

      {/* Summen */}
      <div className="space-y-2 py-4 border-t border-ash">
        <div className="flex justify-between text-sm text-mid">
          <span>Zwischensumme · {itemCount} Artikel</span>
          <span>{subtotal.toFixed(2).replace('.', ',')} €</span>
        </div>

        {/* Aktionsrabatt — steht über der Gutscheinzeile, weil er zuerst
            abgezogen wird. */}
        {aktion.discount > 0 && (
          <div className="flex justify-between text-sm text-brand">
            <span>
              {PAKET_AKTION.label}
              <span className="text-mid">
                {' '}
                ({aktion.freePackages} {aktion.freePackages === 1 ? 'Paket' : 'Pakete'} gratis)
              </span>
            </span>
            <span>−{aktion.discount.toFixed(2).replace('.', ',')} €</span>
          </div>
        )}

        {/* Rabattzeile — zwischen Zwischensumme und Versand (F-4=a). */}
        {appliedCoupon && discountAmount > 0 && (
          <div className="flex justify-between text-sm text-brand">
            <span>Rabatt ({appliedCoupon.code})</span>
            <span>−{discountAmount.toFixed(2).replace('.', ',')} €</span>
          </div>
        )}

        <div className="flex justify-between text-sm text-mid">
          <span>{shippingMethod === 'pickup' ? 'Abholung' : 'Versand'}</span>
          <span>
            {shippingMethod === 'pickup' ? (
              'Kostenlos'
            ) : showShippingStrikethrough ? (
              <>
                <span className="line-through mr-1">
                  {baseShipping.toFixed(2).replace('.', ',')} €
                </span>
                <span>0,00 €</span>
                <span className="ml-1 text-xs">(Gutschein)</span>
              </>
            ) : shipping === 0 ? (
              'Kostenlos'
            ) : (
              `${shipping.toFixed(2).replace('.', ',')} €`
            )}
          </span>
        </div>
        {showAlreadyFreeHint && (
          <p className="text-xs" style={{ color: 'var(--color-success)' }}>
            ✓ Code angewendet — Versand ist bereits kostenlos.
          </p>
        )}
      </div>

      {/* Gesamt */}
      <div className="flex justify-between items-baseline pt-4 border-t border-ash">
        <div>
          <span className="text-lg font-semibold text-dark">Gesamt</span>
          <p className="text-xs text-mid">
            inkl. {mwst.toFixed(2).replace('.', ',')} € MwSt
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-mid">EUR</span>
          <span className="text-xl font-bold text-dark ml-1">
            {total.toFixed(2).replace('.', ',')} €
          </span>
        </div>
      </div>

      {/* Vorteile */}
      <div className="mt-6 p-4 bg-pale rounded-lg">
        <h3 className="text-sm font-semibold text-dark mb-4">
          Deine Vorteile mit Bodenjäger
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🛡️</span>
            <div>
              <p className="text-sm font-medium text-dark">Sicher einkaufen</p>
              <p className="text-xs text-mid">
                Mit Trusted Shops Käuferschutz und sicheren Zahlungsmethoden.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🚚</span>
            <div>
              <p className="text-sm font-medium text-dark">Schneller &amp; zuverlässiger Versand</p>
              <p className="text-xs text-mid">
                Wir versenden deine Bestellung schnell und sicher direkt zu dir nach Hause.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🏬</span>
            <div>
              <p className="text-sm font-medium text-dark">Online bestellen &amp; im Markt abholen</p>
              <p className="text-xs text-mid">
                Alle Artikel kannst du bequem online bestellen und bei uns im Markt abholen.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">⭐</span>
            <div>
              <p className="text-sm font-medium text-dark">Fachberatung vom Bodenexperten</p>
              <p className="text-xs text-mid">
                Als Fachhändler beraten wir dich online und vor Ort im Markt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
