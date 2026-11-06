/**
 * Meta Conversions API (serverseitig).
 *
 * Zusammen mit dem Meta Pixel im Browser bilden die beiden den doppelten
 * Übertragungsweg aus der Spezifikation. Beide senden dieselbe `event_id`
 * (= Lead-ID), damit Meta die Ereignisse zusammenführt und NICHT doppelt zählt.
 *
 * Personenbezogene Daten werden vor dem Versand normalisiert und mit SHA-256
 * gehasht — Meta verlangt das, und Klartext soll das Haus nicht verlassen.
 *
 * Inaktiv, solange META_PIXEL_ID und META_CAPI_ACCESS_TOKEN fehlen. Dann
 * passiert nichts und es wird auch kein Fehler geworfen: Ein fehlendes
 * Marketing-Tracking darf niemals eine Kundenanfrage verhindern.
 */
import { createHash } from 'node:crypto'
import type { AreaStatus } from '@/lib/servicegebiet'

const GRAPH_VERSION = 'v21.0'

export interface MetaLeadEingabe {
  leadId: string
  areaStatus: AreaStatus
  /** Staffel-Key, z. B. `41_bis_80`. */
  areaRange: string | null
  /** Bodenart-Key, z. B. `rigid_vinyl`. */
  floorType: string | null
  /** Zeitraum-Key, z. B. `asap`. */
  timeline: string | null
  /** Gewählter nächster Schritt: `aufmass`, `telefon` oder `preis`. */
  naechsterSchritt?: string | null
  email: string
  telefon: string
  vorname: string
  nachname: string
  plz: string
  ort: string
  /** Meta-Browser-Cookies für die Zuordnung. */
  fbp?: string
  fbc?: string
  clientIp?: string
  userAgent?: string
  eventSourceUrl?: string
  /** Zeitpunkt des Leads. */
  zeitpunkt: Date
}

/**
 * Die Pixel-ID ist kein Geheimnis (sie steht ohnehin im Browser), deshalb genügt
 * EINE Variable für Client und Server. `META_PIXEL_ID` bleibt als Alternative
 * erlaubt, falls beide getrennt gepflegt werden sollen.
 */
function pixelId(): string | undefined {
  return (
    process.env.META_PIXEL_ID?.trim() ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
    undefined
  )
}

function istKonfiguriert(): boolean {
  return !!(pixelId() && process.env.META_CAPI_ACCESS_TOKEN?.trim())
}

/** SHA-256 in Hex — Metas erwartetes Format. */
function hash(wert: string): string {
  return createHash('sha256').update(wert, 'utf8').digest('hex')
}

/** Normalisierung laut Meta: trimmen, Kleinschreibung. */
function normText(wert: string): string | undefined {
  const v = wert?.trim().toLowerCase()
  return v ? v : undefined
}

/**
 * Telefon: nur Ziffern, mit Ländervorwahl. Deutsche Eingaben beginnen oft mit
 * 0 statt +49 — das wird hier umgestellt, sonst ordnet Meta nicht zu.
 */
function normTelefon(wert: string): string | undefined {
  let ziffern = (wert ?? '').replace(/\D/g, '')
  if (!ziffern) return undefined
  if (ziffern.startsWith('00')) ziffern = ziffern.slice(2)
  else if (ziffern.startsWith('0')) ziffern = `49${ziffern.slice(1)}`
  return ziffern
}

function hashOptional(wert: string | undefined): string | undefined {
  return wert ? hash(wert) : undefined
}

/** Entfernt undefined-Felder, damit die Payload schlank bleibt. */
function ohneLeere<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''),
  ) as Partial<T>
}

/**
 * Sendet das `Lead`-Event. Gibt zurück, ob der Versand geklappt hat — der
 * Aufrufer soll das nur protokollieren, nicht darauf reagieren.
 */
