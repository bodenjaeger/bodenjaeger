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
import { capturePayPalExpressOrder, type CapturePayPalExpressOrderResult } from '@/lib/paypal';
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
import { FetchTimeoutError } from '@/lib/fetch-with-timeout';
import { PAYPAL_EXPRESS_ENABLED, PAYPAL_EXPRESS_DISABLED_MESSAGE } from '@/lib/paypal-express-flag';

// Vercel Pro. Die eigenen Timeouts unten summieren sich im schlechtesten Fall
// auf knapp 50 s — die Funktion antwortet also immer selbst, bevor Vercel sie
// abbricht (Live-Test 21.10.2026: ohne Timeouts hing sie im Proxy-fetch).
export const maxDuration = 120;

/** Eigene Timeouts je externem Aufruf (ms). */
const TIMEOUT_CAPTURE_MS = 15_000;
const TIMEOUT_WC_CREATE_MS = 15_000;
const TIMEOUT_WC_NOTE_MS = 5_000;
const TIMEOUT_NOTIFY_MS = 6_000;

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

type CaptureResult = CapturePayPalExpressOrderResult;

/**
 * Log-Zeile vor und nach jedem externen Aufruf — so ist im Vercel-Log
 * sichtbar, an welchem Schritt es hängt:
 * `[express-capture] capture start paypalOrderId=…`
 * `[express-capture] capture ok ms=812 paypalOrderId=…`
 */
