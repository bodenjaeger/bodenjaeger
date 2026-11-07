'use client'
// @ts-nocheck

/**
 * Verlegeservice-Formular mit drei Wegen (mobil zuerst, eine Frage pro Bildschirm):
 *  - Aufmaß mit Wunschboden (online bezahlt)
 *  - Preisrahmen (automatische Von-bis-Summe)
 *  - Erstberatung (Rückruf, WhatsApp oder Termin im Fachmarkt)
 *
 * Alle Daten kommen live vom Server: PLZ/Entfernung, Böden aus dem Shop,
 * Preisklassen, Straßenvorschläge. Abgeschickt wird an /api/verlegeservice/funnel.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Check, ChevronLeft, Loader2, MessageCircle, Phone, Ruler, ShoppingBag, Store, Calculator } from 'lucide-react'
import { STANDORT } from '@/content/fachmarkt'
import { formatEuro } from '@/lib/aufmass-kreise'
import { BODENARTEN, ALTBOEDEN, type AltbodenKey, type BodenartKey } from '@/lib/verlegeservice/montage'
import {
  RUECKRUF_NAME,
  WEG_NAME,
  ZAHLART_NAME,
  datumKey,
  pruefeKontakt,
  pruefeZahlung,
  tagKurz,
  terminSlots,
  terminText,
  termintage,
  type BeratungKey,
  type BesitzKey,
  type FunnelAnfrage,
  type FunnelAntwort,
  type FunnelErfolg,
  type KlasseKey,
  type ProduktWahl,
  type RueckrufKey,
  type WegKey,
  type ZahlartKey,
  type ZeitraumKey,
} from '@/lib/verlegeservice/funnel'
import {
  merkeLandingpage,
  sammleTrackingKontext,
  trackFormView,
  trackLeadAbschluss,
  trackLocationChecked,
} from '@/lib/tracking/verlegeservice-events'
import type { VsTracking } from '@/types/verlegeservice-anfrage'

// ── Typen ────────────────────────────────────────────────────────────────────

interface PlzInfo {
  ort: string
  fahrtKm: number
  imGebiet: boolean
  kreis: string
  aufmass: { preis: number } | null
}
interface Boden {
  id: number
  name: string
  art: BodenartKey
  preis: number | null
  bild: string | null
}
type Klassen = Record<'guenstig' | 'mittel' | 'premium', [number, number]> | null
type ScreenId =
  | 'plz' | 'weg' | 'besitz' | 'produkt' | 'bodenart' | 'flaeche' | 'altboden' | 'extras' | 'klasse'
  | 'zeitraum' | 'wunschboden' | 'beratungsart' | 'termin' | 'kontakt' | 'zahlung'

interface Zustand {
  plz: string
  weg: WegKey | null
  besitz: BesitzKey | null
  produkt: Boden | null
  produktText: string
  produktNichtGefunden: boolean
  bodenart: BodenartKey | null
  flaeche: number
  altboden: AltbodenKey | null
  sockelleisten: boolean
  stufen: number
  tueren: number
  klasse: KlasseKey | null
  zeitraum: ZeitraumKey | null
  wunschboeden: Boden[]
  empfehlung: boolean
  beratung: BeratungKey | null
  rueckruf: RueckrufKey | null
  termin: string | null
  terminTag: string | null
  vorname: string
  nachname: string
  telefon: string
  email: string
  strasse: string
  strasseGewaehlt: boolean
  hausnummer: string
  zahlart: ZahlartKey | null
  widerruf: boolean
  datenschutz: boolean
}

const LEER: Zustand = {
  plz: '', weg: null, besitz: null, produkt: null, produktText: '', produktNichtGefunden: false, bodenart: null,
  flaeche: 40, altboden: null, sockelleisten: true, stufen: 0, tueren: 0, klasse: null, zeitraum: null,
  wunschboeden: [], empfehlung: false, beratung: null, rueckruf: null, termin: null, terminTag: null,
  vorname: '', nachname: '', telefon: '', email: '', strasse: '', strasseGewaehlt: false, hausnummer: '',
  zahlart: null, widerruf: false, datenschutz: false,
}

const PFADE: Record<WegKey, ScreenId[]> = {
  aufmass: ['plz', 'weg', 'besitz', 'bodenart', 'flaeche', 'zeitraum', 'wunschboden', 'kontakt', 'zahlung'],
  preis: ['plz', 'weg', 'besitz', 'bodenart', 'flaeche', 'altboden', 'extras', 'klasse', 'zeitraum', 'kontakt'],
  beratung: ['plz', 'weg', 'besitz', 'beratungsart', 'kontakt'],
}

function pfadFuer(z: Zustand): ScreenId[] {
  if (!z.weg) return ['plz', 'weg']
  let p = [...PFADE[z.weg]]
  if (z.besitz === 'bj') {
    p = p.map((x) => (x === 'bodenart' ? 'produkt' : x))
    if (z.produktNichtGefunden && !z.produkt) p.splice(p.indexOf('produkt') + 1, 0, 'bodenart')
    if (z.produkt?.preis) p = p.filter((x) => x !== 'klasse')
  }
  if (z.weg === 'beratung' && z.beratung === 'fachmarkt') p.splice(p.indexOf('beratungsart') + 1, 0, 'termin')
  return p
}

// ── Kleine Bausteine ─────────────────────────────────────────────────────────

const KARTE = 'flex w-full items-center gap-3.5 rounded-xl border-2 bg-white px-4 py-3 text-left transition-colors'
const KARTE_AN = 'border-brand bg-brand/5'
const KARTE_AUS = 'border-ash hover:border-mid'

function Option({
  aktiv, onClick, titel, text, icon, preis, badge, gross, disabled,
}: {
  aktiv: boolean; onClick: () => void; titel: string; text?: string; icon?: React.ReactNode
  preis?: string; badge?: string; gross?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={aktiv}
      className={`${KARTE} ${gross ? 'min-h-[84px] items-start' : 'min-h-[58px]'} ${aktiv ? KARTE_AN : KARTE_AUS} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon && (
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-brand ${aktiv ? 'bg-white' : 'bg-pale'}`}>{icon}</span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-bold text-dark">{titel}</span>
        {text && <span className="text-[13px] leading-snug text-mid">{text}</span>}
        {badge && (
          <span className="mt-1 w-fit max-w-full rounded-md bg-dark px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">{badge}</span>
        )}
      </span>
      {preis && <span className="whitespace-nowrap font-bold text-brand">{preis}</span>}
    </button>
  )
}

function Chip({ aktiv, onClick, children }: { aktiv: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className={`min-h-[40px] rounded-full border px-4 py-2 text-sm transition-colors ${
        aktiv ? 'border-[#d11820] bg-[#d11820] font-bold text-white' : 'border-ash bg-white text-dark hover:border-mid'
      }`}
    >
      {children}
    </button>
  )
}

function Feld({
  id, label, wert, onChange, typ = 'text', auto, optional, fehler, inputMode, placeholder,
}: {
  id: string; label: string; wert: string; onChange: (v: string) => void; typ?: string; auto?: string
  optional?: boolean; fehler?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']; placeholder?: string
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-dark">
        {label} {optional && <span className="font-normal text-mid">(optional)</span>}
      </label>
      <input
        id={id}
        type={typ}
        value={wert}
        autoComplete={auto}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[52px] w-full rounded-lg border-2 bg-white px-3.5 text-base text-dark outline-none focus:ring-[3px] focus:ring-brand/30 ${fehler ? 'border-brand' : 'border-ash'}`}
      />
      {fehler && <p className="text-sm font-bold text-brand">{fehler}</p>}
    </div>
  )
}

function Hinweis({ ton, titel, children }: { ton: 'gut' | 'warn' | 'info'; titel: string; children?: React.ReactNode }) {
  const farbe = ton === 'gut' ? 'border-success/30 bg-success/10' : ton === 'warn' ? 'border-brand/30 bg-brand/5' : 'border-ash bg-pale'
  return (
    <div className={`rounded-xl border-2 px-4 py-3 text-sm ${farbe}`}>
      <p className="font-bold text-dark">{titel}</p>
      {children && <div className="mt-1 text-mid">{children}</div>}
    </div>
  )
}

function Haken() {
  return (
    <span className="mt-0.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand">
      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3.5} aria-hidden="true" />
    </span>
  )
}

function BodenBild({ src }: { src: string | null }) {
  if (!src) return <div className="aspect-[4/3] w-full bg-pale" />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────

export default function VerlegeFunnel() {
  const [z, setZ] = useState<Zustand>(LEER)
  const [verlauf, setVerlauf] = useState<ScreenId[]>(['plz'])
  const [fehler, setFehler] = useState<Record<string, string>>({})
  const [plzInfo, setPlzInfo] = useState<PlzInfo | null>(null)
  const [plzStatus, setPlzStatus] = useState<'leer' | 'laedt' | 'ok' | 'unbekannt'>('leer')
  const [treffer, setTreffer] = useState<Boden[]>([])
  const [sucht, setSucht] = useState(false)
  const [auswahl, setAuswahl] = useState<Boden[]>([])
  const [auswahlSuche, setAuswahlSuche] = useState('')
  const [klassen, setKlassen] = useState<Klassen | undefined>(undefined)
  const [strassen, setStrassen] = useState<string[]>([])
  const [ergebnis, setErgebnis] = useState<FunnelErfolg | null>(null)
  const [sendet, setSendet] = useState(false)
  const [sendeFehler, setSendeFehler] = useState<string>()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const startZeit = useRef<string>(new Date().toISOString())
  const kopfRef = useRef<HTMLDivElement>(null)
  const siteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim()

  const id = verlauf[verlauf.length - 1]
  const pfad = useMemo(() => pfadFuer(z), [z])
  const set = useCallback(<K extends keyof Zustand>(k: K, v: Zustand[K]) => {
    setZ((alt) => ({ ...alt, [k]: v }))
    setFehler((f) => {
      if (!(k in f)) return f
      const kopie = { ...f }
      delete kopie[k as string]
      return kopie
    })
  }, [])

  useEffect(() => {
    merkeLandingpage()
    trackFormView()
  }, [])

  const nachOben = () => kopfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // ── Navigation ─────────────────────────────────────────────────────────────
  const geheZu = useCallback((naechster: ScreenId) => {
    setVerlauf((v) => [...v, naechster])
    setFehler({})
    setTimeout(nachOben, 30)
  }, [])

  const weiterVon = useCallback(
    (aktuell: ScreenId, zustand: Zustand) => {
      const p = pfadFuer(zustand)
      const i = p.indexOf(aktuell)
      if (i >= 0 && i < p.length - 1) geheZu(p[i + 1])
    },
    [geheZu],
  )

  const zurueck = () => {
    if (ergebnis && !ergebnis.zahlungUrl) {
      setErgebnis(null)
      return
    }
    if (verlauf.length > 1) {
      setVerlauf((v) => v.slice(0, -1))
      setFehler({})
    }
  }

  /** Einfachauswahl setzen und automatisch weiter */
  const waehle = <K extends keyof Zustand>(k: K, v: Zustand[K], extra?: Partial<Zustand>) => {
    const neu = { ...z, ...extra, [k]: v }
    setZ(neu)
    setTimeout(() => weiterVon(id, neu), 180)
  }

  // ── PLZ ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!/^\d{5}$/.test(z.plz)) {
      setPlzInfo(null)
      setPlzStatus('leer')
      return
    }
    let aktiv = true
    setPlzStatus('laedt')
    fetch(`/api/verlegeservice/plz?plz=${z.plz}`)
      .then((r) => r.json())
      .then((d: { gefunden: boolean } & Partial<PlzInfo> & { areaStatus?: 'in_area' | 'out_of_area'; distanceKm?: number }) => {
        if (!aktiv) return
        if (!d.gefunden) {
          setPlzInfo(null)
          setPlzStatus('unbekannt')
          trackLocationChecked('unbekannt', null)
          return
        }
        setPlzInfo({ ort: d.ort!, fahrtKm: d.fahrtKm!, imGebiet: !!d.imGebiet, kreis: d.kreis!, aufmass: d.aufmass ?? null })
        setPlzStatus('ok')
        trackLocationChecked(d.imGebiet ? 'in_area' : 'out_of_area', d.distanceKm ?? null)
      })
      .catch(() => aktiv && setPlzStatus('unbekannt'))
    return () => {
      aktiv = false
    }
  }, [z.plz])

  // Außerhalb: nur Beratung möglich
  useEffect(() => {
    if (plzInfo && !plzInfo.imGebiet && z.weg && z.weg !== 'beratung') setZ((a) => ({ ...a, weg: null }))
  }, [plzInfo, z.weg])

  // ── Shop-Suche (schon ausgesucht) ──────────────────────────────────────────
  useEffect(() => {
    const q = z.produktText.trim()
    if (id !== 'produkt' || q.length < 2) {
      setTreffer([])
      return
    }
    setSucht(true)
    const t = setTimeout(() => {
      fetch(`/api/verlegeservice/boeden?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { boeden: Boden[] }) => setTreffer(d.boeden ?? []))
        .catch(() => setTreffer([]))
        .finally(() => setSucht(false))
    }, 250)
    return () => clearTimeout(t)
  }, [z.produktText, id])

  // ── Wunschboden-Auswahl (beliebte Böden der Bodenart + Suche) ─────────────
  useEffect(() => {
    if (id !== 'wunschboden' || !z.bodenart) return
    const q = auswahlSuche.trim()
    const t = setTimeout(() => {
      fetch(`/api/verlegeservice/boeden?art=${z.bodenart}${q.length >= 2 ? `&q=${encodeURIComponent(q)}` : ''}`)
        .then((r) => r.json())
        .then((d: { boeden: Boden[] }) => setAuswahl((d.boeden ?? []).filter((b) => b.id !== z.produkt?.id)))
        .catch(() => setAuswahl([]))
    }, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [id, z.bodenart, z.produkt?.id, auswahlSuche])

  // ── Preisklassen ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (id !== 'klasse' || !z.bodenart) return
    setKlassen(undefined)
    fetch(`/api/verlegeservice/preisklassen?art=${z.bodenart}`)
      .then((r) => r.json())
      .then((d: { klassen: Klassen }) => setKlassen(d.klassen))
      .catch(() => setKlassen(null))
  }, [id, z.bodenart])

  // ── Straßenvorschläge ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = z.strasse.trim()
    if (id !== 'zahlung' || z.strasseGewaehlt || q.length < 2) {
      setStrassen([])
      return
    }
    const t = setTimeout(() => {
      fetch(`/api/verlegeservice/adresse?plz=${z.plz}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { vorschlaege: Array<{ strasse: string }> }) => setStrassen((d.vorschlaege ?? []).map((v) => v.strasse)))
        .catch(() => setStrassen([]))
    }, 250)
    return () => clearTimeout(t)
  }, [z.strasse, z.strasseGewaehlt, z.plz, id])

  // ── Absenden ───────────────────────────────────────────────────────────────
  async function absenden() {
    const pruefung = { ...pruefeKontakt({ ...z, weg: z.weg! }), ...(z.weg === 'aufmass' ? pruefeZahlung(z) : {}) }
    if (z.weg === 'aufmass' && !z.strasseGewaehlt) pruefung.strasse = 'Bitte wähle deine Straße aus den Vorschlägen.'
    if (Object.keys(pruefung).length) {
      setFehler(pruefung)
      return
    }
    if (siteKey && !turnstileToken) {
      setSendeFehler('Bitte warte kurz, die Sicherheitsprüfung läuft noch.')
      return
    }
    setSendet(true)
    setSendeFehler(undefined)
    const payload: FunnelAnfrage = {
      weg: z.weg!,
      plz: z.plz,
      besitz: z.besitz,
      produkt: z.produkt ? { id: z.produkt.id, name: z.produkt.name } : null,
      produktText: z.produkt ? '' : z.produktText,
      bodenart: z.bodenart,
      flaeche: z.flaeche,
      altboden: z.altboden,
      sockelleisten: z.sockelleisten,
      stufen: z.stufen,
      tueren: z.tueren,
      klasse: z.klasse,
      zeitraum: z.zeitraum,
      wunschboeden: z.wunschboeden.map((b): ProduktWahl => ({ id: b.id, name: b.name })),
      empfehlung: z.empfehlung,
      beratung: z.beratung,
      rueckruf: z.rueckruf,
      termin: z.termin,
      vorname: z.vorname,
      nachname: z.nachname,
      telefon: z.telefon,
      email: z.email,
      strasse: z.strasse,
      hausnummer: z.hausnummer,
      zahlart: z.zahlart,
      widerruf: z.widerruf,
      datenschutz: z.datenschutz,
      tracking: sammleTrackingKontext(startZeit.current) as VsTracking,
      turnstileToken: turnstileToken ?? undefined,
    }
    try {
      const res = await fetch('/api/verlegeservice/funnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as FunnelAntwort
      if (!json.success) {
        if (json.felder) setFehler(json.felder)
        setSendeFehler(json.error)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }
      if (json.leadId) {
        trackLeadAbschluss({
          leadId: json.leadId,
          areaStatus: plzInfo?.imGebiet ? 'in_area' : 'out_of_area',
          areaRange: z.weg === 'beratung' ? null : String(z.flaeche),
          floorType: z.bodenart,
          timeline: z.zeitraum,
          naechsterSchritt: z.weg,
        })
      }
      if (json.zahlungUrl) {
        const ziel = json.zahlungUrl
        setTimeout(() => {
          window.location.href = ziel
        }, 400)
        return
      }
      setErgebnis(json)
      setTimeout(nachOben, 30)
    } catch {
      setSendeFehler('Deine Anfrage konnte gerade nicht gesendet werden. Bitte versuche es noch einmal.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setSendet(false)
    }
  }

  // Umstieg vom Preisrahmen
  function zumAufmass() {
    const neu: Zustand = { ...z, weg: 'aufmass' }
    const p = pfadFuer(neu)
    setZ(neu)
    setErgebnis(null)
    setVerlauf(p.slice(0, p.indexOf('wunschboden') + 1))
    setTimeout(nachOben, 30)
  }
  function zurBeratung() {
    const neu: Zustand = { ...z, weg: 'beratung', beratung: 'fachmarkt', termin: null }
    const p = pfadFuer(neu)
    setZ(neu)
    setErgebnis(null)
    setVerlauf(p.slice(0, p.indexOf('termin') + 1))
    setTimeout(nachOben, 30)
  }

  // ── Bildschirme ────────────────────────────────────────────────────────────
  const aufmassPreis = plzInfo?.aufmass ? formatEuro(plzInfo.aufmass.preis) : null
  const maxWunsch = z.produkt ? 2 : 3
  const istLetzter = pfad[pfad.length - 1] === id
  const zeigeTurnstile = istLetzter && !!siteKey

  let titel = ''
  let hinweis: React.ReactNode = null
  let inhalt: React.ReactNode = null
  let button: { text: string; onClick: () => void; aktiv: boolean } | null = null
  const weiterBtn = (text = 'Weiter', aktiv = true) => ({ text, onClick: () => weiterVon(id, z), aktiv })

  switch (id) {
    case 'plz': {
      titel = 'Boden verlegen lassen'
      hinweis = 'In 2 Minuten zu deinem nächsten Schritt: Preisrahmen, Aufmaß mit deinem Wunschboden oder persönliche Beratung.'
      inhalt = (
        <>
          <div className="grid gap-1.5">
            <label htmlFor="vf-plz" className="text-sm font-bold text-dark">Postleitzahl des Objekts</label>
            <input
              id="vf-plz"
              value={z.plz}
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              placeholder="41836"
              onChange={(e) => set('plz', e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="min-h-[60px] w-full rounded-lg border-2 border-ash bg-white px-4 text-center text-[26px] font-bold tracking-[0.12em] text-dark outline-none focus:ring-[3px] focus:ring-brand/30"
            />
          </div>
          {plzStatus === 'laedt' && <p className="text-sm text-mid">Wir prüfen deinen Standort …</p>}
          {plzStatus === 'unbekannt' && <Hinweis ton="warn" titel="Diese PLZ kennen wir nicht.">Bitte prüfe die Eingabe.</Hinweis>}
          {plzStatus === 'ok' && plzInfo && plzInfo.imGebiet && (
            <Hinweis ton="gut" titel="Super, wir verlegen bei dir.">
              {plzInfo.ort} liegt ca. {plzInfo.fahrtKm} km Fahrweg von unserem Fachmarkt in Hückelhoven entfernt.
            </Hinweis>
          )}
          {plzStatus === 'ok' && plzInfo && !plzInfo.imGebiet && (
            <Hinweis ton="warn" titel={`${plzInfo.ort} liegt außerhalb unseres Verlegegebiets.`}>
              Wir verlegen bis ca. 50 km Fahrweg. Deinen Boden liefern wir dir aber deutschlandweit, und beraten lassen kannst du dich natürlich auch.
            </Hinweis>
          )}
        </>
      )
      button = weiterBtn('Weiter', plzStatus === 'ok')
      break
    }
    case 'weg': {
      titel = 'Wie können wir dir helfen?'
      hinweis = 'Du kannst später jederzeit umsteigen.'
      inhalt = plzInfo?.imGebiet ? (
        <>
          <Option gross aktiv={z.weg === 'aufmass'} onClick={() => waehle('weg', 'aufmass')} icon={<Ruler className="h-5 w-5" />}
            titel="Aufmaß mit deinem Wunschboden" text="Wir kommen mit deinen 3 Favoriten als Original-Dielen, messen aus und machen dir ein genaues Angebot."
            preis={aufmassPreis ?? undefined} badge="Wird bei Beauftragung gutgeschrieben" />
          <Option gross aktiv={z.weg === 'preis'} onClick={() => waehle('weg', 'preis')} icon={<Calculator className="h-5 w-5" />}
            titel="Preisrahmen berechnen" text="Sofort eine Von-bis-Summe für Boden und Verlegung, kostenlos." />
          <Option gross aktiv={z.weg === 'beratung'} onClick={() => waehle('weg', 'beratung')} icon={<Phone className="h-5 w-5" />}
            titel="Erst persönlich beraten lassen" text="Telefonisch oder im Fachmarkt, kostenlos." />
        </>
      ) : (
        <>
          <Option gross aktiv={z.weg === 'beratung'} onClick={() => waehle('weg', 'beratung')} icon={<Phone className="h-5 w-5" />}
            titel="Persönlich beraten lassen" text="Telefonisch oder im Fachmarkt in Hückelhoven" />
          <a href="/" className={`${KARTE} min-h-[84px] items-start ${KARTE_AUS}`}>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-pale text-brand"><ShoppingBag className="h-5 w-5" /></span>
            <span className="flex flex-col gap-0.5"><span className="font-bold text-dark">Boden im Shop bestellen</span><span className="text-[13px] text-mid">Lieferung deutschlandweit, Set mit Dämmung und Sockelleiste</span></span>
          </a>
        </>
      )
      break
    }
    case 'besitz': {
      titel = 'Hast du deinen Boden schon?'
      inhalt = (
        <>
          <Option aktiv={z.besitz === 'nein'} onClick={() => waehle('besitz', 'nein', { produkt: null, produktText: '', produktNichtGefunden: false })} titel="Nein, noch nicht" text="Wir helfen dir bei der Auswahl" />
          <Option aktiv={z.besitz === 'bj'} onClick={() => waehle('besitz', 'bj', { produktNichtGefunden: false })} titel="Ja, bei Bodenjäger ausgesucht oder gekauft" />
          <Option aktiv={z.besitz === 'fremd'} onClick={() => set('besitz', 'fremd')} titel="Ja, woanders gekauft" />
          {z.besitz === 'fremd' && (
            <Hinweis ton="warn" titel="Wir verlegen nur Böden aus unserem Sortiment.">
              Schau dir gern unsere Böden an, wir finden bestimmt etwas Passendes für dich.
            </Hinweis>
          )}
        </>
      )
      if (z.besitz === 'fremd') button = weiterBtn('Okay, ich schaue mir eure Böden an')
      break
    }
    case 'produkt': {
      titel = 'Welchen Boden hast du ausgesucht?'
      hinweis = 'Tipp einfach los, wir schlagen dir Böden aus unserem Shop vor.'
      inhalt = z.produkt ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-brand bg-brand/5 px-4 py-3">
          <span><span className="block font-bold text-dark">{z.produkt.name}</span><span className="text-[13px] text-mid">{BODENARTEN[z.produkt.art].name}</span></span>
          <button type="button" onClick={() => setZ({ ...z, produkt: null, bodenart: null })} className="p-1 text-[13px] text-mid underline">Ändern</button>
        </div>
      ) : (
        <>
          <Feld id="vf-produkt" label="Produktname oder Dekor" wert={z.produktText} onChange={(v) => set('produktText', v)} auto="off" placeholder="z. B. Eiche natur" />
          {z.produktText.trim().length >= 2 && (
            <div className="grid overflow-hidden rounded-lg border border-ash bg-white">
              {sucht && !treffer.length && <p className="px-3.5 py-3 text-sm text-mid">Suche läuft …</p>}
              {!sucht && !treffer.length && <p className="px-3.5 py-3 text-sm text-mid">Nichts gefunden. Probier einen anderen Begriff.</p>}
              {treffer.map((b) => (
                <button key={b.id} type="button"
                  onClick={() => waehle('produkt', b, { bodenart: b.art, produktNichtGefunden: false })}
                  className="flex items-center gap-3 border-t border-ash px-3.5 py-2.5 text-left first:border-t-0 hover:bg-pale">
                  {b.bild ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.bild} alt="" className="h-10 w-10 flex-shrink-0 rounded-md object-cover" />
                  ) : <span className="h-10 w-10 flex-shrink-0 rounded-md bg-pale" />}
                  <span className="min-w-0 flex-1"><span className="block text-[15px] text-dark">{b.name}</span><span className="text-xs text-mid">{BODENARTEN[b.art].name}</span></span>
                  {b.preis && <span className="whitespace-nowrap text-xs text-mid">{b.preis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/m²</span>}
                </button>
              ))}
            </div>
          )}
          <button type="button" className="justify-self-start py-1.5 text-sm text-mid underline"
            onClick={() => {
              const neu = { ...z, produktNichtGefunden: true, produkt: null, bodenart: null }
              setZ(neu)
              weiterVon('produkt', neu)
            }}>
            Meinen Boden finde ich nicht
          </button>
        </>
      )
      if (z.produkt) button = weiterBtn()
      break
    }
    case 'bodenart': {
      titel = 'Welcher Boden soll es werden?'
      hinweis = 'Noch unsicher? Wähle, was dir am nächsten kommt.'
      inhalt = (
        <div className="grid grid-cols-2 gap-2.5">
          {(Object.keys(BODENARTEN) as BodenartKey[]).map((k) => (
            <Option key={k} aktiv={z.bodenart === k} onClick={() => waehle('bodenart', k)} titel={BODENARTEN[k].name} text={BODENARTEN[k].hinweis} />
          ))}
        </div>
      )
      break
    }
    case 'flaeche': {
      titel = 'Wie viel Fläche ungefähr?'
      hinweis = 'Grob reicht. Ein Zimmer hat oft 12–20 m².'
      inhalt = (
        <>
          <div className="flex items-baseline justify-center gap-2">
            <input type="number" inputMode="numeric" min={5} max={400} value={z.flaeche} aria-label="Fläche in Quadratmetern"
              onChange={(e) => set('flaeche', Math.max(0, Math.min(400, Number(e.target.value) || 0)))}
              className="w-[130px] rounded-lg border-2 border-ash px-3 py-2 text-center text-[34px] font-bold tabular-nums text-dark outline-none focus:ring-[3px] focus:ring-brand/30" />
            <span className="text-xl font-bold">m²</span>
          </div>
          <input type="range" min={5} max={200} value={Math.min(200, z.flaeche)} aria-label="Fläche einstellen"
            onChange={(e) => set('flaeche', Number(e.target.value))} className="w-full accent-[#ed1b24]" />
          <div className="flex flex-wrap justify-center gap-2">
            {[15, 30, 50, 80, 120].map((m) => <Chip key={m} aktiv={z.flaeche === m} onClick={() => set('flaeche', m)}>{m} m²</Chip>)}
          </div>
        </>
      )
      button = weiterBtn('Weiter', z.flaeche >= 5)
      break
    }
    case 'altboden': {
      titel = 'Was liegt aktuell auf dem Boden?'
      hinweis = 'Das Entfernen rechnen wir gleich mit ein.'
      inhalt = (Object.keys(ALTBOEDEN) as AltbodenKey[]).map((k) => (
        <Option key={k} aktiv={z.altboden === k} onClick={() => waehle('altboden', k)} titel={ALTBOEDEN[k].name} />
      ))
      break
    }
    case 'extras': {
      titel = 'Was soll noch dazu?'
      const stepper = (k: 'stufen' | 'tueren', label: string) => (
        <div className="flex items-center justify-between gap-3 border-t border-ash py-3">
          <span>{label}</span>
          <span className="flex items-center gap-1.5">
            <button type="button" aria-label="weniger" onClick={() => set(k, Math.max(0, z[k] - 1))} className="h-10 w-10 rounded-lg border border-ash bg-white text-xl">−</button>
            <output className="min-w-8 text-center font-bold tabular-nums">{z[k]}</output>
            <button type="button" aria-label="mehr" onClick={() => set(k, Math.min(40, z[k] + 1))} className="h-10 w-10 rounded-lg border border-ash bg-white text-xl">+</button>
          </span>
        </div>
      )
      inhalt = (
        <div className="rounded-xl border border-ash bg-pale px-4">
          <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
            <span>Neue Sockelleisten montieren</span>
            <input type="checkbox" checked={z.sockelleisten} onChange={(e) => set('sockelleisten', e.target.checked)} className="h-[22px] w-[22px] accent-[#ed1b24]" />
          </label>
          {stepper('stufen', 'Treppe (Anzahl Stufen)')}
          {stepper('tueren', 'Türen kürzen')}
        </div>
      )
      button = weiterBtn()
      break
    }
    case 'klasse': {
      const art = z.bodenart ? BODENARTEN[z.bodenart].name : 'Dein Boden'
      titel = 'In welcher Preisklasse suchst du?'
      hinweis = `${art} gibt es bei uns in allen Preislagen.`
      const spanne = (k: 'guenstig' | 'mittel' | 'premium') => (klassen ? `ca. ${klassen[k][0]}–${klassen[k][1]} €/m²` : undefined)
      inhalt = (
        <>
          {klassen === undefined && <p className="text-sm text-mid">Preise werden geladen …</p>}
          <Option aktiv={z.klasse === 'guenstig'} onClick={() => waehle('klasse', 'guenstig')} titel="Günstig" text={spanne('guenstig')} />
          <Option aktiv={z.klasse === 'mittel'} onClick={() => waehle('klasse', 'mittel')} titel="Mittelklasse" text={spanne('mittel')} />
          <Option aktiv={z.klasse === 'premium'} onClick={() => waehle('klasse', 'premium')} titel="Premium" text={spanne('premium')} />
          <Option aktiv={z.klasse === 'empfehlung'} onClick={() => waehle('klasse', 'empfehlung')} titel="Weiß ich nicht – empfehlt mir etwas" text="Wir rechnen mit der Mittelklasse und schlagen dir passende Böden vor" />
        </>
      )
      break
    }
    case 'zeitraum': {
      titel = 'Wann soll verlegt werden?'
      const abKw = process.env.NEXT_PUBLIC_VERLEGE_AB_KW?.trim()
      hinweis = abKw ? `Aktuell planen wir Verlegungen ab KW ${abKw}.` : null
      inhalt = (
        <>
          <Option aktiv={z.zeitraum === 'asap'} onClick={() => waehle('zeitraum', 'asap')} titel="So schnell wie möglich" />
          <Option aktiv={z.zeitraum === '1-3'} onClick={() => waehle('zeitraum', '1-3')} titel="In 1–3 Monaten" />
          <Option aktiv={z.zeitraum === '3-6'} onClick={() => waehle('zeitraum', '3-6')} titel="In 3–6 Monaten" />
          <Option aktiv={z.zeitraum === 'offen'} onClick={() => waehle('zeitraum', 'offen')} titel="Noch offen" text="Ich informiere mich erst" />
        </>
      )
      break
    }
    case 'wunschboden': {
      titel = z.produkt ? 'Möchtest du noch Böden zum Vergleich?' : 'Such dir bis zu 3 Böden aus'
      hinweis = 'Diese bringen wir dir als Original-Dielen zum Aufmaß mit, damit du sie bei dir zu Hause im Licht siehst.'
      const umschalten = (b: Boden) => {
        const da = z.wunschboeden.some((x) => x.id === b.id)
        if (da) set('wunschboeden', z.wunschboeden.filter((x) => x.id !== b.id))
        else if (z.wunschboeden.length < maxWunsch) set('wunschboeden', [...z.wunschboeden, b])
      }
      inhalt = (
        <>
          {z.produkt && (
            <div className="rounded-xl border-2 border-brand bg-brand/5 px-4 py-3">
              <span className="block font-bold text-dark">{z.produkt.name}</span>
              <span className="text-[13px] text-mid">kommt auf jeden Fall mit</span>
            </div>
          )}
          <Feld id="vf-auswahl" label={`${z.bodenart ? BODENARTEN[z.bodenart].name : 'Böden'} durchsuchen`} wert={auswahlSuche} onChange={setAuswahlSuche} auto="off" placeholder="z. B. Eiche, grau, Fischgrät" />
          <p className="text-sm text-mid"><b className="text-dark">{z.wunschboeden.length} von {maxWunsch}</b> {z.produkt ? 'weitere ' : ''}ausgewählt</p>
          {/* Gewählte Böden bleiben sichtbar, auch wenn die Suche sie nicht mehr zeigt */}
          <div className="grid grid-cols-2 gap-2.5">
            {[...z.wunschboeden, ...auswahl.filter((b) => !z.wunschboeden.some((x) => x.id === b.id))].map((b) => {
              const nr = z.wunschboeden.findIndex((x) => x.id === b.id)
              return (
                <button key={b.id} type="button" onClick={() => umschalten(b)} aria-pressed={nr > -1}
                  className={`relative overflow-hidden rounded-xl border-2 bg-white text-left ${nr > -1 ? 'border-brand' : 'border-ash hover:border-mid'}`}>
                  <BodenBild src={b.bild} />
                  {nr > -1 && <span className="absolute right-2 top-2 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">{nr + 1}</span>}
                  <span className="grid gap-0.5 px-2.5 py-2">
                    <span className="text-[13px] font-bold leading-snug text-dark">{b.name}</span>
                    {b.preis && <span className="text-xs text-mid">{b.preis.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/m²</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {!auswahl.length && !z.wunschboeden.length && <p className="text-sm text-mid">Böden werden geladen …</p>}
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-mid">
            <input type="checkbox" checked={z.empfehlung} onChange={(e) => set('empfehlung', e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#ed1b24]" />
            <span>Bringt mir zusätzlich eure Empfehlung mit.</span>
          </label>
        </>
      )
      const ok = !!z.produkt || z.wunschboeden.length > 0 || z.empfehlung
      button = weiterBtn(ok ? 'Weiter' : 'Wähle mindestens einen Boden', ok)
      break
    }
    case 'beratungsart': {
      titel = 'Wie möchtest du beraten werden?'
      inhalt = (
        <>
          <Option aktiv={z.beratung === 'telefon'} onClick={() => waehle('beratung', 'telefon', { termin: null })} icon={<Phone className="h-5 w-5" />} titel="Rückruf am Telefon" text="Wir rufen dich zur Wunschzeit an" />
          <Option aktiv={z.beratung === 'fachmarkt'} onClick={() => waehle('beratung', 'fachmarkt')} icon={<Store className="h-5 w-5" />} titel="Termin im Fachmarkt" text="Such dir einen Termin aus und sieh alle Böden in echt. Neckarstraße 9, Hückelhoven" />
          <Option aktiv={z.beratung === 'whatsapp'} onClick={() => waehle('beratung', 'whatsapp', { termin: null })} icon={<MessageCircle className="h-5 w-5" />} titel="Per WhatsApp" text="Schreib uns Fotos und Fragen" />
        </>
      )
      break
    }
    case 'termin': {
      titel = 'Wann möchtest du kommen?'
      hinweis = 'Such dir einen Termin aus. Dann nehmen wir uns Zeit für dich und legen passende Böden bereit.'
      const tage = termintage()
      const tagWahl = tage.find((t) => datumKey(t) === z.terminTag) ?? tage[0]
      inhalt = (
        <>
          <div className="-mx-1 grid auto-cols-[64px] grid-flow-col gap-2 overflow-x-auto px-1 pb-2">
            {tage.map((t) => {
              const k = tagKurz(t)
              const an = datumKey(t) === datumKey(tagWahl)
              return (
                <button key={datumKey(t)} type="button" onClick={() => set('terminTag', datumKey(t))} aria-pressed={an}
                  className={`grid gap-0.5 rounded-xl border-2 bg-white px-1 py-2 text-center ${an ? 'border-brand bg-brand/5' : 'border-ash'}`}>
                  <span className="text-xs text-mid">{k.wt}</span><b className="text-lg tabular-nums">{k.tag}</b><span className="text-[11px] text-mid">{k.monat}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {terminSlots(tagWahl).map((s) => {
              const key = `${datumKey(tagWahl)}T${s}`
              return (
                <button key={key} type="button" onClick={() => set('termin', key)} aria-pressed={z.termin === key}
                  className={`min-h-[44px] rounded-lg border text-[15px] tabular-nums ${z.termin === key ? 'border-[#d11820] bg-[#d11820] font-bold text-white' : 'border-ash bg-white hover:border-mid'}`}>
                  {s}
                </button>
              )
            })}
          </div>
          {z.termin && <Hinweis ton="gut" titel={`Dein Termin: ${terminText(z.termin)}`}>Fachmarkt Hückelhoven, Neckarstraße 9</Hinweis>}
        </>
      )
      button = weiterBtn(z.termin ? 'Weiter' : 'Wähle einen Termin', !!z.termin)
      break
    }
    case 'kontakt': {
      const fachmarkt = z.weg === 'beratung' && z.beratung === 'fachmarkt'
      titel = z.weg === 'aufmass' ? 'Deine Kontaktdaten' : z.weg === 'preis' ? 'Wohin dürfen wir deinen Preisrahmen schicken?' : fachmarkt ? 'Für wen ist der Termin?' : 'Wie erreichen wir dich?'
      hinweis =
        z.weg === 'aufmass' ? 'Damit wir den Termin mit dir abstimmen können.'
          : z.weg === 'preis' ? 'Deinen Preisrahmen siehst du gleich hier. Bei Fragen melden wir uns bei dir.'
            : fachmarkt ? `Dein Termin: ${terminText(z.termin)}.`
              : 'Mehr brauchen wir nicht. Alles Weitere besprechen wir persönlich.'
      const telefonOptional = z.weg === 'preis' || fachmarkt
      inhalt = (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Feld id="vf-vorname" label="Vorname" wert={z.vorname} onChange={(v) => set('vorname', v)} auto="given-name" fehler={fehler.vorname} />
            <Feld id="vf-nachname" label="Nachname" wert={z.nachname} onChange={(v) => set('nachname', v)} auto="family-name" fehler={fehler.nachname} />
          </div>
          {(z.weg !== 'beratung' || fachmarkt) && (
            <Feld id="vf-email" label="E-Mail" typ="email" wert={z.email} onChange={(v) => set('email', v)} auto="email" fehler={fehler.email} />
          )}
          <Feld id="vf-telefon" label={z.beratung === 'whatsapp' && z.weg === 'beratung' ? 'Handynummer (WhatsApp)' : 'Telefon'} typ="tel" inputMode="tel"
            wert={z.telefon} onChange={(v) => set('telefon', v)} auto="tel" optional={telefonOptional} fehler={fehler.telefon} />
          {z.weg === 'beratung' && z.beratung === 'telefon' && (
            <div className="grid gap-1.5">
              <span className="text-sm font-bold text-dark">Wann rufen wir an?</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(RUECKRUF_NAME) as RueckrufKey[]).map((k) => <Chip key={k} aktiv={z.rueckruf === k} onClick={() => set('rueckruf', k)}>{RUECKRUF_NAME[k]}</Chip>)}
              </div>
            </div>
          )}
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-mid">
            <input type="checkbox" checked={z.datenschutz} onChange={(e) => set('datenschutz', e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#ed1b24]" />
            <span>Ich bin einverstanden, dass Bodenjäger meine Angaben zur Bearbeitung meiner Anfrage verarbeitet und mich dazu kontaktiert. <a href="/datenschutz" target="_blank" className="text-dark underline">Datenschutz</a></span>
          </label>
          {fehler.datenschutz && <p className="text-sm font-bold text-brand">{fehler.datenschutz}</p>}
        </>
      )
      if (z.weg === 'aufmass') {
        button = {
          text: 'Weiter zur Zahlung',
          aktiv: true,
          onClick: () => {
            const e = pruefeKontakt({ ...z, weg: 'aufmass' })
            if (Object.keys(e).length) return setFehler(e)
            weiterVon('kontakt', z)
          },
        }
      } else {
        button = {
          text: z.weg === 'preis' ? 'Preisrahmen anzeigen' : fachmarkt ? 'Termin buchen' : z.beratung === 'whatsapp' ? 'WhatsApp-Beratung anfragen' : 'Rückruf anfordern',
          aktiv: !sendet,
          onClick: absenden,
        }
      }
      break
    }
    case 'zahlung': {
      titel = 'Aufmaß buchen'
      hinweis = 'Nach der Zahlung rufen wir dich an und vereinbaren den Termin.'
      const anzahl = z.wunschboeden.length + (z.empfehlung ? 1 : 0) + (z.produkt ? 1 : 0)
      inhalt = (
        <>
          <dl className="rounded-xl border border-ash bg-pale px-4">
            <div className="flex items-start justify-between gap-3 py-3">
              <dt><b className="block text-dark">Aufmaß + Beratung + Angebot</b><span className="text-[13px] text-mid">{plzInfo?.ort}, {plzInfo?.kreis}</span></dt>
              <dd className="font-bold tabular-nums">{aufmassPreis}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-ash py-3 text-sm"><dt>Dein Wunschboden als Original-Dielen</dt><dd>{anzahl}×</dd></div>
            <div className="flex justify-between gap-3 border-t border-ash py-3 text-sm text-success"><dt>Gutschrift bei Beauftragung</dt><dd>vollständig</dd></div>
            <div className="flex justify-between gap-3 border-t border-ash py-3"><dt>Jetzt zu zahlen <span className="text-sm text-mid">inkl. MwSt.</span></dt><dd className="font-bold tabular-nums">{aufmassPreis}</dd></div>
          </dl>
          <p className="text-[13px] text-mid">Kostenlos absagen oder verschieben bis 24 Stunden vor dem Termin.</p>
          <div className="grid gap-1.5">
            <label htmlFor="vf-strasse" className="text-sm font-bold text-dark">Adresse für das Aufmaß</label>
            {z.strasseGewaehlt ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-brand bg-brand/5 px-4 py-3">
                <span><b className="block text-dark">{z.strasse}</b><span className="text-[13px] text-mid">{z.plz} {plzInfo?.ort}</span></span>
                <button type="button" onClick={() => setZ({ ...z, strasseGewaehlt: false, hausnummer: '' })} className="p-1 text-[13px] text-mid underline">Ändern</button>
              </div>
            ) : (
              <>
                <input id="vf-strasse" value={z.strasse} autoComplete="off" placeholder="Straße eintippen"
                  onChange={(e) => set('strasse', e.target.value)}
                  className={`min-h-[52px] w-full rounded-lg border-2 bg-white px-3.5 text-base outline-none focus:ring-[3px] focus:ring-brand/30 ${fehler.strasse ? 'border-brand' : 'border-ash'}`} />
                {strassen.length > 0 && (
                  <div className="grid overflow-hidden rounded-lg border border-ash bg-white">
                    {strassen.map((s) => (
                      <button key={s} type="button" onClick={() => setZ({ ...z, strasse: s, strasseGewaehlt: true })}
                        className="flex justify-between gap-3 border-t border-ash px-3.5 py-3 text-left first:border-t-0 hover:bg-pale">
                        <span>{s}</span><span className="text-xs text-mid">{z.plz} {plzInfo?.ort}</span>
                      </button>
                    ))}
                  </div>
                )}
                {z.strasse.trim().length >= 3 && strassen.length === 0 && <p className="text-[13px] text-mid">Keine passende Straße in {z.plz} gefunden. Bitte prüfe die Schreibweise.</p>}
              </>
            )}
            {fehler.strasse && <p className="text-sm font-bold text-brand">{fehler.strasse}</p>}
          </div>
          {z.strasseGewaehlt && (
            <div className="max-w-[180px]">
              <Feld id="vf-hausnummer" label="Hausnummer" wert={z.hausnummer} onChange={(v) => set('hausnummer', v)} auto="off" fehler={fehler.hausnummer} />
            </div>
          )}
          <div className="grid gap-1.5">
            <span className="text-sm font-bold text-dark">Zahlungsart</span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ZAHLART_NAME) as ZahlartKey[]).map((k) => <Chip key={k} aktiv={z.zahlart === k} onClick={() => set('zahlart', k)}>{ZAHLART_NAME[k]}</Chip>)}
            </div>
            {fehler.zahlart && <p className="text-sm font-bold text-brand">{fehler.zahlart}</p>}
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-mid">
            <input type="checkbox" checked={z.widerruf} onChange={(e) => set('widerruf', e.target.checked)} className="mt-0.5 h-5 w-5 flex-shrink-0 accent-[#ed1b24]" />
            <span>Ich verlange ausdrücklich, dass Bodenjäger vor Ablauf der Widerrufsfrist mit dem Aufmaß beginnt. Mir ist bekannt, dass mein Widerrufsrecht mit vollständiger Erbringung des Aufmaßes erlischt.</span>
          </label>
          {fehler.widerruf && <p className="text-sm font-bold text-brand">{fehler.widerruf}</p>}
          <p className="text-[13px] text-mid">Es gelten unsere <a href="/agb" target="_blank" className="text-dark underline">AGB</a> und die <a href="/widerruf" target="_blank" className="text-dark underline">Widerrufsbelehrung</a>.</p>
        </>
      )
      button = { text: sendet ? 'Du wirst zur Zahlung weitergeleitet …' : `Jetzt ${aufmassPreis ?? ''} bezahlen`, aktiv: !sendet, onClick: absenden }
      break
    }
  }

  // ── Abschluss-Ansichten ────────────────────────────────────────────────────
  let abschluss: React.ReactNode = null
  if (ergebnis?.preisrahmen) {
    const r = ergebnis.preisrahmen
    abschluss = (
      <div className="grid gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Dein Preisrahmen</p>
        <h2 className="text-[clamp(1.35rem,5.2vw,1.75rem)] font-bold leading-tight text-dark">Hallo {z.vorname}, so viel kostet dein neuer Boden ungefähr</h2>
        <div className="py-2 text-center">
          <p className="text-[clamp(1.9rem,8vw,2.6rem)] font-bold tabular-nums leading-tight text-dark">{formatEuro(r.min)} – {formatEuro(r.max)}</p>
          <p className="mt-1.5 text-sm text-mid">komplett mit {r.enthalten[0]?.startsWith('Boden') ? 'Boden und ' : ''}Verlegung, inkl. MwSt.</p>
        </div>
        <div className="rounded-xl border border-ash bg-pale p-4">
          <p className="font-bold text-dark">Darin enthalten</p>
          <ul className="mt-2 grid gap-2.5">{r.enthalten.map((x) => <li key={x} className="flex gap-2.5 text-[15px]"><Haken />{x}</li>)}</ul>
        </div>
        <p className="text-[13px] text-mid">{r.hinweise.join(' ')}</p>
        {aufmassPreis && (
          <>
            <button type="button" onClick={zumAufmass} className="min-h-[52px] rounded-lg bg-brand px-6 font-bold text-white hover:bg-[#c8161e]">
              Aufmaß mit Wunschboden buchen · {aufmassPreis}
            </button>
            <p className="-mt-2 text-center text-xs text-mid">Wird bei Beauftragung vollständig gutgeschrieben</p>
          </>
        )}
        <button type="button" onClick={zurBeratung} className="min-h-[52px] rounded-lg border border-ash bg-white px-6 font-bold text-dark hover:border-mid">
          Lieber erst im Fachmarkt beraten lassen
        </button>
      </div>
    )
  } else if (ergebnis) {
    const fachmarkt = z.beratung === 'fachmarkt'
    const [kopf, text] = ergebnis.zahlungFehler
      ? ['Deine Anfrage ist da.', 'Die Zahlung konnte gerade nicht gestartet werden. Wir rufen dich an und vereinbaren das Aufmaß persönlich.']
      : fachmarkt
        ? ['Dein Termin steht.', `Wir erwarten dich am ${terminText(z.termin)} im Fachmarkt. Sag bei uns einfach kurz, dass du einen Beratungstermin hast.`]
        : z.beratung === 'whatsapp'
          ? ['Wir schreiben dir per WhatsApp.', 'Schick uns gern schon Fotos von deinen Räumen, dann können wir dich noch besser beraten.']
          : ['Wir rufen dich an.', 'Ein Berater aus unserem Fachmarkt meldet sich zu deiner Wunschzeit.']
    abschluss = (
      <div className="grid gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success"><Check className="h-8 w-8 text-white" strokeWidth={3} /></span>
        <h2 className="text-[clamp(1.35rem,5.2vw,1.75rem)] font-bold leading-tight text-dark">Danke, {z.vorname}! {kopf}</h2>
        <p className="text-mid">{text}</p>
        <Hinweis ton="info" titel="Fachmarkt Hückelhoven">Neckarstraße 9 · Mo–Fr 9–18:30 Uhr, Sa 9–14 Uhr · {STANDORT.telefonAnzeige}</Hinweis>
        <p className="text-xs text-mid">Vorgangsnummer: {ergebnis.leadId}</p>
      </div>
    )
  }

  // ── Rahmen ─────────────────────────────────────────────────────────────────
  const pos = pfad.indexOf(id) + 1
  const fortschritt = ergebnis ? 100 : z.weg ? (pos / (pfad.length + 1)) * 100 : pos * 8
  const zeigeZurueck = !ergebnis ? verlauf.length > 1 : !!ergebnis.preisrahmen

  return (
    <div ref={kopfRef} className="mx-auto w-full max-w-[560px] scroll-mt-24 px-4 pb-32 pt-4">
      <div className="mb-3.5 flex min-h-10 items-center gap-3">
        <button type="button" onClick={zurueck} aria-label="Zurück"
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-ash bg-white hover:border-mid ${zeigeZurueck ? '' : 'invisible'}`}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2 text-xs text-mid">
            <span>{ergebnis ? <b className="text-dark">Fertig</b> : z.weg ? <>Schritt <b className="text-dark">{pos}</b> von {pfad.length}</> : <>Schritt <b className="text-dark">{pos}</b></>}</span>
            <span>{z.weg ? WEG_NAME[z.weg] : ''}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ash">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${fortschritt}%` }} />
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white px-[18px] py-[22px] shadow-[0_12px_40px_rgba(46,45,50,0.10)] sm:px-8 sm:py-[30px]" aria-live="polite">
        {abschluss ?? (
          <>
            {id === 'plz' && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand">Verlegeservice im Umkreis von 50 km</p>}
            <h2 className="text-[clamp(1.35rem,5.2vw,1.75rem)] font-bold leading-tight tracking-tight text-dark">{titel}</h2>
            {hinweis && <p className="mt-2 text-[15px] text-mid">{hinweis}</p>}
            <div className="mt-5 grid grid-cols-1 gap-2.5">{inhalt}</div>
            {zeigeTurnstile && (
              <div className="mt-5">
                <Turnstile ref={turnstileRef} siteKey={siteKey} options={{ language: 'de', theme: 'light' }}
                  onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken(null)} onError={() => setTurnstileToken(null)} />
              </div>
            )}
            {sendeFehler && <p className="mt-4 text-sm font-bold text-brand">{sendeFehler}</p>}
          </>
        )}
      </section>

      {button && !abschluss && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ash bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3">
          <div className="mx-auto max-w-[560px]">
            <button type="button" onClick={button.onClick} disabled={!button.aktiv}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 font-bold text-white hover:bg-[#c8161e] disabled:cursor-not-allowed disabled:opacity-50">
              {sendet && <Loader2 className="h-5 w-5 animate-spin" />}
              {button.text}
            </button>
            {istLetzter && z.weg !== 'aufmass' && <p className="mt-1.5 text-center text-xs text-mid">Kostenlos und unverbindlich</p>}
          </div>
        </div>
      )}
    </div>
  )
}
