import { NextRequest, NextResponse } from 'next/server'
import { VS_ZAHLARTEN, type VsZahlartKey } from '@/content/verlegeservice-anfrage'
import {
  AUFMASS_BEZAHLT_PFAD,
  aufmassFuerNeuenVersuch,
  aufmassZahlungStartenSicher,
  istBezahltStatus,
  ladeAufmassBestellung,
} from '@/lib/aufmass'

/**
 * Neuer Zahlungsversuch für ein Aufmaß, z. B. nach Abbruch bei Stripe/PayPal.
 *
 * POST /api/verlegeservice/aufmass/zahlung  { order, key, zahlart }
 *
 * Legt KEINE neue Bestellung an, sondern startet die Zahlung für die
 * bestehende — so bleibt es bei einer Bestellung pro Anfrage. Der Betrag kommt
 * aus WooCommerce, nie aus dem Request.
 */
export const runtime = 'nodejs'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

export async function POST(request: NextRequest) {
  let body: { order?: unknown; key?: unknown; zahlart?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const orderId = Number(body.order)
  const key = typeof body.key === 'string' ? body.key : ''
  const zahlart = VS_ZAHLARTEN.find((z) => z.key === body.zahlart)?.key as VsZahlartKey | undefined
  if (!zahlart) {
    return NextResponse.json({ success: false, error: 'Bitte wähle eine Zahlungsart.' }, { status: 400 })
  }

  const bestellung = await ladeAufmassBestellung(orderId, key)
  if (!bestellung) {
    return NextResponse.json({ success: false, error: 'Bestellung nicht gefunden.' }, { status: 404 })
  }

  const seite = `${SITE_URL}${AUFMASS_BEZAHLT_PFAD}?order=${orderId}&key=${encodeURIComponent(key)}`
  if (istBezahltStatus(bestellung.status)) {
    return NextResponse.json({ success: true, redirectUrl: seite })
  }
  if (!['pending', 'failed', 'cancelled'].includes(bestellung.status)) {
    // z. B. „on-hold" oder „refunded": hier soll das Team entscheiden.
    return NextResponse.json(
      { success: false, error: 'Diese Bestellung kann nicht mehr online bezahlt werden. Bitte ruf uns an.' },
      { status: 409 },
    )
  }

  try {
    await aufmassFuerNeuenVersuch(orderId, zahlart)
  } catch (e) {
    console.error('[aufmass/zahlung] Zurücksetzen fehlgeschlagen:', orderId, e)
    return NextResponse.json(
      { success: false, error: 'Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }

  const redirectUrl = await aufmassZahlungStartenSicher(
    {
      id: bestellung.id,
      order_key: bestellung.orderKey,
      total: bestellung.total.toFixed(2),
      billing: bestellung.billing,
      line_items: bestellung.line_items,
    },
    zahlart,
  )
  if (!redirectUrl) {
    return NextResponse.json(
      { success: false, error: 'Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ success: true, redirectUrl })
}
