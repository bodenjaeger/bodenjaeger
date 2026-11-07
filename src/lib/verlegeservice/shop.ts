/**
 * Shop-Daten für das Verlegeservice-Formular (nur Server):
 *  - Bodensuche für „schon bei uns ausgesucht" und die Wunschböden beim Aufmaß
 *  - Preisklassen (günstig / mittel / premium) je Bodenart aus den echten
 *    m²-Preisen der Kategorie
 */
import { unstable_cache } from 'next/cache'
import { wooCommerceClient, type StoreApiProduct } from '@/lib/woocommerce'
import { BODENARTEN, bodenartAusKategorien, type BodenartKey } from './montage'

export interface ShopBoden {
  id: number
  name: string
  slug: string
  art: BodenartKey
  /** €/m², null wenn das Produkt nicht in m² verkauft wird */
  preis: number | null
  bild: string | null
}

function istQuadratmeter(p: StoreApiProduct): boolean {
  const e = (p.einheit_short ?? '').toLowerCase()
  return !e || e.includes('m²') || e.includes('m2') || e.includes('qm')
}

function alsBoden(p: StoreApiProduct): ShopBoden | null {
  const art = bodenartAusKategorien(p.categories)
  if (!art) return null
  const preis = Number(p.price)
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    art,
    preis: istQuadratmeter(p) && preis > 0 ? Math.round(preis * 100) / 100 : null,
    bild: p.images?.[0]?.src || null,
  }
}

const suche = unstable_cache(
  async (q: string, art: string): Promise<ShopBoden[]> => {
    const produkte = await wooCommerceClient.getProducts({ search: q, per_page: 40 })
    const boeden = produkte.map(alsBoden).filter((b): b is ShopBoden => b !== null)
    return (art ? boeden.filter((b) => b.art === art) : boeden).slice(0, 12)
  },
  ['verlegeservice-bodensuche'],
  { revalidate: 600 },
)

/** Sucht Böden im Shop. Mit `art` nur Böden dieser Bodenart. */
export async function sucheBoeden(q: string, art?: BodenartKey): Promise<ShopBoden[]> {
  const begriff = q.trim().slice(0, 60)
  if (begriff.length < 2) return []
  return suche(begriff.toLowerCase(), art ?? '')
}

const kategorieBoeden = unstable_cache(
  async (art: BodenartKey): Promise<ShopBoden[]> => {
    const ergebnis: ShopBoden[] = []
    for (const slug of BODENARTEN[art].kategorien) {
      try {
        const produkte = await wooCommerceClient.getProducts({ category: slug, per_page: 100, orderby: 'popularity' })
        for (const p of produkte) {
          const b = alsBoden(p)
          if (b && b.art === art && !ergebnis.some((x) => x.id === b.id)) ergebnis.push(b)
        }
      } catch (e) {
        console.error('[verlegeservice/shop] Kategorie nicht ladbar:', slug, e)
      }
    }
    return ergebnis
  },
  ['verlegeservice-kategorie-boeden'],
  { revalidate: 3600 },
)

/** Beliebteste Böden einer Bodenart (für die Wunschboden-Auswahl ohne Suchbegriff). */
export async function beliebteBoeden(art: BodenartKey, anzahl = 12): Promise<ShopBoden[]> {
  return (await kategorieBoeden(art)).slice(0, anzahl)
}

export type PreisklassenKey = 'guenstig' | 'mittel' | 'premium'
export type Preisklassen = Record<PreisklassenKey, [number, number]>

function quantil(sortiert: number[], q: number): number {
  const pos = (sortiert.length - 1) * q
  const u = Math.floor(pos)
  const o = Math.ceil(pos)
  return sortiert[u] + (sortiert[o] - sortiert[u]) * (pos - u)
}

/**
 * Preisklassen aus den m²-Preisen der Kategorie: unteres, mittleres und oberes
 * Drittel (Ränder bei 10 % und 90 %, damit Ausreißer die Spannen nicht
 * sprengen). `null`, wenn es zu wenige Böden mit m²-Preis gibt.
 */
export async function preisklassen(art: BodenartKey): Promise<Preisklassen | null> {
  const preise = (await kategorieBoeden(art))
    .map((b) => b.preis)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b)
  if (preise.length < 3) return null
  const r = (n: number) => Math.round(n)
  const p10 = quantil(preise, 0.1)
  const p33 = quantil(preise, 1 / 3)
  const p66 = quantil(preise, 2 / 3)
  const p90 = quantil(preise, 0.9)
  return {
    guenstig: [r(p10), r(p33)],
    mittel: [r(p33), r(p66)],
    premium: [r(p66), r(p90)],
  }
}
