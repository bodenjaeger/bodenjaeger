/**
 * Live-Bewertung aus dem öffentlichen Trusted-Shops-Profil (Durchschnitt der
 * letzten 12 Monate). Stündlich aktualisiert. Ohne gültige Antwort wird keine
 * Note angezeigt, damit nie ein veralteter Wert als aktuell erscheint.
 */
const TS_ID = 'XC194F1E7AC0A4EF1D2945E1A065D9618';
const URL = `https://api.trustedshops.com/rest/public/v2/shops/${TS_ID}/quality/reviews.json`;

export interface TrustedShopsRating {
  note: number;
  maximum: 5;
  anzahl: number;
}

export function parseTrustedShopsRating(json: unknown): TrustedShopsRating | null {
  const indicator = (json as {
    response?: { data?: { shop?: { qualityIndicators?: { reviewIndicator?: { overallMark?: unknown; activeReviewCount?: unknown } } } } };
  })?.response?.data?.shop?.qualityIndicators?.reviewIndicator;
  const note = Number(indicator?.overallMark);
  const anzahl = Number(indicator?.activeReviewCount);
  if (!(note > 0 && note <= 5) || !(anzahl > 0)) return null;
  return { note, maximum: 5, anzahl };
}

export async function getTrustedShopsRating(): Promise<TrustedShopsRating | null> {
  try {
    const response = await fetch(URL, { next: { revalidate: 3600 } });
    if (!response.ok) return null;
    return parseTrustedShopsRating(await response.json());
  } catch (error) {
    console.error('Trusted-Shops-Bewertung nicht abrufbar:', error);
    return null;
  }
}
