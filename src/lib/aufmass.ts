/**
 * Bezahltes Aufmaß aus dem Verlegeservice-Formular (nur Server).
 *
 * Ablauf:
 *  1. Das Formular schickt die Anfrage mit `weg = 'aufmass'` an /api/verlegeservice.
 *  2. Dort entsteht wie immer der Lead (Trello + E-Mail). Danach legt dieser
 *     Baustein eine WooCommerce-Bestellung über das passende Aufmaß-Produkt an
 *     (SKU A0001–A0005 je nach Entfernung) und startet Stripe bzw. PayPal.
 *  3. Stripe und PayPal leiten auf /fachmarkt-hueckelhoven/service/
 *     verlegeservice-anfrage/bezahlt zurück. Ist die Zahlung bestätigt, wandert
 *     die Trello-Karte in die Liste „Aufmaß bezahlt" und Meta erhält den Kauf.
 *
 * Bewusst NICHT über den Warenkorb: keine Versandkosten, keine Mengen, keine
 * Mischung mit Böden — und der Preis kommt nie aus dem Browser, sondern aus dem
 * WooCommerce-Produkt zum serverseitig bestimmten Kreis.
 */
import { formatEuro, type AufmassKreis } from '@/lib/aufmass-kreise'
import { fahrwegKm, kreisFuer, MAX_FAHRWEG_KM } from '@/lib/verlegeservice/montage'
import { toNetLineItems } from '@/lib/order-line-items'
import { createPayPalOrder } from '@/lib/paypal'
import { pruefeServicegebiet } from '@/lib/servicegebiet'
import { sendeMetaAufmassKauf } from '@/lib/tracking/meta-capi'
import { aufmassBezahltNachTrello } from '@/lib/trello-verlegeservice'
import { createStripeCheckoutSession, euroToCents, getStripeSession } from '@/lib/stripe'
import {
  addOrderNote,
  createWooCommerceOrder,
  getWCAuthHeaders,
  updateOrderStatus,
  type WooCommerceOrder,
} from '@/lib/woocommerce-checkout'
import type { VsZahlartKey } from '@/content/verlegeservice-anfrage'
import type { VsTracking } from '@/types/verlegeservice-anfrage'

const WP_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL

/** Pfad der Seite, auf die Stripe und PayPal zurückleiten. */
export const AUFMASS_BEZAHLT_PFAD = '/fachmarkt-hueckelhoven/service/verlegeservice-anfrage/bezahlt'

/** Meta-Felder an der WooCommerce-Bestellung. */
export const AUFMASS_META = {
  leadId: '_verlegeservice_lead_id',
  trelloKarte: '_verlegeservice_trello_karte',
  kreis: '_aufmass_kreis',
  entfernungKm: '_aufmass_entfernung_km',
  widerrufVorzeitig: '_aufmass_widerruf_vorzeitig',
  fbp: '_aufmass_fbp',
  fbc: '_aufmass_fbc',
  gclid: '_aufmass_gclid',
  /** „yes", sobald Trello und Meta nach der Zahlung bedient wurden. */
  nachZahlung: '_aufmass_nach_zahlung',
  boeden: '_aufmass_boeden',
  test: '_testbestellung',
} as const

/**
 * Vorschau- und lokale Umgebungen erzeugen Testbestellungen: markiert in
 * WooCommerce, ohne Conversions an Meta und Google.
 */
export function istTestumgebung(): boolean {
  return process.env.VERCEL_ENV !== 'production'
}

// ── Angebot zur PLZ ───────────────────────────────────────────────────────────

export interface AufmassAngebot {
  kreis: AufmassKreis
  /** WooCommerce-Produkt mit der SKU; null = noch nicht angelegt, dann Gebührenzeile */
  produktId: number | null
  produktName: string
  /** Bruttopreis: aus dem WooCommerce-Produkt, sonst aus der Montageliste. */
  preis: number
  plz: string
  ort: string
  distanceKm: number
}

interface WcProdukt {
  id: number
  name: string
  price: string
  status: string
  sku: string
}

/**
 * Sucht das Aufmaß-Produkt über die Artikelnummer. Die Preise werden in
 * WooCommerce wie im übrigen Shop brutto gepflegt. Fünf Minuten Zwischenspeicher
 * genügen — Preisänderungen kommen damit zügig an.
 */
