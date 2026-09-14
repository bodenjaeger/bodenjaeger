'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AKTION_BANNER } from '@/content/aktion-banner';

interface SlideData {
  id: number;
  bgColor: string;
  image: string;
  imageAlt: string;
  // object-position für das Foto der Split-Slides (object-cover) — gilt auf
  // Desktop UND Mobil. Verschiebt den sichtbaren Ausschnitt vertikal.
  // Kleinerer Y-Wert = zeigt mehr vom oberen Bildrand = Content rutscht optisch nach unten.
  // Der X-Anteil wirkt nur auf Desktop; mobil ist die Breite bestimmend,
  // sodass ausschließlich vertikal beschnitten wird.
  objectPosition?: string;
  // Wenn true: kleinere Schriftgrößen für Überschrift/Text/Datum (z. B. SummerSALE).
  smallText?: boolean;
  // Full-Bleed-Slide: Das Bild IST der komplette Slide — Headline, Text, Datum
  // und Button sind darin eingebrannt. Es wird kein HTML-Text gerendert, sonst
  // stünde alles doppelt da. Die gesamte Slide-Fläche wird zum Link auf
  // `buttonHref`, damit der gemalte Button klickbar ist.
  // Das Bild wird mit `object-contain` eingepasst; da die Bühne (siehe
  // STAGE_ASPECT_*) exakt sein Seitenverhältnis hat, entsteht dabei kein Rand.
  fullBleed?: boolean;
  // Eigenes Hochformat-Bild unterhalb von 1200px (nur bei `fullBleed`).
  mobileImage?: string;
  heading?: string;
  subline?: string;
  bullets?: string[];
  text?: string;
  dateText?: string;
  buttonLabel: string;
  buttonHref: string;
  buttonVariant?: 'light' | 'dark';
}

/* Gemeinsame Bühne für ALLE Slides.

   Vorher hatte jeder Slide seine eigene Größe: der Full-Bleed-Banner wurde in
   einen 800px hohen Kasten hinein-`contain`ed (Desktop) bzw. brachte mobil sein
   Hochformat mit, während die Split-Slides mobil "Foto + Textblock" hoch waren.
   Ergebnis: auf Desktop wirkte der Banner ~18% flacher, mobil sprang die Höhe
   bei jedem Wechsel um mehrere hundert Pixel.

   Deshalb gibt jetzt die Bühne die Größe vor und alle Slides füllen sie. Die
   Verhältnisse sind die des Aktionsbanners aus `AKTION_BANNER` — es ist das
   einzige Motiv, das nicht beschnitten werden darf, weil Headline, Text und
   Button eingebrannt sind. Die Fotos der Split-Slides sind dagegen frei
   skalierbar.

   WICHTIG: Wechselt das Banner-Motiv, müssen diese beiden Werte auf die neuen
   Bildmaße angepasst werden — sonst bekommt es wieder farbige Ränder.
   Als Tailwind-Klassen statt Inline-Style, weil der Wechsel an einem
   Breakpoint hängt. */
const STAGE_ASPECT_DESKTOP = 'min-[1200px]:aspect-[8547/4134]'; // Querformat, ab 1200px
const STAGE_ASPECT_MOBILE = 'aspect-[3138/4133]'; // Hochformat, darunter

