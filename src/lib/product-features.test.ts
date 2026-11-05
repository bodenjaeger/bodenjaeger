import { describe, expect, it } from 'vitest';
import { extractProductFeatures, formatLieferzeit } from './product-features';

describe('extractProductFeatures', () => {
  it('liest Listen mit Attributen und liefert alle Einträge', () => {
    expect(extractProductFeatures('<ul><li class="a">Eins</li><li><strong>Zwei</strong> &amp; Drei</li></ul>'))
      .toEqual(['Eins', 'Zwei & Drei']);
  });

  it('liest Zeilen und entfernt Aufzählungszeichen', () => {
    expect(extractProductFeatures('• Eins<br />- Zwei\n<p>Drei</p>')).toEqual(['Eins', 'Zwei', 'Drei']);
  });

  it('kommt mit leeren Werten klar', () => {
    expect(extractProductFeatures(null)).toEqual([]);
  });
});

describe('formatLieferzeit', () => {
  it('entfernt den doppelten Abholhinweis', () => {
    expect(formatLieferzeit('3-7 Arbeitstage oder im Markt abholen')).toBe('3-7 Arbeitstage');
    expect(formatLieferzeit(null)).toBe('3-7 Arbeitstage');
  });
});
