/**
 * Montagepreise laut Montageliste (Stand 03/2026, Seiten „Aufmaß" bis
 * „Treppenrenovierung"). Das sind die fest angebotenen Preise. Sie werden dem
 * Kunden NICHT einzeln gezeigt — das Formular nennt nur die Gesamtspanne. Die
 * Einzelposten stehen intern auf der Trello-Karte.
 *
 * Reine Funktionen, keine Server-Abhängigkeiten.
 */

export type BodenartKey = 'klick' | 'laminat' | 'klebe' | 'parkett' | 'teppich' | 'cv'
export type AltbodenKey = 'keiner' | 'lose' | 'verklebt' | 'klick' | 'fliesen' | 'holz' | 'unklar'

/** Luftlinie → Fahrweg. Grobe Annahme für Landstraße; Kreise selbst sind Luftlinie wie auf der Karte. */
export const UMWEG_FAKTOR = 1.3
/** Wir verlegen im Umkreis von 50 km Fahrweg. */
export const MAX_FAHRWEG_KM = 50

export const BODENARTEN: Record<
  BodenartKey,
  {
    name: string
    hinweis: string
    /** €/m² für <40 m², <80 m², ≥80 m² — min = lose/schwimmend, max = verklebt */
    min: [number, number, number]
    max: [number, number, number]
    artikel: string
    /** €/Stufe gerade bis gewendelt, null = nach Aufmaß */
    treppe: [number, number] | null
    untergrund: 'schwimmend' | 'verklebt' | 'beides'
    /** Kategorie-Slugs im Shop für die Preisklassen */
    kategorien: string[]
  }
> = {
  klick: { name: 'Klick-Vinyl', hinweis: 'wasserfest, leise', min: [19, 17, 15], max: [19, 17, 15], artikel: 'A0300', treppe: [65, 85], untergrund: 'schwimmend', kategorien: ['rigid-vinyl', 'klick-vinyl'] },
  laminat: { name: 'Laminat', hinweis: 'robust, günstig', min: [19, 17, 15], max: [19, 17, 15], artikel: 'A0200', treppe: [65, 85], untergrund: 'schwimmend', kategorien: ['laminat'] },
  klebe: { name: 'Klebe-Vinyl', hinweis: 'flach, sehr strapazierfähig', min: [25, 23, 21], max: [25, 23, 21], artikel: 'A0100', treppe: [65, 85], untergrund: 'verklebt', kategorien: ['klebe-vinyl'] },
  parkett: { name: 'Parkett', hinweis: 'echtes Holz', min: [30, 30, 30], max: [40, 40, 40], artikel: 'A0400/A0410', treppe: null, untergrund: 'beides', kategorien: ['parkett'] },
  teppich: { name: 'Teppichboden', hinweis: 'warm und weich', min: [13, 11, 9], max: [16, 14, 12], artikel: 'A0500/A0510', treppe: [35, 55], untergrund: 'beides', kategorien: ['teppichboden', 'teppich'] },
  cv: { name: 'CV / PVC', hinweis: 'pflegeleicht, preiswert', min: [15, 13, 11], max: [18, 16, 14], artikel: 'A0600/A0610', treppe: [55, 75], untergrund: 'beides', kategorien: ['cv-belag', 'cv', 'pvc'] },
}

export const ALTBOEDEN: Record<AltbodenKey, { name: string; preis: number | null }> = {
  keiner: { name: 'Nichts – roher Estrich (Neubau)', preis: 0 },
  lose: { name: 'Teppich / PVC lose', preis: 4.9 },
  verklebt: { name: 'Teppich / PVC verklebt', preis: 9.9 },
  klick: { name: 'Laminat / Klick-Vinyl', preis: 8.9 },
  fliesen: { name: 'Fliesen', preis: null },
  holz: { name: 'Parkett / Dielen', preis: null },
  unklar: { name: 'Weiß ich nicht', preis: null },
}

const ENTSORGEN = 7.9
const SOCKEL_ENTFERNEN = 2.9
const SOCKEL_MONTAGE: [number, number] = [6.0, 9.5]
const TUER_KUERZEN = 39
const TREPPE_ALTBELAG = 20
const MINDERMENGE = 120
const ANFAHRT_JE_KM_AB_KREIS4 = 3
/** Fahrweg-Kilometer, ab denen über Kreis 4 je km berechnet wird (20 km Luftlinie × Umweg). */
const FAHRWEG_KREIS4 = 26

