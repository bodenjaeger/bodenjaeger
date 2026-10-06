'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculateShippingCost } from '@/lib/shippingConfig';
import { toValidationItems } from '@/lib/cart-utils';
import {
  PAKET_AKTION,
  calculatePaketAktion,
  getFreePackages,
  getLineDiscount,
  isAktionForced,
} from '@/lib/promo';
import { track } from '@/lib/analytics/track';
import { cartItemsToGA4Items } from '@/lib/analytics/mapItem';
import type { PaymentType, PurchaseTrackingPayload } from '@/lib/analytics/types';
import { useAttribution } from '@/hooks/useAttribution';
import type { AppliedCoupon } from '@/types/checkout';
import type { ValidateCouponResult } from '@/lib/coupon';
import OrderSummary from '@/components/checkout/OrderSummary';
import ExpressCheckout from '@/components/checkout/ExpressCheckout';
import GewaehrleistungsMitteilung from '@/components/checkout/GewaehrleistungsMitteilung';

type PaymentMethod = 'stripe' | 'paypal' | 'bacs' | 'klarna';
type ShippingMethod = 'delivery' | 'pickup';

interface FormData {
  // Contact
  email: string;
  phone: string;
  // Shipping
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  country: string;
  // Billing (optional, falls abweichend)
  billingFirstName: string;
  billingLastName: string;
  billingCompany: string;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingPostcode: string;
  billingCountry: string;
  // Options
  sameAsBilling: boolean;
  paymentMethod: PaymentMethod;
  acceptTerms: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, totalPrice, customerNote, deliveryNote } = useCart();

  /**
   * Vorschau-/Testmodus (NEXT_PUBLIC_AKTION_FORCE=1, nur auf Preview-
   * Deployments gesetzt). Blendet Stripe, Klarna, PayPal und den
   * Express-Button aus, damit ein Aktions-Test keine echte Zahlung auslösen
   * kann. Übrig bleibt Vorkasse — die Bestellung landet als Testbestellung
   * markiert in WooCommerce (create-order/route.ts).
   */
  const isVorschauModus = isAktionForced();
  const { isLoggedIn } = useAuth();
  const attribution = useAttribution();

  const [formData, setFormData] = useState<FormData>({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    postcode: '',
    country: 'DE',
    billingFirstName: '',
    billingLastName: '',
    billingCompany: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingPostcode: '',
    billingCountry: 'DE',
    sameAsBilling: true,
    // Im Vorschau-Modus startet der Checkout auf Vorkasse — die Live-Gateways
    // sind dort ausgeblendet (siehe isVorschauModus).
    paymentMethod: isAktionForced() ? 'bacs' : 'stripe',
    acceptTerms: false,
  });

  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('delivery');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon-State. Bleibt bewusst in-memory (kein localStorage, kein Mount-Hook):
  // Bei Page-Reload muss der Kunde den Code erneut eingeben — er hat ihn aus dem
  // Marketing-Material und das ist akzeptabel.
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponNotice, setCouponNotice] = useState<{
    type: 'replaced' | 'removed';
    message: string;
  } | null>(null);

  // Auto-Dismiss der 'replaced'-Notice nach 5s. 'removed'-Notice bleibt
  // permanent (B4=b) und muss aktiv vom User geschlossen werden.
  useEffect(() => {
    if (couponNotice?.type !== 'replaced') return;
    const timer = setTimeout(() => setCouponNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [couponNotice]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      router.push('/cart');
    }
  }, [cartItems, router]);

  // GA4 begin_checkout — einmal beim Mount, sobald der Cart befüllt ist.
  // Step-Wechsel innerhalb der Single-Page-Form NICHT nochmal feuern.
  const beginCheckoutTracked = useRef(false);
  useEffect(() => {
    if (beginCheckoutTracked.current) return;
    if (cartItems.length === 0) return;
    const items = cartItemsToGA4Items(cartItems);
    if (items.length === 0) return;
    track.beginCheckout(items, totalPrice);
    beginCheckoutTracked.current = true;
  }, [cartItems, totalPrice]);

  // GA4 add_payment_info — bei jedem Wechsel der Zahlungsart erneut feuern.
  useEffect(() => {
    if (cartItems.length === 0) return;
    const items = cartItemsToGA4Items(cartItems);
    if (items.length === 0) return;
    track.addPaymentInfo(items, totalPrice, formData.paymentMethod);
  }, [formData.paymentMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coupon-Re-Validation bei kritischen Änderungen (Entscheidung B3=c).
  // Trigger: cartItems.length, totalPrice, shippingMethod. Adress-Eingaben
  // lösen KEINE Re-Validation aus.
  // Bei valid:false wird der Coupon entfernt und eine Notice gesetzt (B4=b,
  // permanent bis User schließt — Anzeige in Phase D).
  useEffect(() => {
    if (!appliedCoupon) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/checkout/validate-coupon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: appliedCoupon.code,
            cartItems: toValidationItems(cartItems),
          }),
        });
        if (cancelled) return;
        const result: ValidateCouponResult = await response.json();
        if (!result.valid) {
          setAppliedCoupon(null);
          setCouponNotice({
            type: 'removed',
            message: `Code „${appliedCoupon.code}" wurde entfernt: ${result.message}`,
          });
        } else if (
          result.coupon.discountAmount !== appliedCoupon.discountAmount ||
          result.coupon.freeShipping !== appliedCoupon.freeShipping
        ) {
          // Discount-Betrag/freeShipping wurde durch Cart-Änderung neu berechnet —
          // aktualisiere lokalen State (silent, keine Notice).
          setAppliedCoupon(result.coupon);
        }
      } catch (err) {
        if (cancelled) return;
        // Netzfehler: Coupon im State behalten, kein UI-Disruption.
        // WC validiert beim Order-Submit nochmal autoritativ.
        console.error('[checkout] Coupon re-validation failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-Validation NUR bei diesen drei Triggern (laut Spec). `appliedCoupon` und
    // `cartItems` werden im Effect gelesen, sind aber bewusst nicht in den Deps:
    // - `appliedCoupon`: ein Apply triggert die Validation eigenständig (Phase B)
    // - `cartItems`: stabile Referenz pro Render würde sonst dauerhafte Re-Runs auslösen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length, totalPrice, shippingMethod]);

  // Auto-fill from customer account
  useEffect(() => {
    if (!isLoggedIn) return;

    fetch('/api/auth/customer')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) return;
        const c = data.customer;
        const billing = c.billing || {};
        const shipping = c.shipping || {};

        // Prüfe ob eine echte Lieferadresse existiert (nicht nur Name)
        const hasShippingAddress = !!(shipping.address_1 && shipping.city && shipping.postcode);

        // Wenn keine separate Lieferadresse: Rechnungsadresse als Lieferadresse verwenden
        const shippingSource = hasShippingAddress ? shipping : billing;

        // Prüfe ob Rechnungs- und Lieferadresse identisch sind
        const addressesMatch = !hasShippingAddress || (
          billing.address_1 === shipping.address_1 &&
          billing.city === shipping.city &&
          billing.postcode === shipping.postcode
        );

        setFormData((prev) => ({
          ...prev,
          // Kontakt
          email: prev.email || c.email || billing.email || '',
          phone: prev.phone || billing.phone || '',
          // Lieferadresse (Shipping, Fallback auf Billing)
          firstName: prev.firstName || shippingSource.first_name || billing.first_name || '',
          lastName: prev.lastName || shippingSource.last_name || billing.last_name || '',
          company: prev.company || shippingSource.company || billing.company || '',
          address1: prev.address1 || shippingSource.address_1 || '',
          address2: prev.address2 || shippingSource.address_2 || '',
          city: prev.city || shippingSource.city || '',
          postcode: prev.postcode || shippingSource.postcode || '',
          country: shippingSource.country || prev.country,
          // Rechnungsadresse
          billingFirstName: prev.billingFirstName || billing.first_name || '',
          billingLastName: prev.billingLastName || billing.last_name || '',
          billingCompany: prev.billingCompany || billing.company || '',
          billingAddress1: prev.billingAddress1 || billing.address_1 || '',
          billingAddress2: prev.billingAddress2 || billing.address_2 || '',
          billingCity: prev.billingCity || billing.city || '',
          billingPostcode: prev.billingPostcode || billing.postcode || '',
          billingCountry: billing.country || prev.billingCountry,
          // Wenn Adressen gleich: sameAsBilling bleibt true
          sameAsBilling: addressesMatch,
        }));
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // Coupon-Handler — werden von CouponInput (via OrderSummary) aufgerufen.
  const handleApplyCoupon = (coupon: AppliedCoupon) => {
    setAppliedCoupon(coupon);
    setCouponNotice(null);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponNotice(null);
  };

  const handleReplaceCoupon = (oldCode: string, newCoupon: AppliedCoupon) => {
    setAppliedCoupon(newCoupon);
    setCouponNotice({
      type: 'replaced',
      message: `Code „${oldCode}" durch „${newCoupon.code}" ersetzt.`,
    });
  };

  const handleDismissNotice = () => setCouponNotice(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validierung
      if (!formData.email || !formData.phone || !formData.firstName || !formData.lastName) {
        setError('Bitte füllen Sie alle Pflichtfelder aus');
        setLoading(false);
        return;
      }

      if (shippingMethod === 'delivery' && (!formData.address1 || !formData.city || !formData.postcode)) {
        setError('Bitte füllen Sie alle Pflichtfelder der Lieferadresse aus');
        setLoading(false);
        return;
      }

      if (shippingMethod === 'pickup' && (!formData.billingAddress1 || !formData.billingCity || !formData.billingPostcode)) {
        setError('Bitte füllen Sie alle Pflichtfelder der Rechnungsadresse aus');
        setLoading(false);
        return;
      }

      if (!formData.acceptTerms) {
        setError('Bitte akzeptieren Sie die AGB und Datenschutzerklärung');
        setLoading(false);
        return;
      }

      // Line Items aus Cart erstellen (Items mit quantity 0 ausfiltern).
      // Muster sind immer kostenlos – der Fracht-Aufschlag für Muster 4+
      // wird in calculateShippingCost auf die Versandkosten aufgeschlagen.
      const line_items = cartItems.filter((item) => item.quantity > 0).map((item) => {
        let totalPrice: number;

        if (item.isSample) {
          totalPrice = 0;
        } else if (item.isSetItem && item.setPricePerUnit !== undefined && item.actualM2 !== undefined) {
          // Set-Angebot Item: Verwende Set-Preis, NICHT regulären Preis!
          // setPricePerUnit ist bereits der korrekte Preis (0 für kostenlos, verrechnung für Premium)
          totalPrice = item.setPricePerUnit * item.actualM2;
        } else {
          // Reguläres Item
          const paketinhalt = item.product.paketinhalt || 1;
          // Paketpreis = Einzelpreis × Paketinhalt (gilt für ALLE Einheiten: m², lfm, kg, Liter etc.)
          totalPrice = item.product.price * paketinhalt * item.quantity;
        }

        // Metadata für Set-Angebot Items (umfassend für Rechnungen/Refunds)
        const metadata = [];
        if (item.isSetItem) {
          metadata.push(
            { key: '_set_angebot', value: 'true' },
            { key: '_set_id', value: item.setId || '' },
            { key: '_set_item_type', value: item.setItemType || '' },
            { key: '_set_price_per_unit', value: item.setPricePerUnit?.toString() || '0' },
            { key: '_regular_price_per_unit', value: item.regularPricePerUnit?.toString() || '0' },
            { key: '_actual_m2', value: item.actualM2?.toString() || '0' },
            { key: '_savings', value: ((item.regularPricePerUnit || 0) * (item.actualM2 || 0) - totalPrice).toFixed(2) }
          );
        }

        if (item.isSample) {
          metadata.push({ key: '_is_sample', value: 'true' });
        }

        // Paket-Aktion: `subtotal` bleibt der volle Betrag, `total` sinkt um
        // den Wert der Gratis-Pakete. WooCommerce weist die Differenz dadurch
        // als Rabatt an der Position aus, statt den Preis stillschweigend zu
        // drücken.
        const aktionDiscount = getLineDiscount(item);
        const lineTotal = Math.max(0, totalPrice - aktionDiscount);

        if (aktionDiscount > 0) {
          metadata.push(
            { key: '_aktion', value: PAKET_AKTION.id },
            { key: '_aktion_gratis_pakete', value: getFreePackages(item).toString() },
            { key: '_aktion_rabatt', value: aktionDiscount.toFixed(2) }
          );
        }

        return {
          product_id: item.product.id,
          quantity: item.quantity,
          subtotal: totalPrice.toFixed(2),
          total: lineTotal.toFixed(2),
          name: item.product.name,
          meta_data: metadata,
        };
      });

      // Billing Address
      let billing;
      if (shippingMethod === 'pickup') {
        // Bei Abholung: Rechnungsadresse aus den Billing-Feldern
        billing = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company: formData.company,
          address_1: formData.billingAddress1,
          address_2: formData.billingAddress2,
          city: formData.billingCity,
          postcode: formData.billingPostcode,
          country: formData.billingCountry || 'DE',
          email: formData.email,
          phone: formData.phone,
        };
      } else if (formData.sameAsBilling) {
        billing = {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company: formData.company,
          address_1: formData.address1,
          address_2: formData.address2,
          city: formData.city,
          postcode: formData.postcode,
          country: formData.country,
          email: formData.email,
          phone: formData.phone,
        };
      } else {
        billing = {
          first_name: formData.billingFirstName,
          last_name: formData.billingLastName,
          company: formData.billingCompany,
          address_1: formData.billingAddress1,
          address_2: formData.billingAddress2,
          city: formData.billingCity,
          postcode: formData.billingPostcode,
          country: formData.billingCountry,
          email: formData.email,
          phone: formData.phone,
        };
      }

      // Shipping Address
      const shipping = shippingMethod === 'pickup'
        ? {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company: 'Abholung im Fachmarkt',
            address_1: 'Neckarstraße 9',
            address_2: '',
            city: 'Hückelhoven',
            postcode: '41836',
            country: 'DE',
          }
        : {
            first_name: formData.firstName,
            last_name: formData.lastName,
            company: formData.company,
            address_1: formData.address1,
            address_2: formData.address2,
            city: formData.city,
            postcode: formData.postcode,
            country: formData.country,
          };

      // Versandkosten berechnen.
      // Schwelle (z.B. Free-Shipping ab 999€) wird auf den DISKONTIERTEN
      // Subtotal angewendet — sonst würden Coupons den Versand künstlich
      // kostenfrei lassen, obwohl der Cart unter die Schwelle gerutscht ist.
      // free_shipping-Coupons nullt der Server zusätzlich autoritativ.
      // Der Aktionsrabatt steckt bereits in den Line-Item-Totals; für die
      // Versandstaffel muss er hier noch einmal explizit abgezogen werden.
      const aktionDiscount = calculatePaketAktion(cartItems).discount;
      const subtotalAfterDiscount = Math.max(
        0,
        totalPrice - aktionDiscount - (appliedCoupon?.discountAmount ?? 0)
      );
      const shippingCost =
        shippingMethod === 'pickup'
          ? 0
          : appliedCoupon?.freeShipping
            ? 0
            : calculateShippingCost(subtotalAfterDiscount, cartItems);

      // API Call
      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing,
          shipping,
          line_items,
          payment_method: formData.paymentMethod,
          shipping_method: shippingMethod,
          customer_note: [
            deliveryNote.trim() && `Lieferwunsch: ${deliveryNote.trim()}`,
            customerNote.trim() && `Anmerkung: ${customerNote.trim()}`,
          ].filter(Boolean).join('\n\n'),
          shipping_cost: shippingCost,
          attribution,
          // Coupon-Felder werden nur mitgesendet, wenn ein Code aktiv ist.
          // Server re-validiert serverseitig (Race-Schutz bei zwischenzeitlicher
          // Backend-Deaktivierung) und reicht WC `coupon_lines` weiter.
          ...(appliedCoupon
            ? {
                couponCode: appliedCoupon.code,
                cartItemsForValidation: toValidationItems(cartItems),
              }
            : {}),
        }),
      });

      const result = await response.json();

      if (result.success && result.redirectUrl) {
        // GA4 purchase-Puffer: Tracking-Daten in localStorage ablegen,
        // damit die Success-Page das Event ohne API-Refetch feuern kann.
        // localStorage statt sessionStorage — Stripe/PayPal-Redirect ist Cross-Domain
        // und Tab-scoped sessionStorage ist dabei nicht zuverlässig.
        try {
          // Bei aktivem Coupon authoritative Brutto-Endsumme aus WC-Order übernehmen
          // (`result.total`), nicht das Pre-Discount-`totalPrice` aus dem Frontend.
          // Bei `freeShipping` ist die Versand-Komponente in `result.total` bereits
          // null — für die separate `shipping`-GA4-Property nutzen wir den
          // tatsächlich gezahlten Versand (0 bei free_shipping, sonst `shippingCost`).
          const trackedValue = result.total
            ? parseFloat(result.total)
            : totalPrice - aktionDiscount + shippingCost;
          const trackedShipping = appliedCoupon?.freeShipping ? 0 : shippingCost;

          const trackingPayload: PurchaseTrackingPayload = {
            items: cartItemsToGA4Items(cartItems),
            value: trackedValue,
            currency: 'EUR',
            paymentType: formData.paymentMethod as PaymentType,
            shipping: trackedShipping,
          };
          localStorage.setItem(
            `order_${result.orderId}_tracking`,
            JSON.stringify(trackingPayload)
          );
        } catch (err) {
          console.warn('[track.purchase] localStorage write failed:', err);
        }

        // Redirect zum Payment Gateway oder Success-Page
        window.location.href = result.redirectUrl;
      } else {
        // Coupon-spezifischer Fehler: zwischen Apply und Submit wurde der Code
        // ungültig (z.B. im WC-Backend deaktiviert). Coupon lokal entfernen und
        // Notice setzen, damit Phase-D-UI den Kunden informiert.
        if (result.errorCode && appliedCoupon) {
          setCouponNotice({
            type: 'removed',
            message: `Code „${appliedCoupon.code}" wurde entfernt: ${result.error}`,
          });
          setAppliedCoupon(null);
        }
        setError(result.error || 'Bestellung konnte nicht erstellt werden');
        setLoading(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return null; // Wird zu /cart weitergeleitet
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content - Two Column Layout */}
      <form onSubmit={handleSubmit}>
        <div className="content-container py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8">
            {/* LINKE SPALTE (60%) */}
            <div className="w-full lg:w-3/5 order-2 lg:order-1">
              {/* Vorschau-Hinweis: macht unübersehbar, dass hier getestet wird
                  und keine echte Zahlung möglich ist. */}
              {isVorschauModus && (
                <div
                  className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4"
                  role="status"
                >
                  <p className="text-sm font-semibold text-amber-900">
                    Vorschau-Modus — Testbestellung
                  </p>
                  <p className="mt-1 text-xs text-amber-900">
                    Die Aktion &bdquo;{PAKET_AKTION.label}&ldquo; ist hier zum Testen dauerhaft
                    aktiv. Es ist nur Vorkasse möglich, es wird keine Zahlung
                    ausgelöst. Die Bestellung wird in WooCommerce als
                    Testbestellung markiert und muss dort storniert werden.
                  </p>
                </div>
              )}

              {!isVorschauModus && <ExpressCheckout />}

              {/* Kontakt */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-dark mb-4">Kontakt</h2>
                <div className="space-y-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="E-Mail *"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Telefon *"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              {/* Versandart */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-dark mb-4">Versandart</h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-ash rounded-lg cursor-pointer hover:border-brand transition-colors">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === 'delivery'}
                      onChange={() => setShippingMethod('delivery')}
                      className="w-5 h-5 text-brand border-ash focus:ring-brand"
                    />
                    <span className="text-sm text-dark">Versand</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 border border-ash rounded-lg cursor-pointer hover:border-brand transition-colors">
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === 'pickup'}
                      onChange={() => setShippingMethod('pickup')}
                      className="w-5 h-5 text-brand border-ash focus:ring-brand"
                    />
                    <span className="text-sm text-dark">Abholung im Fachmarkt Hückelhoven</span>
                  </label>
                </div>
              </div>

              {/* Lieferadresse / Abholung Info */}
              <div className="mb-8">
                {shippingMethod === 'pickup' ? (
                  <>
                    <h2 className="text-lg font-semibold text-dark mb-4">Abholadresse</h2>
                    <div className="p-4 bg-gray-50 border border-ash rounded-lg">
                      <p className="text-sm font-semibold text-dark">Fachmarkt Hückelhoven</p>
                      <p className="text-sm text-mid">Neckarstraße 9</p>
                      <p className="text-sm text-mid">41836 Hückelhoven</p>
                    </div>
                    {/* Name fields still needed for order */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <input
                        type="text"
                        name="firstName"
                        placeholder="Vorname *"
                        required
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Nachname *"
                        required
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-dark mb-4">Lieferadresse</h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="firstName"
                          placeholder="Vorname *"
                          required
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                        <input
                          type="text"
                          name="lastName"
                          placeholder="Nachname *"
                          required
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                      </div>
                      <input
                        type="text"
                        name="company"
                        placeholder="Firma (optional)"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        name="address1"
                        placeholder="Straße und Hausnummer *"
                        required
                        value={formData.address1}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        name="address2"
                        placeholder="Adresszusatz (optional)"
                        value={formData.address2}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          name="postcode"
                          placeholder="PLZ *"
                          required
                          value={formData.postcode}
                          onChange={handleInputChange}
                          className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                        <input
                          type="text"
                          name="city"
                          placeholder="Stadt *"
                          required
                          value={formData.city}
                          onChange={handleInputChange}
                          className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Zahlungsmethode */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-dark mb-4">Zahlungsmethode</h2>
                <div className="space-y-3">
                  {/* PayPal, Klarna und Kreditkarte nur außerhalb des
                      Vorschau-Modus — im Test soll kein echtes Gateway
                      erreichbar sein. */}
                  {!isVorschauModus && (
                  <>
                  {/* PayPal */}
                  <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.paymentMethod === 'paypal'
                      ? 'border-brand bg-pale'
                      : 'border-ash hover:border-brand'
                  }`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paypal"
                          checked={formData.paymentMethod === 'paypal'}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-brand border-ash focus:ring-brand shrink-0"
                        />
                        <span className="text-sm font-medium text-dark">PayPal</span>
                      </div>
                      <Image
                        src="/images/zahlungslogos/paypal.svg"
                        alt="PayPal"
                        width={60}
                        height={24}
                        className="h-6 w-auto shrink-0"
                      />
                    </div>
                    {formData.paymentMethod === 'paypal' && (
                      <p className="mt-3 ml-8 text-xs text-gray-600">
                        PayPal, 30 Tage Rechnungskauf oder flexible Ratenzahlung möglich.
                      </p>
                    )}
                  </label>

                  {/* Klarna */}
                  <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.paymentMethod === 'klarna'
                      ? 'border-brand bg-pale'
                      : 'border-ash hover:border-brand'
                  }`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="klarna"
                          checked={formData.paymentMethod === 'klarna'}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-brand border-ash focus:ring-brand shrink-0"
                        />
                        <span className="text-sm font-medium text-dark">Klarna – Sofort oder später bezahlen</span>
                      </div>
                      <Image
                        src="/images/zahlungslogos/klarna.svg"
                        alt="Klarna"
                        width={60}
                        height={24}
                        className="h-6 w-auto shrink-0"
                      />
                    </div>
                    {formData.paymentMethod === 'klarna' && (
                      <p className="mt-3 ml-8 text-xs text-gray-600">
                        Mit Klarna bequem per Rechnung, Sofortüberweisung oder flexibler Ratenzahlung bezahlen.
                      </p>
                    )}
                  </label>

                  {/* Kreditkarte (Stripe) */}
                  <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.paymentMethod === 'stripe'
                      ? 'border-brand bg-pale'
                      : 'border-ash hover:border-brand'
                  }`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="stripe"
                          checked={formData.paymentMethod === 'stripe'}
                          onChange={handleInputChange}
                          className="w-5 h-5 text-brand border-ash focus:ring-brand shrink-0"
                        />
                        <span className="text-sm font-medium text-dark">Kreditkarte</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Image src="/images/zahlungslogos/visa.svg" alt="Visa" width={32} height={20} className="h-5 w-auto" />
                        <Image src="/images/zahlungslogos/mastercard.svg" alt="Mastercard" width={32} height={20} className="h-5 w-auto" />
                        <Image src="/images/zahlungslogos/amex.svg" alt="American Express" width={32} height={20} className="h-5 w-auto" />
                        <Image src="/images/zahlungslogos/apple-pay.svg" alt="Apple Pay" width={32} height={20} className="h-5 w-auto" />
                        <Image src="/images/zahlungslogos/google-pay.svg" alt="Google Pay" width={32} height={20} className="h-5 w-auto" />
                      </div>
                    </div>
                    {formData.paymentMethod === 'stripe' && (
                      <p className="mt-3 ml-8 text-xs text-gray-600">
                        Sicher bezahlen mit Visa, Mastercard, American Express, Apple Pay oder Google Pay.
                      </p>
                    )}
                  </label>

                  </>
                  )}

                  {/* Vorkasse per Banküberweisung */}
                  <label className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.paymentMethod === 'bacs'
                      ? 'border-brand bg-pale'
                      : 'border-ash hover:border-brand'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bacs"
                        checked={formData.paymentMethod === 'bacs'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-brand border-ash focus:ring-brand shrink-0"
                      />
                      <span className="text-sm font-medium text-dark">Vorkasse per Banküberweisung</span>
                    </div>
                    {formData.paymentMethod === 'bacs' && (
                      <p className="mt-3 ml-8 text-xs text-gray-600">
                        Überweise den Rechnungsbetrag bequem nach deiner Bestellung. Die Zahlungsinformationen erhältst du direkt per E-Mail.
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Rechnungsadresse */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-dark mb-4">Rechnungsadresse</h2>
                {shippingMethod === 'delivery' ? (
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border border-ash rounded-lg cursor-pointer hover:border-brand transition-colors">
                      <input
                        type="radio"
                        name="sameAsBilling"
                        checked={formData.sameAsBilling}
                        onChange={() => setFormData((prev) => ({ ...prev, sameAsBilling: true }))}
                        className="w-5 h-5 text-brand border-ash focus:ring-brand"
                      />
                      <span className="text-sm text-dark">Gleich wie Lieferadresse</span>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-ash rounded-lg cursor-pointer hover:border-brand transition-colors">
                      <input
                        type="radio"
                        name="sameAsBilling"
                        checked={!formData.sameAsBilling}
                        onChange={() => setFormData((prev) => ({ ...prev, sameAsBilling: false }))}
                        className="w-5 h-5 text-brand border-ash focus:ring-brand"
                      />
                      <span className="text-sm text-dark">Andere Rechnungsadresse verwenden</span>
                    </label>

                    {/* Felder für abweichende Rechnungsadresse — nur wenn "Andere" gewählt */}
                    {!formData.sameAsBilling && (
                      <div className="space-y-4 pt-4 pl-1">
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            name="billingFirstName"
                            placeholder="Vorname *"
                            required
                            value={formData.billingFirstName}
                            onChange={handleInputChange}
                            className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                          />
                          <input
                            type="text"
                            name="billingLastName"
                            placeholder="Nachname *"
                            required
                            value={formData.billingLastName}
                            onChange={handleInputChange}
                            className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                          />
                        </div>
                        <input
                          type="text"
                          name="billingCompany"
                          placeholder="Firma (optional)"
                          value={formData.billingCompany}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                        <input
                          type="text"
                          name="billingAddress1"
                          placeholder="Straße und Hausnummer *"
                          required
                          value={formData.billingAddress1}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                        <input
                          type="text"
                          name="billingAddress2"
                          placeholder="Adresszusatz (optional)"
                          value={formData.billingAddress2}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            name="billingPostcode"
                            placeholder="PLZ *"
                            required
                            value={formData.billingPostcode}
                            onChange={handleInputChange}
                            className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                          />
                          <input
                            type="text"
                            name="billingCity"
                            placeholder="Stadt *"
                            required
                            value={formData.billingCity}
                            onChange={handleInputChange}
                            className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      name="billingAddress1"
                      placeholder="Straße und Hausnummer *"
                      required
                      value={formData.billingAddress1}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        name="billingPostcode"
                        placeholder="PLZ *"
                        required
                        value={formData.billingPostcode}
                        onChange={handleInputChange}
                        className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                      <input
                        type="text"
                        name="billingCity"
                        placeholder="Stadt *"
                        required
                        value={formData.billingCity}
                        onChange={handleInputChange}
                        className="px-4 py-3 border border-ash rounded-lg focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes (readonly, from cart) */}
              {(deliveryNote.trim() || customerNote.trim()) && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-dark mb-4">Ihre Notizen</h2>
                  <div className="p-4 bg-gray-50 border border-ash rounded-lg space-y-3">
                    {deliveryNote.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Lieferwunsch</span>
                        <p className="text-sm text-dark whitespace-pre-wrap mt-1">{deliveryNote}</p>
                      </div>
                    )}
                    {customerNote.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase">Anmerkung</span>
                        <p className="text-sm text-dark whitespace-pre-wrap mt-1">{customerNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AGB Checkbox */}
              <div className="mb-6">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-5 h-5 text-brand border-ash focus:ring-brand"
                  />
                  <span className="text-sm text-dark">
                    Ich habe die{' '}
                    <a href="/agb" target="_blank" className="text-brand hover:underline">
                      AGB
                    </a>{' '}
                    und{' '}
                    <a href="/datenschutz" target="_blank" className="text-brand hover:underline">
                      Datenschutzerklärung
                    </a>{' '}
                    gelesen und akzeptiere diese. *
                  </span>
                </label>
              </div>

              {/* EU-Gewährleistungsmitteilung (VO (EU) 2025/1960) – immer anzeigen */}
              <GewaehrleistungsMitteilung />

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-6 text-base font-semibold text-white bg-brand rounded-lg hover:bg-[#d11920] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Bestellung wird erstellt...' : 'Jetzt kaufen'}
              </button>

              {/* Footer Links */}
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-brand">
                <a href="/widerruf" className="hover:underline">Widerrufsrecht</a>
                <a href="/versand-lieferzeit" className="hover:underline">Versand</a>
                <a href="/datenschutz" className="hover:underline">Datenschutzerklärung</a>
                <a href="/agb" className="hover:underline">AGB</a>
                <a href="/impressum" className="hover:underline">Impressum</a>
              </div>
            </div>

            {/* RECHTE SPALTE (40%) */}
            <div className="w-full lg:w-2/5 order-1 lg:order-2">
              <OrderSummary
                shippingMethod={shippingMethod}
                appliedCoupon={appliedCoupon}
                couponNotice={couponNotice}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                onReplaceCoupon={handleReplaceCoupon}
                onDismissNotice={handleDismissNotice}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
