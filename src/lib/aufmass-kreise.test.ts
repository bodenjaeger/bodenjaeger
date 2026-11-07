import { describe, expect, it } from 'vitest'
import { aufmassKreis, formatEuro } from './aufmass-kreise'

describe('aufmassKreis', () => {
  it('ordnet die Entfernung dem richtigen Kreis zu', () => {
    expect(aufmassKreis(0.4)?.sku).toBe('A0001') // Hückelhoven
    expect(aufmassKreis(5)?.sku).toBe('A0001') // Grenze gehört zum inneren Kreis
    expect(aufmassKreis(7.1)?.sku).toBe('A0002') // Erkelenz
    expect(aufmassKreis(10.8)?.sku).toBe('A0003') // Wegberg
    expect(aufmassKreis(17.9)?.sku).toBe('A0004') // Niederkrüchten
    expect(aufmassKreis(21.9)?.sku).toBe('A0005') // Mönchengladbach
    expect(aufmassKreis(50)?.sku).toBe('A0005')
  })

  it('liefert außerhalb des Verlegegebiets keinen Kreis', () => {
    expect(aufmassKreis(50.1)).toBeNull()
    expect(aufmassKreis(-1)).toBeNull()
    expect(aufmassKreis(Number.NaN)).toBeNull()
  })
})

describe('formatEuro', () => {
  it('schreibt ganze und gebrochene Beträge deutsch', () => {
    expect(formatEuro(69)).toBe('69 €')
    expect(formatEuro(69.5)).toBe('69,50 €')
  })
})