export interface Kreis {
  bisKm: number
  name: string
  aufmass: number
  aufmassSku: string
  baustelle: number
}

/** Kreise um den Fachmarkt (Luftlinie, aus der Karte der Montageliste geschätzt). */
export const KREISE: readonly Kreis[] = [
  { bisKm: 5, name: 'Kreis 1', aufmass: 49, aufmassSku: 'A0001', baustelle: 169 },
  { bisKm: 10, name: 'Kreis 2', aufmass: 59, aufmassSku: 'A0002', baustelle: 189 },
  { bisKm: 15, name: 'Kreis 3', aufmass: 69, aufmassSku: 'A0003', baustelle: 209 },
  { bisKm: 20, name: 'Kreis 4', aufmass: 79, aufmassSku: 'A0004', baustelle: 229 },
  { bisKm: Number.POSITIVE_INFINITY, name: 'über Kreis 4', aufmass: 119, aufmassSku: 'A0005', baustelle: 229 },
]

export function kreisFuer(luftlinieKm: number): Kreis {
  return KREISE.find((k) => luftlinieKm <= k.bisKm) ?? KREISE[KREISE.length - 1]
}

export function fahrwegKm(luftlinieKm: number): number {
  return Math.round(luftlinieKm * UMWEG_FAKTOR)
}

export interface PreisEingabe {
  bodenart: BodenartKey
  flaeche: number
  altboden: AltbodenKey
  sockelleisten: boolean
  stufen: number
  tueren: number
  luftlinieKm: number
  /** Bodenpreis €/m² als Spanne (aus Produkt oder Preisklasse); null = Boden nicht enthalten */
  material: [number, number] | null
}

export interface Posten {
  name: string
  min: number
  max: number
}

export interface Preisrahmen {
  /** Gesamtspanne inkl. Boden, gerundet auf 50 € */
  min: number
  max: number
  verlegung: [number, number]
  boden: [number, number] | null
  posten: Posten[]
  /** Was enthalten ist — für den Kunden, ohne Preise */
  enthalten: string[]
  /** Was nicht enthalten ist bzw. beim Aufmaß geklärt wird */
  hinweise: string[]
}

const abrunden = (n: number) => Math.floor(n / 50) * 50
const aufrunden = (n: number) => Math.ceil(n / 50) * 50

