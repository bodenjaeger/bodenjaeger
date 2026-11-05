import { describe, expect, it } from 'vitest';
import { parseTrustedShopsRating } from './trusted-shops';

const antwort = (overallMark: unknown, activeReviewCount: unknown) => ({
  response: { data: { shop: { qualityIndicators: { reviewIndicator: { overallMark, activeReviewCount } } } } },
});

describe('parseTrustedShopsRating', () => {
  it('liest Note und Anzahl', () => {
    expect(parseTrustedShopsRating(antwort(5, 10))).toEqual({ note: 5, maximum: 5 });
  });

  it('liefert ohne gültige Bewertung nichts', () => {
    expect(parseTrustedShopsRating(antwort(0, 0))).toBeNull();
    expect(parseTrustedShopsRating(antwort(5, 0))).toBeNull();
    expect(parseTrustedShopsRating({})).toBeNull();
  });
});
