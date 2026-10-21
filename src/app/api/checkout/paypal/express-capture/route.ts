/**
 * API Route: PayPal Express Capture
 *
 * POST /api/checkout/paypal/express-capture
 *
 * Body (vom Browser im onApprove-Callback des PayPal-Smart-Buttons):
 * {
 *   paypalOrderId: string,           // data.orderID aus dem SDK
 *   line_items: OrderLineItem[],     // DIESELBEN Positionen wie bei express-create
 *   shipping_cost: number,           // Brutto, EUR
 *   customer_note?: string,
 * }
 *
 * Flow:
 * 1. Body validieren (vor dem Capture — bis hier ist kein Geld bewegt)
 * 2. PayPal capturen via WP-Proxy /paypal/express-capture
 *    -> liefert Adresse, Email, Name, Phone, Amount, Transaction-ID
 * 3. WooCommerce-Order erstellen mit set_paid: false + status: 'processing'
 *    (set_paid: true würde einen separaten WC-Payment-Vorgang anstoßen, was
 *    wir nicht wollen, da PayPal bereits captured hat)
 * 4. Transaction-ID + PayPal-Order-ID in meta_data + lesbare Order-Note
 * 5. Summenabgleich WC-Order ↔ eingezogener Betrag
 * 6. Response: { success, wcOrderId, wcOrderKey, redirectUrl }
 *
 * ── Nach dem Capture gibt es keinen Fehler-Response mehr ────────────────────
 * Ab Schritt 2 hat der Kunde bezahlt. Scheitert danach etwas (WC lehnt ab,
 * PayPal liefert keine Adresse, Netzwerk), wird geloggt, der Shop per Mail
 * benachrichtigt und der Kunde trotzdem auf die Bestätigungsseite geleitet
 * (`?paypal=pending&tx=…`). Die Seite leert den Warenkorb — sonst bezahlt der
 * Kunde im Zweifel ein zweites Mal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalExpressOrder } from '@/lib/paypal';
import { createWooCommerceOrder, addOrderNote } from '@/lib/woocommerce-checkout';
import type { WooCommerceOrderData } from '@/lib/woocommerce-checkout';
import {
  TAX_RATE,
  sumLineItemTotals,
  toNetLineItems,
  validateOrderLineItems,
  type OrderLineItem,
} from '@/lib/order-line-items';
import { notifyShop } from '@/lib/shop-notification';

// Capture + WC-Order + Notiz + ggf. Mail — großzügig, weit unter dem Pro-Limit.
export const maxDuration = 60;

/** Ab dieser Abweichung (EUR) bekommt die Order eine Notiz. */
const AMOUNT_NOTE_THRESHOLD = 0.01;
/** Ab dieser Abweichung (EUR) zusätzlich eine Mail an den Shop. */
const AMOUNT_MAIL_THRESHOLD = 1.0;

const MISSING_ORDER_SUBJECT = 'PayPal bezahlt, Bestellung fehlt – manuell anlegen';
const AMOUNT_MISMATCH_SUBJECT = 'PayPal Express: Betrag weicht von der Bestellung ab – bitte prüfen';

interface ExpressCaptureBody {
  paypalOrderId: string;
  line_items: OrderLineItem[];
  shipping_cost: number;
  customer_note?: string;
}