async function ladeProduktPerSku(sku: string): Promise<WcProdukt | null> {
  if (!WP_URL) return null
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}&per_page=5`,
      { headers: getWCAuthHeaders(), next: { revalidate: 300 } },
    )
    if (!res.ok) {
      console.error('[aufmass] Produktsuche fehlgeschlagen:', sku, res.status)
      return null
    }
    const liste = (await res.json()) as WcProdukt[]
    return (
      liste.find(
        (p) =>
          p.sku === sku &&
          (p.status === 'publish' || p.status === 'private') &&
          parseFloat(p.price) > 0,
      ) ?? null
    )
  } catch (e) {
    console.error('[aufmass] Produktsuche Netzwerkfehler:', sku, e)
    return null
  }
}

/**
 * Preis und Produkt für das Aufmaß an dieser PLZ. `null`, wenn die PLZ
 * unbekannt ist, außerhalb des Verlegegebiets liegt oder das Produkt in
 * WooCommerce fehlt — dann ist das Aufmaß nicht online buchbar.
 */
export async function aufmassAngebot(plz: string): Promise<AufmassAngebot | null> {
  const gebiet = pruefeServicegebiet(plz)
  // Verlegegebiet: 50 km Fahrweg (geschätzt aus der Luftlinie)
  if (!gebiet || fahrwegKm(gebiet.distanceKm) > MAX_FAHRWEG_KM) return null
  const k = kreisFuer(gebiet.distanceKm)
  const kreis: AufmassKreis = { bisKm: k.bisKm, name: k.name, sku: k.aufmassSku }
  const produkt = await ladeProduktPerSku(k.aufmassSku)
  return {
    kreis,
    produktId: produkt?.id ?? null,
    produktName: produkt?.name ?? `Aufmaß + Beratung + Angebot ${k.name}`,
    preis: produkt ? parseFloat(produkt.price) : k.aufmass,
    plz: gebiet.plz,
    ort: gebiet.ort,
    distanceKm: gebiet.distanceKm,
  }
}

// ── Bestellung anlegen und Zahlung starten ────────────────────────────────────

const ZAHLART_WOO: Record<VsZahlartKey, { methode: string; titel: string }> = {
  // Gleiche Werte wie im normalen Checkout, damit WordPress (Stripe-Webhook,
  // PayPal-Capture) die Bestellung genauso behandelt.
  stripe: { methode: 'stripe', titel: 'Kreditkarte (Visa, Mastercard, Amex)' },
  klarna: { methode: 'stripe_klarna', titel: 'Klarna – Sofort oder später bezahlen' },
  paypal: { methode: 'paypal', titel: 'PayPal' },
}

export interface AufmassBestellungEingabe {
  angebot: AufmassAngebot
  leadId: string
  trelloCardId: string | null
  vorname: string
  nachname: string
  email: string
  telefon: string
  strasse: string
  ort: string
  zahlart: VsZahlartKey
  tracking: VsTracking
  /** Böden, die als Großmuster mitgebracht werden */
  boeden?: string[]
}

export async function aufmassBestellungAnlegen(
  e: AufmassBestellungEingabe,
): Promise<WooCommerceOrder> {
  const test = istTestumgebung()
  const zahlart = ZAHLART_WOO[e.zahlart]
  const brutto = e.angebot.preis.toFixed(2)
  const adresse = {
    first_name: e.vorname,
    last_name: e.nachname,
    address_1: e.strasse,
    city: e.ort || e.angebot.ort,
    postcode: e.angebot.plz,
    country: 'DE',
  }

  const meta: Array<{ key: string; value: string }> = [
    { key: AUFMASS_META.leadId, value: e.leadId },
    { key: AUFMASS_META.kreis, value: `${e.angebot.kreis.name} (${e.angebot.kreis.sku})` },
    { key: AUFMASS_META.entfernungKm, value: String(e.angebot.distanceKm) },
    { key: AUFMASS_META.widerrufVorzeitig, value: new Date().toISOString() },
  ]
  if (e.boeden?.length) meta.push({ key: AUFMASS_META.boeden, value: e.boeden.join(' | ') })
  if (e.trelloCardId) meta.push({ key: AUFMASS_META.trelloKarte, value: e.trelloCardId })
  if (e.tracking.fbp) meta.push({ key: AUFMASS_META.fbp, value: e.tracking.fbp })
  if (e.tracking.fbc) meta.push({ key: AUFMASS_META.fbc, value: e.tracking.fbc })
  if (e.tracking.gclid) meta.push({ key: AUFMASS_META.gclid, value: e.tracking.gclid })
  if (test) {
    meta.push(
      { key: AUFMASS_META.test, value: 'yes' },
      { key: '_testbestellung_grund', value: 'Aufmaß aus Vorschau- oder Entwicklungsumgebung' },
    )
  }

  const order = await createWooCommerceOrder({
    payment_method: zahlart.methode,
    payment_method_title: zahlart.titel,
    set_paid: false,
    status: 'pending',
    billing: { ...adresse, email: e.email, phone: e.telefon },
    shipping: adresse,
    // WooCommerce erwartet Nettobeträge (siehe toNetLineItems). Ist das
    // Produkt mit der SKU noch nicht angelegt, geht das Aufmaß als
    // Gebührenzeile mit Artikelnummer im Namen in die Bestellung.
    ...(e.angebot.produktId
      ? {
          line_items: toNetLineItems([
            { product_id: e.angebot.produktId, quantity: 1, subtotal: brutto, total: brutto },
          ]),
        }
      : {
          line_items: [],
          fee_lines: [
            {
              name: `${e.angebot.produktName} (${e.angebot.kreis.sku})`,
              total: (e.angebot.preis / 1.19).toFixed(2),
              tax_status: 'taxable' as const,
            },
          ],
        }),
    customer_note: `Aufmaß zur Verlegeservice-Anfrage ${e.leadId}`,
    meta_data: meta,
  })

  const notizen = [
    `Aufmaß ${e.angebot.kreis.name} (${e.angebot.kreis.sku}), ca. ${e.angebot.distanceKm.toLocaleString('de-DE')} km. Verlegeservice-Anfrage ${e.leadId}.`,
    'Kunde hat ausdrücklich verlangt, dass vor Ablauf der Widerrufsfrist mit dem Aufmaß begonnen wird.',
  ]
  if (test) {
    notizen.unshift(
      '⚠️ TESTBESTELLUNG aus Vorschau- oder Entwicklungsumgebung. Nicht abrechnen — bitte stornieren.',
    )
  }
  for (const n of notizen) {
    await addOrderNote(order.id, n, false).catch((err) =>
      console.error('[aufmass] Bestellnotiz fehlgeschlagen:', order.id, err),
    )
  }

  return order
}

function bezahltUrl(orderId: number, orderKey: string): string {
  return `${SITE_URL}${AUFMASS_BEZAHLT_PFAD}?order=${orderId}&key=${encodeURIComponent(orderKey)}`
}

/**
 * Startet Stripe bzw. PayPal für eine bestehende Aufmaß-Bestellung und gibt die
 * Weiterleitungsadresse zurück. Der Betrag kommt aus `order.total`.
 */
export async function aufmassZahlungStarten(
  order: Pick<WooCommerceOrder, 'id' | 'order_key' | 'total' | 'billing' | 'line_items'> & {
    fee_lines?: Array<{ name: string }>
  },
  zahlart: VsZahlartKey,
): Promise<string> {
  const betrag = parseFloat(order.total)
  const name = order.line_items[0]?.name || order.fee_lines?.[0]?.name || 'Aufmaß + Beratung + Angebot'
  const zurueck = bezahltUrl(order.id, order.order_key)
  const abgebrochen = `${zurueck}&abgebrochen=1`

  if (zahlart === 'paypal') {
    const paypal = await createPayPalOrder({
      orderId: order.id,
      orderKey: order.order_key,
      amount: betrag.toFixed(2),
      lineItems: [{ name, quantity: 1, unit_amount: betrag.toFixed(2) }],
      returnUrl: `${SITE_URL}/api/verlegeservice/aufmass/paypal?order=${order.id}&key=${encodeURIComponent(order.order_key)}`,
      cancelUrl: abgebrochen,
    })
    return paypal.approvalUrl
  }

  const session = await createStripeCheckoutSession({
    orderId: order.id,
    orderKey: order.order_key,
    lineItems: [{ name, quantity: 1, price: euroToCents(betrag) }],
    customerEmail: order.billing.email,
    paymentMethod: zahlart === 'klarna' ? 'klarna' : 'card',
    successUrl: `${zurueck}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: abgebrochen,
  })
  return session.url
}

