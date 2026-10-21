import type { GA4Item } from './types';

/**
 * OpenAI Measurement Pixel (ChatGPT Ads) — Event-Weiterleitung.
 *
 * Das Script lädt `OpenAIPixel.tsx` erst nach Marketing-Einwilligung. Vorher
 * existiert `window.oaiq` nicht, `measure()` tut dann nichts — Events ohne
 * Einwilligung gehen also nie raus. Doku:
 * https://developers.openai.com/ads/measurement-pixel
 *
 * Beträge erwartet OpenAI als Ganzzahl in der kleinsten Währungseinheit
 * (Cent): 129,99 € → 12999.
 */

export const OPENAI_PIXEL_ID = 'RKDXHXFm5KTf5q2hiQUhBL';

type OaiqFn = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
  interface Window {
    oaiq?: OaiqFn;
  }
}

interface OaiqContent {
  id: string;
  name: string;
  content_type: 'product' | 'page';
  quantity?: number;
  amount?: number;
  currency?: 'EUR';
}

interface OaiqContentsData {
  type: 'contents';
  amount?: number;
  currency?: 'EUR';
  contents?: OaiqContent[];
}

/** Euro → Cent als Ganzzahl. */
export function toMinorUnits(euro: number): number {
  return Math.round(Number(euro) * 100);
}

function toContents(items: GA4Item[]): OaiqContent[] {
  return items.map((item) => ({
    id: item.item_id,
    name: item.item_name,
    content_type: 'product',
    // OpenAI verlangt Ganzzahlen. GA4-Items zählen Pakete/Stück, das passt;
    // falls doch einmal eine Kommazahl ankommt, lieber weglassen als runden.
    ...(Number.isInteger(item.quantity) ? { quantity: item.quantity } : {}),
  }));
}

function measure(
  event: 'page_viewed' | 'contents_viewed' | 'items_added' | 'checkout_started' | 'order_created',
  data: OaiqContentsData,
  options?: { event_id?: string }
): void {
  if (typeof window === 'undefined' || typeof window.oaiq !== 'function') return;
  try {
    if (options) {
      window.oaiq('measure', event, data, options);
    } else {
      window.oaiq('measure', event, data);
    }
  } catch (err) {
    console.warn('[openai-pixel] measure failed:', err);
  }
}

export const openaiPixel = {
  pageViewed(path: string, title: string): void {
    measure('page_viewed', {
      type: 'contents',
      contents: [{ id: path, name: title || path, content_type: 'page' }],
    });
  },

  contentsViewed(item: GA4Item): void {
    measure('contents_viewed', { type: 'contents', contents: toContents([item]) });
  },

  itemsAdded(items: GA4Item[], totalValue: number): void {
    measure('items_added', {
      type: 'contents',
      amount: toMinorUnits(totalValue),
      currency: 'EUR',
      contents: toContents(items),
    });
  },

  checkoutStarted(items: GA4Item[], totalValue: number): void {
    measure('checkout_started', {
      type: 'contents',
      amount: toMinorUnits(totalValue),
      currency: 'EUR',
      contents: toContents(items),
    });
  },

  orderCreated(orderId: number, items: GA4Item[], totalValue: number): void {
    measure(
      'order_created',
      {
        type: 'contents',
        amount: toMinorUnits(totalValue),
        currency: 'EUR',
        contents: toContents(items),
      },
      // Für eine spätere Deduplizierung mit der Conversions API.
      { event_id: `order_${orderId}` }
    );
  },
};