type CaptureResult = Awaited<ReturnType<typeof capturePayPalExpressOrder>>;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatEuro(n: number): string {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

/** Positionen als Klartext für Mail und Log — ohne Secrets, nur Bestelldaten. */
function describeLineItems(items: OrderLineItem[]): string {
  return items
    .map((item) => {
      const m2 = item.meta_data?.find((m) => m.key === '_actual_m2')?.value;
      const setType = item.meta_data?.find((m) => m.key === '_set_item_type')?.value;
      const extras = [
        setType && `Set: ${setType}`,
        m2 && `Menge: ${m2}`,
        item.meta_data?.some((m) => m.key === '_is_sample') && 'Muster',
      ]
        .filter(Boolean)
        .join(', ');
      return `- ${item.quantity} × ${item.name || 'Produkt'} (ID ${item.product_id}) – ${formatEuro(
        parseFloat(item.total)
      )}${extras ? ` [${extras}]` : ''}`;
    })
    .join('\n');
}

/**
 * Bezahlt, aber keine WC-Order: alles loggen, Shop benachrichtigen, Kunde
 * bekommt trotzdem eine Bestätigung. Wirft nie.
 */
async function handleOrderMissingAfterCapture(params: {
  body: ExpressCaptureBody;
  capture: CaptureResult | null;
  reason: string;
  error?: unknown;
}): Promise<NextResponse> {
  const { body, capture, reason, error } = params;
  const transactionId = capture?.transactionId ?? '';
  const amount = capture?.amount?.value ?? '?';
  const currency = capture?.amount?.currency_code ?? 'EUR';
  const customerName =
    `${capture?.payerGivenName ?? ''} ${capture?.payerSurname ?? ''}`.trim() ||
    capture?.shippingName ||
    '';
  const address = capture?.shippingAddress;

  console.error('❌ PAYPAL EXPRESS: Zahlung erfasst, WooCommerce-Order NICHT angelegt — manuell anlegen!', {
    reason,
    error: error instanceof Error ? error.message : error,
    paypalOrderId: body.paypalOrderId,
    captureId: transactionId,
    amount: `${amount} ${currency}`,
    customer: { name: customerName, email: capture?.payerEmail, phone: capture?.payerPhone },
    shippingAddress: address,
    shippingCost: body.shipping_cost,
    customerNote: body.customer_note,
    lineItems: body.line_items,
  });

  const message = [
    'PayPal hat die Zahlung eingezogen, die Bestellung konnte aber NICHT in WooCommerce angelegt werden.',
    'Bitte die Bestellung manuell anlegen und den Kunden informieren.',
    '',
    `Grund: ${reason}${error instanceof Error ? ` (${error.message})` : ''}`,
    '',
    '— Zahlung —',
    `Betrag: ${amount} ${currency}`,
    `PayPal-Order-ID: ${body.paypalOrderId}`,
    `Transaktions-ID (Capture): ${transactionId || '–'}`,
    '',
    '— Kunde —',
    `Name: ${customerName || '–'}`,
    `E-Mail: ${capture?.payerEmail || '–'}`,
    `Telefon: ${capture?.payerPhone || '–'}`,
    address
      ? `Lieferadresse: ${capture?.shippingName || customerName}, ${address.address_line_1}${
          address.address_line_2 ? `, ${address.address_line_2}` : ''
        }, ${address.postal_code} ${address.admin_area_2}, ${address.country_code}`
      : 'Lieferadresse: – (von PayPal nicht geliefert)',
    '',
    '— Warenkorb (Mengen = Pakete/Stück, Beträge brutto) —',
    describeLineItems(body.line_items),
    `Versand: ${formatEuro(body.shipping_cost)}`,
    `Summe Positionen + Versand: ${formatEuro(sumLineItemTotals(body.line_items) + body.shipping_cost)}`,
    '',
    body.customer_note ? `Kundennotiz:\n${body.customer_note}` : 'Kundennotiz: –',
  ].join('\n');

  const sent = await notifyShop({
    subject: MISSING_ORDER_SUBJECT,
    message,
    replyTo: { name: customerName, email: capture?.payerEmail, phone: capture?.payerPhone },
  });
  if (!sent) {
    console.error('❌ PAYPAL EXPRESS: Benachrichtigungs-Mail an den Shop fehlgeschlagen', {
      paypalOrderId: body.paypalOrderId,
      captureId: transactionId,
    });
  }

  const tx = transactionId || body.paypalOrderId;
  return NextResponse.json({
    success: true,
    orderPending: true,
    transactionId: tx,
    redirectUrl: `/checkout/success?paypal=pending&tx=${encodeURIComponent(tx)}`,
  });
}

export async function POST(request: NextRequest) {
  // 1. Body parsen + validieren
  let body: ExpressCaptureBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.paypalOrderId || typeof body.paypalOrderId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'paypalOrderId fehlt' },
      { status: 400 }
    );
  }
  const lineItemsError = validateOrderLineItems(body.line_items);
  if (lineItemsError) {
    return NextResponse.json({ success: false, error: lineItemsError }, { status: 400 });
  }
  if (typeof body.shipping_cost !== 'number' || body.shipping_cost < 0) {
    return NextResponse.json(
      { success: false, error: 'Versandkosten ungültig' },
      { status: 400 }
    );
  }

  // 2. PayPal capturen via WP-Plugin /paypal/express-capture
  let capture: CaptureResult;
  try {
    console.log(`🔄 Capturing PayPal Express Order: ${body.paypalOrderId}`);
    capture = await capturePayPalExpressOrder(body.paypalOrderId);
  } catch (error) {
    console.error('❌ PayPal Express Capture error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Express capture failed',
      },
      { status: 500 }
    );
  }

  if (!capture.success) {
    console.error(`❌ PayPal Express capture failed: status=${capture.status}`);
    return NextResponse.json(
      {
        success: false,
        error: `PayPal capture nicht erfolgreich (Status: ${capture.status ?? 'unknown'})`,
      },
      { status: 502 }
    );
  }

  // ── Ab hier ist bezahlt. Jeder Fehler → handleOrderMissingAfterCapture. ──
  try {
    if (!capture.payerEmail || !capture.shippingAddress) {
      return await handleOrderMissingAfterCapture({
        body,
        capture,
        reason: 'PayPal lieferte unvollständige Daten (Adresse oder E-Mail fehlen)',
      });
    }

    // 3. Adresse aus PayPal-Daten -> WC-Format
    const shippingNameRaw = (capture.shippingName ?? '').trim();
    const fullName =
      shippingNameRaw ||
      `${capture.payerGivenName ?? ''} ${capture.payerSurname ?? ''}`.trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstName = (capture.payerGivenName ?? nameParts[0] ?? '').trim();
    const lastName = (capture.payerSurname ?? nameParts.slice(1).join(' ') ?? '').trim();

    const shipping = {
      first_name: firstName,
      last_name:  lastName,
      address_1:  capture.shippingAddress.address_line_1,
      address_2:  capture.shippingAddress.address_line_2 || '',
      city:       capture.shippingAddress.admin_area_2,
      state:      capture.shippingAddress.admin_area_1 || '',
      postcode:   capture.shippingAddress.postal_code,
      country:    capture.shippingAddress.country_code, // ISO 2-Letter (z.B. 'DE')
    };

    const billing = {
      ...shipping,
      email: capture.payerEmail,
      phone: capture.payerPhone || '',
    };

    // 4. Positionen Brutto -> Netto, gleiche Umrechnung wie create-order.
    //    Der Aktionsrabatt steckt bereits in `total` der Positionen.
    const lineItemsNet = toNetLineItems(body.line_items);

    const shippingCostNet =
      body.shipping_cost > 0 ? (body.shipping_cost / TAX_RATE).toFixed(2) : '0.00';

    // 5. WC-Order anlegen
    const orderData: WooCommerceOrderData = {
      payment_method: 'paypal',
      payment_method_title: 'PayPal Express',
      set_paid: false,
      status: 'processing',
      billing,
      shipping,
      line_items: lineItemsNet,
      customer_note: body.customer_note || '',
      shipping_lines:
        body.shipping_cost > 0
          ? [
              {
                method_id: 'flat_rate',
                method_title: 'Standardversand',
                total: shippingCostNet,
              },
            ]
          : undefined,
      meta_data: [
        { key: '_transaction_id', value: capture.transactionId ?? '' },
        { key: '_paypal_order_id', value: body.paypalOrderId },
        { key: '_paypal_express', value: 'yes' },
      ],
    };

    let wcOrder: Awaited<ReturnType<typeof createWooCommerceOrder>>;
    try {
      wcOrder = await createWooCommerceOrder(orderData);
    } catch (error) {
      return await handleOrderMissingAfterCapture({
        body,
        capture,
        reason: 'WooCommerce hat die Bestellung abgelehnt',
        error,
      });
    }

    if (!wcOrder || !wcOrder.id) {
      return await handleOrderMissingAfterCapture({
        body,
        capture,
        reason: 'WooCommerce lieferte keine Bestell-ID',
      });
    }

    // 6. Lesbare Order-Note (interne Notiz, customer-visible: false)
    await addOrderNote(
      wcOrder.id,
      `PayPal Express Zahlung erfolgreich. PayPal Order ID: ${body.paypalOrderId}, Transaction ID: ${
        capture.transactionId ?? '–'
      }, Betrag: ${capture.amount?.value ?? '?'} ${capture.amount?.currency_code ?? 'EUR'}.`,
      false
    ).catch((err) => console.error(`[express-capture] Order-Notiz fehlgeschlagen (${wcOrder.id}):`, err));

    // 7. Summenabgleich: WC-Gesamtsumme ↔ eingezogener PayPal-Betrag
    await checkAmountMismatch({ body, capture, wcOrderId: wcOrder.id, wcTotalRaw: wcOrder.total });

    console.log(`✅ WC Order ${wcOrder.id} created from PayPal Express capture`);

    return NextResponse.json({
      success: true,
      wcOrderId: wcOrder.id,
      wcOrderKey: wcOrder.order_key,
      redirectUrl: `/checkout/success?order=${wcOrder.id}&paypal=success`,
    });
  } catch (error) {
    return await handleOrderMissingAfterCapture({
      body,
      capture,
      reason: 'Unerwarteter Fehler nach dem Capture',
      error,
    });
  }
}