const slides: SlideData[] = [
  {
    id: 4,
    // Motiv, Rotton und Linkziel aus der gemeinsamen Quelle — die
    // Fachmarktseite zeigt denselben Banner in ihrem Hero.
    bgColor: AKTION_BANNER.bgColor,
    fullBleed: true,
    image: AKTION_BANNER.imageDesktop,
    mobileImage: AKTION_BANNER.imageMobile,
    imageAlt: AKTION_BANNER.alt,
    buttonLabel: AKTION_BANNER.linkLabel,
    buttonHref: AKTION_BANNER.href,
  },
  {
    id: 1,
    bgColor: '#4c4c4c',
    image: '/images/sliderbilder/primecore.webp',
    imageAlt: 'Primecore',
    objectPosition: 'right 45%',
    heading: 'primeCORE',
    subline: 'Der extrem starke Vinylboden.',
    bullets: [
      '0,7mm Nutzschicht',
      '8mm stark',
      'Korkdämmung integriert',
      'Lebenslange Garantie',
    ],
    buttonLabel: 'Mehr erfahren',
    buttonHref: '/category/primecore',
    buttonVariant: 'light',
  },
  {
    id: 3,
    bgColor: '#00518a',
    image: '/images/sliderbilder/coreTec.webp',
    imageAlt: 'CoreTec',
    objectPosition: 'right 10%',
    heading: 'COREtec',
    text: 'Die Markenwelt der Luxusböden mit lebenslanger Garantie.',
    buttonLabel: 'Mehr erfahren',
    buttonHref: '/category/coretec',
    buttonVariant: 'dark',
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Navigation callbacks - defined before useEffect that uses them
  const goToNextSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const goToPrevSlide = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  // Auto-play functionality
  useEffect(() => {
    if (isPaused || isTransitioning) return;

    const timer = setInterval(() => {
      goToNextSlide();
    }, 5000);

    return () => clearInterval(timer);
  }, [currentSlide, isPaused, isTransitioning, goToNextSlide]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [currentSlide, isTransitioning]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      } else if (e.key === 'ArrowRight') {
        goToNextSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide]);

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextSlide();
    } else if (isRightSwipe) {
      goToPrevSlide();
    }
  };

  return (
    <div className="w-full bg-white overflow-hidden py-[10px]">
      <div className="content-container">
      <div
        className="w-full relative overflow-hidden bg-white rounded-[2%]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="region"
        aria-label="Hero Slider"
        aria-roledescription="carousel"
      >
        {/* Main Slider Container — die Bühne.
            Ihre Höhe kommt aus dem Seitenverhältnis (STAGE_ASPECT_*), nicht aus
            dem Inhalt. Alle Slides liegen absolut gestapelt darin und sind damit
            zwangsläufig exakt gleich groß; beim Wechsel springt nichts.
            `max-h-[85vh]` kappt nur den Tablet-Bereich, wo das Hochformat sonst
            über 1200px hoch würde. Greift die Kappung, bleiben die Slides
            weiterhin gleich hoch — der Banner bekommt dann seitlich Rand in
            seiner eigenen Hintergrundfarbe. */}
        <div className={`relative ${STAGE_ASPECT_MOBILE} max-h-[85vh] ${STAGE_ASPECT_DESKTOP} min-[1200px]:max-h-none`}>
          {slides.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
            <div
              key={slide.id}
              className={`absolute inset-0 ${
                isActive
                  ? 'block min-[1200px]:opacity-100 min-[1200px]:z-10'
                  : 'hidden min-[1200px]:block min-[1200px]:opacity-0 min-[1200px]:z-0'
              } min-[1200px]:transition-opacity min-[1200px]:duration-500`}
              style={{ backgroundColor: slide.bgColor }}
            >
              {slide.fullBleed ? (
                <>
                  {/* Full-Bleed Desktop: Bild füllt die Bühne exakt, weil
                      STAGE_ASPECT_DESKTOP sein Seitenverhältnis hat.
                      `object-contain` bleibt als Schutz: passt das Motiv einmal
                      nicht mehr, wird es eingepasst statt angeschnitten —
                      Headline, Badges und Button sind eingebrannt. */}
                  <a
                    href={slide.buttonHref}
                    aria-label={slide.buttonLabel}
                    className="hidden min-[1200px]:block relative h-full"
                  >
                    <Image
                      src={slide.image}
                      alt={slide.imageAlt}
                      fill
                      className="object-contain"
                      sizes="(min-width: 1400px) 1400px, 100vw"
                      priority={index === 0}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </a>

                  {/* Full-Bleed Mobile/Tablet: Hochformat-Bild füllt die Bühne,
                      deren Verhältnis STAGE_ASPECT_MOBILE vorgibt. Nur wenn die
                      85vh-Kappung greift (Tablet), letterboxt `object-contain`
                      seitlich in der gleichen Rotfläche. */}
                  <a
                    href={slide.buttonHref}
                    aria-label={slide.buttonLabel}
                    className="min-[1200px]:hidden relative block h-full w-full"
                  >
                    <Image
                      src={slide.mobileImage ?? slide.image}
                      alt={slide.imageAlt}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority={index === 0}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </a>
                </>
              ) : (
                <>
              {/* Desktop-Layout: links Text, rechts Bild — füllt die Bühne. */}
              <div className="hidden min-[1200px]:flex h-full">
                <div className="flex-1 min-w-0 flex flex-col justify-center px-16 py-12 text-white">
                  <h2 className={`font-bold mb-6 leading-tight ${
                    slide.smallText
                      ? 'text-3xl min-[1200px]:text-4xl'
                      : 'text-4xl min-[1200px]:text-5xl'
                  }`}>
                    {slide.heading}
                  </h2>
                  {slide.subline && (
                    <p className={`mb-6 ${
                      slide.smallText
                        ? 'text-lg min-[1200px]:text-xl'
                        : 'text-xl min-[1200px]:text-2xl'
                    }`}>
                      {slide.subline}
                    </p>
                  )}
                  {slide.bullets && (
                    <ul className="text-base min-[1200px]:text-lg mb-8 space-y-1.5">
                      {slide.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  )}
                  {slide.text && (
                    <p className={`mb-8 leading-snug ${
                      slide.smallText
                        ? 'text-lg min-[1200px]:text-xl'
                        : 'text-xl min-[1200px]:text-2xl'
                    }`}>
                      {slide.text}
                    </p>
                  )}
                  {slide.dateText && (
                    <p className={`mb-8 ${
                      slide.smallText
                        ? 'text-sm min-[1200px]:text-base'
                        : 'text-base min-[1200px]:text-lg'
                    }`}>
                      {slide.dateText}
                    </p>
                  )}
                  <a
                    href={slide.buttonHref}
                    className={`inline-flex items-center justify-center gap-2 w-fit px-8 py-3 font-semibold rounded-full transition-colors ${
                      slide.buttonVariant === 'dark'
                        ? 'bg-dark text-white hover:bg-black'
                        : 'bg-white text-dark hover:bg-gray-100'
                    }`}
                  >
                    {slide.buttonLabel}
                    <span aria-hidden>›</span>
                  </a>
                </div>
                <div className="w-[58%] min-[1200px]:w-[70%] flex-shrink-0 relative">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: slide.objectPosition ?? 'right center' }}
                    sizes="(min-width: 1200px) 70vw, 58vw"
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              </div>

              {/* Mobile/Tablet-Layout: Bild oben, Text unten — zusammen genau
                  eine Bühnenhöhe.
                  Der Textblock bekommt seine natürliche Höhe, das Bild nimmt
                  per `flex-1 min-h-0` den Rest. So läuft nichts über, egal wie
                  schmal das Gerät ist, und alle Slides bleiben gleich hoch.
                  `object-cover`: das Foto füllt seine Fläche randlos aus. Der
                  Beschnitt liegt vertikal, `objectPosition` steuert ihn — die
                  Y-Werte sind so gewählt, dass Markenlogo und Preis-Badge im
                  Bild sichtbar bleiben (siehe `objectPosition` in den Slides).
                  Schriften und Abstände sind bewusst kompakter als vorher:
                  vorher durfte der Text den Container beliebig hoch schieben,
                  jetzt teilt er sich die feste Höhe mit dem Bild — je weniger
                  er braucht, desto mehr Fläche bleibt dem Foto. */}
              <div className="min-[1200px]:hidden flex h-full flex-col">
                <div className="relative w-full flex-1 min-h-0">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: slide.objectPosition ?? 'center center' }}
                    sizes="100vw"
                    priority={index === 0}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
                {/* Je kürzer dieser Block, desto mehr Fläche bleibt dem Foto
                    darüber — beides teilt sich die feste Bühnenhöhe.
                    Die Abstände sind deshalb so bemessen, dass auch der längste
                    Slide (Subline + 4 Bullets) dem Foto die ~262px lässt, die
                    es bei Handy-Breite für die volle Höhe braucht.
                    pb-8 hält die Dot-Navigation (bottom-4) vom Button frei. */}
                <div className="flex flex-col items-start px-5 pt-4 pb-8 text-white">
                  <h2 className="text-2xl font-bold mb-1.5 leading-tight">
                    {slide.heading}
                  </h2>
                  {slide.subline && (
                    <p className="text-sm mb-1.5">{slide.subline}</p>
                  )}
                  {/* Zweispaltig: vier Bullets untereinander kosteten zwei
                      Zeilen mehr, die dem Foto gefehlt haben.
                      `px-5` und `gap-x-2` statt großzügigerer Werte, damit der
                      längste Eintrag ("Korkdämmung integriert", ~139px bei
                      12px) in eine Spalte passt — bricht er um, ist die
                      gewonnene Zeile wieder weg. */}
                  {slide.bullets && (
                    <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs leading-tight mb-2">
                      {slide.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  )}
                  {slide.text && (
                    <p className="text-sm mb-2 leading-snug">{slide.text}</p>
                  )}
                  {slide.dateText && (
                    <p className="text-xs mb-2">{slide.dateText}</p>
                  )}
                  <a
                    href={slide.buttonHref}
                    className={`inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-full transition-colors ${
                      slide.buttonVariant === 'dark'
                        ? 'bg-dark text-white hover:bg-black'
                        : 'bg-white text-dark hover:bg-gray-100'
                    }`}
                  >
                    {slide.buttonLabel}
                    <span aria-hidden>›</span>
                  </a>
                </div>
              </div>
                </>
              )}
            </div>
            );
          })}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevSlide}
          disabled={isTransitioning}
          className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Previous slide"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <button
          onClick={goToNextSlide}
          disabled={isTransitioning}
          className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Next slide"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Dot Navigation */}
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 md:gap-3">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`h-2.5 md:h-3 rounded-full transition-all duration-300 touch-manipulation ${
                index === currentSlide
                  ? 'bg-white w-6 md:w-8'
                  : 'bg-white/50 hover:bg-white/75 w-2.5 md:w-3'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === currentSlide ? 'true' : 'false'}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
