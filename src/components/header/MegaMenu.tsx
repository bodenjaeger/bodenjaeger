'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bath, Building2, Check, CookingPot, Droplets, Layers, Sofa, type LucideIcon } from 'lucide-react'
import { filterSlug } from '@/lib/category-filters'
import {
  MEGA_PANELS,
  VERLEGEN_PFLEGEN,
  finderFilter,
  finderHref,
  type BodenFinder,
  type FinderIcon,
  type FinderSchritt,
  type MegaChip,
  type MegaPanel,
  type Teaser,
} from '@/content/megaMenu'
import {
  LEISTUNGEN_DROPDOWN,
  MAPS_ROUTE_URL,
  OEFFNUNGSZEITEN,
  STANDORT,
  TEAM,
} from '@/content/fachmarkt'
import SchliessenButton from '@/components/shared/SchliessenButton'

/**
 * Inhalte der Mega-Menüs im Desktop-Header (HeaderNav.tsx).
 *
 * Aufbau jedes Panels: links Kategorien als Karten oder Links, in der Mitte
 * Boden-Finder bzw. Schnellfilter (Chips), rechts zwei Teaser (ab xl),
 * unten eine Fußzeile mit Link auf die ganze Kategorie.
 *
 * Gestaltung nach CLAUDE.md: Panel und Karten rounded-xl, Buttons rounded-lg,
 * Chips rounded-full, ausgewählte Chips bg-[#d11820], nur Poppins Regular/Bold.
 */

const BOLD = 'font-[family-name:var(--font-poppins-bold)]'
const REGULAR = 'font-[family-name:var(--font-poppins-regular)] font-normal'
const KICKER = `mb-3 text-[11px] ${BOLD} uppercase tracking-[0.12em] text-mid`

interface PanelProps {
  onNavigate: () => void
}

function Chip({ chip, onNavigate }: { chip: MegaChip; onNavigate: () => void }) {
  return (
    <Link
      href={chip.href}
      onClick={onNavigate}
      className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full border border-ash bg-white px-3.5 text-[13px] text-dark transition-colors hover:border-mid"
    >
      {chip.swatch && (
        <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full border border-black/15" style={{ background: chip.swatch }} />
      )}
      {chip.label}
    </Link>
  )
}

function TeaserKarte({ teaser, onNavigate }: { teaser: Teaser; onNavigate: () => void }) {
  return (
    <Link
      href={teaser.href}
      onClick={onNavigate}
      className={`group flex flex-col gap-1.5 rounded-xl p-[18px] transition-colors ${
        teaser.dunkel ? 'bg-dark text-white hover:bg-mid' : 'bg-pale text-dark hover:bg-ash'
      }`}
    >
      <span className={`text-[15px] ${BOLD}`}>{teaser.titel}</span>
      <span className={`text-xs leading-relaxed ${teaser.dunkel ? 'text-white/80' : 'text-mid'}`}>{teaser.text}</span>
      <span className={`mt-1 inline-flex items-center gap-1.5 text-[13px] ${BOLD}`}>
        {teaser.linkLabel}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} aria-hidden="true" />
      </span>
    </Link>
  )
}

function ListenLink({ label, href, text, onNavigate }: { label: string; href: string; text?: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="-mx-3 flex flex-col gap-0.5 rounded-lg px-3 py-2 text-dark transition-colors hover:bg-pale">
      <span className={`text-sm ${BOLD}`}>{label}</span>
      {text && <span className="text-xs text-mid">{text}</span>}
    </Link>
  )
}

type FilterIndex = Array<Record<string, string[]>>

/** Filterdaten je Kategorie nur einmal pro Besuch laden. */
const indexCache = new Map<string, Promise<FilterIndex | null>>()

