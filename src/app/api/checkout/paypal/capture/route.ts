/**
 * API Route: PayPal Capture
 *
 * GET /api/checkout/paypal/capture?order=123&token=xxx
 *
 * Erfasst die PayPal-Zahlung nachdem Kunde von PayPal zurückkommt
 *
 * WICHTIG:
 * - "token" ist die PayPal Order ID (wird von PayPal als Query-Parameter gesendet)
 * - "order" ist unsere WooCommerce Order ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { updateOrderStatus, addOrderNote, getOrderStatus } from '@/lib/woocommerce-checkout';

// Capture über den Proxy + Status-Prüfung + ggf. Status-Update.
export const maxDuration = 60;

/**
 * Ist die Order bereits bezahlt? Fängt den doppelten Aufruf der Rückkehr-URL
 * ab (Reload, Zurück-Button, doppelter Redirect): Der zweite Capture schlägt
 * bei PayPal fehl, weil schon erfasst — die Order darf dann NICHT auf
 * „failed“ gesetzt werden. Bei Fehlern beim Abruf `false` (altes Verhalten).
 */
async function isAlreadyPaid(orderId: number): Promise<boolean> {
  try {
    const order = await getOrderStatus(orderId);
    return order.status === 'processing' || order.status === 'completed';
  } catch (err) {
    console.error(`[paypal/capture] Status-Abruf für Order ${orderId} fehlgeschlagen:`, err);
    return false;
  }
}

function successRedirect(orderId: number) {
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?order=${orderId}&paypal=success`,
    { status: 302 }
  );
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  let orderId: number | null = null;
  try {
    // 1. Query-Parameter auslesen
    const searchParams = request.nextUrl.searchParams;
    const wcOrderId = searchParams.get('order');
    const paypalOrderId = searchParams.get('token'); // PayPal sendet als "token"

    // 2. Validierung
    if (!wcOrderId || !paypalOrderId) {
      console.error('❌ PayPal capture: Missing parameters');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?error=missing_params`,
        { status: 302 }
      );
    }

    orderId = parseInt(wcOrderId);
    if (isNaN(orderId)) {
      console.error('❌ PayPal capture: Invalid order ID');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?error=invalid_order_id`,
        { status: 302 }
      );
    }

    console.log(
      `🔄 Capturing PayPal payment for WC Order ${orderId}, PayPal Order ${paypalOrderId}`
    );

    // 3. PayPal Zahlung erfassen (capture) — Proxy aktualisiert WooCommerce Order direkt
    const result = await capturePayPalOrder(paypalOrderId, orderId);

    // 4. Erfolg: Proxy hat Order bereits auf "processing" gesetzt
    if (result.success) {
      console.log(`✅ Order ${orderId} captured via proxy (Transaction: ${result.transactionId})`);

      // Redirect zur Success-Page
      return successRedirect(orderId);
    }

    // 5. Fehler — aber vorher prüfen, ob die Order schon bezahlt ist
    if (await isAlreadyPaid(orderId)) {
      console.log(`ℹ️ Order ${orderId} ist bereits bezahlt — kein Statuswechsel, weiter zur Success-Page`);
      return successRedirect(orderId);
    }

    // Zahlung fehlgeschlagen
    await updateOrderStatus(orderId, 'failed');
    await addOrderNote(
      orderId,
      `PayPal payment failed. PayPal Order ID: ${paypalOrderId}`,
      false
    );

    console.log(`❌ Order ${orderId} marked as failed`);

    // Redirect zurück zum Checkout mit Error
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?error=payment_failed&order=${orderId}`,
      { status: 302 }
    );
  } catch (error) {
    console.error('❌ PayPal capture error:', error);

    // Wirft der Proxy, weil die Zahlung schon erfasst ist (zweiter Aufruf),
    // soll der Kunde trotzdem seine Bestätigung sehen.
    if (orderId !== null && !isNaN(orderId) && (await isAlreadyPaid(orderId))) {
      return successRedirect(orderId);
    }

    // Bei Fehler: Redirect zurück zum Checkout
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?error=payment_error`,
      { status: 302 }
    );
  }
}
