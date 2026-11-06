'use client'

/**
 * Bausteine des Verlegeservice-Formulars.
 *
 * Gestaltung laut Spezifikation: weißer Hintergrund, dunkle Schrift, rote
 * Akzentfarbe, dezente graue Rahmen, abgerundete Karten, große Klickflächen.
 * Aktive Auswahl deutlich rot; im Fortschritt sind erledigte Schritte grün,
 * der aktuelle rot, künftige grau.
 *
 * Alle Klickflächen sind mindestens 48 px hoch — das ist die Größe, die auf dem
 * Smartphone verlässlich zu treffen ist.
 */
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

// ── Fortschrittsanzeige ───────────────────────────────────────────────────────

export function Fortschritt({
  schritte,
  aktiv,
}: {
  schritte: readonly string[]
  /** Nullbasierter Index des aktuellen Schritts. */
  aktiv: number
}) {
  return (
    <ol className="flex items-start gap-2" aria-label="Fortschritt">
      {schritte.map((titel, i) => {
        const erledigt = i < aktiv
        const aktuell = i === aktiv

        const kreis = erledigt
          ? 'bg-success text-white'
          : aktuell
            ? 'bg-brand text-white'
            : 'bg-ash text-mid'
        const linie = i < aktiv ? 'bg-success' : 'bg-ash'

        return (
          <li key={titel} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              {/* Linke Verbindungslinie – beim ersten Schritt unsichtbar. */}
              <span className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-transparent' : linie}`} />
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${kreis}`}
                aria-current={aktuell ? 'step' : undefined}
              >
                {erledigt ? <Check className="h-5 w-5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`h-1 flex-1 rounded-full ${i === schritte.length - 1 ? 'bg-transparent' : i < aktiv ? 'bg-success' : 'bg-ash'}`}
              />
            </div>
            <span
              className={`text-center text-xs font-bold sm:text-sm ${aktuell ? 'text-brand' : erledigt ? 'text-success' : 'text-mid'}`}
            >
              {titel}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

// ── Überschriften / Layout ────────────────────────────────────────────────────

export function SchrittKopf({
  ueberschrift,
  hinweis,
}: {
  ueberschrift: string
  hinweis?: string
}) {
  return (
    <div className="mb-8">
      <h2
        className="font-bold leading-tight text-dark"
        style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}
      >
        {ueberschrift}
      </h2>
      {hinweis && <p className="mt-3 text-mid">{hinweis}</p>}
    </div>
  )
}

export function Frage({
  text,
  pflicht,
  hinweis,
  fehler,
  children,
}: {
  text: string
  pflicht?: boolean
  hinweis?: string
  fehler?: string
  children: ReactNode
}) {
  return (
    <fieldset className="mt-8 first:mt-0">
      <legend className="mb-1 text-base font-bold text-dark md:text-lg">
        {text}
        {pflicht && <span className="ml-1 text-brand">*</span>}
      </legend>
      {hinweis && <p className="mb-3 text-sm text-mid">{hinweis}</p>}
      <div className={hinweis ? '' : 'mt-3'}>{children}</div>
      <Fehler text={fehler} />
    </fieldset>
  )
}

export function Fehler({ text }: { text?: string }) {
  if (!text) return null
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-brand">
      {text}
    </p>
  )
}

// ── Auswahlkarten ─────────────────────────────────────────────────────────────

const KARTE_BASIS =
  'flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-medium transition-colors'
const KARTE_AUS = 'border-ash bg-white text-dark hover:border-mid'
const KARTE_AN = 'border-brand bg-brand/5 text-dark'

/** Einfachauswahl (Radio-Verhalten) als große Karte. */
export function EinzelKarte({
  label,
  aktiv,
  onClick,
}: {
  label: string
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktiv}
      onClick={onClick}
      className={`${KARTE_BASIS} ${aktiv ? KARTE_AN : KARTE_AUS}`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${aktiv ? 'border-brand' : 'border-ash'}`}
      >
        {aktiv && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
      <span>{label}</span>
    </button>
  )
}

/** Mehrfachauswahl (Checkbox-Verhalten) als große Karte. */
export function MehrfachKarte({
  label,
  aktiv,
  onClick,
}: {
  label: string
  aktiv: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={aktiv}
      onClick={onClick}
      className={`${KARTE_BASIS} ${aktiv ? KARTE_AN : KARTE_AUS}`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${aktiv ? 'border-brand bg-brand' : 'border-ash'}`}
      >
        {aktiv && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </span>
      <span>{label}</span>
    </button>
  )
}

/**
 * Große Auswahlkarte mit Titel, Erklärtext und optional Preis und Kennzeichen —
 * für den Schritt „Wie soll es weitergehen?". Verhält sich wie ein Radio.
 */
export function WegKarte({
  titel,
  text,
  badge,
  preis,
  aktiv,
  gesperrt,
  onClick,
}: {
  titel: string
  text: string
  badge?: string | null
  preis?: string | null
  aktiv: boolean
  gesperrt?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={aktiv}
      aria-disabled={gesperrt || undefined}
      disabled={gesperrt}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
        aktiv ? KARTE_AN : KARTE_AUS
      } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-ash`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${aktiv ? 'border-brand' : 'border-ash'}`}
      >
        {aktiv && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-bold text-dark">{titel}</span>
          {preis && <span className="font-bold text-brand">{preis}</span>}
          {badge && (
            <span className="rounded-md bg-dark px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-mid">{text}</span>
      </span>
    </button>
  )
}

/** Raster für Auswahlkarten — eine Spalte mobil, zwei ab sm. */
export function KartenRaster({ children, spalten = 2 }: { children: ReactNode; spalten?: 1 | 2 }) {
  return (
    <div className={`grid gap-3 ${spalten === 2 ? 'sm:grid-cols-2' : ''}`}>{children}</div>
  )
}

// ── Eingabefelder ─────────────────────────────────────────────────────────────

const INPUT_BASIS =
  'w-full min-h-[52px] rounded-xl border-2 bg-white px-4 py-3 text-dark placeholder:text-mid/60 focus:outline-none focus:ring-2 focus:ring-brand/30'

export function Textfeld({
  id,
  label,
  wert,
  onChange,
  fehler,
  pflicht,
  typ = 'text',
  platzhalter,
  autoComplete,
  inputMode,
  maxLength,
  hinweis,
}: {
  id: string
  label: string
  wert: string
  onChange: (v: string) => void
  fehler?: string
  pflicht?: boolean
  typ?: 'text' | 'email' | 'tel'
  platzhalter?: string
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'tel' | 'numeric'
  maxLength?: number
  hinweis?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-dark">
        {label}
        {pflicht && <span className="ml-1 text-brand">*</span>}
      </label>
      <input
        id={id}
        type={typ}
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        placeholder={platzhalter}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={fehler ? true : undefined}
        aria-describedby={fehler ? `${id}-fehler` : undefined}
        className={`${INPUT_BASIS} ${fehler ? 'border-brand' : 'border-ash'}`}
      />
      {hinweis && !fehler && <p className="mt-2 text-sm text-mid">{hinweis}</p>}
      {fehler && (
        <p id={`${id}-fehler`} role="alert" className="mt-2 text-sm font-medium text-brand">
          {fehler}
        </p>
      )}
    </div>
  )
}

export function Textbereich({
  id,
  label,
  wert,
  onChange,
  platzhalter,
  hinweis,
  zeilen = 4,
}: {
  id: string
  label?: string
  wert: string
  onChange: (v: string) => void
  platzhalter?: string
  hinweis?: string
  zeilen?: number
}) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-bold text-dark">
          {label}
        </label>
      )}
      <textarea
        id={id}
        value={wert}
        onChange={(e) => onChange(e.target.value)}
        placeholder={platzhalter}
        rows={zeilen}
        maxLength={2000}
        className={`${INPUT_BASIS} resize-y border-ash`}
      />
      {hinweis && <p className="mt-2 text-sm text-mid">{hinweis}</p>}
    </div>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function NaviLeiste({
  zurueck,
  weiter,
  weiterLabel,
  weiterDeaktiviert,
}: {
  zurueck?: () => void
  weiter: () => void
  weiterLabel: string
  weiterDeaktiviert?: boolean
}) {
  return (
    <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {zurueck ? (
        <button
          type="button"
          onClick={zurueck}
          className="min-h-[48px] rounded-xl px-5 font-bold text-mid transition-colors hover:text-dark"
        >
          Zurück
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={weiter}
        disabled={weiterDeaktiviert}
        className="min-h-[52px] rounded-xl bg-brand px-8 font-bold text-white shadow-sm transition-colors hover:bg-[#c8161e] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {weiterLabel}
      </button>
    </div>
  )
}

/** Farbig hinterlegter Hinweisblock (Gebietsprüfung, Altboden-Hinweis). */
export function Hinweisbox({
  ton,
  titel,
  text,
}: {
  ton: 'gut' | 'neutral' | 'warnung'
  titel?: string
  text: string
}) {
  const stil =
    ton === 'gut'
      ? 'border-success/30 bg-success/10'
      : ton === 'warnung'
        ? 'border-brand/30 bg-brand/5'
        : 'border-ash bg-pale'
  return (
    <div className={`mt-4 rounded-2xl border-2 p-4 ${stil}`}>
      {titel && <p className="font-bold text-dark">{titel}</p>}
      <p className={`text-mid ${titel ? 'mt-1' : ''}`}>{text}</p>
    </div>
  )
}
