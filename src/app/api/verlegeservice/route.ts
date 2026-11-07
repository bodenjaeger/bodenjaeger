import { NextRequest, NextResponse } from 'next/server'
import {
  VS_BODENARTEN,
  VS_FEHLER,
  VS_FLAECHE_STAFFELN,
  VS_WEG_AUFMASS,
  VS_WEGE,
  VS_ZAHLARTEN,
  VS_ZEITRAEUME,
} from '@/content/verlegeservice-anfrage'
import {
  aufmassAngebot,
  aufmassBestellungAnlegen,
  aufmassZahlungStartenSicher,
  type AufmassAngebot,
} from '@/lib/aufmass'
import { naechsteLeadId } from '@/lib/leadId'
import { pruefeServicegebiet, type AreaStatus } from '@/lib/servicegebiet'
import { kartenBeschreibung, kommentarAnKarte, leadNachTrello } from '@/lib/trello-verlegeservice'
import { sendeMetaLead } from '@/lib/tracking/meta-capi'
import { pruefeAnfrage } from '@/lib/verlegeservice-validierung'
import type {
  VsAnfrage,
  VsAnfrageAntwort,
} from '@/types/verlegeservice-anfrage'

/**
 * Zentraler Endpunkt des Verlegeservice-Formulars.
 *
 * Das Frontend spricht NIE direkt mit Trello, Google oder Meta — alles läuft
 * hier durch, damit Zugangsdaten ausschließlich in Environment Variables auf
 * dem Server liegen.
 *
 * Ablauf: validieren → Spam-Schutz → Servicegebiet serverseitig bestimmen →
 * Lead-ID → Trello (Karte + Anhänge) → E-Mail → Meta CAPI → Antwort.
 *
 * Bei „Aufmaß vor Ort" (weg = 'aufmass') kommt danach die Zahlung: Preis und
 * Produkt bestimmt der Server aus der PLZ (siehe lib/aufmass.ts), legt eine
 * WooCommerce-Bestellung an und gibt die Weiterleitung zu Stripe/PayPal
 * zurück. Der Lead entsteht trotzdem zuerst — bricht jemand die Zahlung ab,
 * liegt die Anfrage dem Team bereits vor.
 *
 * Zustellgarantie: Trello UND E-Mail werden versucht. Erfolg wird gemeldet,
 * sobald MINDESTENS EIN Kanal funktioniert hat — ein Lead mit Auftragswert soll
 * nicht an einem einzelnen Ausfall verloren gehen. Scheitern beide, bekommt der
 * Nutzer einen Fehler und kann es erneut versuchen.
 */

// Node-Runtime: nötig für Buffer (Base64 → Datei) und crypto (Meta-Hashes).
export const runtime = 'nodejs'
// Anhänge gehen einzeln und nacheinander zu Trello — das braucht Luft.
export const maxDuration = 60

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

/** Leere Vorgabe, damit fehlende Felder nicht als undefined durchlaufen. */
function normalisiere(rohdaten: Partial<VsAnfrage>): VsAnfrage {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    plz: s(rohdaten.plz).trim(),
    ort: s(rohdaten.ort).trim(),
    flaecheStaffel: (rohdaten.flaecheStaffel ?? null) as VsAnfrage['flaecheStaffel'],
    qm:
      typeof rohdaten.qm === 'number' && Number.isFinite(rohdaten.qm)
        ? Math.round(rohdaten.qm)
        : null,
    raeume: Array.isArray(rohdaten.raeume) ? rohdaten.raeume.filter((r) => typeof r === 'string') : [],
    raumSonstiger: s(rohdaten.raumSonstiger).trim(),
    // Mehrfachauswahl: nur bekannte Keys übernehmen und Dubletten verwerfen —
    // was hier hereinkommt, landet unverändert in Trello und im Tracking.
    bodenarten: Array.isArray(rohdaten.bodenarten)
      ? ([...new Set(rohdaten.bodenarten)].filter((b) =>
          VS_BODENARTEN.some((o) => o.key === b),
        ) as VsAnfrage['bodenarten'])
      : [],
    zeitraum: (rohdaten.zeitraum ?? null) as VsAnfrage['zeitraum'],
    zeitraumDetail: s(rohdaten.zeitraumDetail).trim(),
    altbodenEntfernen: (rohdaten.altbodenEntfernen ?? null) as VsAnfrage['altbodenEntfernen'],
    altbodenBelag: (rohdaten.altbodenBelag ?? null) as VsAnfrage['altbodenBelag'],
    altbodenBelagSonstiger: s(rohdaten.altbodenBelagSonstiger).trim(),
    altbodenVerlegeart: (rohdaten.altbodenVerlegeart ?? null) as VsAnfrage['altbodenVerlegeart'],
    vorname: s(rohdaten.vorname).trim(),
    nachname: s(rohdaten.nachname).trim(),
    telefon: s(rohdaten.telefon).trim(),
    email: s(rohdaten.email).trim(),
    kontaktart: (rohdaten.kontaktart ?? null) as VsAnfrage['kontaktart'],
    erreichbarkeit: (rohdaten.erreichbarkeit ?? null) as VsAnfrage['erreichbarkeit'],
    preisvorstellung: s(rohdaten.preisvorstellung).trim(),
    freitext: s(rohdaten.freitext).trim(),
    datenschutz: rohdaten.datenschutz === true,
    weg: VS_WEGE.some((w) => w.key === rohdaten.weg) ? (rohdaten.weg as VsAnfrage['weg']) : null,
    aufmass:
      rohdaten.aufmass && typeof rohdaten.aufmass === 'object'
        ? {
            strasse: s(rohdaten.aufmass.strasse).trim().slice(0, 120),
            zahlart: VS_ZAHLARTEN.some((z) => z.key === rohdaten.aufmass?.zahlart)
              ? (rohdaten.aufmass.zahlart as NonNullable<VsAnfrage['aufmass']>['zahlart'])
              : null,
            widerruf: rohdaten.aufmass.widerruf === true,
          }
        : undefined,
    dateien: Array.isArray(rohdaten.dateien) ? rohdaten.dateien : [],
    tracking: rohdaten.tracking && typeof rohdaten.tracking === 'object' ? rohdaten.tracking : {},
    turnstileToken: typeof rohdaten.turnstileToken === 'string' ? rohdaten.turnstileToken : undefined,
    website: typeof rohdaten.website === 'string' ? rohdaten.website : undefined,
  }
}