async function step<T>(
  name: string,
  paypalOrderId: string,
  fn: () => Promise<T>
): Promise<T> {
  const started = Date.now();
  console.log(`[express-capture] ${name} start paypalOrderId=${paypalOrderId}`);
  try {
    const result = await fn();
    console.log(`[express-capture] ${name} ok ms=${Date.now() - started} paypalOrderId=${paypalOrderId}`);
    return result;
  } catch (error) {
    console.error(
      `[express-capture] ${name} fail ms=${Date.now() - started} paypalOrderId=${paypalOrderId} error=${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}

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
 * Bezahlt (oder möglicherweise bezahlt), aber keine WC-Order: alles loggen,
 * Shop benachrichtigen, Kunde bekommt trotzdem eine Bestätigung. Wirft nie.
 *
 * `captureUnclear`: Der Capture-Ausgang ist unbekannt (Timeout, 5xx, kein
 * JSON). Es liegen dann keine Käuferdaten vor — das Team muss in PayPal
 * nachsehen, ob eingezogen wurde.
 * `orderMayExist`: Die WC-Anlage lief in ein Timeout. WooCommerce kann die
 * Bestellung trotzdem noch angelegt haben.
 */
async function handleOrderMissingAfterCapture(params: {
  body: ExpressCaptureBody;
  capture: CaptureResult | null;
  reason: string;
  error?: unknown;
  captureUnclear?: boolean;
  orderMayExist?: boolean;
}): Promise<NextResponse> {
  const { body, capture, reason, error, captureUnclear = false, orderMayExist = false } = params;
  const transactionId = capture?.transactionId ?? '';
  const amount = capture?.amount?.value ?? '?';
  const currency = capture?.amount?.currency_code ?? 'EUR';
  const customerName =
    `${capture?.payerGivenName ?? ''} ${capture?.payerSurname ?? ''}`.trim() ||
    capture?.shippingName ||
    '';
  const address = capture?.shippingAddress;

  // Einheitliche, durchsuchbare Log-Zeile — auch dann vollständig, wenn die
  // Mail über WordPress scheitert.
  console.error(
    'PAYPAL_EXPRESS_ORDER_MISSING',
    JSON.stringify({
      reason,
      error: error instanceof Error ? error.message : error ?? null,
      captureUnclear,
      orderMayExist,
      paypalOrderId: body.paypalOrderId,
      captureId: transactionId || null,
      amount: `${amount} ${currency}`,
      customer: { name: customerName, email: capture?.payerEmail ?? null, phone: capture?.payerPhone ?? null },
      shippingAddress: address ?? null,
      shippingCost: body.shipping_cost,
      itemsTotal: sumLineItemTotals(body.line_items),
      customerNote: body.customer_note ?? null,
      lineItems: body.line_items,
    })
  );

  const intro = captureUnclear
    ? [
        'Der Ausgang der PayPal-Zahlung ist UNKLAR (keine Antwort vom Zahlungs-Proxy). Es kann eingezogen worden sein.',
        `Bitte in PayPal nach der Order-ID ${body.paypalOrderId} suchen:`,
        '- Zahlung eingezogen → Bestellung manuell anlegen (Käuferdaten stehen in PayPal) und Kunden informieren.',
        '- Nicht eingezogen → Kunden informieren, dass die Zahlung nicht durchging.',
      ]
    : [
        'PayPal hat die Zahlung eingezogen, die Bestellung konnte aber NICHT in WooCommerce angelegt werden.',
        'Bitte die Bestellung manuell anlegen und den Kunden informieren.',
      ];
  if (orderMayExist) {
    intro.push(
      `ACHTUNG: WooCommerce hat nicht rechtzeitig geantwortet. Bitte ZUERST in WooCommerce nach der PayPal-Order-ID ${body.paypalOrderId} suchen — die Bestellung kann trotzdem angelegt worden sein.`
    );
  }

  const message = [
    ...intro,
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

  // notifyShop wirft nie; `false` = nicht zugestellt.
  const sent = await step('notify-wp', body.paypalOrderId, () =>
    notifyShop({
      subject: MISSING_ORDER_SUBJECT,
      message,
      replyTo: { name: customerName, email: capture?.payerEmail, phone: capture?.payerPhone },
      timeoutMs: TIMEOUT_NOTIFY_MS,
    })
  );
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
  // Notschalter: ausgeschaltet → sofort 503, KEIN Capture bei PayPal.
  if (!PAYPAL_EXPRESS_ENABLED) {
    return NextResponse.json(
      { success: false, error: PAYPAL_EXPRESS_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

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
  let outcome: Awaited<ReturnType<typeof capturePayPalExpressOrder>>;
  try {
    outcome = await step('capture', body.paypalOrderId, () =>
      capturePayPalExpressOrder(body.paypalOrderId, TIMEOUT_CAPTURE_MS)
    );
  } catch (error) {
    // Wirft nur bei fehlender Proxy-Konfiguration — dann wurde nichts an
    // PayPal gesendet, also auch nichts eingezogen.
    console.error('❌ PayPal Express Capture nicht gestartet (Konfiguration):', error);
    return NextResponse.json(
      { success: false, error: 'PayPal ist gerade nicht erreichbar. Bitte versuche es später erneut.' },
      { status: 500 }
    );
  }

  console.log(
    `[express-capture] capture outcome=${outcome.outcome}${
      outcome.outcome === 'captured' ? '' : ` reason=${outcome.reason}`
    } paypalOrderId=${body.paypalOrderId}`
  );

  // Eindeutige Ablehnung durch PayPal: nichts eingezogen, Kunde kann es
  // erneut versuchen.
  if (outcome.outcome === 'declined') {
    return NextResponse.json(
      {
        success: false,
        error:
          'PayPal hat die Zahlung abgelehnt. Es wurde nichts abgebucht. Bitte versuche es erneut oder wähle eine andere Zahlungsart.',
        declineReason: outcome.reason,
      },
      { status: 402 }
    );
  }

  // Ausgang unklar (Timeout, Netzwerk, 5xx, kein JSON): kann eingezogen sein
  // → wie „bezahlt, Bestellung fehlt“ behandeln.
  if (outcome.outcome === 'unknown') {
    return await handleOrderMissingAfterCapture({
      body,
      capture: null,
      reason: `Capture-Ausgang unklar: ${outcome.reason}`,
      captureUnclear: true,
    });
  }

  const capture: CaptureResult = outcome.data;

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
      wcOrder = await step('wc-create', body.paypalOrderId, () =>
        createWooCommerceOrder(orderData, { timeoutMs: TIMEOUT_WC_CREATE_MS })
      );
    } catch (error) {
      const timedOut = error instanceof FetchTimeoutError;
      return await handleOrderMissingAfterCapture({
        body,
        capture,
        reason: timedOut
          ? 'WooCommerce hat nicht rechtzeitig geantwortet'
          : 'WooCommerce hat die Bestellung abgelehnt',
        error,
        orderMayExist: timedOut,
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
    await step('wc-note', body.paypalOrderId, () =>
      addOrderNote(
        wcOrder.id,
        `PayPal Express Zahlung erfolgreich. PayPal Order ID: ${body.paypalOrderId}, Transaction ID: ${
          capture.transactionId ?? '–'
        }, Betrag: ${capture.amount?.value ?? '?'} ${capture.amount?.currency_code ?? 'EUR'}.`,
        false,
        { timeoutMs: TIMEOUT_WC_NOTE_MS }
      )
    ).catch(() => {
      // bereits von step() geloggt — die Order existiert, also weiter.
    });

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
      await step('wc-note-amount', body.paypalOrderId, () =>
        addOrderNote(
          wcOrderId,
          `⚠️ Summenabgleich nicht möglich: PayPal-Betrag "${capture.amount?.value ?? '–'}", Bestellsumme "${wcTotalRaw}". Bitte prüfen.`,
          false,
          { timeoutMs: TIMEOUT_WC_NOTE_MS }
        )
      ).catch(() => {
        // bereits von step() geloggt
      });
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

    await step('wc-note-amount', body.paypalOrderId, () =>
      addOrderNote(wcOrderId, `⚠️ ${text}`, false, { timeoutMs: TIMEOUT_WC_NOTE_MS })
    ).catch(() => {
      // bereits von step() geloggt
    });

    if (diff >= AMOUNT_MAIL_THRESHOLD) {
      await step('notify-wp-amount', body.paypalOrderId, () => notifyShop({
        timeoutMs: TIMEOUT_NOTIFY_MS,
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
      }));
    }
  } catch (error) {
    console.error('[express-capture] Summenabgleich fehlgeschlagen:', error);
  }
}
