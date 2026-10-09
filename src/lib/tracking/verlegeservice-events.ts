'use client'

/**
 * Clientseitiges Tracking des Verlegeservice-Formulars.
 *
 * Drei Empfänger, alle optional:
 *  1. dataLayer (GTM) — läuft immer, wenn GTM eingebunden ist
 *  2. Google Ads Conversion via gtag — nur mit NEXT_PUBLIC_GOOGLE_ADS_*
 *  3. Meta Pixel via fbq — nur mit NEXT_PUBLIC_META_PIXEL_ID
 *
 * Wichtig: Die Abschluss-Events werden ERST nach erfolgreicher Serverantwort
 * gefeuert (Spezifikation: „Conversion erst nach erfolgreicher Formularannahme
 * auslösen"). Die Lead-ID kommt vom Server und dient dem Meta-Pixel als
 * `eventID` — dieselbe ID nutzt die Conversions API, damit Meta nicht doppelt
 * zählt.
 */
import type { AreaStatus } from '@/lib/servicegebiet'

type DataLayerEintrag = Record<string, unknown>

/**
 * `dataLayer` ist projektweit schon global deklariert (GoogleTagManager), daher
 * NICHT `Window` erweitern — das kollidiert. Stattdessen eine eigene Sicht auf
 * das Fenster, in die wir gezielt hineinschauen.
 */
type TrackingFenster = Window & {
  dataLayer?: DataLayerEintrag[]
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
}

function fenster(): TrackingFenster | null {
  return typeof window === 'undefined' ? null : (window as TrackingFenster)
}

/** Schiebt ein Event in den dataLayer (GTM). Fällt still aus, wenn keiner da ist. */
function dataLayerPush(event: string, daten: DataLayerEintrag = {}): void {
  const w = fenster()
  if (!w) return
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event, ...daten })
}

// ── Ereignisnamen (Spezifikation) ─────────────────────────────────────────────
export const VS_EVENTS = {
  formView: 'verlegeservice_form_view',
  formStarted: 'verlegeservice_form_started',
  locationChecked: 'verlegeservice_location_checked',
  stepProject: 'verlegeservice_step_project_completed',
  stepAltboden: 'verlegeservice_step_altboden_completed',
  leadInArea: 'verlegeservice_lead_in_area',
  leadOutOfArea: 'verlegeservice_lead_out_of_area',
} as const

export function trackFormView(): void {
  dataLayerPush(VS_EVENTS.formView)
}

export function trackFormStarted(): void {
  dataLayerPush(VS_EVENTS.formStarted)
}

export function trackLocationChecked(
  areaStatus: AreaStatus | 'unbekannt',
  distanceKm: number | null,
): void {
  dataLayerPush(VS_EVENTS.locationChecked, {
    area_status: areaStatus,
    distance_km: distanceKm,
  })
}

export function trackStepProject(daten: {
  area_range: string | null
  floor_type: string | null
  timeline: string | null
  raum_anzahl: number
}): void {
  dataLayerPush(VS_EVENTS.stepProject, daten)
}

export function trackStepAltboden(altbodenEntfernen: string | null): void {
  dataLayerPush(VS_EVENTS.stepAltboden, { altboden_entfernen: altbodenEntfernen })
}

// ── Abschluss: Lead ───────────────────────────────────────────────────────────

export interface LeadAbschluss {
  leadId: string
  areaStatus: AreaStatus
  areaRange: string | null
  floorType: string | null
  timeline: string | null
}

/**
 * Google-Ads-Conversion. `in_area` und `out_of_area` bekommen getrennte Labels,
 * damit `in_area` als primäre Conversion optimiert werden kann und
 * `out_of_area` nur als sekundäres Analyse-Event mitläuft.
 */
function sendeGoogleAdsConversion(a: LeadAbschluss): void {
  const w = fenster()
  const conversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID?.trim()
  const label =
    a.areaStatus === 'in_area'
      ? process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_IN_AREA?.trim()
      : process.env.NEXT_PUBLIC_GOOGLE_ADS_LABEL_OUT_OF_AREA?.trim()

  if (!w?.gtag || !conversionId || !label) return

  w.gtag('event', 'conversion', {
    send_to: `${conversionId}/${label}`,
    // Die Lead-ID verhindert Doppelzählungen bei Reloads und ist der Schlüssel
    // für die späteren Offline-Rückmeldungen (qualifiziert / gewonnen).
    transaction_id: a.leadId,
  })
}

