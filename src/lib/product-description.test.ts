import { describe, expect, it } from 'vitest';
import { buildProductMetaDescription } from './product-description';
import type { StoreApiProduct } from './woocommerce';

const product = (overrides: Partial<StoreApiProduct>): StoreApiProduct =>
  ({
    name: 'Klebe-Vinyl Pulse Grey',
    price: 29.99,
    einheit_short: 'm²',
    show_lieferzeit: true,
    lieferzeit: '3-7 Arbeitstage oder im Markt abholen',
    short_description:
      '<ul><li>2,5 mm stark | Nutzschicht: 0,55 mm | NK 34</li><li>Synchrongeprägte Oberfläche</li><li>100% wasserfest</li></ul>',
    ...overrides,
  }) as StoreApiProduct;

describe('buildProductMetaDescription', () => {
  it('baut Name, Kernpunkte, Preis und Lieferzeit zusammen', () => {
    expect(buildProductMetaDescription(product({}))).toBe(
      'Klebe-Vinyl Pulse Grey: 2,5 mm stark, Nutzschicht: 0,55 mm, NK 34 – ab 29,99 €/m². Lieferzeit 3–7 Arbeitstage. Jetzt bei Bodenjäger kaufen.'
    );
  });

  it('macht Produkte einer Serie mit gleicher Kurzbeschreibung eindeutig', () => {
    const a = buildProductMetaDescription(product({ name: 'Klebe-Vinyl Pulse Grey' }));
    const b = buildProductMetaDescription(product({ name: 'Klebe-Vinyl Fresh Oak Classic' }));
    expect(a).not.toBe(b);
  });

  it('bleibt bei langen Namen unter 155 Zeichen (Kernpunkte/Lieferzeit fallen weg)', () => {
    const text = buildProductMetaDescription(
      product({ name: 'STAUF - XP10 Zementäre Ausgleichmasse 25 kg', einheit_short: 'kg', price: 1.4 })
    );
    expect(text.length).toBeLessThanOrEqual(155);
    expect(text).toContain('ab 1,40 €/kg');
  });

  it('übernimmt eine gepflegte Rank-Math-Description, die zum Produkt passt', () => {
    const custom = 'Entdecke COREtec Meadow - wasserfest, kratzfest und pflegeleicht, mit integrierter Korkdämmung.';
    expect(buildProductMetaDescription(product({ name: 'Rigid-Vinyl COREtec Meadow' }), custom)).toBe(custom);
  });

  it('ignoriert Aufzählungen und Texte eines anderen Produkts', () => {
    const bullets = '• Dampfdicht für sichere Abdichtung der Dampfbremse • Rutschfest fixiert Dämmungen zuverlässig';
    const fremd = 'Entdecke COREtec Alto - wasserfest, kratzfest und pflegeleicht, mit authentischer Holzoptik.';
    const p = product({ name: 'Rigid-Vinyl COREtec Berner' });
    expect(buildProductMetaDescription(p, bullets)).toMatch(/^Rigid-Vinyl COREtec Berner/);
    expect(buildProductMetaDescription(p, fremd)).toMatch(/^Rigid-Vinyl COREtec Berner/);
  });

  it('lässt den Preis weg, wenn keiner da ist', () => {
    expect(buildProductMetaDescription(product({ price: 0, show_lieferzeit: false }))).toBe(
      'Klebe-Vinyl Pulse Grey: 2,5 mm stark, Nutzschicht: 0,55 mm, NK 34, Synchrongeprägte Oberfläche. Jetzt bei Bodenjäger kaufen.'
    );
  });
});
