/**
 * Öffnungsstatus des Fachmarkts für die Kopfzeile („Jetzt geöffnet · bis 18:30 Uhr“).
 *
 * Grundlage sind die festen Zeiten aus `OEFFNUNGSZEITEN` in
 * `src/content/fachmarkt.ts` (Mo–Fr 9:00–18:30, Sa 9:00–14:00). Sonntage
 * zählen als geschlossen, weil nur an ausgewählten Sonntagen geöffnet ist.
 * Gerechnet wird immer in deutscher Zeit, unabhängig vom Gerät.
 */

type Zeitfenster = [beginn: number, ende: number]

/** Minuten seit Mitternacht je Wochentag (0 = Sonntag). */
const ZEITEN: Record<number, Zeitfenster | null> = {
  0: null,
  1: [540, 1110],
  2: [540, 1110],
  3: [540, 1110],
  4: [540, 1110],
  5: [540, 1110],
  6: [540, 840],
}

const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

export interface Oeffnungsstatus {
  offen: boolean
  /** Ausführlich für Desktop, z. B. „Jetzt geöffnet · bis 18:30 Uhr“ */
  text: string
  /** Kurz für schmale Zeilen, z. B. „Offen bis 18:30“ */
  kurz: string
}

function uhrzeit(minuten: number): string {
  const h = Math.floor(minuten / 60)
  const m = minuten % 60
  return `${h}:${m < 10 ? '0' : ''}${m}`
}

function jetztInBerlin(datum: Date): { tag: number; minuten: number } {
  const teile = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(datum)
  const wert = (typ: string) => teile.find((t) => t.type === typ)?.value ?? ''
  const tag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wert('weekday'))
  return { tag: tag < 0 ? datum.getDay() : tag, minuten: Number(wert('hour')) * 60 + Number(wert('minute')) }
}

export function oeffnungsstatus(datum: Date = new Date()): Oeffnungsstatus {
  const { tag, minuten } = jetztInBerlin(datum)
  const heute = ZEITEN[tag]

  if (heute && minuten >= heute[0] && minuten < heute[1]) {
    return { offen: true, text: `Jetzt geöffnet · bis ${uhrzeit(heute[1])} Uhr`, kurz: `Offen bis ${uhrzeit(heute[1])}` }
  }
  if (heute && minuten < heute[0]) {
    return { offen: false, text: `Öffnet heute um ${uhrzeit(heute[0])} Uhr`, kurz: `Öffnet ${uhrzeit(heute[0])}` }
  }
  for (let i = 1; i <= 7; i++) {
    const naechster = (tag + i) % 7
    const fenster = ZEITEN[naechster]
    if (!fenster) continue
    const wann = i === 1 ? 'morgen' : TAGE[naechster]
    return {
      offen: false,
      text: `Geschlossen · öffnet ${wann} um ${uhrzeit(fenster[0])} Uhr`,
      kurz: `Öffnet ${i === 1 ? 'morgen' : TAGE[naechster].slice(0, 2) + '.'} ${uhrzeit(fenster[0])}`,
    }
  }
  return { offen: false, text: 'Geschlossen', kurz: 'Geschlossen' }
}