export function berechnePreisrahmen(e: PreisEingabe): Preisrahmen {
  const b = BODENARTEN[e.bodenart]
  const m2 = Math.max(1, Math.round(e.flaeche))
  const stufe = m2 < 40 ? 0 : m2 < 80 ? 1 : 2
  const posten: Posten[] = []
  const add = (name: string, min: number, max: number) => posten.push({ name, min, max })
  const enthalten: string[] = []
  const hinweise: string[] = []

  add(`${b.name} verlegen (${m2} m², ${b.artikel})`, b.min[stufe] * m2, b.max[stufe] * m2)
  enthalten.push(`Verlegung von ca. ${m2} m²`)
  if (m2 < 15) add('Mindermenge unter 15 m²', MINDERMENGE, MINDERMENGE)

  const alt = ALTBOEDEN[e.altboden]
  const hatAltboden = e.altboden !== 'keiner'
  if (alt.preis) {
    const p = (alt.preis + ENTSORGEN) * m2
    add(`Altboden entfernen und entsorgen (${alt.name})`, p, p)
    enthalten.push('Alten Boden entfernen und entsorgen')
  } else if (alt.preis === null) {
    hinweise.push(
      e.altboden === 'unklar'
        ? 'Ob und wie der alte Boden entfernt wird, klären wir beim Aufmaß.'
        : `${alt.name} entfernen ist nicht enthalten, das klären wir beim Aufmaß.`,
    )
  }

  // Untergrund: erst vor Ort sichtbar, deshalb als Spanne
  const spachteln3 = m2 < 50 ? 10 : 8
  const spachteln6 = m2 < 50 ? 12 : 10
  if (b.untergrund === 'verklebt') add('Untergrund grundieren und spachteln', (1.8 + spachteln3) * m2, (3.8 + spachteln6) * m2)
  else if (b.untergrund === 'beides') add('Untergrund vorbereiten (falls nötig)', 0, (3.8 + spachteln6) * m2)
  else add('Untergrund vorbereiten (falls nötig)', 0, (3.5 + spachteln3) * m2)
  enthalten.push('Untergrund vorbereiten, falls nötig')

  if (e.sockelleisten) {
    const lfm = m2 // Faustregel des Shops: lfm ≈ m²
    const entfernen = hatAltboden ? SOCKEL_ENTFERNEN * lfm : 0
    add(`Sockelleisten montieren (ca. ${lfm} lfm)`, SOCKEL_MONTAGE[0] * lfm + entfernen, SOCKEL_MONTAGE[1] * lfm + entfernen)
    enthalten.push('Sockelleisten montieren')
    hinweise.push('Die Sockelleisten selbst suchst du dir beim Aufmaß aus.')
  }

  if (e.stufen > 0) {
    if (b.treppe) {
      add(`Treppe (${e.stufen} Stufen)`, b.treppe[0] * e.stufen, (b.treppe[1] + (hatAltboden ? TREPPE_ALTBELAG : 0)) * e.stufen)
      enthalten.push(`Treppe mit ${e.stufen} Stufen`)
    } else {
      hinweise.push('Die Treppe ist nicht enthalten, den Preis nennen wir dir nach dem Aufmaß.')
    }
  }

  if (e.tueren > 0) {
    add(`Türen kürzen (${e.tueren})`, TUER_KUERZEN * e.tueren, TUER_KUERZEN * e.tueren)
    enthalten.push(`${e.tueren} ${e.tueren === 1 ? 'Tür' : 'Türen'} kürzen`)
  }

  const kreis = kreisFuer(e.luftlinieKm)
  let baustelleMax = kreis.baustelle
  if (!Number.isFinite(kreis.bisKm)) {
    baustelleMax += Math.max(0, fahrwegKm(e.luftlinieKm) - FAHRWEG_KREIS4) * ANFAHRT_JE_KM_AB_KREIS4
  }
  add(`Baustellenpauschale (${kreis.name})`, kreis.baustelle, baustelleMax)
  enthalten.push('Anfahrt und Baustelleneinrichtung')

  const vMin = posten.reduce((s, p) => s + p.min, 0)
  const vMax = posten.reduce((s, p) => s + p.max, 0)

  let boden: [number, number] | null = null
  if (e.material) {
    // 5–10 % Verschnitt
    boden = [e.material[0] * m2 * 1.05, e.material[1] * m2 * 1.1]
  } else {
    hinweise.push(`Den Boden suchst du dir bei uns aus, er ist in der Spanne noch nicht enthalten.`)
  }

  hinweise.push('Wie viel am Untergrund zu tun ist, sehen wir erst vor Ort. Dein genaues Angebot bekommst du nach dem Aufmaß.')

  return {
    min: abrunden(vMin + (boden?.[0] ?? 0)),
    max: aufrunden(vMax + (boden?.[1] ?? 0)),
    verlegung: [abrunden(vMin), aufrunden(vMax)],
    boden: boden ? [abrunden(boden[0]), aufrunden(boden[1])] : null,
    posten: posten.map((p) => ({ ...p, min: Math.round(p.min), max: Math.round(p.max) })),
    enthalten,
    hinweise,
  }
}

/** Ordnet ein Shop-Produkt anhand seiner Kategorien einer Bodenart zu. */
export function bodenartAusKategorien(kategorien: Array<{ slug?: string; name?: string }> | undefined): BodenartKey | null {
  const t = (kategorien ?? []).map((k) => `${k.slug ?? ''} ${k.name ?? ''}`.toLowerCase()).join(' ')
  if (/sockel|zubeh|daemm|dämm|kleber|grundier|spachtel|profil|muster/.test(t) && !/vinyl|laminat|parkett|teppich/.test(t)) return null
  if (/klebe/.test(t)) return 'klebe'
  if (/rigid|klick-vinyl|klick vinyl|klickvinyl/.test(t)) return 'klick'
  if (/laminat/.test(t)) return 'laminat'
  if (/parkett/.test(t)) return 'parkett'
  if (/teppich/.test(t)) return 'teppich'
  if (/\bcv\b|pvc/.test(t)) return 'cv'
  if (/vinyl/.test(t)) return 'klick'
  return null
}