/**
 * Vergleicht die WC-Gesamtsumme mit dem eingezogenen Betrag.
 * Ab 0,01 € Notiz an der Order + Warnung im Log, ab 1,00 € zusätzlich Mail.
 * Wirft nie — die Order ist zu diesem Zeitpunkt bereits angelegt.
 */
async function checkAmountMismatch(params: {
  body: ExpressCaptureBody;
  capture: CaptureResult;
  wcOrderId: number;
  wcTotalRaw: string;
}): Promise<void> {
  const { body, capture, wcOrderId, wcTotalRaw } = params;
  try {
    const paid = parseFloat(capture.amount?.value ?? '');
    const wcTotal = parseFloat(wcTotalRaw);

    if (!Number.isFinite(paid) || !Number.isFinite(wcTotal)) {
      console.warn('[express-capture] Summenabgleich nicht möglich', {
        wcOrderId,
        paid: capture.amount?.value,
        wcTotal: wcTotalRaw,
      });
      await addOrderNote(
        wcOrderId,
        `⚠️ Summenabgleich nicht möglich: PayPal-Betrag "${capture.amount?.value ?? '–'}", Bestellsumme "${wcTotalRaw}". Bitte prüfen.`,
        false
      ).catch((err) => console.error('[express-capture] Abgleich-Notiz fehlgeschlagen:', err));
      return;
    }

    const diff = round2(Math.abs(paid - wcTotal));
    if (diff < AMOUNT_NOTE_THRESHOLD) return;

    const text = `Betragsabweichung: PayPal hat ${formatEuro(paid)} eingezogen, die Bestellung beträgt ${formatEuro(
      wcTotal
    )} (Differenz ${formatEuro(diff)}).`;

    console.warn(`[express-capture] ${text}`, {
      wcOrderId,
      paypalOrderId: body.paypalOrderId,
      captureId: capture.transactionId,
    });

    await addOrderNote(wcOrderId, `⚠️ ${text}`, false).catch((err) =>
      console.error('[express-capture] Abgleich-Notiz fehlgeschlagen:', err)
    );

    if (diff >= AMOUNT_MAIL_THRESHOLD) {
      await notifyShop({
        subject: AMOUNT_MISMATCH_SUBJECT,
        message: [
          `Bestellung #${wcOrderId} (PayPal Express)`,
          text,
          '',
          `PayPal-Order-ID: ${body.paypalOrderId}`,
          `Transaktions-ID (Capture): ${capture.transactionId ?? '–'}`,
          `Kunde: ${capture.payerGivenName ?? ''} ${capture.payerSurname ?? ''} <${capture.payerEmail ?? '–'}>`,
          '',
          'Bitte Bestellung und Zahlung prüfen und ggf. korrigieren bzw. erstatten.',
        ].join('\n'),
        replyTo: {
          name: `${capture.payerGivenName ?? ''} ${capture.payerSurname ?? ''}`.trim(),
          email: capture.payerEmail,
        },
      });
    }
  } catch (error) {
    console.error('[express-capture] Summenabgleich fehlgeschlagen:', error);
  }
}
