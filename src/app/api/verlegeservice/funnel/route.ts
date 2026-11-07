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
  KLASSE_NAME,
  RUECKRUF_NAME,
  WEG_NAME,
  ZAHLART_NAME,
  ZEITRAUM_NAME,
  istGueltigerTermin,
  leadStufe,
  pruefeKontakt,
  grossAnfang,
  pruefeTelefon,
  pruefeZahlung,
  telefonAnzeige,
  terminText,
  whatsappLink,
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
import { berlinZuIso, clientIp, heuteBerlin, pruefeTurnstile, teamMail, vorgangPruefen, vorgangSignieren } from '@/lib/verlegeservice/server'
import { preisklassen } from '@/lib/verlegeservice/shop'
import { karteAktualisieren, karteAnlegen, type KartenLabel } from '@/lib/verlegeservice/trello'

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
    whatsapp: r.whatsapp === true || r.beratung === 'whatsapp',
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
    vorgang: s(r.vorgang, 200) || undefined,
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
    .replace(/^_|_$/gm, '')

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
  // Zweite Anfrage im selben Besuch (z. B. Preisrahmen → Aufmaß): dieselbe
  // Karte und dieselbe Lead-ID, damit nichts doppelt im Board landet.
  const vorher = vorgangPruefen(a.vorgang)
  const leadId = vorher?.leadId ?? (await naechsteLeadId())
  const stufe = leadStufe(a, Number.isFinite(kreis.bisKm), imGebiet)
  const name = `${a.vorname} ${a.nachname}`.trim()
  const termin = a.beratung === 'fachmarkt' ? terminText(a.termin) : ''
  const boeden = [a.produkt ? produktName : null, ...a.wunschboeden.map((b) => b.name), a.empfehlung ? 'Empfehlung des Beraters' : null].filter(
    (x): x is string => !!x,
  )

  // ── Trello-Karte ─────────────────────────────────────────────────────────
  // Oben: was jetzt zu tun ist, mit WhatsApp-Knopf (Text schon drin). Dann der
  // kurze Ablauf, danach Kunde und Projekt. Kalkulation und Quelle ganz unten.
  const t = a.tracking
  const fachmarkt = a.weg === 'beratung' && a.beratung === 'fachmarkt'
  const vorname = grossAnfang(a.vorname)
  const bodenWort = a.produkt ? produktName : a.bodenart ? BODENARTEN[a.bodenart].name : ''
  const perWhatsapp = a.whatsapp && !!a.telefon
  const wa = (text: string) => whatsappLink(a.telefon.slice(1), text)

  // Nachrichten: kurz, persönlich, immer mit einer klaren Frage zum nächsten Schritt
  const hallo = `Hallo ${vorname}, hier ist Bodenjäger aus Hückelhoven.`
  const gruss = 'Viele Grüße aus Hückelhoven'
  const waText =
    a.weg === 'aufmass'
      ? `${hallo} Danke für deine Aufmaß-Buchung! Wann passt es dir, dass wir bei dir vorbeikommen? Schick uns gern zwei, drei Termine. Deine Großmuster bringen wir mit.\n\n${gruss}`
      : a.weg === 'preis'
        ? `${hallo} Danke, dass du deinen Preisrahmen${bodenWort ? ` für ${bodenWort}` : ''} berechnet hast! Den genauen Preis bekommst du nach einem kurzen Aufmaß bei dir zu Hause. Deine Wunschböden bringen wir als Großmuster mit, damit du sie im echten Licht siehst.\n\nWann würde es dir passen? Oder magst du lieber erst bei uns im Fachmarkt vorbeischauen?\n\n${gruss}`
        : fachmarkt
          ? `${hallo} Dein Beratungstermin steht: ${termin} bei uns im Fachmarkt, Neckarstraße 9. Wir legen passende Böden für dich bereit.\n\nFalls etwas dazwischenkommt, schreib uns einfach hier. Bis bald!`
          : a.beratung === 'whatsapp'
            ? `${hallo} Schön, dass du dich meldest! Schick uns gern ein paar Fotos von den Räumen und ungefähr die Quadratmeter, dann beraten wir dich direkt hier im Chat.\n\n${gruss}`
            : `${hallo} Du wolltest einen Rückruf zum Bodenverlegen. Wann passt es dir am besten? Gern können wir auch direkt hier schreiben.\n\n${gruss}`
  const waNichtErreicht = `${hallo} Wir haben gerade versucht, dich wegen deiner Anfrage anzurufen. Wann passt es dir besser? Oder schreib uns einfach hier, was du vorhast.\n\n${gruss}`

  const kanal = perWhatsapp ? 'WhatsApp schicken' : 'Anrufen'
  const naechsterSchritt =
    a.weg === 'aufmass'
      ? 'Sobald das Label **Bezahlt** da ist: Termin fürs Aufmaß ausmachen'
      : a.weg === 'preis'
        ? `Heute melden und Aufmaß anbieten`
        : fachmarkt
          ? `Kunde kommt **${termin}** in den Fachmarkt`
          : a.beratung === 'whatsapp'
            ? 'Per WhatsApp melden'
            : `Zurückrufen${a.rueckruf && a.rueckruf !== 'egal' ? ` – **${RUECKRUF_NAME[a.rueckruf].toLowerCase()}**` : ''}`

  const ablauf =
    a.weg === 'aufmass'
      ? [`${kanal}, Termin ausmachen → Karte nach **📏 Aufmaß-Termin steht**`, 'Großmuster einpacken (Liste unten), Aufmaß machen', 'Angebot in SAP, Aufmaß gutschreiben → **📄 Angebot erstellt**']
      : a.weg === 'preis'
        ? [kanal, 'Aufmaß oder Beratung im Fachmarkt anbieten', 'Kein Interesse → **🗂 Unqualifiziert / später**']
        : fachmarkt
          ? [perWhatsapp ? 'Bestätigung per WhatsApp schicken' : 'Kurz anrufen und Termin bestätigen', 'Passende Böden bereitlegen', 'Nach dem Termin: Aufmaß buchen lassen oder → **⏳ Wartet auf Kunde**']
          : a.beratung === 'whatsapp'
            ? ['WhatsApp schicken', 'Fragen beantworten, Aufmaß oder Fachmarkt-Termin anbieten']
            : ['Anrufen', perWhatsapp ? 'Nicht erreicht → WhatsApp „nicht erreicht“ und Karte nach **📞 Nicht erreicht**' : 'Nicht erreicht → Karte nach **📞 Nicht erreicht**', 'Aufmaß oder Fachmarkt-Termin anbieten']

  const z: string[] = []
  z.push(`## ➡️ ${naechsterSchritt}`)
  if (perWhatsapp) {
    z.push(`💬 **[WhatsApp mit Text öffnen](${wa(waText)})** · 📞 ${telefonAnzeige(a.telefon)}`)
    z.push(`_Nicht erreicht? [WhatsApp „nicht erreicht“](${wa(waNichtErreicht)})_`)
  } else if (a.telefon) {
    z.push(`📞 **${telefonAnzeige(a.telefon)}** _(keine WhatsApp-Freigabe – bitte anrufen)_`)
  } else if (a.email) {
    z.push(`✉️ **${a.email}** _(keine Telefonnummer angegeben)_`)
  }
  z.push('', '**So geht’s weiter**', ...ablauf.map((x, i) => `${i + 1}. ${x}`))

  z.push('', '---', '', `## 👤 ${name}`)
  const kontakt = [a.telefon && a.email ? `✉️ ${a.email}` : null, `📍 ${a.weg === 'aufmass' ? `${a.strasse} ${a.hausnummer}, ` : ''}${gebiet.plz} ${gebiet.ort} · ca. ${fahrt} km`].filter(Boolean)
  z.push(kontakt.join(' · '))
  if (a.weg === 'aufmass' && strasseGeprueft === false) z.push('⚠️ Straße nicht im Straßenverzeichnis – Adresse kurz prüfen')

  const projekt: string[] = []
  if (a.produkt) projekt.push(`**Boden:** ${bodenLink(a.produkt.id, produktName)} _(schon ausgesucht)_`)
  else if (a.produktText) projekt.push(`**Boden:** ${a.produktText} _(im Shop nicht gefunden)_`)
  else if (a.bodenart && a.weg !== 'beratung') projekt.push(`**Boden:** ${BODENARTEN[a.bodenart].name} _(noch nicht ausgesucht)_`)
  if (a.weg !== 'beratung') projekt.push(`**Fläche:** ca. ${a.flaeche} m²`)
  if (a.altboden && a.weg === 'preis') projekt.push(`**Altboden:** ${ALTBOEDEN[a.altboden].name}`)
  if (a.weg === 'preis') {
    const extras = [a.sockelleisten ? 'Sockelleisten' : null, a.stufen ? `${a.stufen} Stufen` : null, a.tueren ? `${a.tueren} Türen kürzen` : null].filter(Boolean)
    if (extras.length) projekt.push(`**Extras:** ${extras.join(', ')}`)
  }
  if (a.zeitraum) projekt.push(`**Wann:** ${ZEITRAUM_NAME[a.zeitraum]}`)
  if (rahmen) projekt.push(`**Genannter Preisrahmen:** ${formatEuro(rahmen.min)} – ${formatEuro(rahmen.max)}`)
  if (projekt.length) z.push('', ...projekt.map((x) => `- ${x}`))

  if (a.weg === 'aufmass' && angebot) {
    z.push('', `**📦 Großmuster mitnehmen**`)
    if (a.produkt) z.push(`- ${bodenLink(a.produkt.id, produktName)}`)
    for (const w of a.wunschboeden) z.push(`- ${bodenLink(w.id, w.name)}`)
    if (a.empfehlung) z.push('- Eure Empfehlung')
    z.push('', `**💶 Aufmaß ${formatEuro(angebot.preis)}** · ${a.zahlart ? ZAHLART_NAME[a.zahlart] : ''} · wird bei Beauftragung gutgeschrieben`)
  }

  z.push('', '---', '', '**Intern**')
  if (rahmen) {
    for (const p of rahmen.posten) z.push(`- ${p.name}: ${p.min === p.max ? formatEuro(p.min) : `${formatEuro(p.min)} – ${formatEuro(p.max)}`}`)
    z.push(`- Boden: ${rahmen.boden ? `${formatEuro(rahmen.boden[0])} – ${formatEuro(rahmen.boden[1])} (${bodenText})` : 'nicht enthalten'}`)
    if (!a.produkt && a.klasse) z.push(`- Preisklasse: ${KLASSE_NAME[a.klasse]}`)
  }
  const quelle = [t.utmSource, t.utmMedium, t.utmCampaign].filter(Boolean).join(' / ') || (t.gclid ? 'Google Ads' : t.fbclid ? 'Meta' : t.referrer ? t.referrer : 'direkt')
  z.push(`- Vorgang ${leadId} · Lead-Stufe ${stufe} · ${kreis.name}${angebot ? ` (${angebot.kreis.sku})` : ''} · Quelle: ${quelle}`)
  const beschreibung = z.join('\n')

  const labels: KartenLabel[] = [
    { name: `Lead-Stufe ${stufe}`, farbe: stufe === 'A' ? 'green' : stufe === 'B' ? 'orange' : 'black' },
    { name: WEG_NAME[a.weg], farbe: a.weg === 'aufmass' ? 'red' : a.weg === 'preis' ? 'blue' : 'purple' },
  ]
  if (fachmarkt) labels.push({ name: 'Termin Fachmarkt', farbe: 'pink' })
  if (a.weg === 'aufmass') labels.push({ name: 'Zahlung offen', farbe: 'yellow' })

  // Checkliste nur beim Aufmaß – „Bezahlt“ hakt sich nach der Zahlung selbst ab
  const checklisten: Array<{ name: string; punkte: string[] }> =
    a.weg === 'aufmass' ? [{ name: 'Aufmaß', punkte: ['Bezahlt', 'Termin vereinbart', 'Angebot erstellt'] }] : []

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
    (async () => {
      const karte = { titel, beschreibung, liste: faellig ? ('termin' as const) : ('neu' as const), faellig, labels, checklisten }
      if (vorher && (await karteAktualisieren(vorher.cardId, karte, `🔄 Kunde hat nachgelegt: jetzt ${WEG_NAME[a.weg]}`))) return vorher.cardId
      return karteAnlegen(karte)
    })(),
    teamMail({ name, email: a.email, telefon: a.telefon, text: `${vorher ? '🔄 Aktualisierte Anfrage\n' : ''}${titel}\n\n${alsText(beschreibung)}` }),
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
    ...(cardId ? { vorgang: vorgangSignieren(cardId, leadId) } : {}),
    ...(rahmen ? { preisrahmen: { min: rahmen.min, max: rahmen.max, enthalten: rahmen.enthalten, hinweise: rahmen.hinweise, boden: bodenText } } : {}),
    ...(zahlungUrl ? { zahlungUrl } : {}),
    ...(a.weg === 'aufmass' && !zahlungUrl ? { zahlungFehler: true } : {}),
  })
}
