import { describe, expect, it } from 'vitest';
import { parseProductSpecs, pickHighlightSpecs } from './product-specs';

describe('parseProductSpecs', () => {
  it('liest zweispaltige Zeilen', () => {
    expect(parseProductSpecs('<table><tr><th>Nutzschicht:</th><td class="x"><strong>0,55</strong>&nbsp;mm</td></tr><tr><td>Leer</td><td></td></tr></table>'))
      .toEqual([{ label: 'Nutzschicht', value: '0,55 mm' }]);
  });

  it('liefert ohne Tabelle nichts', () => {
    expect(parseProductSpecs('<p>Text</p>')).toEqual([]);
    expect(parseProductSpecs(null)).toEqual([]);
  });
});

describe('pickHighlightSpecs', () => {
  it('wählt höchstens vier wichtige Werte', () => {
    const labels = ['Farbe', 'Wasserfest', 'Fußbodenheizung', 'Dielenmaß', 'Gesamtstärke', 'Nutzungsklasse', 'Nutzschicht'];
    const specs = labels.map((label) => ({ label, value: 'x' }));
    expect(pickHighlightSpecs(specs).map((s) => s.label)).toEqual(['Nutzschicht', 'Nutzungsklasse', 'Gesamtstärke', 'Dielenmaß']);
  });

  it('lässt lange Werte aus den Kacheln', () => {
    expect(pickHighlightSpecs([{ label: 'Fußbodenheizung', value: 'Ja, Warmwasserfußbodenheizung' }])).toEqual([]);
  });
});
