/**
 * Kampagnen-Banner „Jedes 7. Paket gratis".
 *
 * Startseite (`HeroSlider`) und Fachmarktseite (`FachmarktHero`) zeigen
 * dasselbe Motiv — Bildpfade, Rotton und Linkziel liegen deshalb nur hier,
 * sonst driften sie beim nächsten Motivwechsel auseinander.
 *
 * WICHTIG: Headline, Text, Enddatum, Kategorie-Badges und der Button sind in
 * die PNGs eingebrannt. Daneben darf also kein HTML-Text gerendert werden, und
 * die Bildfläche selbst muss der Link sein, weil der gemalte Button nicht
 * klickbar ist.
 *
 * Achtung Laufzeit: Die Bilder nennen „Nur bis zum 21.10.2026", die
 * Rabattlogik in `src/lib/promo.ts` hat aber `endsAt: null` (unbefristet).
 * Beim Festlegen des Enddatums beides angleichen.
 */
export const AKTION_BANNER = {
  /** Querformat, 8547×4134 (Verhältnis 2,07) — ab 1200px. */
  imageDesktop: '/images/sliderbilder/Slider Desktop - Jedes 7.png',
  /** Hochformat, 3138×4133 — unterhalb von 1200px. */
  imageMobile: '/images/sliderbilder/Slider Mobil - Jedes 7.png',
  /** Seitenverhältnis des Hochformats als CSS-`aspect-ratio`. */
  mobileAspectRatio: '3138 / 4133',
  /**
   * Tatsächlicher Rotton der PNGs — NICHT das Brand-Rot #ed1b24, das eine
   * Stelle daneben liegt. Als Hintergrund gesetzt bleiben damit die Ränder
   * unsichtbar, die `object-contain` beim Einpassen frei lässt.
   */
  bgColor: '#ed1c24',
  alt:
    'Jedes 7. Paket gratis — Sockelleiste und Dämmung kostenlos bei jedem Bodenkauf, für Laminat, Vinyl und Parkett. Der Rabatt wird automatisch im Warenkorb abgezogen. Nur bis zum 21.10.2026.',
  href: '/sale',
  /** Beschriftung des eingebrannten Buttons, dient als `aria-label` des Links. */
  linkLabel: 'Alle Aktionsböden entdecken',
  /**
   * Lage des eingebrannten Buttons in den PNGs, in Prozent der Bildfläche.
   * Nachgemessen an der weißen Pille: Desktop 2326×321 px (von 8547×4134),
   * Mobil 1360×183 px (von 3138×4133).
   *
   * Wozu: Der gemalte Button skaliert mit dem Bild. Auf Desktop trifft er
   * die Größe der HTML-Buttons noch (51 vs. 48 px hoch), mobil fällt er auf
   * rund 20 px Höhe mit ~8 px Schrift zusammen, während die HTML-Buttons der
   * übrigen Slides 36 px hoch sind. Mit diesen Maßen lässt er sich übermalen
   * und durch einen echten Button ersetzen.
   *
   * `cover` ist ein etwas größeres Rechteck um die Pille, das sonst nur
   * flächiges Rot enthält (nachgemessen) — mit `bgColor` gefüllt verschwindet
   * der gemalte Button darin unsichtbar.
   * `left`/`centerY` sind linke Kante und vertikale Mitte der Pille; daran
   * wird der HTML-Button ausgerichtet, damit er wie im Motiv an der Textkante
   * sitzt.
   *
   * WICHTIG: Beim Motivwechsel neu messen.
   */
  buttonDesktop: {
    cover: { left: 2.5, top: 77, width: 31, height: 12 },
    left: 3.955,
    centerY: 82.959,
  },
  buttonMobile: {
    cover: { left: 3.5, top: 89, width: 47.5, height: 9.5 },
    left: 5.609,
    centerY: 93.842,
  },
} as const
