'use client'

/**
 * Formular „Verlegeservice anfragen" — vier Schritte plus Bestätigung.
 *
 * Ausschließlich für Interessenten, die eine Verlegung durch Bodenjäger
 * möchten. „Nur Material kaufen" und „Ich verlege selbst" kommen bewusst nicht
 * vor (Vorgabe) — es gibt hier keine Vorqualifizierung, die Anfragen abweist.
 *
 * Zustand liegt in einem einzigen Objekt und wird bei jedem Schrittwechsel im
 * sessionStorage gesichert. Zurückgehen verliert daher nichts. Dateien werden
 * NICHT gesichert: Sie liegen als Base64 im Speicher und würden das
 * sessionStorage-Limit (rund 5 MB) sprengen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { CheckCircle2, Loader2, Phone } from 'lucide-react'
import { STANDORT } from '@/content/fachmarkt'
import {
  VS_ALTBODEN,
  VS_ALTBODEN_BELAG,
  VS_ALTBODEN_ENTFERNEN,
  VS_ALTBODEN_VERLEGEART,
  VS_BELAG_SONSTIGER,
  VS_BESTAETIGUNG,
  VS_BODENART_BERATUNG,
  VS_BODENARTEN,
  VS_ERREICHBARKEIT,
  VS_FEHLER,
  VS_FLAECHE_STAFFELN,
  VS_KONTAKT,
  VS_KONTAKTART,
  VS_PROJEKT,
  VS_RAEUME,
  VS_RAUM_SONSTIGER,
  VS_SCHRITTE,
  VS_STANDORT,
  VS_ZEITRAEUME,
  VS_ZEITRAUM_SPAETER,
  type VsBodenartKey,
} from '@/content/verlegeservice-anfrage'
import { formatEntfernung, type AreaStatus } from '@/lib/servicegebiet'
import {
  labelAltbodenBelag,
  labelAltbodenEntfernen,
  labelBodenarten,
  labelFlaeche,
  labelVerlegeart,
  labelZeitraum,
  pruefeAltboden,
  pruefeKontakt,
  pruefeProjekt,
  pruefeStandort,
  type Feldfehler,
} from '@/lib/verlegeservice-validierung'
import {
  merkeLandingpage,
  sammleTrackingKontext,
  trackFormStarted,
  trackFormView,
  trackLeadAbschluss,
  trackLocationChecked,
  trackStepAltboden,
  trackStepProject,
} from '@/lib/tracking/verlegeservice-events'
import type { VsAnfrage, VsAnfrageAntwort, VsTracking } from '@/types/verlegeservice-anfrage'
import DateiUpload, { type UploadDatei } from './DateiUpload'
import {
  EinzelKarte,
  Fehler,
  Fortschritt,
  Frage,
  Hinweisbox,
  KartenRaster,
  MehrfachKarte,
  NaviLeiste,
  SchrittKopf,
  Textbereich,
  Textfeld,
} from './felder'

const ENTWURF_KEY = 'vs-anfrage-entwurf'

/**
 * Zerlegt den Datenschutz-Satz am Wort „Datenschutzerklärung", damit der Link
 * mitten im Satz sitzt. Fehlt das Wort im Text, kommt der Link hinten dran.
 */
const datenschutzTeile = (() => {
  const text = VS_KONTAKT.datenschutzText
  const i = text.indexOf(VS_KONTAKT.datenschutzLinkLabel)
  if (i < 0) return { vor: `${text} `, nach: '' }
  return {
    vor: text.slice(0, i),
    nach: text.slice(i + VS_KONTAKT.datenschutzLinkLabel.length),
  }
})()

/** Alles außer Dateien und Technik — genau das wird zwischengespeichert. */
type Entwurf = Omit<VsAnfrage, 'dateien' | 'tracking' | 'turnstileToken' | 'website'>