/**
 * Wie `aufmassZahlungStarten`, aber mit Rückfall: Scheitert der Start, wird die
 * Bestellung auf „fehlgeschlagen" gesetzt (wie im normalen Checkout) und
 * `null` zurückgegeben.
 */
export async function aufmassZahlungStartenSicher(
  order: Pick<WooCommerceOrder, 'id' | 'order_key' | 'total' | 'billing' | 'line_items'> & {
    fee_lines?: Array<{ name: string }>
  },
  zahlart: VsZahlartKey,
): Promise<string | null> {
  try {
    return await aufmassZahlungStarten(order, zahlart)
  } catch (err) {
    console.error('[aufmass] Zahlung konnte nicht gestartet werden:', order.id, err)
    await updateOrderStatus(order.id, 'failed').catch(() => undefined)
    await addOrderNote(
      order.id,
      `Zahlung konnte nicht gestartet werden (${zahlart}): ${err instanceof Error ? err.message : 'unbekannter Fehler'}`,
      false,
    ).catch(() => undefined)
    return null
  }
}

// ── Bestellung lesen und nach der Zahlung abschließen ─────────────────────────

export interface AufmassBestellung {
  id: number
  orderKey: string
  status: string
  total: number
  zahlart: string
  produktName: string
  vorname: string
  nachname: string
  email: string
  telefon: string
  strasse: string
  plz: string
  ort: string
  meta: Record<string, string>
  line_items: WooCommerceOrder['line_items']
  fee_lines: Array<{ name: string }>
  billing: WooCommerceOrder['billing']
}

