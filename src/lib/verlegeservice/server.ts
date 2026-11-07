/**
 * Gemeinsame Server-Helfer für das Verlegeservice-Formular: Spam-Schutz,
 * Team-Mail über WordPress, Zeitzone für Termine.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function clientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    undefined
  )
}

export async function pruefeTurnstile(request: NextRequest, token?: string): Promise<boolean> {
  // Vorschau-Adressen (*.vercel.app) sind im Turnstile-Widget nicht freigegeben,
  // dort lädt die Prüfung nicht. In der Vorschau wird sie deshalb übersprungen.
  if (process.env.VERCEL_ENV === 'preview') return true
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    console.warn('[verlegeservice] TURNSTILE_SECRET_KEY fehlt — Spam-Schutz übersprungen.')
    return true
  }
  if (!token) return false
  const params = new URLSearchParams({ secret, response: token })
  const ip = clientIp(request)
  if (ip) params.append('remoteip', ip)
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: params })
    const json = (await res.json()) as { success?: boolean }
    return json.success === true
  } catch (e) {
    console.error('[verlegeservice] Turnstile nicht erreichbar:', e)
    return false
  }
}

/**
 * Mail ans Team über den bestehenden WordPress-Contact-Endpunkt. Der Betreff
 * „verlegeservice" leitet im Plugin an verkauf@bodenjaeger.de.
 */
export async function teamMail(d: { name: string; email: string; telefon: string; text: string }): Promise<boolean> {
  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL
  const secret = process.env.JAEGER_CONTACT_SECRET?.trim()
  if (!wpUrl || !secret) {
    console.error('[verlegeservice] WORDPRESS_URL oder JAEGER_CONTACT_SECRET fehlt')
    return false
  }
  try {
    const res = await fetch(`${wpUrl}/wp-json/jaeger/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Jaeger-Secret': secret },
      body: JSON.stringify({
        name: d.name,
        // Der Endpunkt verlangt eine E-Mail; ohne Angabe die eigene Adresse.
        email: d.email || 'service@bodenjaeger.de',
        phone: d.telefon,
        subject: 'verlegeservice',
        message: d.text,
      }),
    })
    if (!res.ok) {
      console.error('[verlegeservice] WordPress-Mail fehlgeschlagen:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (e) {
    console.error('[verlegeservice] WordPress-Mail Netzwerkfehler:', e)
    return false
  }
}

/** „2026-11-10" + „15:00" (Ortszeit Hückelhoven) → ISO in UTC. */
export function berlinZuIso(datum: string, zeit: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum)
  const t = /^(\d{2}):(\d{2})$/.exec(zeit)
  if (!m || !t) return null
  const utcGuess = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1], +t[2])
  // Versatz von Europe/Berlin zu diesem Zeitpunkt bestimmen (MEZ/MESZ)
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(utcGuess))
  const off = teile.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const o = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(off)
  const minuten = o ? (o[1] === '-' ? -1 : 1) * (+o[2] * 60 + +(o[3] ?? 0)) : 60
  return new Date(utcGuess - minuten * 60_000).toISOString()
}

/** Heutiges Datum in Hückelhoven als „YYYY-MM-DD". */
export function heuteBerlin(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())
}

// ── Vorgang: dieselbe Anfrage im selben Besuch erkennen ─────────────────────
// Der Browser bekommt nach dem Absenden „<Karte>.<Lead-ID>.<Signatur>“ zurück.
// Schickt er später erneut ab (z. B. Umstieg Preisrahmen → Aufmaß), wird die
// vorhandene Karte aktualisiert statt eine zweite angelegt. Die Signatur
// verhindert, dass jemand fremde Karten überschreibt.

const vorgangsSchluessel = () => process.env.TRELLO_TOKEN?.trim() || process.env.WC_CONSUMER_SECRET?.trim() || ''

export function vorgangSignieren(cardId: string, leadId: string): string | undefined {
  const k = vorgangsSchluessel()
  if (!k) return undefined
  const sig = createHmac('sha256', k).update(`${cardId}.${leadId}`).digest('base64url')
  return `${cardId}.${leadId}.${sig}`
}

export function vorgangPruefen(token: string | undefined): { cardId: string; leadId: string } | null {
  const k = vorgangsSchluessel()
  if (!k || !token) return null
  const teile = token.split('.')
  if (teile.length !== 3) return null
  const [cardId, leadId, sig] = teile
  const erwartet = createHmac('sha256', k).update(`${cardId}.${leadId}`).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(erwartet)
  return a.length === b.length && timingSafeEqual(a, b) ? { cardId, leadId } : null
}
