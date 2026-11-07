import { NextRequest, NextResponse } from 'next/server'
import { formatEuro } from '@/lib/aufmass-kreise'
import { aufmassAngebot, aufmassBestellungAnlegen, aufmassZahlungStartenSicher } from '@/lib/aufmass'
import { naechsteLeadId } from '@/lib/leadId'
import { pruefeServicegebiet } from '@/lib/servicegebiet'
import { sendeMetaLead } from '@/lib/tracking/meta-capi'
import { wooCommerceClient } from '@/lib/woocommerce'
import { strassenVorschlaege } from '@/lib/verlegeservice/adresse'
import {
  BERATUNG_NAME,
  BESITZ_NAME,
  KLASSE_NAME,
  RUECKRUF_NAME,
  WEG_NAME,
  ZAHLART_NAME,
  ZEITRAUM_NAME,
  istGueltigerTermin,
  leadStufe,
  pruefeKontakt,
  pruefeZahlung,
  terminText,
  type FunnelAnfrage,
  type FunnelAntwort,
  type ProduktWahl,
} from '@/lib/verlegeservice/funnel'
import {
  ALTBOEDEN,
  BODENARTEN,
  MAX_FAHRWEG_KM,
  berechnePreisrahmen,
  bodenartAusKategorien,
  fahrwegKm,
  kreisFuer,
  type AltbodenKey,
  type BodenartKey,
  type Preisrahmen,
} from '@/lib/verlegeservice/montage'
import { berlinZuIso, clientIp, heuteBerlin, pruefeTurnstile, teamMail } from '@/lib/verlegeservice/server'
import { preisklassen } from '@/lib/verlegeservice/shop'
import { karteAnlegen, type KartenLabel } from '@/lib/verlegeservice/trello'

/**
 * Anfrage aus dem Verlegeservice-Formular mit drei Wegen.
 *
 * POST /api/verlegeservice/funnel
 *
 *  - Preisrahmen:  Spanne nach Montageliste + Bodenpreis aus dem Shop berechnen,
 *                  Lead anlegen, Spanne zurückgeben
 *  - Erstberatung: Lead anlegen (Rückruf / WhatsApp / Termin im Fachmarkt mit
 *                  Fälligkeit und Telefon-Checkliste)
 *  - Aufmaß:       Lead anlegen, WooCommerce-Bestellung, Weiterleitung zu
 *                  Stripe/PayPal (Abschluss auf …/verlegeservice-anfrage/bezahlt)
 *
 * Jeder Lead geht an Trello und per Mail ans Team. Erfolg, sobald mindestens
 * einer der beiden Wege klappt.
 */
export const runtime = 'nodejs'
export const maxDuration = 60

const s = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const n = (v: unknown, min: number, max: number, std: number) => {
  const z = Number(v)
  return Number.isFinite(z) ? Math.min(max, Math.max(min, Math.round(z))) : std
}
const eins = <T extends string>(v: unknown, erlaubt: readonly T[]): T | null =>
  typeof v === 'string' && (erlaubt as readonly string[]).includes(v) ? (v as T) : null
const produkt = (v: unknown): ProduktWahl | null => {
  if (!v || typeof v !== 'object') return null
  const o = v as { id?: unknown; name?: unknown }
  const id = Number(o.id)
  return Number.isInteger(id) && id > 0 ? { id, name: s(o.name, 200) } : null
}