interface WcOrderMitMeta extends WooCommerceOrder {
  meta_data?: Array<{ key: string; value: unknown }>
  fee_lines?: Array<{ name: string }>
}

/**
 * Lädt eine Aufmaß-Bestellung. `null`, wenn sie nicht existiert, der Schlüssel
 * nicht passt oder es keine Aufmaß-Bestellung ist.
 */
/**
 * Aufmaß-Bestellung nur über die Nummer laden (für den WooCommerce-Webhook,
 * der per Signatur geprüft ist). null = keine Aufmaß-Bestellung.
 */
export async function ladeAufmassBestellungPerId(orderId: number): Promise<AufmassBestellung | null> {
  if (!WP_URL || !Number.isInteger(orderId) || orderId <= 0) return null
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, { headers: getWCAuthHeaders(), cache: 'no-store' })
  if (!res.ok) return null
  const o = (await res.json()) as { order_key?: string }
  return o.order_key ? ladeAufmassBestellung(orderId, o.order_key) : null
}

export async function ladeAufmassBestellung(
  orderId: number,
  orderKey: string,
): Promise<AufmassBestellung | null> {
  if (!WP_URL || !Number.isInteger(orderId) || orderId <= 0 || !orderKey) return null
  try {
    const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: getWCAuthHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const o = (await res.json()) as WcOrderMitMeta
    if (o.order_key !== orderKey) return null

    const meta: Record<string, string> = {}
    for (const m of o.meta_data ?? []) {
      if (typeof m.value === 'string') meta[m.key] = m.value
    }
    if (!meta[AUFMASS_META.leadId]) return null

    return {
      id: o.id,
      orderKey: o.order_key,
      status: o.status,
      total: parseFloat(o.total),
      zahlart: o.payment_method ?? '',
      produktName: o.line_items[0]?.name ?? o.fee_lines?.[0]?.name ?? '',
      vorname: o.billing.first_name,
      nachname: o.billing.last_name,
      email: o.billing.email,
      telefon: o.billing.phone,
      strasse: o.billing.address_1,
      plz: o.billing.postcode,
      ort: o.billing.city,
      meta,
      line_items: o.line_items,
      fee_lines: o.fee_lines ?? [],
      billing: o.billing,
    }
  } catch (e) {
    console.error('[aufmass] Bestellung laden fehlgeschlagen:', orderId, e)
    return null
  }
}

/** Setzt einzelne Meta-Felder, ohne die übrigen anzutasten. */
export async function setzeBestellMeta(orderId: number, werte: Record<string, string>): Promise<void> {
  if (!WP_URL) return
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: getWCAuthHeaders(),
    body: JSON.stringify({
      meta_data: Object.entries(werte).map(([key, value]) => ({ key, value })),
    }),
  })
  if (!res.ok) throw new Error(`Meta-Update fehlgeschlagen: ${res.status}`)
}

