/**
 * API Route: PayPal Express Create
 *
 * POST /api/checkout/paypal/express-create
 *
 * Body (vom Express-Button im Browser):
 * {
 *   line_items: OrderLineItem[]   // aus buildOrderLineItems(), Brutto
 *   shipping_cost: number         // Versandkosten brutto, EUR
 * }
 *
 * PayPal zieht `Summe der line_items.total + shipping_cost` ein — dieselben
 * Positionen schickt der Browser danach an /express-capture, damit die
 * WooCommerce-Order exakt den eingezogenen Betrag abbildet.
 *
 * Response (Erfolg):
 * {
 *   success: true,
 *   approvalUrl: string,       // Redirect-URL zu PayPal
 *   paypalOrderId: string,
 *   referenceId: string,
 * }
 *
 * Erstellt NUR die PayPal-Order. Die WooCommerce-Order entsteht
 * erst nach erfolgreichem Capture in /api/checkout/paypal/express-capture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayPalExpressOrder } from '@/lib/paypal';
import {
  sumLineItemTotals,
  validateOrderLineItems,
  type OrderLineItem,
} from '@/lib/order-line-items';

interface ExpressCreateBody {
  line_items: OrderLineItem[];
  shipping_cost: number;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Body parsen
    let body: ExpressCreateBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // 2. Server-Side Validation
    const errors: string[] = [];

    const lineItemsError = validateOrderLineItems(body.line_items);
    if (lineItemsError) errors.push(lineItemsError);

    if (typeof body.shipping_cost !== 'number' || body.shipping_cost < 0) {
      errors.push('Versandkosten ungültig');
    }

    const itemsTotal = lineItemsError ? 0 : sumLineItemTotals(body.line_items);
    if (!lineItemsError && itemsTotal <= 0) {
      errors.push('Keine bezahlbaren Artikel im Warenkorb');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('; ') },
        { status: 400 }
      );
    }

    // 3. Line Items für PayPal — rein informativ, createPayPalExpressOrder
    //    bündelt sie ohnehin zu einem Sammelposten. Gratis-Positionen raus,
    //    PayPal lehnt unit_amount "0.00" ab.
    const paypalLineItems = body.line_items
      .filter((item) => parseFloat(item.total) > 0)
      .map((item) => ({
        name: (item.name || `Produkt #${item.product_id}`).slice(0, 127), // PayPal max length 127
        quantity: item.quantity,
        unit_amount: (parseFloat(item.total) / item.quantity).toFixed(2),
      }));

    // 4. Gesamtbetrag = Positionen (Aktionsrabatt steckt schon in `total`)
    //    + Versand. Gleiche Formel wie der normale PayPal-Ablauf in
    //    create-order/route.ts.
    const totalAmount = (itemsTotal + body.shipping_cost).toFixed(2);

    // 5. PayPal Express Order beim Proxy erstellen
    const result = await createPayPalExpressOrder({
      amount: totalAmount,
      lineItems: paypalLineItems,
    });

    console.log(
      `✅ PayPal Express Order created: ${result.paypalOrderId} (ref: ${result.referenceId})`
    );

    return NextResponse.json({
      success: true,
      approvalUrl: result.approvalUrl,
      paypalOrderId: result.paypalOrderId,
      referenceId: result.referenceId,
    });
  } catch (error) {
    console.error('❌ PayPal Express Create error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'PayPal Express creation failed',
      },
      { status: 500 }
    );
  }
}