function normalisiere(r: Record<string, unknown>): FunnelAnfrage {
  return {
    weg: eins(r.weg, ['aufmass', 'preis', 'beratung'] as const) ?? 'beratung',
    plz: s(r.plz, 5),
    besitz: eins(r.besitz, ['nein', 'bj', 'fremd'] as const),
    produkt: produkt(r.produkt),
    produktText: s(r.produktText, 120),
    bodenart: eins(r.bodenart, Object.keys(BODENARTEN) as BodenartKey[]),
    flaeche: n(r.flaeche, 1, 1000, 40),
    altboden: eins(r.altboden, Object.keys(ALTBOEDEN) as AltbodenKey[]),
    sockelleisten: r.sockelleisten === true,
    stufen: n(r.stufen, 0, 40, 0),
    tueren: n(r.tueren, 0, 30, 0),
    klasse: eins(r.klasse, ['guenstig', 'mittel', 'premium', 'empfehlung'] as const),
    zeitraum: eins(r.zeitraum, ['asap', '1-3', '3-6', 'offen'] as const),
    wunschboeden: Array.isArray(r.wunschboeden) ? r.wunschboeden.map(produkt).filter((p): p is ProduktWahl => !!p).slice(0, 3) : [],
    empfehlung: r.empfehlung === true,
    beratung: eins(r.beratung, ['telefon', 'fachmarkt', 'whatsapp'] as const),
    rueckruf: eins(r.rueckruf, ['egal', 'vormittags', 'mittags', 'nachmittags'] as const),
    termin: typeof r.termin === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.termin) ? r.termin : null,
    vorname: s(r.vorname, 80),
    nachname: s(r.nachname, 80),
    telefon: s(r.telefon, 40),
    email: s(r.email, 120),
    strasse: s(r.strasse, 120),
    hausnummer: s(r.hausnummer, 12),
    zahlart: eins(r.zahlart, ['paypal', 'stripe', 'klarna'] as const),
    widerruf: r.widerruf === true,
    datenschutz: r.datenschutz === true,
    tracking: r.tracking && typeof r.tracking === 'object' ? (r.tracking as FunnelAnfrage['tracking']) : {},
    turnstileToken: s(r.turnstileToken, 4096) || undefined,
    website: s(r.website, 200) || undefined,
  }
}

const fehler = (error: string, felder?: Record<string, string>, status = 400) =>
  NextResponse.json<FunnelAntwort>({ success: false, error, ...(felder ? { felder } : {}) }, { status })