function ladeIndex(kategorie: string): Promise<FilterIndex | null> {
  let laden = indexCache.get(kategorie)
  if (!laden) {
    laden = fetch(`/api/menu-filter?kategorie=${kategorie}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { produkte?: FilterIndex } | null) => d?.produkte ?? null)
      .catch(() => null)
    indexCache.set(kategorie, laden)
    // Fehlgeschlagen: beim nächsten Öffnen neu versuchen
    laden.then((ergebnis) => ergebnis === null && indexCache.delete(kategorie))
  }
  return laden
}

function passt(produkt: Record<string, string[]>, filter: Record<string, string[]>): boolean {
  return Object.entries(filter).every(([key, slugs]) => (produkt[key] ?? []).some((wert) => slugs.includes(filterSlug(wert))))
}

const ICONS: Record<FinderIcon, LucideIcon> = {
  wohnen: Sofa,
  kueche: CookingPot,
  bad: Bath,
  buero: Building2,
  klick: Layers,
  klebe: Droplets,
}

function anzahlText(n: number | null): string {
  if (n === null) return ''
  return n === 1 ? '1 Boden' : `${n} Böden`
}

/**
 * Boden-Finder: wenige, eindeutige Fragen. Jede Antwort zeigt vorher, wie viele
 * Böden übrig bleiben; Antworten ohne Treffer sind ausgegraut. Der Button
 * nennt die Trefferzahl und führt auf die gefilterte Kategorie.
 */
function Finder({ finder, onNavigate }: { finder: BodenFinder; onNavigate: () => void }) {
  const [auswahl, setAuswahl] = useState<Record<string, string[]>>({})
  const [index, setIndex] = useState<FilterIndex | null>(null)

  useEffect(() => {
    let aktiv = true
    ladeIndex(finder.kategorie).then((daten) => aktiv && setIndex(daten))
    return () => {
      aktiv = false
    }
  }, [finder.kategorie])

  const zaehlen = useCallback(
    (sel: Record<string, string[]>): number | null =>
      index ? index.filter((produkt) => passt(produkt, finderFilter(finder, sel))).length : null,
    [index, finder]
  )

  const mitOption = (schritt: FinderSchritt, optionId: string): Record<string, string[]> => {
    const aktuell = auswahl[schritt.id] ?? []
    if (aktuell.includes(optionId)) return auswahl
    return { ...auswahl, [schritt.id]: schritt.einzeln ? [optionId] : [...aktuell, optionId] }
  }

  const umschalten = (schritt: FinderSchritt, optionId: string) => {
    setAuswahl((alt) => {
      const aktuell = alt[schritt.id] ?? []
      if (aktuell.includes(optionId)) return { ...alt, [schritt.id]: aktuell.filter((id) => id !== optionId) }
      return { ...alt, [schritt.id]: schritt.einzeln ? [optionId] : [...aktuell, optionId] }
    })
  }

  const gesamt = useMemo(() => zaehlen(auswahl), [zaehlen, auswahl])
  const href = finderHref(finder, auswahl)
  const gewaehltIrgendwas = Object.values(auswahl).some((ids) => ids.length > 0)
  const hinweise = [
    ...new Set(
      finder.schritte.flatMap((schritt) =>
        (auswahl[schritt.id] ?? []).map((id) => schritt.optionen.find((o) => o.id === id)?.hinweis).filter(Boolean)
      )
    ),
  ] as string[]

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl bg-pale p-6">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xl text-dark ${BOLD}`}>{finder.titel}</span>
        {gewaehltIrgendwas && (
          <button
            type="button"
            onClick={() => setAuswahl({})}
            className={`cursor-pointer text-[13px] text-mid underline underline-offset-2 hover:text-dark ${REGULAR}`}
          >
            Zurücksetzen
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {finder.schritte.map((schritt) => {
          const halb = schritt.darstellung === 'kacheln' && schritt.optionen.length <= 2
          return (
            <fieldset key={schritt.id} className={halb ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
              <legend className={KICKER}>{schritt.titel}</legend>

              {schritt.darstellung === 'kacheln' && (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${schritt.optionen.length}, minmax(0, 1fr))` }}>
                  {schritt.optionen.map((option) => {
                    const gewaehlt = (auswahl[schritt.id] ?? []).includes(option.id)
                    const n = zaehlen(mitOption(schritt, option.id))
                    const leer = n === 0 && !gewaehlt
                    const Icon = option.icon ? ICONS[option.icon] : null
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={gewaehlt}
                        disabled={leer}
                        onClick={() => umschalten(schritt, option.id)}
                        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          gewaehlt ? 'border-[#d11820] bg-[#d11820] text-white' : 'border-ash bg-white text-dark hover:border-mid'
                        }`}
                      >
                        {Icon && <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />}
                        <span className="text-[13px] leading-tight">{option.label}</span>
                        <span className={`min-h-4 text-[11px] leading-none ${REGULAR} ${gewaehlt ? 'text-white/85' : 'text-mid'}`}>{anzahlText(n)}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {schritt.darstellung === 'farben' && (
                <div className="flex flex-wrap gap-5">
                  {schritt.optionen.map((option) => {
                    const gewaehlt = (auswahl[schritt.id] ?? []).includes(option.id)
                    const n = zaehlen(mitOption(schritt, option.id))
                    const leer = n === 0 && !gewaehlt
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={gewaehlt}
                        disabled={leer}
                        onClick={() => umschalten(schritt, option.id)}
                        className={`group flex cursor-pointer items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-40 ${REGULAR}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-10 w-10 items-center justify-center rounded-full border border-black/15 transition-shadow ${
                            gewaehlt ? 'ring-2 ring-[#d11820] ring-offset-2 ring-offset-pale' : 'group-hover:ring-2 group-hover:ring-mid/40 group-hover:ring-offset-2 group-hover:ring-offset-pale'
                          }`}
                          style={{ background: option.swatch }}
                        >
                          {gewaehlt && <Check className={`h-5 w-5 ${option.id === 'hell' ? 'text-dark' : 'text-white'}`} strokeWidth={3} />}
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span className={`text-[13px] text-dark ${gewaehlt ? BOLD : ''}`}>{option.label}</span>
                          <span className="text-[11px] text-mid">{anzahlText(n)}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {schritt.darstellung === 'chips' && (
                <div className="flex flex-wrap gap-2">
                  {schritt.optionen.map((option) => {
                    const gewaehlt = (auswahl[schritt.id] ?? []).includes(option.id)
                    const n = zaehlen(mitOption(schritt, option.id))
                    const leer = n === 0 && !gewaehlt
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={gewaehlt}
                        disabled={leer}
                        onClick={() => umschalten(schritt, option.id)}
                        className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${REGULAR} ${
                          gewaehlt ? 'border-[#d11820] bg-[#d11820] text-white' : 'border-ash bg-white text-dark hover:border-mid'
                        }`}
                      >
                        {option.label}
                        {n !== null && <span className={gewaehlt ? 'text-white/80' : 'text-mid'}>{n}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </fieldset>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-2.5">
        {hinweise.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mid">
            {hinweise.map((h) => (
              <span key={h} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2.5} aria-hidden="true" />
                {h}
              </span>
            ))}
          </p>
        )}
        <Link
          href={href}
          onClick={onNavigate}
          aria-disabled={gesamt === 0}
          className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-[15px] text-white transition-colors ${BOLD} ${
            gesamt === 0 ? 'pointer-events-none bg-mid' : 'bg-brand hover:bg-[#d11820]'
          }`}
        >
          {gesamt === null ? 'Passende Böden anzeigen' : gesamt === 0 ? 'Keine Treffer – Auswahl ändern' : `${anzahlText(gesamt)} anzeigen`}
          {gesamt !== 0 && <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />}
        </Link>
      </div>
    </div>
  )
}

function KategoriePanel({ panel, onNavigate }: { panel: MegaPanel } & PanelProps) {
  return (
    <>
      <div className="flex gap-8 px-7 pt-3 pb-7">
        {/* Links: Kategorien */}
        <div className="flex w-[290px] flex-none flex-col gap-2.5">
          <p className={KICKER}>{panel.linksTitel}</p>
          {panel.karten?.map((karte) => (
            <Link
              key={karte.href}
              href={karte.href}
              onClick={onNavigate}
              className="flex flex-col gap-1 rounded-xl border border-ash px-4 py-3.5 text-dark transition-colors hover:border-mid"
            >
              <span className={`text-[15px] ${BOLD}`}>{karte.label}</span>
              {karte.punkte.map((punkt) => (
                <span key={punkt} className="flex items-start gap-1.5 text-xs leading-snug text-mid">
                  <Check className="mt-px h-3.5 w-3.5 flex-none text-brand" strokeWidth={2.5} aria-hidden="true" />
                  {punkt}
                </span>
              ))}
            </Link>
          ))}
          {panel.links?.map((link) => (
            <ListenLink key={link.href} {...link} onNavigate={onNavigate} />
          ))}
          {panel.premium && (
            <div className="relative mt-1 overflow-hidden rounded-xl bg-dark text-white">
              {/* Schichtaufbau aus dem Kategoriebild, oben rechts angeschnitten */}
              <Image
                src={panel.premium.bild}
                alt=""
                width={220}
                height={160}
                className="pointer-events-none absolute -top-8 -right-10 w-[190px] opacity-90"
              />
              <div className="relative flex flex-col gap-3 p-4">
                <Link href={panel.premium.href} onClick={onNavigate} className="group flex flex-col gap-1.5 pr-16">
                  <span className={`text-[11px] uppercase tracking-[0.12em] text-white/70 ${BOLD}`}>{panel.premium.kicker}</span>
                  <span className={`inline-flex items-center gap-1.5 text-[17px] ${BOLD}`}>
                    {panel.premium.titel}
                  </span>
                  {panel.premium.punkte.map((punkt) => (
                    <span key={punkt} className="flex items-start gap-1.5 text-xs leading-snug text-white/85">
                      <Check className="mt-px h-3.5 w-3.5 flex-none text-white" strokeWidth={2.5} aria-hidden="true" />
                      {punkt}
                    </span>
                  ))}
                </Link>
                <Link
                  href={panel.premium.favorit.href}
                  onClick={onNavigate}
                  className="flex h-11 items-center justify-between gap-2 rounded-lg bg-white px-3.5 text-dark transition-colors hover:bg-pale"
                >
                  <span className={`text-sm ${BOLD}`}>{panel.premium.favorit.label}</span>
                  <span className={`rounded-md bg-[#d11820] px-2 py-0.5 text-[11px] text-white ${BOLD}`}>{panel.premium.favorit.hinweis}</span>
                </Link>
                <Link
                  href={panel.premium.weitere.href}
                  onClick={onNavigate}
                  className="inline-flex items-center gap-1 self-start text-xs text-white/80 underline underline-offset-2 hover:text-white"
                >
                  Auch {panel.premium.weitere.label} ansehen
                </Link>
              </div>
            </div>
          )}
          {panel.marken && (
            <div className="mt-1 flex gap-2">
              {panel.marken.map((marke) => (
                <Link
                  key={marke.href}
                  href={marke.href}
                  onClick={onNavigate}
                  className={`flex h-11 flex-1 items-center justify-center rounded-lg border border-ash text-sm text-dark transition-colors hover:border-mid ${BOLD}`}
                >
                  {marke.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mitte: Boden-Finder oder Schnellfilter */}
        <div className="min-w-0 flex-1">
          {panel.finder ? (
            <Finder finder={panel.finder} onNavigate={onNavigate} />
          ) : panel.id === 'verlegen' ? (
            <div>
              <p className={KICKER}>Pflegen &amp; ergänzen</p>
              {VERLEGEN_PFLEGEN.map((link) => (
                <ListenLink key={link.href} {...link} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {panel.gruppen?.map((gruppe) => (
                <div key={gruppe.titel}>
                  <p className={KICKER}>{gruppe.titel}</p>
                  <div className="flex flex-wrap gap-2">
                    {gruppe.chips.map((chip) => (
                      <Chip key={chip.href} chip={chip} onNavigate={onNavigate} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rechts: Teaser */}
        <div className="hidden w-[270px] flex-none flex-col gap-3 xl:flex">
          {/* Neben dem Finder nur ein Teaser, damit das Menü ruhig bleibt */}
          {(panel.finder ? panel.teaser.slice(0, 1) : panel.teaser).map((teaser) => (
            <TeaserKarte key={teaser.titel} teaser={teaser} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </>
  )
}

const FM = '/fachmarkt-hueckelhoven'

function FachmarktPanel({ onNavigate, promoActive }: PanelProps & { promoActive: boolean }) {
  const leistungen = LEISTUNGEN_DROPDOWN.filter((l) => l.href !== `${FM}/service`)
  return (
    <>
      <div className="flex gap-8 px-7 pt-3 pb-7">
        <div className="flex w-[330px] flex-none flex-col gap-3">
          <div className="relative h-[170px] w-full overflow-hidden rounded-xl bg-pale">
            <Image
              src="/images/fachmarkt-hueckelhoven/fachmarkt-hero.webp"
              alt="Bodenjäger Fachmarkt in Hückelhoven"
              fill
              sizes="330px"
              className="object-cover"
            />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[15px] text-dark ${BOLD}`}>{STANDORT.strasse}</p>
              <p className="text-[13px] text-mid">
                {STANDORT.plz} {STANDORT.ort}
              </p>
            </div>
          </div>
          <dl className="grid gap-1 text-xs text-mid">
            {OEFFNUNGSZEITEN.map((z) => (
              <div key={z.tag} className="flex justify-between gap-3">
                <dt>{z.tag}</dt>
                <dd className="text-right tabular-nums">
                  {z.zeit}
                  {'hinweis' in z && z.hinweis ? ` (${z.hinweis})` : ''}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-1 flex gap-2">
            <Link
              href="/kontakt"
              onClick={onNavigate}
              className={`flex h-11 flex-1 items-center justify-center rounded-lg bg-brand text-sm text-white transition-colors hover:bg-[#d11820] ${BOLD}`}
            >
              Beratung vereinbaren
            </Link>
            <a
              href={MAPS_ROUTE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-11 flex-1 items-center justify-center rounded-lg border border-ash text-sm text-dark transition-colors hover:border-mid ${BOLD}`}
            >
              Route planen
            </a>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 gap-8">
          <div>
            <p className={KICKER}>Unsere Leistungen</p>
            {leistungen.map((l) => (
              <ListenLink key={l.href} label={l.label} href={l.href} onNavigate={onNavigate} />
            ))}
          </div>
          <div>
            <p className={KICKER}>Nur im Fachmarkt</p>
            <ListenLink label="Teppichboden" text="Große Auswahl vor Ort" href={`${FM}#bodenkategorien`} onNavigate={onNavigate} />
            <ListenLink label="CV-Böden" text="Von der Rolle, auf Maß" href={`${FM}#bodenkategorien`} onNavigate={onNavigate} />
            <ListenLink
              label="Reste"
              text={promoActive ? 'Black Weeks: zusätzlich 50 %' : 'Zum Sonderpreis vor Ort'}
              href={`${FM}#angebote`}
              onNavigate={onNavigate}
            />

            <p className={`${KICKER} mt-5`}>Fachmarkt entdecken</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Ausstellung', href: `${FM}#ausstellung` },
                { label: 'Bewertungen', href: `${FM}#bewertungen` },
                { label: 'Team', href: `${FM}#team` },
                { label: 'Kontakt', href: `${FM}#kontakt` },
              ].map((chip) => (
                <Chip key={chip.label} chip={chip} onNavigate={onNavigate} />
              ))}
            </div>

            <Link href={`${FM}#team`} onClick={onNavigate} className="mt-5 flex items-center gap-3.5 rounded-xl bg-pale p-3.5 transition-colors hover:bg-ash">
              <span className="flex pl-2.5">
                {TEAM.mitglieder.slice(0, 4).map((m) => (
                  <span key={m.name} className="relative -ml-2.5 h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-ash">
                    <Image src={m.foto} alt={m.name} fill sizes="44px" className="object-cover" />
                  </span>
                ))}
              </span>
              <span className="flex flex-col">
                <span className={`text-sm text-dark ${BOLD}`}>Unser Team berät dich</span>
                <span className="text-xs text-mid">Persönlich, am Telefon oder per WhatsApp</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

const TITEL: Record<string, string> = {
  vinyl: 'Vinyl',
  laminat: 'Laminat',
  parkett: 'Parkett',
  zubehoer: 'Zubehör',
  verlegen: 'Verlegen & Pflegen',
  fachmarkt: 'Fachmarkt Hückelhoven',
}

/**
 * Ein Mega-Menü mit Kopfzeile: Titel, Link auf die ganze Kategorie und das
 * einheitliche X zum Schließen (SchliessenButton), wie in allen Fenstern.
 */
export default function MegaMenu({
  id,
  onNavigate,
  onClose,
  promoActive,
}: {
  id: string
  /** Nach Klick auf einen Link */
  onNavigate: () => void
  /** X oben rechts */
  onClose: () => void
  promoActive: boolean
}) {
  const panel = MEGA_PANELS[id]
  if (id !== 'fachmarkt' && !panel) return null
  const alle = id === 'fachmarkt' ? { label: 'Zur Fachmarkt-Seite', href: '/fachmarkt-hueckelhoven' } : panel.fuss

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-7 pt-5 pb-2">
        <div className="flex min-w-0 items-baseline gap-5">
          <p className={`text-xl text-dark ${BOLD}`}>{TITEL[id]}</p>
          <Link href={alle.href} onClick={onNavigate} className={`inline-flex items-center gap-1.5 text-[13px] text-dark hover:text-brand ${BOLD}`}>
            {alle.label}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </div>
        <SchliessenButton onClick={onClose} label={`Menü ${TITEL[id]} schließen`} />
      </div>
      {id === 'fachmarkt' ? (
        <FachmarktPanel onNavigate={onNavigate} promoActive={promoActive} />
      ) : (
        <KategoriePanel panel={panel} onNavigate={onNavigate} />
      )}
    </>
  )
}