/** Meta Pixel mit `eventID` = Lead-ID (Deduplizierung gegen die CAPI). */
function sendeMetaPixel(a: LeadAbschluss): void {
  const w = fenster()
  if (!w?.fbq || !process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()) return

  w.fbq(
    'track',
    'Lead',
    {
      lead_type: 'verlegeservice',
      area_status: a.areaStatus,
      ...(a.areaRange ? { area_range: a.areaRange } : {}),
      ...(a.floorType ? { floor_type: a.floorType } : {}),
      ...(a.timeline ? { timeline: a.timeline } : {}),
    },
    { eventID: a.leadId },
  )
}

/**
 * Feuert alle Abschluss-Events. Nur aufrufen, wenn der Server die Anfrage
 * bestätigt hat.
 */
export function trackLeadAbschluss(a: LeadAbschluss): void {
  const event = a.areaStatus === 'in_area' ? VS_EVENTS.leadInArea : VS_EVENTS.leadOutOfArea
  dataLayerPush(event, {
    lead_id: a.leadId,
    area_status: a.areaStatus,
    area_range: a.areaRange,
    floor_type: a.floorType,
    timeline: a.timeline,
  })

  sendeGoogleAdsConversion(a)
  sendeMetaPixel(a)
}

// ── Kontextdaten für den Server ───────────────────────────────────────────────

/** Liest ein Cookie im Browser (für die Meta-Cookies _fbp / _fbc). */
function cookie(name: string): string | undefined {
  const w = fenster()
  if (!w) return undefined
  const treffer = w.document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  )
  return treffer ? decodeURIComponent(treffer[1]) : undefined
}

function geraetKategorie(): 'mobile' | 'tablet' | 'desktop' {
  const w = fenster()
  if (!w) return 'desktop'
  const ua = w.navigator.userAgent
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}

function browserName(): string {
  const w = fenster()
  if (!w) return 'unbekannt'
  const ua = w.navigator.userAgent
  // Reihenfolge zählt: Edge und Chrome tragen beide "Chrome" im UA-String.
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return 'unbekannt'
}

/**
 * Sammelt Kampagnen- und Kontextdaten aus URL, Cookies und Browser.
 * Die UTM-/Klick-Parameter werden aus der aktuellen URL gelesen; kommt der
 * Nutzer über mehrere Seiten, liefert `landingpage` die Einstiegsseite, sofern
 * sie im sessionStorage hinterlegt wurde.
 *
 * Die Meta-Cookies `_fbp`/`_fbc` werden nur mit Marketing-Einwilligung gelesen.
 */
export function sammleTrackingKontext(
  formularStart?: string,
  marketingErlaubt = false,
): Record<string, string | undefined> {
  const w = fenster()
  if (!w) return {}

  const p = new URLSearchParams(w.location.search)
  const wert = (k: string) => p.get(k) ?? undefined

  let landingpage: string | undefined
  try {
    landingpage = w.sessionStorage.getItem('bj_landingpage') ?? w.location.href
  } catch {
    // sessionStorage kann in privaten Modi gesperrt sein — dann aktuelle URL.
    landingpage = w.location.href
  }

  return {
    utmSource: wert('utm_source'),
    utmMedium: wert('utm_medium'),
    utmCampaign: wert('utm_campaign'),
    utmContent: wert('utm_content'),
    utmTerm: wert('utm_term'),
    gclid: wert('gclid'),
    gbraid: wert('gbraid'),
    wbraid: wert('wbraid'),
    fbclid: wert('fbclid'),
    fbp: marketingErlaubt ? cookie('_fbp') : undefined,
    fbc: marketingErlaubt ? cookie('_fbc') : undefined,
    landingpage,
    referrer: w.document.referrer || undefined,
    deviceKategorie: geraetKategorie(),
    browser: browserName(),
    formularStart,
  }
}

/** Merkt die Einstiegsseite einmal pro Sitzung. */
export function merkeLandingpage(): void {
  const w = fenster()
  if (!w) return
  try {
    if (!w.sessionStorage.getItem('bj_landingpage')) {
      w.sessionStorage.setItem('bj_landingpage', w.location.href)
    }
  } catch {
    // Kein sessionStorage — kein Beinbruch, dann fehlt nur die Einstiegsseite.
  }
}
