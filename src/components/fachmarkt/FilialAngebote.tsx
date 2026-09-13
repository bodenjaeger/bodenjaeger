'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FILIAL_ANGEBOTE } from '@/content/fachmarkt'
import type { FilialBanner } from '@/types/fachmarkt'
import Reveal from '@/components/shared/Reveal'
import { usePrefersReducedMotion } from '@/components/shared/useInView'

interface FilialAngeboteProps {
  banners: FilialBanner[]
}

/**
 * Ein Banner (Format 7:3). Klickbar NUR, wenn ctaUrl gesetzt ist.
 *
 * Bewusst OHNE Text-Overlay: die Aktionsmotive bringen Headline, Preise und
 * Rabatthinweise schon im Bild mit — eingeblendete Schrift hat sie verdeckt.
 * `titel`/`untertitel`/`ctaLabel` bleiben in den Daten (Alt-Text, CMS-Phase 2).
 *
 * Zwei Einpassungen, gesteuert über `banner.hintergrund`:
 *  - gesetzt → `object-contain` auf dieser Farbe. Für Motive mit eingebrannter
 *    Schrift, die nicht beschnitten werden dürfen. Die 7:3-Box bleibt, das
 *    Motiv nimmt also keinen Millimeter mehr Platz ein als ein Foto-Banner;
 *    passt sein Verhältnis nicht exakt, bleiben Ränder in der Motivfarbe.
 *    Kein Hover-Zoom — der würde die eingebrannten Rändern wieder abschneiden.
 *  - nicht gesetzt → `object-cover` wie bisher (Foto, Beschnitt unkritisch).
 */
function Banner({ banner }: { banner: FilialBanner }) {
  const clickable = Boolean(banner.ctaUrl)
  const contain = Boolean(banner.hintergrund)
  const inner = (
    <div
      className="group relative aspect-[7/3] w-full overflow-hidden rounded-3xl"
      style={banner.hintergrund ? { backgroundColor: banner.hintergrund } : undefined}
    >
      <Image
        src={banner.bild}
        alt={banner.bildAlt || banner.titel}
        fill
        sizes="(max-width: 1024px) 100vw, 1200px"
        className={
          contain
            ? 'object-contain'
            : `object-cover${clickable ? ' transition-transform duration-500 group-hover:scale-105' : ''}`
        }
      />
    </div>
  )

  return clickable ? (
    <Link href={banner.ctaUrl!} className="block w-full flex-shrink-0 snap-center">
      {inner}
    </Link>
  ) : (
    // Ohne Link: kein <a>-Wrapper, kein Pointer, kein Hover.
    <div className="w-full flex-shrink-0 snap-center">{inner}</div>
  )
}

/**
 * Sektion "Aktuelle Angebote" als Banner-Slider (CSS scroll-snap, kein
 * zusätzliches Paket). Pfeile + Dots, tastaturbedienbar,
 * `prefers-reduced-motion` respektiert. Fallback: 0 Banner → Sektion aus.
 */
export default function FilialAngebote({ banners }: FilialAngeboteProps) {
  const reduced = usePrefersReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const scrollToIndex = useCallback(
    (i: number) => {
      const el = trackRef.current
      if (!el) return
      const clamped = Math.max(0, Math.min(i, banners.length - 1))
      el.scrollTo({ left: clamped * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
      setActive(clamped)
    },
    [banners.length, reduced],
  )

  const onScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }, [])

  if (!banners || banners.length === 0) return null
  const multiple = banners.length > 1

  return (
    <section id="angebote" className="scroll-mt-24 bg-dark py-28 text-white md:py-40">
      <div className="content-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand">
            {FILIAL_ANGEBOTE.kicker}
          </p>
          <h2 className="font-bold" style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)' }}>
            {FILIAL_ANGEBOTE.headline}
          </h2>
        </Reveal>

        <Reveal className="relative mt-14">
          {/* Slider-Track */}
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: 'none' }}
          >
            {banners.map((b) => (
              <Banner key={b.id} banner={b} />
            ))}
          </div>

          {multiple && (
            <>
              {/* Pfeile (Desktop) */}
              <button
                type="button"
                aria-label="Vorheriges Angebot"
                onClick={() => scrollToIndex(active - 1)}
                className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-dark shadow-lg hover:bg-white md:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Nächstes Angebot"
                onClick={() => scrollToIndex(active + 1)}
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-dark shadow-lg hover:bg-white md:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              {/* Dots */}
              <div className="mt-6 flex justify-center gap-2">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Zu Angebot ${i + 1}`}
                    aria-current={i === active}
                    onClick={() => scrollToIndex(i)}
                    className={`h-2.5 rounded-full transition-all ${i === active ? 'w-6 bg-brand' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
