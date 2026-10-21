/**
 * API Route: Order erstellen + Payment Session
 *
 * POST /api/checkout/create-order
 *
 * Erstellt eine WooCommerce Order und initiiert den Payment-Flow
 * je nach ausgewählter Zahlungsmethode
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  addOrderNote,
  createWooCommerceOrder,
  updateOrderStatus,
  type OrderStatus,
  type WooCommerceOrderData,
} from '@/lib/woocommerce-checkout';
import { createStripeCheckoutSession, euroToCents } from '@/lib/stripe';
import { createPayPalOrder } from '@/lib/paypal';
import { wpValidateToken, wpGetCurrentUser } from '@/lib/auth';
import { buildOrderMetaData, type AttributionData } from '@/lib/attribution';
import {
  validateAndCalculateCoupon,
  type AppliedCoupon,
  type CartItemForValidation,
} from '@/lib/coupon';
import { isAktionForced } from '@/lib/promo';
import { TAX_RATE, toNetLineItems } from '@/lib/order-line-items';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface CreateOrderRequestBody {
  billing: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    address_2?: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    product_id: number;
    quantity: number;
    subtotal?: string;
    total?: string;
    name?: string;
    meta_data?: Array<{
      key: string;
      value: string;
    }>;
  }>;
  payment_method: 'stripe' | 'paypal' | 'sofort' | 'bacs' | 'klarna';
  shipping_method?: 'delivery' | 'pickup';
  customer_note?: string;
  shipping_cost?: number;
  attribution?: AttributionData | null;
  /** Sanitisierter Coupon-Code (optional). Falls gesetzt, ist `cartItemsForValidation` Pflicht. */
  couponCode?: string;
  /** Cart-Snapshot für serverseitige Coupon-Re-Validation. */
  cartItemsForValidation?: CartItemForValidation[];
}

// ============================================================================
// Body-Helfer
// ============================================================================

/**
 * Type-Guard für `CartItemForValidation`. Bewusst inline dupliziert (gleiche
 * Logik wie in `validate-coupon/route.ts`) — eine Extraktion in `coupon.ts`
 * wäre ein Refactor, der nicht zum Scope von Phase E gehört.
 */