const LEER: Entwurf = {
  plz: '',
  ort: '',
  flaecheStaffel: null,
  qm: null,
  raeume: [],
  raumSonstiger: '',
  bodenarten: [],
  zeitraum: null,
  zeitraumDetail: '',
  altbodenEntfernen: null,
  altbodenBelag: null,
  altbodenBelagSonstiger: '',
  altbodenVerlegeart: null,
  vorname: '',
  nachname: '',
  telefon: '',
  email: '',
  kontaktart: null,
  erreichbarkeit: null,
  preisvorstellung: '',
  freitext: '',
  datenschutz: false,
}

interface PlzErgebnis {
  gefunden: boolean
  ort?: string
  distanceKm?: number
  areaStatus?: AreaStatus
}

interface Ergebnis {
  leadId: string
  areaStatus: AreaStatus
  distanceKm: number | null
  ort: string
  dateienUebertragen: number
  dateienGesamt: number
}

export default function VerlegeserviceAnfrage() {
  const [schritt, setSchritt] = useState(0)
  const [d, setD] = useState<Entwurf>(LEER)
  const [dateien, setDateien] = useState<UploadDatei[]>([])
  const [fehler, setFehler] = useState<Feldfehler>({})
  const [plzErgebnis, setPlzErgebnis] = useState<PlzErgebnis | null>(null)
  const [plzLaeuft, setPlzLaeuft] = useState(false)
  const [sendet, setSendet] = useState(false)
  const [sendeFehler, setSendeFehler] = useState<string>()
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null)
  const [website, setWebsite] = useState('') // Honeypot
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const startZeit = useRef<string>(new Date().toISOString())
  const startGemeldet = useRef(false)
  const siteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim()

  const setzen = useCallback(<K extends keyof Entwurf>(feld: K, wert: Entwurf[K]) => {
    setD((v) => ({ ...v, [feld]: wert }))
    // Fehler am Feld verschwindet, sobald der Nutzer etwas ändert.
    setFehler((f) => {
      if (!(feld in f)) return f
      const kopie = { ...f }
      delete kopie[feld as string]
      return kopie
    })
    if (!startGemeldet.current) {
      startGemeldet.current = true
      trackFormStarted()
    }
  }, [])

  // Entwurf laden (einmalig) und Seitenaufruf melden.
  useEffect(() => {
    merkeLandingpage()
    trackFormView()
    try {
      const roh = sessionStorage.getItem(ENTWURF_KEY)
      if (roh) {
        const gesichert = JSON.parse(roh) as Partial<Entwurf>
        // `bodenarten` erzwingen: Ein Entwurf, der noch vor der Umstellung auf
        // Mehrfachauswahl entstanden ist, kennt das Feld nicht oder hat dort
        // einen Einzelwert. Ohne Absicherung würde `.includes()` im Render
        // scheitern und das Formular weiß bleiben.
        setD({
          ...LEER,
          ...gesichert,
          bodenarten: Array.isArray(gesichert.bodenarten) ? gesichert.bodenarten : [],
        })
      }
    } catch {
      // Kein sessionStorage (privater Modus) — dann eben ohne Entwurf.
    }
  }, [])

  // Nach jedem Schrittwechsel sichern.
  useEffect(() => {
    try {
      sessionStorage.setItem(ENTWURF_KEY, JSON.stringify(d))
    } catch {
      // Speicher voll oder gesperrt — Formular funktioniert weiterhin.
    }
  }, [d, schritt])

  // PLZ nachschlagen, sobald fünf Ziffern stehen (leicht entprellt).
  useEffect(() => {
    const plz = d.plz.trim()
    if (!/^\d{5}$/.test(plz)) {
      setPlzErgebnis(null)
      return
    }
    let abgebrochen = false
    setPlzLaeuft(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/verlegeservice/plz?plz=${plz}`)
        const json = (await res.json()) as PlzErgebnis
        if (abgebrochen) return
        setPlzErgebnis(json)
        if (json.gefunden) {
          // Ort nur vorbelegen, solange der Nutzer nichts Eigenes eingetragen hat.
          setD((v) => (v.ort.trim() ? v : { ...v, ort: json.ort ?? '' }))
          trackLocationChecked(json.areaStatus ?? 'out_of_area', json.distanceKm ?? null)
        } else {
          trackLocationChecked('unbekannt', null)
        }
      } catch {
        if (!abgebrochen) setPlzErgebnis(null)
      } finally {
        if (!abgebrochen) setPlzLaeuft(false)
      }
    }, 400)
    return () => {
      abgebrochen = true
      clearTimeout(timer)
    }
  }, [d.plz])

  const staffel = useMemo(
    () => VS_FLAECHE_STAFFELN.find((s) => s.key === d.flaecheStaffel) ?? null,
    [d.flaecheStaffel],
  )
  /** Bei „Noch nicht genau bekannt" wird keine Quadratmeterzahl verlangt. */
  const braucheQm = !!staffel && staffel.min !== null

  const weiter = (pruefung: Feldfehler, danach?: () => void) => {
    if (Object.keys(pruefung).length > 0) {
      setFehler(pruefung)
      return
    }
    setFehler({})
    danach?.()
    setSchritt((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const zurueck = () => {
    setFehler({})
    setSchritt((s) => Math.max(0, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const raumUmschalten = (raum: string) => {
    const drin = d.raeume.includes(raum)
    setzen('raeume', drin ? d.raeume.filter((r) => r !== raum) : [...d.raeume, raum])
  }

  /**
   * Mehrfachauswahl der Bodenarten. „Noch nicht entschieden – Beratung
   * gewünscht" (VS_BODENART_BERATUNG) verträgt sich nicht mit einer konkreten
   * Wahl, deshalb verdrängen sich beide gegenseitig statt sich zu addieren.
   */
  const bodenartUmschalten = (key: VsBodenartKey) => {
    const drin = d.bodenarten.includes(key)
    if (drin) {
      setzen('bodenarten', d.bodenarten.filter((b) => b !== key))
      return
    }
    if (key === VS_BODENART_BERATUNG) {
      setzen('bodenarten', [key])
      return
    }
    setzen('bodenarten', [
      ...d.bodenarten.filter((b) => b !== VS_BODENART_BERATUNG),
      key,
    ])
  }

  async function absenden() {
    const pruefung = pruefeKontakt(d)
    if (Object.keys(pruefung).length > 0) {
      setFehler(pruefung)
      return
    }
    if (siteKey && !turnstileToken) {
      setSendeFehler('Bitte schließe den Sicherheitscheck ab.')
      return
    }

    setFehler({})
    setSendeFehler(undefined)
    setSendet(true)

    const tracking = sammleTrackingKontext(startZeit.current) as VsTracking
    const payload: VsAnfrage = {
      ...d,
      qm: braucheQm ? d.qm : null,
      dateien: dateien.map(({ filename, mime, dataBase64 }) => ({ filename, mime, dataBase64 })),
      tracking,
      turnstileToken: turnstileToken ?? undefined,
      website,
    }

    try {
      const res = await fetch('/api/verlegeservice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as VsAnfrageAntwort

      if (!json.success) {
        if (json.felder) setFehler(json.felder)
        setSendeFehler(json.error)
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }

      // Conversion erst jetzt — nach bestätigter Annahme. Leere Lead-ID bedeutet
      // Honeypot-Treffer; dann wird bewusst nichts getrackt.
      if (json.leadId) {
        trackLeadAbschluss({
          leadId: json.leadId,
          areaStatus: json.areaStatus,
          areaRange: d.flaecheStaffel,
          floorType: d.bodenarten.join(',') || null,
          timeline: d.zeitraum,
        })
      }

      setErgebnis({
        leadId: json.leadId,
        areaStatus: json.areaStatus,
        distanceKm: json.distanceKm,
        ort: json.ort,
        dateienUebertragen: json.dateienUebertragen,
        dateienGesamt: json.dateienGesamt,
      })
      try {
        sessionStorage.removeItem(ENTWURF_KEY)
      } catch {
        // egal
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSendeFehler(VS_FEHLER.absendenFehlgeschlagen)
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setSendet(false)
    }
  }

  // ── Bestätigung ─────────────────────────────────────────────────────────────
  if (ergebnis) {
    return <Bestaetigung d={d} ergebnis={ergebnis} />
  }

  return (
    <section className="pt-10">
      <div className="content-container mx-auto max-w-3xl">
        <Fortschritt schritte={VS_SCHRITTE} aktiv={schritt} />

        <div className="mt-10 rounded-3xl border border-ash bg-white p-6 shadow-sm md:p-10">
          {/* ── Schritt 1: Standort ─────────────────────────────────────────── */}
          {schritt === 0 && (
            <>
              <SchrittKopf ueberschrift={VS_STANDORT.ueberschrift} hinweis={VS_STANDORT.hinweis} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Textfeld
                  id="vs-plz"
                  label={VS_STANDORT.plzLabel}
                  wert={d.plz}
                  onChange={(v) => setzen('plz', v.replace(/\D/g, '').slice(0, 5))}
                  fehler={fehler.plz}
                  pflicht
                  inputMode="numeric"
                  autoComplete="postal-code"
                  platzhalter={VS_STANDORT.plzPlatzhalter}
                  maxLength={5}
                />
                <Textfeld
                  id="vs-ort"
                  label={VS_STANDORT.ortLabel}
                  wert={d.ort}
                  onChange={(v) => setzen('ort', v)}
                  autoComplete="address-level2"
                  platzhalter={VS_STANDORT.ortPlatzhalter}
                />
              </div>

              {plzLaeuft && (
                <p className="mt-4 flex items-center gap-2 text-sm text-mid">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Standort wird geprüft …
                </p>
              )}

              {!plzLaeuft && plzErgebnis?.gefunden && plzErgebnis.areaStatus === 'in_area' && (
                <Hinweisbox
                  ton="gut"
                  titel={VS_STANDORT.inArea.titel}
                  text={`${VS_STANDORT.inArea.text} (Entfernung ca. ${formatEntfernung(plzErgebnis.distanceKm ?? 0)})`}
                />
              )}
              {!plzLaeuft && plzErgebnis?.gefunden && plzErgebnis.areaStatus === 'out_of_area' && (
                <Hinweisbox
                  ton="warnung"
                  titel={VS_STANDORT.outOfArea.titel}
                  text={VS_STANDORT.outOfArea.text}
                />
              )}
              {!plzLaeuft && plzErgebnis && !plzErgebnis.gefunden && (
                <Hinweisbox ton="neutral" text={VS_STANDORT.unbekannt} />
              )}

              <NaviLeiste
                weiter={() => weiter(pruefeStandort(d))}
                weiterLabel={VS_STANDORT.weiter}
              />
            </>
          )}

          {/* ── Schritt 2: Projekt ──────────────────────────────────────────── */}
          {schritt === 1 && (
            <>
              <SchrittKopf ueberschrift={VS_PROJEKT.ueberschrift} />

              <Frage text={VS_PROJEKT.flaecheFrage} pflicht fehler={fehler.flaecheStaffel}>
                <KartenRaster>
                  {VS_FLAECHE_STAFFELN.map((s) => (
                    <EinzelKarte
                      key={s.key}
                      label={s.label}
                      aktiv={d.flaecheStaffel === s.key}
                      onClick={() => {
                        setzen('flaecheStaffel', s.key)
                        // Bei „nicht bekannt" die Zahl verwerfen, damit keine
                        // widersprüchliche Angabe übrig bleibt.
                        if (s.min === null) setzen('qm', null)
                      }}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              {braucheQm && (
                <Frage text={VS_PROJEKT.qmFrage} hinweis={VS_PROJEKT.qmHinweis} fehler={fehler.qm}>
                  <div className="flex items-center gap-3">
                    <input
                      id="vs-qm"
                      inputMode="numeric"
                      value={d.qm === null ? '' : String(d.qm)}
                      onChange={(e) => {
                        const nur = e.target.value.replace(/\D/g, '').slice(0, 5)
                        setzen('qm', nur ? Number(nur) : null)
                      }}
                      placeholder={VS_PROJEKT.qmPlatzhalter}
                      className={`min-h-[52px] w-40 rounded-xl border-2 bg-white px-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-brand/30 ${fehler.qm ? 'border-brand' : 'border-ash'}`}
                    />
                    <span className="font-bold text-dark">{VS_PROJEKT.qmEinheit}</span>
                  </div>
                </Frage>
              )}

              <Frage
                text={VS_PROJEKT.raeumeFrage}
                pflicht
                hinweis={VS_PROJEKT.raeumeHinweis}
                fehler={fehler.raeume}
              >
                <KartenRaster>
                  {VS_RAEUME.map((r) => (
                    <MehrfachKarte
                      key={r}
                      label={r}
                      aktiv={d.raeume.includes(r)}
                      onClick={() => raumUmschalten(r)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              {d.raeume.includes(VS_RAUM_SONSTIGER) && (
                <div className="mt-5">
                  <Textfeld
                    id="vs-raum-sonstiger"
                    label={VS_PROJEKT.raumSonstigerFrage}
                    wert={d.raumSonstiger}
                    onChange={(v) => setzen('raumSonstiger', v)}
                    fehler={fehler.raumSonstiger}
                    pflicht
                    maxLength={120}
                  />
                </div>
              )}

              <Frage
                text={VS_PROJEKT.bodenartFrage}
                pflicht
                hinweis={VS_PROJEKT.bodenartHinweis}
                fehler={fehler.bodenarten}
              >
                <KartenRaster>
                  {VS_BODENARTEN.map((b) => (
                    <MehrfachKarte
                      key={b.key}
                      label={b.label}
                      aktiv={d.bodenarten.includes(b.key)}
                      onClick={() => bodenartUmschalten(b.key)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              <Frage text={VS_PROJEKT.zeitraumFrage} pflicht fehler={fehler.zeitraum}>
                <KartenRaster>
                  {VS_ZEITRAEUME.map((z) => (
                    <EinzelKarte
                      key={z.key}
                      label={z.label}
                      aktiv={d.zeitraum === z.key}
                      onClick={() => setzen('zeitraum', z.key)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              {d.zeitraum === VS_ZEITRAUM_SPAETER && (
                <div className="mt-5">
                  <Textfeld
                    id="vs-zeitraum-detail"
                    label={VS_PROJEKT.zeitraumSpaeterFrage}
                    wert={d.zeitraumDetail}
                    onChange={(v) => setzen('zeitraumDetail', v)}
                    platzhalter={VS_PROJEKT.zeitraumSpaeterPlatzhalter}
                    maxLength={160}
                  />
                </div>
              )}

              <NaviLeiste
                zurueck={zurueck}
                weiter={() =>
                  weiter(pruefeProjekt({ ...d, qm: braucheQm ? d.qm : null }), () =>
                    trackStepProject({
                      area_range: d.flaecheStaffel,
                      // Mehrfachauswahl als kommaseparierte Keys — der
                      // Parametername bleibt, damit bestehende Auswertungen
                      // weiterlaufen.
                      floor_type: d.bodenarten.join(',') || null,
                      timeline: d.zeitraum,
                      raum_anzahl: d.raeume.length,
                    }),
                  )
                }
                weiterLabel={VS_PROJEKT.weiter}
              />
            </>
          )}

          {/* ── Schritt 3: Altboden ─────────────────────────────────────────── */}
          {schritt === 2 && (
            <>
              <SchrittKopf ueberschrift={VS_ALTBODEN.ueberschrift} />

              <Frage text={VS_ALTBODEN.entfernenFrage} pflicht fehler={fehler.altbodenEntfernen}>
                <KartenRaster>
                  {VS_ALTBODEN_ENTFERNEN.map((o) => (
                    <EinzelKarte
                      key={o.key}
                      label={o.label}
                      aktiv={d.altbodenEntfernen === o.key}
                      onClick={() => setzen('altbodenEntfernen', o.key)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              {d.altbodenEntfernen === 'unklar' && (
                <Hinweisbox ton="neutral" text={VS_ALTBODEN.unklarHinweis} />
              )}

              {d.altbodenEntfernen === 'ja' && (
                <>
                  <Frage text={VS_ALTBODEN.belagFrage} pflicht fehler={fehler.altbodenBelag}>
                    <KartenRaster>
                      {VS_ALTBODEN_BELAG.map((o) => (
                        <EinzelKarte
                          key={o.key}
                          label={o.label}
                          aktiv={d.altbodenBelag === o.key}
                          onClick={() => setzen('altbodenBelag', o.key)}
                        />
                      ))}
                    </KartenRaster>
                  </Frage>

                  {d.altbodenBelag === VS_BELAG_SONSTIGER && (
                    <div className="mt-5">
                      <Textfeld
                        id="vs-belag-sonstiger"
                        label={VS_ALTBODEN.belagSonstigerFrage}
                        wert={d.altbodenBelagSonstiger}
                        onChange={(v) => setzen('altbodenBelagSonstiger', v)}
                        fehler={fehler.altbodenBelagSonstiger}
                        pflicht
                        maxLength={120}
                      />
                    </div>
                  )}

                  <Frage text={VS_ALTBODEN.verlegeartFrage} hinweis={VS_ALTBODEN.verlegeartHinweis}>
                    <KartenRaster>
                      {VS_ALTBODEN_VERLEGEART.map((o) => (
                        <EinzelKarte
                          key={o.key}
                          label={o.label}
                          aktiv={d.altbodenVerlegeart === o.key}
                          onClick={() => setzen('altbodenVerlegeart', o.key)}
                        />
                      ))}
                    </KartenRaster>
                  </Frage>
                </>
              )}

              <NaviLeiste
                zurueck={zurueck}
                weiter={() =>
                  weiter(pruefeAltboden(d), () => trackStepAltboden(d.altbodenEntfernen))
                }
                weiterLabel={VS_ALTBODEN.weiter}
              />
            </>
          )}

          {/* ── Schritt 4: Kontakt und Unterlagen ───────────────────────────── */}
          {schritt === 3 && (
            <>
              <SchrittKopf ueberschrift={VS_KONTAKT.ueberschrift} hinweis={VS_KONTAKT.hinweis} />

              <div className="grid gap-5 sm:grid-cols-2">
                <Textfeld
                  id="vs-vorname"
                  label={VS_KONTAKT.vornameLabel}
                  wert={d.vorname}
                  onChange={(v) => setzen('vorname', v)}
                  fehler={fehler.vorname}
                  pflicht
                  autoComplete="given-name"
                />
                <Textfeld
                  id="vs-nachname"
                  label={VS_KONTAKT.nachnameLabel}
                  wert={d.nachname}
                  onChange={(v) => setzen('nachname', v)}
                  fehler={fehler.nachname}
                  pflicht
                  autoComplete="family-name"
                />
                <Textfeld
                  id="vs-telefon"
                  label={VS_KONTAKT.telefonLabel}
                  wert={d.telefon}
                  onChange={(v) => setzen('telefon', v)}
                  fehler={fehler.telefon}
                  pflicht
                  typ="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <Textfeld
                  id="vs-email"
                  label={VS_KONTAKT.emailLabel}
                  wert={d.email}
                  onChange={(v) => setzen('email', v)}
                  fehler={fehler.email}
                  pflicht
                  typ="email"
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              <Frage text={VS_KONTAKT.kontaktartFrage}>
                <KartenRaster>
                  {VS_KONTAKTART.map((o) => (
                    <EinzelKarte
                      key={o.key}
                      label={o.label}
                      aktiv={d.kontaktart === o.key}
                      onClick={() => setzen('kontaktart', o.key)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              <Frage text={VS_KONTAKT.erreichbarkeitFrage}>
                <KartenRaster>
                  {VS_ERREICHBARKEIT.map((o) => (
                    <EinzelKarte
                      key={o.key}
                      label={o.label}
                      aktiv={d.erreichbarkeit === o.key}
                      onClick={() => setzen('erreichbarkeit', o.key)}
                    />
                  ))}
                </KartenRaster>
              </Frage>

              <Frage text={VS_KONTAKT.preisUeberschrift}>
                <Textbereich
                  id="vs-preis"
                  wert={d.preisvorstellung}
                  onChange={(v) => setzen('preisvorstellung', v)}
                  platzhalter={VS_KONTAKT.preisPlatzhalter}
                  hinweis={VS_KONTAKT.preisHinweis}
                  zeilen={2}
                />
              </Frage>

              <Frage text={VS_KONTAKT.freitextUeberschrift} hinweis={VS_KONTAKT.freitextHinweis}>
                <Textbereich
                  id="vs-freitext"
                  wert={d.freitext}
                  onChange={(v) => setzen('freitext', v)}
                  platzhalter={VS_KONTAKT.freitextPlatzhalter}
                  zeilen={4}
                />
              </Frage>

              <Frage text={VS_KONTAKT.uploadUeberschrift}>
                <DateiUpload dateien={dateien} onChange={setDateien} />
              </Frage>

              {/* Honeypot — für Menschen unsichtbar, Bots füllen ihn gern aus. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="vs-website">Website</label>
                <input
                  id="vs-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="mt-8 rounded-2xl border border-ash bg-pale p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={d.datenschutz}
                    onChange={(e) => setzen('datenschutz', e.target.checked)}
                    className="mt-1 h-5 w-5 flex-shrink-0 accent-[#ed1b24]"
                  />
                  {/* Der Satz wird am Wort „Datenschutzerklärung" geteilt, damit
                      der Link an seiner Stelle im Text steht statt hinten dran. */}
                  <span className="text-sm text-mid">
                    {datenschutzTeile.vor}
                    <Link
                      href={VS_KONTAKT.datenschutzHref}
                      target="_blank"
                      className="font-bold text-brand underline"
                    >
                      {VS_KONTAKT.datenschutzLinkLabel}
                    </Link>
                    {datenschutzTeile.nach}
                  </span>
                </label>
                <Fehler text={fehler.datenschutz} />
              </div>

              {siteKey && (
                <div className="mt-6">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={siteKey}
                    options={{ language: 'de', theme: 'light' }}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken(null)}
                    onError={() => setTurnstileToken(null)}
                  />
                </div>
              )}

              <Fehler text={sendeFehler} />

              <button
                type="button"
                onClick={absenden}
                disabled={sendet}
                className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-brand px-8 text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#c8161e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendet ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {VS_KONTAKT.absendenLaeuft}
                  </>
                ) : (
                  VS_KONTAKT.absenden
                )}
              </button>
              <p className="mt-3 text-center text-sm text-mid">{VS_KONTAKT.absendenHinweis}</p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={zurueck}
                  className="min-h-[48px] font-bold text-mid transition-colors hover:text-dark"
                >
                  Zurück
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Bestätigungsansicht ───────────────────────────────────────────────────────

function Zeile({ bez, wert }: { bez: string; wert: string | null }) {
  if (!wert) return null
  return (
    <div className="flex flex-col gap-0.5 border-b border-ash py-3 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-56 flex-shrink-0 text-sm font-bold text-dark">{bez}</dt>
      <dd className="text-mid">{wert}</dd>
    </div>
  )
}

function Bestaetigung({ d, ergebnis }: { d: Entwurf; ergebnis: Ergebnis }) {
  const inArea = ergebnis.areaStatus === 'in_area'

  return (
    <section className="pt-10">
      <div className="content-container mx-auto max-w-3xl">
        <div className="rounded-3xl border border-ash bg-white p-6 text-center shadow-sm md:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </span>
          <h2
            className="mt-6 font-bold text-dark"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}
          >
            {VS_BESTAETIGUNG.ueberschrift}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-mid">
            {inArea ? VS_BESTAETIGUNG.textInArea : VS_BESTAETIGUNG.textOutOfArea}
          </p>
          {ergebnis.leadId && (
            <p className="mt-4 text-sm text-mid">
              Vorgangsnummer: <span className="font-bold text-dark">{ergebnis.leadId}</span>
            </p>
          )}

          <div className="mt-10 text-left">
            <h3 className="text-lg font-bold text-dark">{VS_BESTAETIGUNG.zusammenfassungTitel}</h3>
            <dl className="mt-3">
              <Zeile
                bez="Standort"
                wert={[d.plz, ergebnis.ort || d.ort].filter(Boolean).join(' ')}
              />
              <Zeile
                bez="Servicegebiet"
                wert={
                  inArea
                    ? `Im regulären Verlegegebiet${ergebnis.distanceKm !== null ? ` (ca. ${formatEntfernung(ergebnis.distanceKm)})` : ''}`
                    : `Außerhalb des 50-km-Gebiets${ergebnis.distanceKm !== null ? ` (ca. ${formatEntfernung(ergebnis.distanceKm)})` : ''}`
                }
              />
              <Zeile bez="Flächenstaffel" wert={labelFlaeche(d.flaecheStaffel)} />
              <Zeile bez="Genaue Fläche" wert={d.qm ? `ca. ${d.qm} m²` : null} />
              <Zeile
                bez="Räume"
                wert={
                  d.raeume.length
                    ? d.raeume
                        .map((r) =>
                          r === VS_RAUM_SONSTIGER && d.raumSonstiger.trim()
                            ? `${r} (${d.raumSonstiger.trim()})`
                            : r,
                        )
                        .join(', ')
                    : null
                }
              />
              <Zeile bez="Gewünschte Bodenart" wert={labelBodenarten(d.bodenarten)} />
              <Zeile
                bez="Gewünschter Zeitraum"
                wert={
                  labelZeitraum(d.zeitraum)
                    ? `${labelZeitraum(d.zeitraum)}${d.zeitraumDetail.trim() ? ` (${d.zeitraumDetail.trim()})` : ''}`
                    : null
                }
              />
              <Zeile bez="Altboden entfernen" wert={labelAltbodenEntfernen(d.altbodenEntfernen)} />
              {d.altbodenEntfernen === 'ja' && (
                <>
                  <Zeile bez="Vorhandener Boden" wert={labelAltbodenBelag(d.altbodenBelag)} />
                  <Zeile bez="Verlegeart" wert={labelVerlegeart(d.altbodenVerlegeart)} />
                </>
              )}
              <Zeile bez="Kontakt" wert={`${d.vorname} ${d.nachname}`.trim()} />
              <Zeile bez="Telefon" wert={d.telefon} />
              <Zeile bez="E-Mail" wert={d.email} />
              <Zeile
                bez="Hochgeladene Dateien"
                wert={
                  ergebnis.dateienGesamt > 0
                    ? `${ergebnis.dateienUebertragen} von ${ergebnis.dateienGesamt}`
                    : null
                }
              />
            </dl>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href={VS_BESTAETIGUNG.zurueckHref}
              className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand px-8 font-bold text-white transition-colors hover:bg-[#c8161e]"
            >
              {VS_BESTAETIGUNG.zurueck}
            </Link>
            <a
              href={STANDORT.telefonLink}
              className="flex items-center gap-2 font-bold text-mid transition-colors hover:text-dark"
            >
              <Phone className="h-4 w-4" />
              {STANDORT.telefonAnzeige}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