async function pruefeTurnstile(request: NextRequest, token?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    // Lokal ohne Secret: überspringen, damit Entwicklung möglich bleibt.
    console.warn('[api/verlegeservice] TURNSTILE_SECRET_KEY fehlt — Spam-Schutz übersprungen.')
    return true
  }
  if (!token) return false

  const params = new URLSearchParams({ secret, response: token })
  const ip =
    request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || ''
  if (ip) params.append('remoteip', ip.split(',')[0].trim())

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: params })
    const json = (await res.json()) as TurnstileVerifyResponse
    return json.success === true
  } catch (e) {
    console.error('[api/verlegeservice] Turnstile nicht erreichbar:', e)
    return false
  }
}

/**
 * Schickt die Anfrage als strukturierte Mail über den bestehenden
 * WordPress-Contact-Endpunkt. Der kann keine Anhänge — die Dateien liegen
 * ohnehin an der Trello-Karte, die Mail nennt nur ihre Anzahl.
 */
async function sendeMail(a: VsAnfrage, klartext: string): Promise<boolean> {
  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL
  const secret = process.env.JAEGER_CONTACT_SECRET?.trim()
  if (!wpUrl || !secret) {
    console.error('[api/verlegeservice] WORDPRESS_URL oder JAEGER_CONTACT_SECRET fehlt')
    return false
  }

  try {
    const res = await fetch(`${wpUrl}/wp-json/jaeger/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Jaeger-Secret': secret },
      body: JSON.stringify({
        name: `${a.vorname} ${a.nachname}`.trim(),
        email: a.email,
        phone: a.telefon,
        // Der Betreff steuert im WordPress-Endpunkt den Empfänger
        // (Jaeger_Contact_Endpoint::ROUTING: 'verlegeservice' =>
        // verkauf@bodenjaeger.de). Gebraucht wird deshalb exakt der Slug, nicht
        // ein Freitext — jeder unbekannte Wert fällt auf info@bodenjaeger.de
        // zurück. Die Lead-ID steht als erste Zeile im Klartext.
        subject: 'verlegeservice',
        message: klartext,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[api/verlegeservice] WordPress-Mail fehlgeschlagen:', res.status, text)
      return false
    }
    return true
  } catch (e) {
    console.error('[api/verlegeservice] WordPress-Mail Netzwerkfehler:', e)
    return false
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<VsAnfrageAntwort>> {
  let rohdaten: Partial<VsAnfrage>
  try {
    rohdaten = (await request.json()) as Partial<VsAnfrage>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ungültiger Request-Body.' },
      { status: 400 },
    )
  }

  const a = normalisiere(rohdaten)

  // Honeypot: stiller Erfolg für Bots. leadId bleibt leer — daran erkennt das
  // Formular, dass keine Conversion gefeuert werden darf.
  if (a.website && a.website.length > 0) {
    return NextResponse.json({
      success: true,
      leadId: '',
      areaStatus: 'out_of_area',
      distanceKm: null,
      ort: '',
      dateienUebertragen: 0,
      dateienGesamt: 0,
    })
  }

  // Vollständige Prüfung — dieselben Regeln, die das Formular anzeigt.
  const felder = pruefeAnfrage(a)
  if (Object.keys(felder).length > 0) {
    return NextResponse.json(
      { success: false, error: 'Bitte prüfe die markierten Felder.', felder },
      { status: 400 },
    )
  }

  if (!(await pruefeTurnstile(request, a.turnstileToken))) {
    return NextResponse.json(
      { success: false, error: 'Sicherheitscheck fehlgeschlagen. Bitte lade die Seite neu.' },
      { status: 400 },
    )
  }

  // Servicegebiet IMMER serverseitig bestimmen — der Client könnte lügen.
  const gebiet = pruefeServicegebiet(a.plz)
  const areaStatus: AreaStatus = gebiet?.areaStatus ?? 'out_of_area'
  const distanceKm = gebiet?.distanceKm ?? null
  const ort = gebiet?.ort ?? a.ort

  // Aufmaß: Preis und Produkt vor dem Lead bestimmen. Ist das Aufmaß hier
  // nicht buchbar (außerhalb, Produkt fehlt), soll der Nutzer das sofort sehen
  // und einen anderen Weg wählen können — ohne halben Lead in Trello.
  let angebot: AufmassAngebot | null = null
  if (a.weg === VS_WEG_AUFMASS) {
    angebot = await aufmassAngebot(a.plz)
    if (!angebot) {
      return NextResponse.json(
        {
          success: false,
          error: VS_FEHLER.aufmassNichtMoeglich,
          felder: { weg: VS_FEHLER.aufmassNichtMoeglich },
        },
        { status: 400 },
      )
    }
  }

  const leadId = await naechsteLeadId()
  const eingang = new Date()

  const trelloOpts = {
    leadId,
    areaStatus,
    distanceKm,
    ort,
    eingang,
    aufmass: angebot
      ? { preis: angebot.preis, kreis: angebot.kreis.name, sku: angebot.kreis.sku }
      : null,
  }
  // Für die Mail dieselbe Struktur, nur ohne Markdown-Sternchen.
  const klartext = kartenBeschreibung(a, trelloOpts).replace(/\*\*/g, '')

  // Beide Kanäle parallel — der langsamere bestimmt die Laufzeit, nicht die Summe.
  const [trello, mailOk] = await Promise.all([
    leadNachTrello(a, trelloOpts),
    sendeMail(a, klartext),
  ])

  if (!trello.cardId && !mailOk) {
    console.error('[api/verlegeservice] Beide Zustellwege fehlgeschlagen für', leadId)
    return NextResponse.json(
      { success: false, error: VS_FEHLER.absendenFehlgeschlagen },
      { status: 502 },
    )
  }

  // Meta CAPI: nach der Zustellung, Fehler nur protokollieren. Tracking darf
  // eine erfolgreich zugestellte Anfrage nicht nachträglich kippen.
  const staffel = VS_FLAECHE_STAFFELN.find((s) => s.key === a.flaecheStaffel)
  const zeitraum = VS_ZEITRAEUME.find((z) => z.key === a.zeitraum)
  await sendeMetaLead({
    leadId,
    areaStatus,
    areaRange: staffel?.key ?? null,
    // Kommaseparierte Keys; der Parametername bleibt `floor_type`, damit
    // bestehende Auswertungen weiterlaufen.
    floorType: a.bodenarten.join(',') || null,
    timeline: zeitraum?.key ?? null,
    naechsterSchritt: a.weg,
    email: a.email,
    telefon: a.telefon,
    vorname: a.vorname,
    nachname: a.nachname,
    plz: a.plz,
    ort,
    fbp: a.tracking.fbp,
    fbc: a.tracking.fbc,
    clientIp:
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    eventSourceUrl: a.tracking.landingpage,
    zeitpunkt: eingang,
  }).catch((e) => {
    console.error('[api/verlegeservice] Meta CAPI Fehler:', e)
    return false
  })

  // Aufmaß: Bestellung anlegen und Zahlung starten. Scheitert das, ist die
  // Anfrage trotzdem angekommen — das Formular zeigt dann einen Hinweis und das
  // Team sieht auf der Karte, dass die Zahlung nicht gestartet wurde.
  let zahlungUrl: string | undefined
  let zahlungFehler = false
  if (angebot && a.aufmass?.zahlart) {
    try {
      const order = await aufmassBestellungAnlegen({
        angebot,
        leadId,
        trelloCardId: trello.cardId,
        vorname: a.vorname,
        nachname: a.nachname,
        email: a.email,
        telefon: a.telefon,
        strasse: a.aufmass.strasse,
        ort,
        zahlart: a.aufmass.zahlart,
        tracking: a.tracking,
      })
      zahlungUrl = (await aufmassZahlungStartenSicher(order, a.aufmass.zahlart)) ?? undefined
    } catch (e) {
      console.error('[api/verlegeservice] Aufmaß-Bestellung fehlgeschlagen für', leadId, e)
    }
    if (!zahlungUrl) {
      zahlungFehler = true
      if (trello.cardId) {
        // Nur Kommentar, die Karte bleibt in der Eingangsliste.
        await kommentarAnKarte(
          trello.cardId,
          '⚠️ Aufmaß gewählt, aber die Zahlung konnte nicht gestartet werden. Bitte Kunden anrufen und das Aufmaß persönlich vereinbaren.',
        )
      }
    }
  }

  return NextResponse.json({
    success: true,
    leadId,
    areaStatus,
    distanceKm,
    ort,
    dateienUebertragen: trello.dateienUebertragen,
    dateienGesamt: trello.dateienGesamt,
    ...(zahlungUrl ? { zahlungUrl } : {}),
    ...(zahlungFehler ? { zahlungFehler: true } : {}),
  })
}