function isCartItemForValidation(x: unknown): x is CartItemForValidation {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.productId === 'number' &&
    Number.isFinite(o.productId) &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    typeof o.quantity === 'number' &&
    Number.isFinite(o.quantity) &&
    typeof o.isSample === 'boolean' &&
    typeof o.isOnSale === 'boolean' &&
    Array.isArray(o.categoryIds) &&
    o.categoryIds.every((c) => typeof c === 'number')
  );
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Request Body parsen
    const body: CreateOrderRequestBody = await request.json();
    const {
      billing,
      shipping,
      line_items,
      payment_method,
      shipping_method,
      customer_note,
      shipping_cost,
      attribution,
      couponCode,
      cartItemsForValidation,
    } = body;

    // 2. Validierung
    const validation = validateOrderData(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // 2b. Coupon-Re-Validation (vor allem Order-Building).
    // Wenn ein Coupon-Code vorliegt, validieren wir ihn serverseitig erneut
    // mit dem aus dem Body rekonstruierten Cart-Snapshot. Schlägt das fehl,
    // wird die Order NICHT erstellt (Entscheidung B1: PAngV-konform).
    let appliedCoupon: AppliedCoupon | null = null;
    if (couponCode !== undefined) {
      // Strukturelle Voraussetzung: Wenn couponCode gesetzt ist, muss
      // cartItemsForValidation ein wohlgeformtes Array sein. Ein Verstoß
      // ist ein Client-Bug, kein Coupon-Validierungs-Fehler → errorCode 'UNKNOWN'.
      if (typeof couponCode !== 'string') {
        console.error('[create-order] Bad request: couponCode is not a string', {
          actualType: typeof couponCode,
        });
        return NextResponse.json(
          { success: false, error: 'Ungültige Anfrage.', errorCode: 'UNKNOWN' },
          { status: 400 }
        );
      }
      if (!Array.isArray(cartItemsForValidation)) {
        console.error('[create-order] Bad request: couponCode present but cartItemsForValidation missing or not an array', {
          couponCode,
          cartItemsForValidationType: typeof cartItemsForValidation,
        });
        return NextResponse.json(
          { success: false, error: 'Ungültige Anfrage.', errorCode: 'UNKNOWN' },
          { status: 400 }
        );
      }
      const invalidIndex = cartItemsForValidation.findIndex((it) => !isCartItemForValidation(it));
      if (invalidIndex !== -1) {
        console.error('[create-order] Bad request: cartItemsForValidation contains malformed item', {
          index: invalidIndex,
          item: cartItemsForValidation[invalidIndex],
        });
        return NextResponse.json(
          { success: false, error: 'Ungültige Anfrage.', errorCode: 'UNKNOWN' },
          { status: 400 }
        );
      }

      const couponResult = await validateAndCalculateCoupon(couponCode, cartItemsForValidation);
      if (!couponResult.valid) {
        return NextResponse.json(
          {
            success: false,
            error: couponResult.message,
            errorCode: couponResult.errorCode,
          },
          { status: 400 }
        );
      }
      appliedCoupon = couponResult.coupon;
    }

    // 3. Eingeloggten Kunden erkennen (optional, Gastbestellung bleibt möglich)
    let customerId: number | undefined;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (token) {
        const isValid = await wpValidateToken(token);
        if (isValid) {
          const user = await wpGetCurrentUser(token);
          if (user) {
            customerId = user.id;
            console.log(`👤 Eingeloggter Kunde: ${user.id} (${user.email})`);
          }
        }
      }
    } catch {
      // Kein Auth — Gastbestellung, kein Problem
    }

    // 4. Payment Method für WooCommerce festlegen
    const wcPaymentMethod =
      payment_method === 'sofort' ? 'stripe_sofort' :
      payment_method === 'klarna' ? 'stripe_klarna' :
      payment_method;

    // WooCommerce REST API interpretiert line_items.subtotal/total und
    // shipping_lines.total IMMER als Netto (ex-Tax) — unabhängig von der
    // "Preise inkl. Steuern eingeben"-Einstellung im Admin. Das Frontend
    // sendet Brutto (wie im Warenkorb angezeigt), also hier für den
    // WC-Call auf Netto umrechnen. Stripe/PayPal unten bleiben auf Brutto.
    const lineItemsNet = toNetLineItems(line_items);
    const shippingCostNet = shipping_cost ? shipping_cost / TAX_RATE : 0;

    // 0€-Order erkennen (z.B. reine Muster-Bestellung ≤ 3 ohne Versand-Aufschlag).
    // Diese durchlaufen KEIN Payment-Gateway und werden direkt als bezahlt + processing
    // erstellt, damit Billbee sie als „Bezahlt" einliest statt als „Bestätigt".
    const lineItemsTotal = lineItemsNet.reduce(
      (sum, item) => sum + parseFloat(item.total || '0'),
      0
    );
    const isZeroOrder = lineItemsTotal + shippingCostNet === 0;

    // Order Attribution Tracking (WooCommerce 8.5+ Native, _wc_order_attribution_*)
    // Frontend liefert die Daten nur, wenn analytics-Consent vorliegt — sonst null.
    const attributionMetaData = attribution ? buildOrderMetaData(attribution) : [];

    // 5. WooCommerce Order erstellen (Status: pending)
    // free_shipping-Coupon nullt den GESAMTEN Versand (inkl. Muster-Aufschlag).
    // Wir setzen shipping_lines deterministisch, anstatt uns auf WC's eigene
    // Coupon-Verarbeitung der Versandzeile zu verlassen.
    const shippingLines: WooCommerceOrderData['shipping_lines'] =
      shipping_method === 'pickup'
        ? [
            {
              method_id: 'local_pickup',
              method_title: 'Abholung im Fachmarkt',
              total: '0.00',
            },
          ]
        : appliedCoupon?.freeShipping
          ? [
              {
                method_id: 'flat_rate',
                method_title: 'Versand (Gutschein)',
                total: '0.00',
              },
            ]
          : shipping_cost
            ? [
                {
                  method_id: 'flat_rate',
                  method_title: 'Standardversand',
                  total: shippingCostNet.toFixed(2),
                },
              ]
            : undefined;

    // Vorschau-Modus (NEXT_PUBLIC_AKTION_FORCE=1) läuft nur auf Test-/
    // Preview-Deployments. Bestellungen von dort werden markiert, damit sie in
    // WooCommerce und Billbee nicht mit echten Aufträgen verwechselt werden.
    const isTestOrder = isAktionForced();
    const testOrderMetaData = isTestOrder
      ? [
          { key: '_testbestellung', value: 'yes' },
          { key: '_testbestellung_grund', value: 'Vorschau-Deployment (NEXT_PUBLIC_AKTION_FORCE)' },
        ]
      : [];

    const orderData: WooCommerceOrderData = {
      ...(customerId ? { customer_id: customerId } : {}),
      payment_method: wcPaymentMethod,
      payment_method_title: getPaymentMethodTitle(payment_method),
      set_paid: isZeroOrder,
      status: isZeroOrder ? 'processing' : 'pending',
      billing,
      shipping,
      line_items: lineItemsNet,
      customer_note,
      ...(attributionMetaData.length + testOrderMetaData.length > 0
        ? { meta_data: [...attributionMetaData, ...testOrderMetaData] }
        : {}),
      ...(shippingLines ? { shipping_lines: shippingLines } : {}),
      ...(appliedCoupon ? { coupon_lines: [{ code: appliedCoupon.code }] } : {}),
    };

    const order = await createWooCommerceOrder(orderData);

    console.log(`✅ WooCommerce Order created: ${order.id}`);

    // Bestellnotiz zusätzlich zum Meta-Feld: im Backoffice sofort sichtbar,
    // ohne dass jemand die Custom Fields aufklappen muss.
    if (isTestOrder) {
      addOrderNote(
        order.id,
        '⚠️ TESTBESTELLUNG aus dem Vorschau-Deployment (Aktions-Test). Nicht ausliefern, nicht abrechnen — bitte stornieren.'
      ).catch((err) => console.error('[create-order] Test-Notiz fehlgeschlagen:', err));
    }

    // 6. Kundenprofil mit Adressen aktualisieren (im Hintergrund, blockiert nicht)
    if (customerId) {
      const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL;
      const WC_KEY = process.env.WC_CONSUMER_KEY;
      const WC_SECRET = process.env.WC_CONSUMER_SECRET;
      fetch(`${WP_URL}/wp-json/wc/v3/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')}`,
        },
        body: JSON.stringify({ billing, shipping }),
      }).catch((err) => console.error('Kundenprofil-Update fehlgeschlagen:', err));
    }

    // 7. Je nach Zahlungsmethode: Payment Session erstellen oder direkt zur Success-Page.
    //
    // Konsistenz-Garantie: Bei aktivem Coupon liest der Stripe-/PayPal-Branch den
    // Gesamtbetrag aus `order.total` (WC = Source of Truth, post-Discount).
    // Ohne Coupon bleibt das bestehende Per-Item-Layout.
    let redirectUrl: string | null = null;

    const consolidatedLabel = `Bodenjäger Bestellung #${order.id}`;
    const orderTotalBrutto = parseFloat(order.total);

    // ============================
    // 0€-ORDER (z.B. nur Muster oder 100%-Coupon)
    // ============================
    // Payment-Gateway überspringen: Stripe/PayPal lehnen 0€-Sessions ab,
    // und WC ist oben bereits paid + processing gesetzt → direkt zur Success-Page.
    if (isZeroOrder) {
      redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?order=${order.id}&key=${order.order_key}`;
      console.log(`✅ 0€ Order ${order.id} — Payment Gateway übersprungen (set_paid + processing)`);
    }
    // ============================
    // BACS (Vorkasse) — kein externer Payment-Provider, kein Rollback nötig
    // ============================
    else if (payment_method === 'bacs') {
      await updateOrderStatus(order.id, 'on-hold');
      redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?order=${order.id}&key=${order.order_key}`;
      console.log(`✅ Vorkasse Order created, status set to on-hold`);
    } else {
      // STRIPE / SOFORT / KLARNA / PAYPAL — Payment-Session mit Rollback bei Fehler
      try {
        if (
          payment_method === 'stripe' ||
          payment_method === 'sofort' ||
          payment_method === 'klarna'
        ) {
          const stripeLineItems = appliedCoupon
            ? [
                {
                  name: consolidatedLabel,
                  quantity: 1,
                  price: euroToCents(orderTotalBrutto),
                },
              ]
            : line_items.map((item) => ({
                name: item.name || `Produkt #${item.product_id}`,
                quantity: item.quantity,
                price: euroToCents(parseFloat(item.total || '0') / item.quantity),
              }));

          const stripeShippingCost = appliedCoupon
            ? undefined // bereits in order.total enthalten
            : shipping_cost
              ? euroToCents(shipping_cost)
              : undefined;

          const stripePaymentMethod =
            payment_method === 'sofort'
              ? 'sofort'
              : payment_method === 'klarna'
                ? 'klarna'
                : 'card';

          const stripeSession = await createStripeCheckoutSession({
            orderId: order.id,
            orderKey: order.order_key,
            lineItems: stripeLineItems,
            customerEmail: billing.email,
            paymentMethod: stripePaymentMethod,
            shippingCost: stripeShippingCost,
          });

          redirectUrl = stripeSession.url;
          const variantLabel =
            payment_method === 'sofort'
              ? 'SOFORT '
              : payment_method === 'klarna'
                ? 'Klarna '
                : '';
          console.log(`✅ Stripe ${variantLabel}Session created: ${stripeSession.sessionId}`);
        }

        if (payment_method === 'paypal') {
          let paypalAmount: number;
          let paypalLineItems: Array<{ name: string; quantity: number; unit_amount: string }>;

          if (appliedCoupon) {
            paypalAmount = orderTotalBrutto;
            paypalLineItems = [
              {
                name: consolidatedLabel,
                quantity: 1,
                unit_amount: orderTotalBrutto.toFixed(2),
              },
            ];
          } else {
            const subtotal = line_items.reduce(
              (sum, item) => sum + parseFloat(item.total || '0'),
              0
            );
            paypalAmount = subtotal + (shipping_cost || 0);
            paypalLineItems = line_items.map((item) => ({
              name: item.name || `Produkt #${item.product_id}`,
              quantity: item.quantity,
              unit_amount: (parseFloat(item.total || '0') / item.quantity).toFixed(2),
            }));
          }

          const paypalOrder = await createPayPalOrder({
            orderId: order.id,
            orderKey: order.order_key,
            amount: paypalAmount.toFixed(2),
            lineItems: paypalLineItems,
          });

          redirectUrl = paypalOrder.approvalUrl;
          console.log(`✅ PayPal Order created: ${paypalOrder.paypalOrderId}`);
        }
      } catch (paymentErr) {
        // Rollback: WC-Order existiert bereits, aber Payment-Session schlug fehl.
        // - Mit Coupon: Status 'cancelled' → WC reduziert `usage_count` (wichtig bei
        //   `usage_limit=1`-Promo-Codes, damit der Slot nicht verbraucht bleibt).
        // - Ohne Coupon: Status 'failed' (kein Side-Effect auf Coupons nötig).
        // Audit-Trail via interner Order-Note. Beide Operationen sind best-effort —
        // wenn sie scheitern, bleibt die Order pending und WC-Cron räumt auf.
        const errMsg = paymentErr instanceof Error ? paymentErr.message : 'Unknown error';
        console.error(
          `[create-order] Payment session failed for order ${order.id}:`,
          paymentErr
        );

        const rollbackStatus: OrderStatus = appliedCoupon ? 'cancelled' : 'failed';
        await updateOrderStatus(order.id, rollbackStatus).catch((err) =>
          console.error(
            `[create-order] Rollback to '${rollbackStatus}' failed for order ${order.id}:`,
            err
          )
        );
        await addOrderNote(
          order.id,
          `Payment session failed (${payment_method}): ${errMsg}`,
          false
        ).catch((err) =>
          console.error(`[create-order] Failed to add order note to ${order.id}:`, err)
        );

        return NextResponse.json(
          {
            success: false,
            error: 'Zahlungs-Session konnte nicht erstellt werden. Bitte versuche es erneut.',
          },
          { status: 500 }
        );
      }
    }

    // 6. Erfolg zurückgeben
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderKey: order.order_key,
      total: order.total,
      redirectUrl,
    });
  } catch (error) {
    console.error('❌ Checkout error:', error);

    // Error Response
    return NextResponse.json(
      {
        success: false,
        error: 'Bestellung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Hilfsfunktionen
// ============================================================================

/**
 * Validiert die Order-Daten
 */
function validateOrderData(data: CreateOrderRequestBody): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Billing Validierung
  if (!data.billing?.email) {
    errors.push('E-Mail ist erforderlich');
  } else if (!isValidEmail(data.billing.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  if (!data.billing?.first_name) {
    errors.push('Vorname (Rechnung) ist erforderlich');
  }

  if (!data.billing?.last_name) {
    errors.push('Nachname (Rechnung) ist erforderlich');
  }

  if (!data.billing?.address_1) {
    errors.push('Straße (Rechnung) ist erforderlich');
  }

  if (!data.billing?.city) {
    errors.push('Stadt (Rechnung) ist erforderlich');
  }

  if (!data.billing?.postcode) {
    errors.push('Postleitzahl (Rechnung) ist erforderlich');
  }

  if (!data.billing?.country) {
    errors.push('Land (Rechnung) ist erforderlich');
  }

  if (!data.billing?.phone) {
    errors.push('Telefon ist erforderlich');
  }

  // Shipping Validierung
  if (!data.shipping?.first_name) {
    errors.push('Vorname (Versand) ist erforderlich');
  }

  if (!data.shipping?.last_name) {
    errors.push('Nachname (Versand) ist erforderlich');
  }

  if (!data.shipping?.address_1) {
    errors.push('Straße (Versand) ist erforderlich');
  }

  if (!data.shipping?.city) {
    errors.push('Stadt (Versand) ist erforderlich');
  }

  if (!data.shipping?.postcode) {
    errors.push('Postleitzahl (Versand) ist erforderlich');
  }

  if (!data.shipping?.country) {
    errors.push('Land (Versand) ist erforderlich');
  }

  // Line Items Validierung
  if (!data.line_items || data.line_items.length === 0) {
    errors.push('Warenkorb ist leer');
  }

  if (data.line_items) {
    data.line_items.forEach((item, index) => {
      if (!item.product_id || typeof item.product_id !== 'number') {
        errors.push(`Produkt ${index + 1}: Ungültige Produkt-ID`);
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push(`Produkt ${index + 1}: Ungültige Menge`);
      }
    });
  }

  // Payment Method Validierung
  if (!data.payment_method) {
    errors.push('Zahlungsmethode ist erforderlich');
  }

  const validPaymentMethods = ['stripe', 'paypal', 'sofort', 'bacs', 'klarna'];
  if (data.payment_method && !validPaymentMethods.includes(data.payment_method)) {
    errors.push('Ungültige Zahlungsmethode');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * E-Mail Validierung (einfache Regex)
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gibt den Titel der Zahlungsmethode zurück
 */
function getPaymentMethodTitle(method: string): string {
  const titles: Record<string, string> = {
    stripe: 'Kreditkarte (Visa, Mastercard, Amex)',
    paypal: 'PayPal',
    sofort: 'Sofortüberweisung',
    bacs: 'Vorkasse / Überweisung',
    klarna: 'Klarna – Sofort oder später bezahlen',
  };
  return titles[method] || method;
}
