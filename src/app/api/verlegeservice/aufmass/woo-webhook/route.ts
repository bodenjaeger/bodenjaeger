import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { aufmassNachZahlungAbschliessen, istBezahltStatus, ladeAufmassBestellungPerId } from '@/lib/aufmass'

/**
 * WooCommerce-Webhook „Bestellung aktualisiert“ für bezahlte Aufmaße.
 *
 * Sicherheitsnetz, falls der Kunde nach der Zahlung nicht auf die Bezahlt-Seite
 * zurückkommt (Browser geschlossen): Sobald WooCommerce die Bestellung auf
 * „In Bearbeitung“ setzt, wird die Trello-Karte auf „Bezahlt“ umgestellt und
 * der Kauf an Meta gemeldet. Läuft pro Bestellung nur einmal, egal ob die
 * Bezahlt-Seite oder der Webhook zuerst kommt.
 *
 * Einrichtung in WooCommerce → Einstellungen → Erweitert → Webhooks:
 *   Thema „Bestellung aktualisiert“, Zustell-URL diese Route,
 *   Geheimnis = WC_WEBHOOK_SECRET in Vercel.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

function signaturOk(body: string, signatur: string | null, secret: string): boolean {
  if (!signatur) return false
  const erwartet = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  const a = Buffer.from(erwartet)
  const b = Buffer.from(signatur)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const secret = process.env.WC_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error('[aufmass/woo-webhook] WC_WEBHOOK_SECRET fehlt')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  // WooCommerce schickt beim Anlegen einen Test-Ping ohne Signatur und ohne JSON.
  if (!request.headers.get('x-wc-webhook-signature') && body.startsWith('webhook_id=')) {
    return NextResponse.json({ ok: true })
  }
  if (!signaturOk(body, request.headers.get('x-wc-webhook-signature'), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let order: { id?: number; status?: string }
  try {
    order = JSON.parse(body) as { id?: number; status?: string }
  } catch {
    return NextResponse.json({ ok: true })
  }
  // Nur bezahlte Bestellungen interessieren
  if (!order.id || !order.status || !istBezahltStatus(order.status)) return NextResponse.json({ ok: true })

  try {
    const b = await ladeAufmassBestellungPerId(order.id)
    if (b && istBezahltStatus(b.status)) await aufmassNachZahlungAbschliessen(b, {})
  } catch (e) {
    console.error('[aufmass/woo-webhook] Abschluss fehlgeschlagen:', order.id, e)
    // 500, damit WooCommerce es erneut versucht
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
