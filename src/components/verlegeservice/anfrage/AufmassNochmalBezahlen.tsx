'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { VS_AUFMASS_BEZAHLT, VS_ZAHLARTEN, VS_ZAHLUNG, type VsZahlartKey } from '@/content/verlegeservice-anfrage'
import { EinzelKarte, Fehler, KartenRaster } from './felder'

/**
 * Zweiter Zahlungsversuch auf der Bezahlt-Seite, z. B. nach Abbruch bei PayPal.
 * Startet die Zahlung für die bestehende Bestellung neu.
 */
export default function AufmassNochmalBezahlen({
  orderId,
  orderKey,
  preis,
}: {
  orderId: number
  orderKey: string
  preis: string
}) {
  const [zahlart, setZahlart] = useState<VsZahlartKey | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string>()

  async function bezahlen() {
    if (!zahlart) {
      setFehler('Bitte wähle eine Zahlungsart.')
      return
    }
    setFehler(undefined)
    setLaeuft(true)
    try {
      const res = await fetch('/api/verlegeservice/aufmass/zahlung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderId, key: orderKey, zahlart }),
      })
      const json = (await res.json()) as { success: boolean; redirectUrl?: string; error?: string }
      if (json.success && json.redirectUrl) {
        window.location.href = json.redirectUrl
        return
      }
      setFehler(json.error ?? 'Die Zahlung konnte nicht gestartet werden.')
    } catch {
      setFehler('Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.')
    }
    setLaeuft(false)
  }

  return (
    <div className="mt-8 text-left">
      <p className="mb-3 font-bold text-dark">{VS_ZAHLUNG.zahlartFrage}</p>
      <KartenRaster spalten={1}>
        {VS_ZAHLARTEN.map((z) => (
          <EinzelKarte key={z.key} label={z.label} aktiv={zahlart === z.key} onClick={() => setZahlart(z.key)} />
        ))}
      </KartenRaster>
      <Fehler text={fehler} />
      <button
        type="button"
        onClick={bezahlen}
        disabled={laeuft}
        className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-brand px-8 text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#c8161e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {laeuft ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {VS_ZAHLUNG.bezahlenLaeuft}
          </>
        ) : (
          `${VS_AUFMASS_BEZAHLT.nochmal} (${preis})`
        )}
      </button>
    </div>
  )
}
