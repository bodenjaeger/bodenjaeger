/**
 * Stripe Payment Integration
 *
 * Ruft den WordPress Proxy auf statt Stripe direkt.
 * Credentials (STRIPE_SECRET_KEY) bleiben auf dem WordPress-Server.
 *
 * Unterstützt:
 * - Kreditkartenzahlungen (Visa, Mastercard, Amex)
 *   inkl. Apple Pay & Google Pay (Stripe zeigt sie automatisch in der
 *   gehosteten Checkout-Seite, wenn im Stripe-Dashboard aktiviert)
 * - Sofortüberweisung (SOFORT)
 * - Klarna (Rechnung, Sofortüberweisung, Ratenkauf — Auswahl auf Klarna-Seite)
 */

// ============================================================================
// Proxy Configuration
// ============================================================================

const PROXY_URL = process.env.PAYMENT_PROXY_URL; // https://2025.bodenjaeger.de/wp-json/bodenjaeger/v1
const PROXY_KEY = process.env.PAYMENT_PROXY_KEY;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

function checkProxyConfig() {
  if (!PROXY_URL) throw new Error('PAYMENT_PROXY_URL is not configured');
  if (!PROXY_KEY) throw new Error('PAYMENT_PROXY_KEY is not configured');
  if (!NEXT_PUBLIC_SITE_URL) throw new Error('NEXT_PUBLIC_SITE_URL is not configured');
}

function proxyHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Bodenjaeger-Key': PROXY_KEY!,
  };
}

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface CreateCheckoutSessionParams {
  orderId: number;
  orderKey: string;
  lineItems: Array<{
    name: string;
    quantity: number;
    price: number; // in Cent!
  }>;
  customerEmail: string;
  paymentMethod: 'card' | 'sofort' | 'klarna';
  shippingCost?: number;
  /**
   * Abweichende Rückkehr-Adressen (z. B. für das Aufmaß aus dem
   * Verlegeservice-Formular). Ohne Angabe gelten die Checkout-Seiten.
   * `{CHECKOUT_SESSION_ID}` ersetzt Stripe durch die Session-ID.
   */
  successUrl?: string;
  cancelUrl?: string;
}

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

// StripeWebhookResult wird nicht mehr in Next.js verwendet –
// der Webhook geht direkt zu WordPress.
// Das Interface bleibt für eventuelle Importe in anderen Dateien erhalten.
export interface StripeWebhookResult {
  orderId: number;
  status: 'paid' | 'failed';
  sessionId: string;
}

// Vereinfachter Typ für die Session-Antwort vom Proxy
export interface StripeSessionData {
  id: string;
  payment_status: string;
  status: string;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  metadata: Record<string, string>;
  [key: string]: unknown;
}

// ============================================================================
// Stripe Checkout Session erstellen
// ============================================================================

/**
 * Erstellt eine Stripe Checkout Session über den WordPress Proxy.
 *
 * @param params - Line Items, Customer Info, Payment Method
 * @returns Session ID und Redirect URL
 *
 * @example
 * ```typescript
 * const session = await createStripeCheckoutSession({
 *   orderId: 123,
 *   orderKey: 'wc_order_abc123',
 *   lineItems: [
 *     { name: 'Laminat Premium', quantity: 10, price: 24999 }, // 249.99 EUR = 24999 Cent
 *   ],
 *   customerEmail: 'kunde@example.com',
 *   paymentMethod: 'card',
 *   shippingCost: 490,
 * });
 * // Redirect zu: session.url
 * ```
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<StripeCheckoutSession> {
  checkProxyConfig();

  const { orderId, orderKey, lineItems, customerEmail, paymentMethod, shippingCost, successUrl, cancelUrl } = params;

  // Line Items für Stripe formatieren (price_data mit unit_amount in Cent)
  const stripeLineItems = lineItems.map((item) => ({
    price_data: {
      currency: 'eur',
      product_data: { name: item.name },
      unit_amount: item.price, // Stripe erwartet Cent
    },
    quantity: item.quantity,
  }));

  // Versandkosten als eigene Position
  if (shippingCost && shippingCost > 0) {
    stripeLineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Versandkosten' },
        unit_amount: shippingCost,
      },
      quantity: 1,
    });
  }

  try {
    const res = await fetch(`${PROXY_URL}/stripe/create-session`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({
        line_items: stripeLineItems,
        success_url:
          successUrl ??
          `${NEXT_PUBLIC_SITE_URL}/checkout/success?order=${orderId}&key=${orderKey}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl ?? `${NEXT_PUBLIC_SITE_URL}/checkout?cancelled=true&order=${orderId}`,
        metadata: {
          order_id: orderId.toString(), // Feld-Name identisch zum Original
          order_key: orderKey,
          payment_method: paymentMethod,
        },
        customer_email: customerEmail,
        payment_method_types:
          paymentMethod === 'sofort' ? ['sofort'] :
          paymentMethod === 'klarna' ? ['klarna'] :
          ['card'],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error: ${res.status}`);
    }

    if (!data.url) {
      throw new Error('Stripe session URL is missing in proxy response');
    }

    return {
      sessionId: data.sessionId,
      url: data.url,
    };
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    throw new Error(
      `Failed to create Stripe checkout session: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// Stripe Session abrufen (Success-Page)
// ============================================================================

/**
 * Ruft Details einer Stripe Checkout Session über den WordPress Proxy ab.
 *
 * @param sessionId - Die Stripe Session ID
 * @returns Die Stripe Session (payment_status, metadata, etc.)
 *
 * @example
 * ```typescript
 * const session = await getStripeSession('cs_test_xxx');
 * if (session.payment_status === 'paid') {
 *   console.log('Payment successful');
 * }
 * ```
 */
export async function getStripeSession(sessionId: string): Promise<StripeSessionData> {
  checkProxyConfig();

  try {
    const res = await fetch(`${PROXY_URL}/stripe/get-session`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({ session_id: sessionId }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error: ${res.status}`);
    }

    return data as StripeSessionData;
  } catch (error) {
    console.error('Failed to retrieve Stripe session:', error);
    throw new Error(
      `Failed to retrieve Stripe session: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// Webhook Handler
// HINWEIS: handleStripeWebhook wird nicht mehr von Next.js aufgerufen.
// Stripe sendet Webhooks direkt an WordPress:
//   https://2025.bodenjaeger.de/wp-json/bodenjaeger/v1/stripe/webhook
//
// Die Next.js Route src/app/api/checkout/stripe/webhook/route.ts
// kann gelöscht oder auf eine leere 200-Antwort reduziert werden.
// ============================================================================

/**
 * @deprecated Webhook wird jetzt direkt von WordPress verarbeitet.
 * Diese Funktion bleibt nur erhalten falls sie anderswo importiert wird.
 */
export async function handleStripeWebhook(
  _payload: string,
  _signature: string
): Promise<StripeWebhookResult> {
  throw new Error(
    'handleStripeWebhook is no longer used. ' +
    'Stripe webhooks are now handled directly by the WordPress proxy. ' +
    'Update the webhook URL in the Stripe Dashboard to: ' +
    'https://2025.bodenjaeger.de/wp-json/bodenjaeger/v1/stripe/webhook'
  );
}

// ============================================================================
// Hilfsfunktionen (unveraendert)
// ============================================================================

/**
 * Konvertiert Euro in Cent für Stripe
 * @example euroToCents(249.99) // 24999
 */
export function euroToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Konvertiert Cent in Euro für Anzeige
 * @example centsToEuro(24999) // "249.99"
 */
export function centsToEuro(cents: number): string {
  return (cents / 100).toFixed(2);
}
