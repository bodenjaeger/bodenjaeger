'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import {
  MEGA_PANELS,
  VERLEGEN_PFLEGEN,
  finderHref,
  type BodenFinder,
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
import type { Oeffnungsstatus } from '@/lib/oeffnungsstatus'

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

function Fusszeile({ label, href, text, onNavigate }: { label: string; href: string; text: string; onNavigate: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ash px-8 py-3.5 text-[13px]">
      <Link href={href} onClick={onNavigate} className={`inline-flex items-center gap-1.5 text-dark hover:text-brand ${BOLD}`}>
        {label}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
      </Link>
      <span className="text-mid">{text}</span>
    </div>
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

/** Boden-Finder: Auswahl in Schritten, daraus wird die gefilterte Kategorie-Adresse. */
function Finder({ finder, onNavigate }: { finder: BodenFinder; onNavigate: () => void }) {
  const [auswahl, setAuswahl] = useState<Record<string, string[]>>({})

  const umschalten = (schrittId: string, optionId: string) => {
    setAuswahl((alt) => {
      const aktuell = alt[schrittId] ?? []
      const neu = aktuell.includes(optionId) ? aktuell.filter((id) => id !== optionId) : [...aktuell, optionId]
      return { ...alt, [schrittId]: neu }
    })
  }

  const { href, zusammenfassung, hinweis } = useMemo(() => {
    const namen: string[] = []
    const hinweise = new Set<string>()
    for (const schritt of finder.schritte) {
      for (const id of auswahl[schritt.id] ?? []) {
        const option = schritt.optionen.find((o) => o.id === id)
        if (!option) continue
        namen.push(option.label)
        if (option.hinweis) hinweise.add(option.hinweis)
      }
    }
    return {
      href: finderHref(finder, auswahl),
      zusammenfassung: namen.length ? namen.join(' · ') : 'Noch nichts gewählt',
      hinweis: hinweise.size
        ? `Wir zeigen ${[...hinweise].join(' mit ').replace(/ mit nur /g, ' mit ')}.`
        : 'Wähle, was dir wichtig ist – wir setzen die passenden Filter.',
    }
  }, [auswahl, finder])

  return (
    <div className="flex h-full flex-col gap-[18px] rounded-xl bg-pale p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className={`text-xl text-dark ${BOLD}`}>{finder.titel}</span>
        <span className="text-xs text-mid">{finder.unterzeile}</span>
      </div>

      {finder.schritte.map((schritt) => (
        <fieldset key={schritt.id}>
          <legend className={KICKER}>{schritt.titel}</legend>
          <div className="flex flex-wrap gap-2">
            {schritt.optionen.map((option) => {
              const gewaehlt = (auswahl[schritt.id] ?? []).includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={gewaehlt}
                  onClick={() => umschalten(schritt.id, option.id)}
                  className={`inline-flex min-h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] transition-colors ${REGULAR} ${
                    gewaehlt ? 'border-[#d11820] bg-[#d11820] text-white' : 'border-ash bg-white text-dark hover:border-mid'
                  }`}
                >
                  {option.swatch && (
                    <span aria-hidden="true" className="h-3.5 w-3.5 flex-none rounded-full border border-black/15" style={{ background: option.swatch }} />
                  )}
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-auto flex flex-wrap items-center gap-4 border-t border-ash pt-4">
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
          <span className={`text-[13px] text-dark ${BOLD}`}>{zusammenfassung}</span>
          <span className="text-xs text-mid">{hinweis}</span>
        </div>
        <Link
          href={href}
          onClick={onNavigate}
          className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-brand px-5 text-sm text-white transition-colors hover:bg-[#d11820] ${BOLD}`}
        >
          Passende Böden anzeigen
          <ArrowRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function KategoriePanel({ panel, onNavigate }: { panel: MegaPanel } & PanelProps) {
  return (
    <>
      <div className="flex gap-8 p-7">
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
          {panel.teaser.map((teaser) => (
            <TeaserKarte key={teaser.titel} teaser={teaser} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
      <Fusszeile {...panel.fuss} onNavigate={onNavigate} />
    </>
  )
}

const FM = '/fachmarkt-hueckelhoven'

function FachmarktPanel({ onNavigate, status, promoActive }: PanelProps & { status: Oeffnungsstatus | null; promoActive: boolean }) {
  const leistungen = LEISTUNGEN_DROPDOWN.filter((l) => l.href !== `${FM}/service`)
  return (
    <>
      <div className="flex gap-8 p-7">
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
            {status && <p className={`max-w-[170px] text-right text-xs text-dark ${BOLD}`}>{status.text}</p>}
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
      <Fusszeile
        label="Zur Fachmarkt-Seite"
        href={FM}
        text="Was du online bestellst, kannst du auch im Fachmarkt abholen."
        onNavigate={onNavigate}
      />
    </>
  )
}

export default function MegaMenu({
  id,
  onNavigate,
  status,
  promoActive,
}: {
  id: string
  onNavigate: () => void
  status: Oeffnungsstatus | null
  promoActive: boolean
}) {
  if (id === 'fachmarkt') return <FachmarktPanel onNavigate={onNavigate} status={status} promoActive={promoActive} />
  const panel = MEGA_PANELS[id]
  if (!panel) return null
  return <KategoriePanel panel={panel} onNavigate={onNavigate} />
}
