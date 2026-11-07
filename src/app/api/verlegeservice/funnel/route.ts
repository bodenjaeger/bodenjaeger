import { NextRequest, NextResponse } from 'next/server'
import { formatEuro } from '@/lib/aufmass-kreise'
import { aufmassAngebot, aufmassBestellungAnlegen, aufmassZahlungStartenSicher } from '@/lib/aufmass'
import { naechsteLeadId } from '@/lib/leadId'
import { pruefeServicegebiet } from '@/lib/servicegebiet'
import { sendeMetaLead } from '@/lib/tracking/meta-capi'
import { SITE_URL } from '@/lib/site'
import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce'
import { strasseBekannt } from '@/lib/verlegeservice/adresse'
import {
  BESITZ_NAME,
  KLASSE_NAME,
  RUECKRUF_NAME,
  WEG_NAME,
  ZAHLART_NAME,
  ZEITRAUM_NAME,
  istGueltigerTermin,
  leadStufe,
  pruefeKontakt,
  pruefeTelefon,
  pruefeZahlung,
  telefonAnzeige,
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

/** Trello-Markdown für die Team-Mail in Klartext umwandeln */
const alsText = (md: string) =>
  md
    .replace(/^#+\s*/gm, '')
    .replace(/^---$/gm, '')
    .replace(/\*\*|_\(|\)_/g, (m) => (m === '**' ? '' : m === '_(' ? '(' : ')'))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')

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

  // Telefon einheitlich als E.164 (+49…) weitergeben
  const tel = pruefeTelefon(a.telefon)
  a.telefon = tel.ok ? tel.e164 : ''

  if (!(await pruefeTurnstile(request, a.turnstileToken))) {
    return fehler('Die Sicherheitsprüfung ist abgelaufen. Bitte versuche es noch einmal.', undefined, 403)
  }

  // Adresse gegen das Straßenverzeichnis der PLZ prüfen. Nicht gefundene
  // Straßen (z. B. Neubaugebiet) werden angenommen, aber auf der Karte markiert.
  const strasseGeprueft = a.weg === 'aufmass' ? await strasseBekannt(a.strasse, gebiet.plz, gebiet.ort) : null

  // ── Produkt und Preisrahmen ──────────────────────────────────────────────
  let produktPreis: number | null = null
  let produktName = a.produkt?.name ?? ''
  const ids = [a.produkt?.id, ...a.wunschboeden.map((b) => b.id)].filter((x): x is number => !!x)
  let produkte = new Map<number, StoreApiProduct>()
  if (ids.length) {
    try {
      produkte = await wooCommerceClient.getProductsByIds(ids)
    } catch (e) {
      console.error('[api/verlegeservice/funnel] Produkte nicht ladbar:', ids, e)
    }
  }
  const gewaehlt = a.produkt ? produkte.get(a.produkt.id) : undefined
  if (gewaehlt) {
    produktName = gewaehlt.name
    const art = bodenartAusKategorien(gewaehlt.categories)
    if (art) a.bodenart = art
    const einheit = (gewaehlt.einheit_short ?? '').toLowerCase()
    if ((!einheit || /m²|m2|qm/.test(einheit)) && Number(gewaehlt.price) > 0) produktPreis = Number(gewaehlt.price)
  }
  /** Bodenname als Link in den Shop (Markdown für Trello) */
  const bodenLink = (id: number, name: string) => {
    const slug = produkte.get(id)?.slug
    return slug ? `[${name}](${SITE_URL}/products/${slug})` : name
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

  // ── Trello-Karte: oben das, was jetzt zu tun ist, dann Kontakt, Projekt, intern
  const t = a.tracking
  const fachmarkt = a.weg === 'beratung' && a.beratung === 'fachmarkt'
  const naechsterSchritt =
    a.weg === 'aufmass'
      ? 'Sobald das Label **Bezahlt** da ist: anrufen und Aufmaßtermin vereinbaren'
      : a.weg === 'preis'
        ? stufe === 'C' || !a.telefon
          ? 'Per Mail nachfassen und Aufmaß oder Fachmarkt anbieten'
          : 'Innerhalb von 1 Tag anrufen und das Aufmaß anbieten'
        : fachmarkt
          ? `Kunde kommt **${termin}** in den Fachmarkt – passende Böden bereitlegen`
          : a.beratung === 'whatsapp'
            ? 'Per WhatsApp melden'
            : `Zurückrufen${a.rueckruf && a.rueckruf !== 'egal' ? ` – **${RUECKRUF_NAME[a.rueckruf].toLowerCase()}**` : ''}`

  const z: string[] = []
  z.push(`## ➡️ ${naechsterSchritt}`, '')
  z.push('---', '', '## 👤 Kontakt')
  z.push(`**${name}**`)
  if (a.telefon) z.push(`📞 ${telefonAnzeige(a.telefon)} · [WhatsApp](https://wa.me/${a.telefon.slice(1)})`)
  if (a.email) z.push(`✉️ ${a.email}`)
  z.push(`📍 ${a.weg === 'aufmass' ? `${a.strasse} ${a.hausnummer}, ` : ''}${gebiet.plz} ${gebiet.ort} · ca. ${fahrt} km · ${kreis.name}`)
  if (a.weg === 'aufmass' && strasseGeprueft === false) z.push('⚠️ Straße nicht im Straßenverzeichnis – Adresse beim Anruf prüfen')

  const projekt: string[] = []
  if (a.produkt) projekt.push(`**Boden:** ${bodenLink(a.produkt.id, produktName)} _(schon ausgesucht)_`)
  else if (a.produktText) projekt.push(`**Boden:** ${a.produktText} _(im Shop nicht gefunden)_`)
  else if (a.bodenart && a.weg !== 'beratung') projekt.push(`**Boden:** ${BODENARTEN[a.bodenart].name} _(noch nicht ausgesucht)_`)
  else if (a.besitz) projekt.push(`**Boden:** ${BESITZ_NAME[a.besitz]}`)
  if (a.weg !== 'beratung') projekt.push(`**Fläche:** ca. ${a.flaeche} m²`)
  if (a.altboden && a.weg === 'preis') projekt.push(`**Altboden:** ${ALTBOEDEN[a.altboden].name}`)
  if (a.weg === 'preis') {
    const extras = [a.sockelleisten ? 'Sockelleisten' : null, a.stufen ? `${a.stufen} Stufen` : null, a.tueren ? `${a.tueren} Türen kürzen` : null].filter(Boolean)
    if (extras.length) projekt.push(`**Extras:** ${extras.join(', ')}`)
    if (!a.produkt && a.klasse) projekt.push(`**Preisklasse:** ${KLASSE_NAME[a.klasse]}`)
  }
  if (a.zeitraum) projekt.push(`**Verlegen:** ${ZEITRAUM_NAME[a.zeitraum]}`)
  if (projekt.length) z.push('', '## 🏠 Projekt', ...projekt.map((x) => `- ${x}`))

  if (a.weg === 'aufmass' && angebot) {
    z.push('', '## 📦 Großmuster mitnehmen')
    if (a.produkt) z.push(`- ${bodenLink(a.produkt.id, produktName)}`)
    for (const w of a.wunschboeden) z.push(`- ${bodenLink(w.id, w.name)}`)
    if (a.empfehlung) z.push('- Eure Empfehlung')
    z.push('', `## 💶 Aufmaß ${formatEuro(angebot.preis)}`, `${a.zahlart ? ZAHLART_NAME[a.zahlart] : ''} · ${angebot.kreis.name} (${angebot.kreis.sku}) · wird bei Beauftragung gutgeschrieben`)
  }
  if (rahmen) z.push('', `## 💶 Genannter Preisrahmen: ${formatEuro(rahmen.min)} – ${formatEuro(rahmen.max)}`)

  z.push('', '---', '', '**Intern**')
  if (rahmen) {
    for (const p of rahmen.posten) z.push(`- ${p.name}: ${p.min === p.max ? formatEuro(p.min) : `${formatEuro(p.min)} – ${formatEuro(p.max)}`}`)
    z.push(`- Boden: ${rahmen.boden ? `${formatEuro(rahmen.boden[0])} – ${formatEuro(rahmen.boden[1])} (${bodenText})` : 'nicht enthalten'}`)
  }
  const quelle = [t.utmSource, t.utmMedium, t.utmCampaign].filter(Boolean).join(' / ') || (t.gclid ? 'Google Ads' : t.fbclid ? 'Meta' : t.referrer ? t.referrer : 'direkt')
  z.push(`- Vorgang ${leadId} · Lead-Stufe ${stufe} · Quelle: ${quelle}`)
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
    checklisten.push({ name: 'Aufmaß', punkte: ['Bezahlt (Label wechselt automatisch)', 'Termin vereinbaren', 'Großmuster einpacken (Liste oben)', 'Aufmaß durchführen', 'Angebot in SAP erstellen (Aufmaß gutschreiben)'] })
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

  const titelVorne =
    a.weg === 'aufmass'
      ? `📏 Aufmaß ${angebot ? formatEuro(angebot.preis) : ''}`.trim()
      : a.weg === 'preis'
        ? `💶 Preisrahmen ${rahmen ? `${formatEuro(rahmen.min)}–${formatEuro(rahmen.max)}` : ''}`.trim()
        : fachmarkt
          ? `📅 ${termin} Fachmarkt`
          : a.beratung === 'whatsapp'
            ? '💬 WhatsApp'
            : `📞 Rückruf${a.rueckruf && a.rueckruf !== 'egal' ? ` ${RUECKRUF_NAME[a.rueckruf].toLowerCase()}` : ''}`
  const titel = `${titelVorne} · ${name} · ${gebiet.ort}`
  const faellig = a.beratung === 'fachmarkt' && a.termin ? berlinZuIso(...(a.termin.split('T') as [string, string])) : null

  const [cardId, mailOk] = await Promise.all([
    karteAnlegen({ titel, beschreibung, liste: faellig ? 'termin' : 'neu', faellig, labels, checklisten }),
    teamMail({ name, email: a.email, telefon: a.telefon, text: `${titel}\n\n${alsText(beschreibung)}` }),
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
