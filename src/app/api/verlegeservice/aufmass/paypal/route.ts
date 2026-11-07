import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'
import { AUFMASS_BEZAHLT_PFAD, istBezahltStatus, ladeAufmassBestellung } from '@/lib/aufmass'
import { addOrderNote } from '@/lib/woocommerce-checkout'

/**
 * Rückkehr von PayPal für ein Aufmaß aus dem Verlegeservice-Formular.
 *
 * GET /api/verlegeservice/aufmass/paypal?order=123&key=wc_order_…&token=<PayPal-Order>
 *
 * Wie die Checkout-Route erfasst sie die Zahlung über den WordPress-Proxy (der
 * die Bestellung auf „In Bearbeitung" setzt) und leitet dann auf die
 * Bezahlt-Seite des Formulars statt auf die Checkout-Bestätigung. Der
 * Bestellschlüssel stellt sicher, dass nur die eigene Bestellung erfasst wird.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

// In der Vorschau zurück auf die Vorschau, damit ein Test komplett dort läuft
const SITE_URL =
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL

function zurSeite(orderId: number, key: string, abgebrochen = false) {
  const url = `${SITE_URL}${AUFMASS_BEZAHLT_PFAD}?order=${orderId}&key=${encodeURIComponent(key)}${abgebrochen ? '&abgebrochen=1' : ''}`
  return NextResponse.redirect(url, { status: 302 })
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const orderId = Number(sp.get('order'))
  const key = sp.get('key') ?? ''
  const paypalOrderId = sp.get('token')

  const bestellung = await ladeAufmassBestellung(orderId, key)
  if (!bestellung || !paypalOrderId) {
    return NextResponse.redirect(`${SITE_URL}${AUFMASS_BEZAHLT_PFAD}`, { status: 302 })
  }

  // Zweiter Aufruf (Reload, Zurück-Button): schon bezahlt, nicht erneut erfassen.
  if (istBezahltStatus(bestellung.status)) return zurSeite(orderId, key)

  try {
    const ergebnis = await capturePayPalOrder(paypalOrderId, orderId)
    if (ergebnis.success) return zurSeite(orderId, key)
  } catch (e) {
    console.error('[aufmass/paypal] Capture fehlgeschlagen:', orderId, e)
  }

  // Wirft der Proxy, weil die Zahlung schon erfasst ist, zählt der Status.
  const nachher = await ladeAufmassBestellung(orderId, key)
  if (nachher && istBezahltStatus(nachher.status)) return zurSeite(orderId, key)

  await addOrderNote(orderId, `PayPal-Zahlung für Aufmaß nicht abgeschlossen. PayPal-Order: ${paypalOrderId}`, false).catch(
    () => undefined,
  )
  return zurSeite(orderId, key, true)
}