export async function sendeMetaLead(e: MetaLeadEingabe): Promise<boolean> {
  if (!istKonfiguriert()) return false

  const id = pixelId()!
  const token = process.env.META_CAPI_ACCESS_TOKEN!.trim()

  const userData = ohneLeere({
    em: hashOptional(normText(e.email)),
    ph: hashOptional(normTelefon(e.telefon)),
    fn: hashOptional(normText(e.vorname)),
    ln: hashOptional(normText(e.nachname)),
    zp: hashOptional(normText(e.plz)),
    ct: hashOptional(normText(e.ort)),
    country: hashOptional('de'),
    fbp: e.fbp,
    fbc: e.fbc,
    client_ip_address: e.clientIp,
    client_user_agent: e.userAgent,
  })

  // Nicht sensible Parameter — bewusst nur Keys, keine Klartext-Personendaten.
  const customData = ohneLeere({
    lead_type: 'verlegeservice',
    area_status: e.areaStatus,
    area_range: e.areaRange ?? undefined,
    floor_type: e.floorType ?? undefined,
    timeline: e.timeline ?? undefined,
    next_step: e.naechsterSchritt ?? undefined,
  })

  const payload = {
    data: [
      ohneLeere({
        event_name: 'Lead',
        // Gemeinsame ID mit dem Pixel im Browser — Grundlage der Deduplizierung.
        event_id: e.leadId,
        event_time: Math.floor(e.zeitpunkt.getTime() / 1000),
        action_source: 'website',
        event_source_url: e.eventSourceUrl,
        user_data: userData,
        custom_data: customData,
      }),
    ],
    ...(process.env.META_CAPI_TEST_CODE?.trim()
      ? { test_event_code: process.env.META_CAPI_TEST_CODE.trim() }
      : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${id}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[meta-capi] Versand fehlgeschlagen:', res.status, text)
      return false
    }
    return true
  } catch (err) {
    console.error('[meta-capi] Netzwerkfehler:', err)
    return false
  }
}

// ── Kauf: bezahltes Aufmaß ────────────────────────────────────────────────────

export interface MetaAufmassKauf {
  /** Gemeinsame ID mit dem Pixel auf der Bezahlt-Seite: `aufmass-<Bestellnummer>`. */
  eventId: string
  leadId: string
  /** Bruttobetrag in Euro. */
  wert: number
  sku: string
  email: string
  telefon: string
  vorname: string
  nachname: string
  plz: string
  ort: string
  fbp?: string
  fbc?: string
  clientIp?: string
  userAgent?: string
  eventSourceUrl?: string
  zeitpunkt: Date
}

/**
 * Sendet `Purchase` für ein bezahltes Aufmaß — das stärkste Signal, das Meta
 * aus dem Verlegeservice bekommt. Gibt zurück, ob der Versand geklappt hat.
 */
export async function sendeMetaAufmassKauf(e: MetaAufmassKauf): Promise<boolean> {
  if (!istKonfiguriert()) return false

  const id = pixelId()!
  const token = process.env.META_CAPI_ACCESS_TOKEN!.trim()

  const payload = {
    data: [
      ohneLeere({
        event_name: 'Purchase',
        event_id: e.eventId,
        event_time: Math.floor(e.zeitpunkt.getTime() / 1000),
        action_source: 'website',
        event_source_url: e.eventSourceUrl,
        user_data: ohneLeere({
          em: hashOptional(normText(e.email)),
          ph: hashOptional(normTelefon(e.telefon)),
          fn: hashOptional(normText(e.vorname)),
          ln: hashOptional(normText(e.nachname)),
          zp: hashOptional(normText(e.plz)),
          ct: hashOptional(normText(e.ort)),
          country: hashOptional('de'),
          fbp: e.fbp,
          fbc: e.fbc,
          client_ip_address: e.clientIp,
          client_user_agent: e.userAgent,
        }),
        custom_data: {
          currency: 'EUR',
          value: Math.round(e.wert * 100) / 100,
          content_name: 'Aufmaß Verlegeservice',
          content_ids: [e.sku],
          content_type: 'product',
          lead_id: e.leadId,
        },
      }),
    ],
    ...(process.env.META_CAPI_TEST_CODE?.trim()
      ? { test_event_code: process.env.META_CAPI_TEST_CODE.trim() }
      : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${id}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[meta-capi] Aufmaß-Kauf fehlgeschlagen:', res.status, text)
      return false
    }
    return true
  } catch (err) {
    console.error('[meta-capi] Aufmaß-Kauf Netzwerkfehler:', err)
    return false
  }
}
