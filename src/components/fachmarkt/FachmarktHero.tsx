import Image from 'next/image'
import { Check } from 'lucide-react'
import { HERO } from '@/content/fachmarkt'
import CtaButton from '@/components/shared/CtaButton'

/**
 * Sektion 1: Hero. Ein Foto (dezenter Ken-Burns-Zoom), dunkler Verlauf,
 * Headline, CTAs (nur Desktop), 4 schlichte Vorteils-Zeilen.
 * Höhe bewusst reduziert (~70–78vh), damit Hero inkl. CTAs auf 1440×900 und
 * 1920×1080 ohne Scrollen sichtbar ist. Mobile: keine Buttons (StickyBottomBar).
 */
export default function FachmarktHero() {
  return (
    <section className="relative min-h-[70vh] w-full overflow-hidden bg-dark md:min-h-[78vh]">
      <Image
        src={HERO.image}
        alt={HERO.imageAlt}
        fill
        priority
        sizes="100vw"
        className="fm-kenburns object-cover"
      />
      {/* Verlauf links → rechts für Lesbarkeit */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(46,45,50,0.92) 0%, rgba(46,45,50,0.7) 40%, rgba(46,45,50,0.15) 100%)' }}
      />

      <div className="content-container relative flex min-h-[70vh] items-center md:min-h-[78vh]">
        <div className="max-w-2xl py-14 text-white md:py-16">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            {HERO.kicker}
          </p>
          <h1
            className="font-bold leading-[1.08]"
            style={{ fontSize: 'clamp(1.9rem, 6vw, 3.75rem)' }}
          >
            {HERO.headline}
          </h1>
          <p
            className="mt-5 text-white/85"
            style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.375rem)' }}
          >
            {HERO.subline}
          </p>

          {/* CTAs nur ab md — mobil übernimmt die StickyBottomBar */}
          <div className="mt-8 hidden flex-wrap gap-4 md:flex">
            {HERO.ctas.map((cta) => (
              <CtaButton key={cta.label} cta={cta} size="lg" />
            ))}
          </div>

          {/* Schlichte Zeilen, keine Karten-Optik */}
          <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 md:mt-10">
            {HERO.checks.map((check) => (
              <li key={check} className="flex items-center gap-3 text-white/90">
                <Check className="h-5 w-5 flex-shrink-0 text-brand" strokeWidth={3} />
                <span className="text-base font-medium md:text-lg">{check}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
