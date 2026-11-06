import reviewsData from '@/data/google-reviews.json';

/* Google-Bewertungen live über die Google Places API (New), stündlich zwischengespeichert.

   Benötigt in Vercel zwei Umgebungsvariablen:
   - GOOGLE_PLACES_API_KEY  API-Schlüssel mit freigeschalteter „Places API (New)“
   - GOOGLE_PLACE_ID        Place-ID des Fachmarkts (z. B. „ChIJ…“)

   Fehlt eine davon oder antwortet Google nicht, kommen die Texte aus
   data/google-reviews.json – dann ohne Anzahl, weil die dort gespeicherte
   Zahl veraltet. Google liefert pro Abruf höchstens 5 Bewertungstexte. */

export interface GoogleReview {
  author: string;
  rating: number;
  text: string;
}

export interface GoogleReviewSummary {
  rating: number;
  /** null, wenn die Zahl nicht live von Google kommt */
  reviewCount: number | null;
  reviews: GoogleReview[];
  live: boolean;
}

interface PlacesResponse {
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
}

/* Aus der gespeicherten Datei: Beratung, Lieferung deutschlandweit, Musterbox */
const FALLBACK_AUTOREN = ['Ralf Sieke', 'Melanie Kunz', 'Ka Ro'];
const MIN_TEXTLAENGE = 60;

function fallback(): GoogleReviewSummary {
  const data = reviewsData as { business: { rating: number }; reviews: GoogleReview[] };
  return {
    rating: data.business.rating,
    reviewCount: null,
    reviews: FALLBACK_AUTOREN.map((name) => data.reviews.find((r) => r.author === name)).filter(
      (r): r is GoogleReview => Boolean(r)
    ),
    live: false,
  };
}

export async function getGoogleReviews(anzahl = 3): Promise<GoogleReviewSummary> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return fallback();

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=de`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      console.error('Google-Bewertungen nicht abrufbar:', response.status);
      return fallback();
    }
    const json = (await response.json()) as PlacesResponse;
    if (!(json.rating && json.userRatingCount)) return fallback();

    const live: GoogleReview[] = (json.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName?.trim() || 'Google-Nutzer',
        rating: r.rating ?? 0,
        text: (r.originalText?.text || r.text?.text || '').trim(),
      }))
      .filter((r) => r.rating === 5 && r.text.length >= MIN_TEXTLAENGE);

    /* Google liefert nur wenige Texte – fehlende mit gespeicherten echten Bewertungen auffüllen */
    const reviews = [...live, ...fallback().reviews.filter((f) => !live.some((l) => l.author === f.author))].slice(0, anzahl);

    return { rating: json.rating, reviewCount: json.userRatingCount, reviews, live: true };
  } catch (error) {
    console.error('Google-Bewertungen nicht abrufbar:', error);
    return fallback();
  }
}
