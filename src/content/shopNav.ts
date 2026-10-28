/**
 * Inhalte des Shop-Headers: USP-Leiste, Hauptnavigation, Direktlinks.
 *
 * Einzige Quelle für Header und Mobile-Menü — beide lesen dieselben Daten,
 * damit Desktop-Dropdown und mobiles Akkordeon nicht auseinanderlaufen.
 *
 * Kategorie-Slugs bleiben unverändert (`/category/vinylboden` usw.); im Header
 * werden nur die Labels verkürzt („Vinyl" statt „Vinylboden"). Sockelleisten
 * und Dämmung liegen als eigene Gruppe im Zubehör-Dropdown.
 */

import { PROMO_PATH } from '@/lib/black-weeks'

export type NavIcon = 'package' | 'truck' | 'calendar' | 'gift'

export interface UspItem {
  id: string
  icon: NavIcon
  label: string
}

export interface NavChild {
  id: string
  label: string
  /** Fertiger Pfad. Leer bei Gruppen-Überschriften. */
  href: string
  /** true = nicht klickbare Zwischenüberschrift im Dropdown. */
  isGroupLabel?: boolean
}

export interface NavItem {
  id: string
  label: string
  href: string
  children?: NavChild[]
  /**
   * Beschriftung des ersten Eintrags im mobilen Untermenü, der auf die
   * Kategorieseite selbst führt (ShopMobileMenu.tsx).
   *
   * Wird ausformuliert, weil das kurze Header-Label nicht in jeden Satz passt:
   * „Alle Vinyl anzeigen" wäre falsches Deutsch, „Alle Vinylböden anzeigen"
   * richtig. Fehlt das Feld, steht dort „Alles anzeigen" — grammatisch immer
   * korrekt, nur weniger konkret.
   */
  allLabel?: string
}

/** Anzeigedauer eines USP im mobilen Ticker (UspBar.tsx). Seit dem Wegfall des
 *  Fortschrittsbalkens der einzige Taktgeber — frei änderbar. */
export const USP_INTERVAL_MS = 4000

export const USP_ITEMS: UspItem[] = [
  { id: 'musterbox', icon: 'package', label: 'Gratis Musterbox' },
  { id: 'lieferung', icon: 'truck', label: 'Kostenfreie Lieferung ab 999€' },
  { id: 'einlagerung', icon: 'calendar', label: '12 Monate kostenfrei Einlagerung' },
  { id: 'set', icon: 'gift', label: 'Dämmung & Sockelleiste kostenlos im Set' },
]

export const SHOP_NAV: NavItem[] = [
  {
    id: 'vinyl',
    label: 'Vinyl',
    href: '/category/vinylboden',
    allLabel: 'Alle Vinylböden anzeigen',
    children: [
      { id: 'klebe-vinyl', label: 'Klebe-Vinyl', href: '/category/klebe-vinyl' },
      { id: 'rigid-vinyl', label: 'Rigid-Vinyl', href: '/category/rigid-vinyl' },
      { id: 'vinyl-marken', label: 'Marken', href: '', isGroupLabel: true },
      { id: 'coretec', label: 'COREtec', href: '/category/coretec' },
      { id: 'primecore', label: 'primeCORE', href: '/category/primecore' },
    ],
  },
  {
    id: 'parkett',
    label: 'Parkett',
    href: '/category/parkett',
  },
  {
    id: 'laminat',
    label: 'Laminat',
    href: '/category/laminat',
    allLabel: 'Alle Laminatböden anzeigen',
    children: [
      { id: 'laminat-marken', label: 'Marken', href: '', isGroupLabel: true },
      { id: 'orca', label: 'O.R.C.A.', href: '/category/o-r-c-a' },
    ],
  },
  {
    id: 'zubehoer',
    label: 'Zubehör',
    href: '/category/zubehoer',
    allLabel: 'Alle Zubehörartikel anzeigen',
    children: [
      { id: 'zubehoer-set', label: 'Fürs Set', href: '', isGroupLabel: true },
      { id: 'sockelleisten', label: 'Sockelleisten', href: '/category/sockelleisten' },
      { id: 'daemmung', label: 'Dämmung', href: '/category/daemmung' },
      { id: 'zubehoer-rest', label: 'Verlegen & Pflegen', href: '', isGroupLabel: true },
      {
        id: 'untergrundvorbereitung',
        label: 'Untergrundvorbereitung',
        href: '/category/untergrundvorbereitung',
      },
      { id: 'werkzeug', label: 'Werkzeug', href: '/category/werkzeug' },
      { id: 'kleber', label: 'Kleber', href: '/category/kleber' },
      {
        id: 'montagekleber-silikon',
        label: 'Montagekleber & Silikon',
        href: '/category/montagekleber-silikon',
      },
      { id: 'reinigung-pflege', label: 'Reinigung & Pflege', href: '/category/reinigung-pflege' },
      {
        id: 'zubehoer-fuer-sockelleisten',
        label: 'Zubehör für Sockelleisten',
        href: '/category/zubehoer-fuer-sockelleisten',
      },
    ],
  },
  {
    id: 'angebote',
    label: 'Angebote',
    href: '/sale',
  },
]

/**
 * Linkziel eines Hauptpunkts. Während der Black Weeks führt „Angebote“ auf
 * die Aktionsseite statt auf /sale; ob die Aktion läuft, entscheidet der
 * Server (`isPromoActive()` in layout.tsx → Header).
 */
export function getNavHref(item: NavItem, promoActive: boolean): string {
  return promoActive && item.id === 'angebote' ? PROMO_PATH : item.href
}

/** Fetter weißer Textlink in Nav-Zeile und Mobile-Menü (vorher rot). */
export const MUSTER_LINK = {
  label: 'Kostenlose Bodenmuster bestellen',
  href: '/category/musterbox',
} as const

/** Outline-Button rechts in der Nav-Zeile bzw. Block im Mobile-Menü. */
export const FACHMARKT_LINK = {
  label: 'Zum Fachmarkt Hückelhoven',
  title: 'Fachmarkt Hückelhoven',
  subline: 'Ausstellung, Beratung & Verlegeservice',
  linkLabel: 'Zum Fachmarkt',
  href: '/fachmarkt-hueckelhoven',
} as const

export const SEARCH_PLACEHOLDER = 'Suche'
