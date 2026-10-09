'use client'

import { Map as MapIcon } from 'lucide-react'
import { MAPS_ROUTE_URL } from '@/content/fachmarkt'
import { useCookieConsent } from '@/contexts/CookieConsentContext'

interface ConsentGatedMapProps {
  src: string
  title: string
  /** Klassen für iframe und Platzhalter (Größe, Rundung). */
  className?: string
}

/**
 * Google-Maps-Embed für helle Seiten. Lädt externe Google-Inhalte erst nach
 * funktionaler Einwilligung; vorher Platzhalter mit „Karte aktivieren"
 * (öffnet den Consent-Banner) und direktem Google-Maps-Link.
 * Dunkle Variante: siehe AbschlussCta.
 */
export default function ConsentGatedMap({ src, title, className = '' }: ConsentGatedMapProps) {
  const { isAllowed, openBanner } = useCookieConsent()

  if (isAllowed('functional')) {
    return (
      <iframe
        src={src}
        title={title}
        aria-label={title}
        className={`border-0 ${className}`}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 bg-ash/60 p-8 text-center ${className}`}
    >
      <MapIcon className="h-10 w-10 text-mid" />
      <p className="max-w-sm text-sm text-mid">
        Die Google-Maps-Karte wird aus Datenschutzgründen erst nach deiner Einwilligung geladen.
      </p>
      <button
        type="button"
        onClick={openBanner}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand px-6 py-2 font-bold text-white transition-colors hover:bg-[#d11820]"
      >
        Karte aktivieren
      </button>
      <a
        href={MAPS_ROUTE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold text-dark underline hover:text-brand"
      >
        Stattdessen in Google Maps öffnen
      </a>
    </div>
  )
}