/** Stellt eine nicht bezahlte Bestellung für einen neuen Zahlungsversuch um. */
export async function aufmassFuerNeuenVersuch(orderId: number, zahlart: VsZahlartKey): Promise<void> {
  if (!WP_URL) return
  const z = ZAHLART_WOO[zahlart]
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    method: 'PUT',
    headers: getWCAuthHeaders(),
    body: JSON.stringify({ status: 'pending', payment_method: z.methode, payment_method_title: z.titel }),
  })
  if (!res.ok) throw new Error(`Bestellung konnte nicht zurückgesetzt werden: ${res.status}`)
}

export function istBezahltStatus(status: string): boolean {
  return status === 'processing' || status === 'completed'
}

/**
 * Bezahlt? Der Status in WooCommerce setzt WordPress per Stripe-Webhook bzw.
 * PayPal-Capture. Der Webhook kann ein paar Sekunden hinterherhinken — dann
 * zählt die Stripe-Session, sofern sie zu genau dieser Bestellung gehört.
 */
export async function istAufmassBezahlt(b: AufmassBestellung, stripeSessionId?: string): Promise<boolean> {
  if (istBezahltStatus(b.status)) return true
  if (!stripeSessionId) return false
  try {
    const s = await getStripeSession(stripeSessionId)
    return s.payment_status === 'paid' && s.metadata?.order_id === String(b.id)
  } catch (e) {
    console.error('[aufmass] Stripe-Session nicht abrufbar:', stripeSessionId, e)
    return false
  }
}

/** Event-ID für Pixel und Conversions API — muss auf beiden Seiten gleich sein. */
export function aufmassEventId(orderId: number): string {
  return `aufmass-${orderId}`
}

/**
 * Schließt ein bezahltes Aufmaß ab: Trello-Karte verschieben, Zahlung
 * kommentieren, Kauf an Meta melden. Läuft pro Bestellung nur einmal (Meta-Feld
 * `_aufmass_nach_zahlung`); bei einem Reload der Bezahlt-Seite passiert nichts
 * mehr. Fehler werden nur protokolliert — die Zahlung selbst ist ja erfolgt.
 */
export async function aufmassNachZahlungAbschliessen(
  b: AufmassBestellung,
  kontext: { clientIp?: string; userAgent?: string; seitenUrl?: string },
): Promise<void> {
  if (b.meta[AUFMASS_META.nachZahlung] === 'yes') return
  const test = b.meta[AUFMASS_META.test] === 'yes'
  const sku = (b.meta[AUFMASS_META.kreis]?.match(/\((A\d{4})\)/) ?? [])[1] ?? ''

  const karte = b.meta[AUFMASS_META.trelloKarte]
  if (karte) {
    const zeilen = [
      `${test ? '⚠️ TEST · ' : ''}✅ **Bezahlt** · ${formatEuro(b.total)} · Bestellung #${b.id}`,
      '➡️ Jetzt anrufen und Aufmaßtermin vereinbaren',
    ]
    await aufmassBezahltNachTrello(karte, zeilen.join('\n')).catch((e) =>
      console.error('[aufmass] Trello nach Zahlung fehlgeschlagen:', b.id, e),
    )
  }

  if (!test) {
    await sendeMetaAufmassKauf({
      eventId: aufmassEventId(b.id),
      leadId: b.meta[AUFMASS_META.leadId],
      wert: b.total,
      sku,
      email: b.email,
      telefon: b.telefon,
      vorname: b.vorname,
      nachname: b.nachname,
      plz: b.plz,
      ort: b.ort,
      fbp: b.meta[AUFMASS_META.fbp],
      fbc: b.meta[AUFMASS_META.fbc],
      clientIp: kontext.clientIp,
      userAgent: kontext.userAgent,
      eventSourceUrl: kontext.seitenUrl,
      zeitpunkt: new Date(),
    }).catch((e) => console.error('[aufmass] Meta-Kauf fehlgeschlagen:', b.id, e))
  }

  await setzeBestellMeta(b.id, { [AUFMASS_META.nachZahlung]: 'yes' }).catch((e) =>
    console.error('[aufmass] Abschluss-Markierung fehlgeschlagen:', b.id, e),
  )
}