export async function POST(request: NextRequest): Promise<NextResponse<FunnelAntwort>> {
  let roh: Record<string, unknown>
  try {
    roh = (await request.json()) as Record<string, unknown>
  } catch {
    return fehler('Ungültige Anfrage.')
  }
  const a = normalisiere(roh)

  // Honeypot: stiller Erfolg ohne Lead
  if (a.website) return NextResponse.json({ success: true, leadId: '', leadStufe: 'C' })

  // ── Prüfen ────────────────────────────────────────────────────────────────
  const gebiet = pruefeServicegebiet(a.plz)
  if (!gebiet) return fehler('Bitte prüfe deine Postleitzahl.', { plz: 'Diese PLZ kennen wir nicht.' })
  const fahrt = fahrwegKm(gebiet.distanceKm)
  const imGebiet = fahrt <= MAX_FAHRWEG_KM
  const kreis = kreisFuer(gebiet.distanceKm)
  if (a.weg !== 'beratung' && !imGebiet) {
    return fehler('Für diesen Standort bieten wir keine Verlegung an.', { plz: 'Außerhalb unseres Verlegegebiets.' })
  }
  if (!a.besitz) return fehler('Bitte gib an, ob du deinen Boden schon hast.')

  const felder: Record<string, string> = { ...pruefeKontakt(a) }
  if (a.weg !== 'beratung') {
    if (!a.bodenart) felder.bodenart = 'Bitte wähle eine Bodenart.'
    if (!a.zeitraum) felder.zeitraum = 'Bitte wähle einen Zeitraum.'
  }
  if (a.weg === 'preis' && !a.altboden) felder.altboden = 'Bitte gib an, was aktuell auf dem Boden liegt.'
  if (a.weg === 'beratung') {
    if (!a.beratung) felder.beratung = 'Bitte wähle, wie du beraten werden möchtest.'
    const heute = new Date(`${heuteBerlin()}T12:00:00`)
    if (a.beratung === 'fachmarkt' && !istGueltigerTermin(a.termin, heute)) felder.termin = 'Bitte wähle einen Termin.'
  }
  if (a.weg === 'aufmass') {
    Object.assign(felder, pruefeZahlung(a))
    if (!a.produkt && !a.wunschboeden.length && !a.empfehlung) felder.wunschboeden = 'Bitte wähle mindestens einen Boden.'
  }
  if (Object.keys(felder).length) return fehler('Bitte prüfe die markierten Felder.', felder)

  if (!(await pruefeTurnstile(request, a.turnstileToken))) {
    return fehler('Die Sicherheitsprüfung ist abgelaufen. Bitte versuche es noch einmal.', undefined, 403)
  }

  // Adresse gegen die Straßenliste der PLZ prüfen (nur wenn der Dienst antwortet)
  if (a.weg === 'aufmass') {
    const treffer = await strassenVorschlaege(a.strasse, gebiet.plz, gebiet.ort)
    if (treffer.length && !treffer.some((t) => t.strasse.toLowerCase() === a.strasse.toLowerCase())) {
      return fehler('Bitte wähle deine Straße aus den Vorschlägen.', { strasse: 'Bitte wähle deine Straße aus den Vorschlägen.' })
    }
  }

  // ── Produkt und Preisrahmen ──────────────────────────────────────────────
  let produktPreis: number | null = null
  let produktName = a.produkt?.name ?? ''
  if (a.produkt) {
    try {
      const p = (await wooCommerceClient.getProductsByIds([a.produkt.id])).get(a.produkt.id)
      if (p) {
        produktName = p.name
        const art = bodenartAusKategorien(p.categories)
        if (art) a.bodenart = art
        const einheit = (p.einheit_short ?? '').toLowerCase()
        if ((!einheit || /m²|m2|qm/.test(einheit)) && Number(p.price) > 0) produktPreis = Number(p.price)
      }
    } catch (e) {
      console.error('[api/verlegeservice/funnel] Produkt nicht ladbar:', a.produkt.id, e)
    }
  }

  let rahmen: Preisrahmen | null = null
  let bodenText = ''
  if (a.weg === 'preis' && a.bodenart && a.altboden) {
    let material: [number, number] | null = null
    if (produktPreis) {
      material = [produktPreis, produktPreis]
      bodenText = produktName
    } else {
      const klassen = await preisklassen(a.bodenart).catch(() => null)
      const k = a.klasse === 'guenstig' || a.klasse === 'premium' ? a.klasse : 'mittel'
      material = klassen ? klassen[k] : null
      bodenText = `${BODENARTEN[a.bodenart].name}${material ? `, ${KLASSE_NAME[k]}` : ''}`
    }
    rahmen = berechnePreisrahmen({
      bodenart: a.bodenart,
      flaeche: a.flaeche,
      altboden: a.altboden,
      sockelleisten: a.sockelleisten,
      stufen: a.stufen,
      tueren: a.tueren,
      luftlinieKm: gebiet.distanceKm,
      material,
    })
    if (material) rahmen.enthalten.unshift(`Boden: ${bodenText}`)
  }

  // ── Aufmaß-Angebot ───────────────────────────────────────────────────────
  const angebot = a.weg === 'aufmass' ? await aufmassAngebot(a.plz) : null
  if (a.weg === 'aufmass' && !angebot) return fehler('Für diesen Standort können wir das Aufmaß nicht online buchen.')

  // ── Lead ─────────────────────────────────────────────────────────────────
  const leadId = await naechsteLeadId()
  const stufe = leadStufe(a, Number.isFinite(kreis.bisKm), imGebiet)
  const name = `${a.vorname} ${a.nachname}`.trim()
  const termin = a.beratung === 'fachmarkt' ? terminText(a.termin) : ''
  const boeden = [a.produkt ? produktName : null, ...a.wunschboeden.map((b) => b.name), a.empfehlung ? 'Empfehlung des Beraters' : null].filter(
    (x): x is string => !!x,
  )

  const z: string[] = []
  z.push(`**KONTAKT** ${name} · Vorgang ${leadId}`)
  z.push(`Tel: ${a.telefon || '–'} · E-Mail: ${a.email || '–'}`)
  z.push(`${gebiet.plz} ${gebiet.ort}${a.weg === 'aufmass' ? `, ${a.strasse} ${a.hausnummer}` : ''} · ca. ${fahrt} km Fahrweg · ${kreis.name}`)
  z.push('', `**WEG** ${WEG_NAME[a.weg]} · Lead-Stufe ${stufe}`)
  z.push(`Boden schon? ${BESITZ_NAME[a.besitz]}`)
  if (a.produkt) z.push(`Ausgesuchter Boden: ${produktName}`)
  else if (a.produktText) z.push(`Ausgesuchter Boden: ${a.produktText} (im Shop nicht gefunden)`)
  if (a.bodenart && a.weg !== 'beratung') z.push(`Bodenart: ${BODENARTEN[a.bodenart].name} · Fläche: ca. ${a.flaeche} m²`)
  if (a.altboden && a.weg === 'preis') z.push(`Altboden: ${ALTBOEDEN[a.altboden].name}`)
  if (a.weg === 'preis') {
    z.push(`Extras: ${[a.sockelleisten ? 'Sockelleisten' : null, a.stufen ? `${a.stufen} Stufen` : null, a.tueren ? `${a.tueren} Türen` : null].filter(Boolean).join(', ') || '–'}`)
    if (!a.produkt && a.klasse) z.push(`Preisklasse: ${KLASSE_NAME[a.klasse]}`)
  }
  if (a.zeitraum) z.push(`Zeitraum: ${ZEITRAUM_NAME[a.zeitraum]}`)
  if (a.weg === 'beratung' && a.beratung) {
    z.push(`Beratung: ${BERATUNG_NAME[a.beratung]}${a.beratung === 'telefon' && a.rueckruf ? ` · ${RUECKRUF_NAME[a.rueckruf]}` : ''}${termin ? ` · ${termin}` : ''}`)
  }
  if (a.weg === 'aufmass' && angebot) {
    z.push(`Wunschböden (Original-Dielen mitnehmen): ${boeden.join(', ')}`)
    z.push(`Aufmaß: ${formatEuro(angebot.preis)} (${angebot.kreis.name}, ${angebot.kreis.sku}) · ${a.zahlart ? ZAHLART_NAME[a.zahlart] : ''} · Zahlung offen`)
  }
  if (rahmen) {
    z.push('', `**GENANNTER PREISRAHMEN** ${formatEuro(rahmen.min)} – ${formatEuro(rahmen.max)}`)
    z.push('**KALKULATION (intern, nicht für den Kunden)**')
    for (const p of rahmen.posten) z.push(`${p.name}: ${p.min === p.max ? formatEuro(p.min) : `${formatEuro(p.min)} – ${formatEuro(p.max)}`}`)
    z.push(`Boden: ${rahmen.boden ? `${formatEuro(rahmen.boden[0])} – ${formatEuro(rahmen.boden[1])} (${bodenText})` : 'nicht enthalten'}`)
  }
  const t = a.tracking
  z.push('', `**QUELLE** ${[t.utmSource, t.utmMedium, t.utmCampaign].filter(Boolean).join(' / ') || (t.referrer ? `Referrer: ${t.referrer}` : 'direkt')}${t.gclid ? ' · gclid' : ''}${t.fbclid ? ' · fbclid' : ''}`)
  if (t.landingpage) z.push(`Einstieg: ${t.landingpage}`)
  const beschreibung = z.join('\n')

  const labels: KartenLabel[] = [
    { name: `Lead-Stufe ${stufe}`, farbe: stufe === 'A' ? 'green' : stufe === 'B' ? 'orange' : 'black' },
    { name: WEG_NAME[a.weg], farbe: a.weg === 'aufmass' ? 'red' : a.weg === 'preis' ? 'blue' : 'purple' },
  ]
  if (a.weg === 'beratung' && a.beratung === 'fachmarkt') labels.push({ name: 'Termin Fachmarkt', farbe: 'pink' })
  if (a.weg === 'aufmass') labels.push({ name: 'Zahlung offen', farbe: 'yellow' })

  const checklisten: Array<{ name: string; punkte: string[] }> = []
  const gespraech = [
    'Bodenart / Wunsch?',
    'Räume und ca. m²?',
    'Was liegt aktuell? Entfernen?',
    'Treppe? Türen?',
    'Wann soll verlegt werden?',
    'Budget-Rahmen?',
    'Nächster Schritt: Aufmaß gebucht / Fachmarkttermin / später',
  ]
  if (a.weg === 'beratung' && a.beratung === 'fachmarkt') {
    checklisten.push({ name: 'Beratung im Fachmarkt', punkte: [`Kunde kommt ${termin}`, 'Passende Böden bereitlegen', ...gespraech] })
  } else if (a.weg === 'beratung') {
    checklisten.push({ name: a.beratung === 'whatsapp' ? 'WhatsApp-Beratung' : 'Telefonat', punkte: [a.beratung === 'whatsapp' ? 'Per WhatsApp melden' : 'Zurückrufen', ...gespraech] })
  } else if (a.weg === 'aufmass') {
    checklisten.push({ name: 'Aufmaß', punkte: ['Zahlung eingegangen (Karte wandert dann automatisch)', 'Termin vereinbaren', `Dielen einpacken: ${boeden.join(', ')}`, 'Aufmaß durchführen', 'Angebot in SAP erstellen (Aufmaß gutschreiben)'] })
  } else {
    checklisten.push({
      name: 'Nachfassen Preisrahmen',
      punkte: [
        ...(stufe !== 'C' && a.telefon ? ['Tag 2: anrufen und Aufmaß anbieten'] : []),
        'Tag 3: Mail „Boden in echt sehen" – Fachmarkt oder Musterbox',
        'Tag 7: Mail Erinnerung Aufmaß',
        'Tag 14: ohne Reaktion → Liste „Später"',
      ],
    })
  }

  const titel = `${termin ? `📅 ${termin} – ` : ''}${name} – ${gebiet.ort} (${gebiet.plz}) – ${WEG_NAME[a.weg]}`
  const faellig = a.beratung === 'fachmarkt' && a.termin ? berlinZuIso(...(a.termin.split('T') as [string, string])) : null

  const [cardId, mailOk] = await Promise.all([
    karteAnlegen({ titel, beschreibung, liste: faellig ? 'termin' : 'neu', faellig, labels, checklisten }),
    teamMail({ name, email: a.email, telefon: a.telefon, text: `${titel}\n\n${beschreibung.replace(/\*\*/g, '')}` }),
  ])
  if (!cardId && !mailOk) {
    console.error('[api/verlegeservice/funnel] Trello und Mail fehlgeschlagen für', leadId)
    return fehler('Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuche es gleich noch einmal oder ruf uns an: 02433 938884.', undefined, 502)
  }

  await sendeMetaLead({
    leadId,
    areaStatus: imGebiet ? 'in_area' : 'out_of_area',
    areaRange: a.weg === 'beratung' ? null : String(a.flaeche),
    floorType: a.bodenart,
    timeline: a.zeitraum,
    naechsterSchritt: a.weg,
    email: a.email,
    telefon: a.telefon,
    vorname: a.vorname,
    nachname: a.nachname,
    plz: gebiet.plz,
    ort: gebiet.ort,
    fbp: t.fbp,
    fbc: t.fbc,
    clientIp: clientIp(request),
    userAgent: request.headers.get('user-agent') ?? undefined,
    eventSourceUrl: t.landingpage,
    zeitpunkt: new Date(),
  }).catch((e) => console.error('[api/verlegeservice/funnel] Meta CAPI:', e))

  // ── Aufmaß: Bestellung und Zahlung ───────────────────────────────────────
  let zahlungUrl: string | undefined
  if (a.weg === 'aufmass' && angebot && a.zahlart) {
    try {
      const order = await aufmassBestellungAnlegen({
        angebot,
        leadId,
        trelloCardId: cardId,
        vorname: a.vorname,
        nachname: a.nachname,
        email: a.email,
        telefon: a.telefon,
        strasse: `${a.strasse} ${a.hausnummer}`.trim(),
        ort: gebiet.ort,
        zahlart: a.zahlart,
        tracking: t,
        boeden,
      })
      zahlungUrl = (await aufmassZahlungStartenSicher(order, a.zahlart)) ?? undefined
    } catch (e) {
      console.error('[api/verlegeservice/funnel] Aufmaß-Bestellung fehlgeschlagen:', leadId, e)
    }
  }

  return NextResponse.json<FunnelAntwort>({
    success: true,
    leadId,
    leadStufe: stufe,
    ...(rahmen ? { preisrahmen: { min: rahmen.min, max: rahmen.max, enthalten: rahmen.enthalten, hinweise: rahmen.hinweise, boden: bodenText } } : {}),
    ...(zahlungUrl ? { zahlungUrl } : {}),
    ...(a.weg === 'aufmass' && !zahlungUrl ? { zahlungFehler: true } : {}),
  })
}
