import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { Check, CheckCircle2, Clock, Phone } from 'lucide-react'
import { STANDORT } from '@/content/fachmarkt'
import { VS_AUFMASS_BEZAHLT, VS_BESTAETIGUNG, VS_ZAHLUNG } from '@/content/verlegeservice-anfrage'
import { formatEuro } from '@/lib/aufmass-kreise'
import {
  AUFMASS_BEZAHLT_PFAD,
  AUFMASS_META,
  aufmassEventId,
  aufmassNachZahlungAbschliessen,
  istAufmassBezahlt,
  ladeAufmassBestellung,
} from '@/lib/aufmass'
import AufmassBezahltTracking from '@/components/verlegeservice/anfrage/AufmassBezahltTracking'
import AufmassNochmalBezahlen from '@/components/verlegeservice/anfrage/AufmassNochmalBezahlen'

/**
 * Rückkehrseite nach Stripe bzw. PayPal für das Aufmaß aus dem
 * Verlegeservice-Formular. Prüft die Zahlung serverseitig, schließt sie einmalig
 * ab (Trello-Liste, Meta) und zeigt je nach Stand Danke, Warten oder einen
 * neuen Zahlungsversuch.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Aufmaß gebucht | Bodenjäger Hückelhoven',
  robots: { index: false, follow: false },
}

type SearchParams = Record<string, string | string[] | undefined>
const erster = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

function Karte({ children }: { children: ReactNode }) {
  return (
    <main className="pb-16">
      <section className="pt-16 md:pt-20">
        <div className="content-container mx-auto max-w-3xl">
          <div className="rounded-3xl border border-ash bg-white p-6 text-center shadow-sm md:p-10">{children}</div>
        </div>
      </section>
    </main>
  )
}

function Telefon() {
  return (
    <a
      href={STANDORT.telefonLink}
      className="mt-6 inline-flex items-center gap-2 font-bold text-mid transition-colors hover:text-dark"
    >
      <Phone className="h-4 w-4" />
      {STANDORT.telefonAnzeige}
    </a>
  )
}

export default async function AufmassBezahltPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams
  const orderId = Number(erster(sp.order))
  const key = erster(sp.key) ?? ''
  const sessionId = erster(sp.session_id)
  const abgebrochen = erster(sp.abgebrochen) === '1'

  const b = await ladeAufmassBestellung(orderId, key)
  if (!b) {
    return (
      <Karte>
        <p className="text-lg text-mid">{VS_AUFMASS_BEZAHLT.nichtGefunden}</p>
        <Telefon />
      </Karte>
    )
  }

  const preis = formatEuro(b.total)
  const bezahlt = await istAufmassBezahlt(b, sessionId)

  if (bezahlt) {
    const h = await headers()
    await aufmassNachZahlungAbschliessen(b, {
      clientIp: h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || undefined,
      userAgent: h.get('user-agent') ?? undefined,
      seitenUrl: `${process.env.NEXT_PUBLIC_SITE_URL}${AUFMASS_BEZAHLT_PFAD}`,
    })
    const test = b.meta[AUFMASS_META.test] === 'yes'

    return (
      <Karte>
        {!test && (
          <AufmassBezahltTracking
            eventId={aufmassEventId(b.id)}
            leadId={b.meta[AUFMASS_META.leadId]}
            wert={b.total}
          />
        )}
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-9 w-9 text-success" />
        </span>
        <h1 className="mt-6 font-bold text-dark" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
          {VS_AUFMASS_BEZAHLT.ueberschrift(b.vorname)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-mid">{VS_AUFMASS_BEZAHLT.text}</p>
        <p className="mx-auto mt-2 max-w-xl text-mid">{VS_AUFMASS_BEZAHLT.gutschrift(preis)}</p>
        <p className="mt-4 text-sm text-mid">
          Bestellnummer: <span className="font-bold text-dark">{b.id}</span> · Vorgangsnummer:{' '}
          <span className="font-bold text-dark">{b.meta[AUFMASS_META.leadId]}</span>
        </p>

        <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left">
          {VS_AUFMASS_BEZAHLT.schritte.map((s) => (
            <li key={s} className="flex items-start gap-3 text-dark">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand">
                <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
              </span>
              {s}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-xl text-sm text-mid">
          {VS_ZAHLUNG.storno}{' '}
          <Link href={VS_ZAHLUNG.agbHref} className="font-bold text-dark underline">
            AGB
          </Link>
        </p>

        <div className="mt-10 flex flex-col items-center gap-2">
          <Link
            href={VS_BESTAETIGUNG.zurueckHref}
            className="flex min-h-[52px] items-center justify-center rounded-xl bg-brand px-8 font-bold text-white transition-colors hover:bg-[#c8161e]"
          >
            {VS_BESTAETIGUNG.zurueck}
          </Link>
          <Telefon />
        </div>
      </Karte>
    )
  }

  // Noch nicht bestätigt, aber auch nicht abgebrochen: Stripe-Webhook oder
  // Klarna brauchen manchmal etwas länger.
  if (!abgebrochen && b.status === 'pending' && sessionId) {
    return (
      <Karte>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pale">
          <Clock className="h-9 w-9 text-mid" />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-dark">{VS_AUFMASS_BEZAHLT.wartetTitel}</h1>
        <p className="mx-auto mt-4 max-w-xl text-mid">{VS_AUFMASS_BEZAHLT.wartetText}</p>
        <a
          href={`${AUFMASS_BEZAHLT_PFAD}?order=${b.id}&key=${encodeURIComponent(b.orderKey)}&session_id=${encodeURIComponent(sessionId)}`}
          className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-xl border border-ash px-8 font-bold text-dark transition-colors hover:border-mid"
        >
          Erneut prüfen
        </a>
        <div>
          <Telefon />
        </div>
      </Karte>
    )
  }

  // Abgebrochen oder fehlgeschlagen: Anfrage liegt vor, Zahlung erneut möglich.
  return (
    <Karte>
      <h1 className="text-2xl font-bold text-dark">{VS_AUFMASS_BEZAHLT.offenTitel}</h1>
      <p className="mx-auto mt-4 max-w-xl text-mid">{VS_AUFMASS_BEZAHLT.offenText}</p>
      <p className="mt-4 text-sm text-mid">
        {b.produktName}: <span className="font-bold text-dark">{preis}</span>
      </p>
      <AufmassNochmalBezahlen orderId={b.id} orderKey={b.orderKey} preis={preis} />
      <Telefon />
    </Karte>
  )
}
