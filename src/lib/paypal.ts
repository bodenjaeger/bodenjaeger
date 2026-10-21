/**
 * PayPal Payment Integration
 *
 * Ruft den WordPress Proxy auf statt PayPal direkt.
 * Credentials (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET) bleiben auf dem WordPress-Server.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

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
// TypeScript Interfaces (unveraendert – identisch zum Original)
// ============================================================================

export interface PayPalAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface CreatePayPalOrderParams {
  orderId: number;
  orderKey: string;
  amount: string; // z.B. "2661.61"
  lineItems: Array<{
    name: string;
    quantity: number;
    unit_amount: string;
  }>;
}

export interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

export interface CapturePayPalOrderResult {
  success: boolean;
  transactionId?: string;
  payerEmail?: string;
  payerName?: string;
  referenceId?: string;
}

// ----- Express Checkout Flow -----

export interface CreatePayPalExpressOrderParams {
  amount: string; // z.B. "2661.61"
  currencyCode?: string; // Default 'EUR'
  lineItems: Array<{
    name: string;
    quantity: number;
    unit_amount: string;
  }>;
  referenceId?: string; // Optional — wird sonst auto-generiert
}

export interface PayPalExpressOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
  referenceId: string;
}

export interface PayPalShippingAddress {
  address_line_1: string;
  address_line_2: string;
  admin_area_1: string;  // Bundesland / State
  admin_area_2: string;  // Stadt
  postal_code: string;
  country_code: string;
}

export interface CapturePayPalExpressOrderResult {
  success: boolean;
  status?: string; // bei success=false
  transactionId?: string;
  paypalOrderId?: string;
  payerEmail?: string;
  payerGivenName?: string;
  payerSurname?: string;
  payerPhone?: string;
  shippingName?: string;
  shippingAddress?: PayPalShippingAddress;
  amount?: {
    value: string;
    currency_code: string;
  };
}

// ============================================================================
// PayPal Order erstellen
// ============================================================================

/**
 * Erstellt eine PayPal Order über den WordPress Proxy.
 *
 * @param params - Order Details (ID, Betrag, Line Items)
 * @returns PayPal Order ID und Approval URL (für Redirect)
 *
 * @example
 * ```typescript
 * const result = await createPayPalOrder({
 *   orderId: 123,
 *   orderKey: 'wc_order_abc123',
 *   amount: '2661.61',
 *   lineItems: [
 *     { name: 'Laminat Premium', quantity: 10, unit_amount: '249.99' },
 *   ],
 * });
 * // Redirect zu: result.approvalUrl
 * ```
 */
export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<PayPalOrderResult> {
  checkProxyConfig();

  const { orderId, orderKey, amount, lineItems } = params;

  try {
    const res = await fetch(`${PROXY_URL}/paypal/create-order`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({
        orderId,
        orderKey,
        amount,
        lineItems,
        returnUrl: `${NEXT_PUBLIC_SITE_URL}/api/checkout/paypal/capture?order=${orderId}`,
        cancelUrl: `${NEXT_PUBLIC_SITE_URL}/checkout?cancelled=true&order=${orderId}`,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error: ${res.status}`);
    }

    if (!data.approvalUrl) {
      throw new Error('PayPal approval URL not found in proxy response');
    }

    return {
      paypalOrderId: data.paypalOrderId,
      approvalUrl: data.approvalUrl,
    };
  } catch (error) {
    console.error('Failed to create PayPal order:', error);
    throw new Error(
      `Failed to create PayPal order: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// PayPal Zahlung erfassen (Capture)
// ============================================================================

/**
 * Erfasst die PayPal Zahlung über den WordPress Proxy.
 *
 * Der Proxy übernimmt zusätzlich die WooCommerce Order-Aktualisierung direkt.
 *
 * @param paypalOrderId - Die PayPal Order ID (Query-Parameter "token" von PayPal)
 * @param wcOrderId - Die WooCommerce Order ID (für den Proxy zur Order-Aktualisierung)
 * @returns Erfolg, Transaction ID, Payer-Daten
 *
 * @example
 * ```typescript
 * // Kunde kommt zurück von PayPal mit ?token=xxx&order=123
 * const result = await capturePayPalOrder(token, orderId);
 *
 * if (result.success) {
 *   // WooCommerce Order wurde bereits vom Proxy auf "processing" gesetzt
 *   redirect('/checkout/success?order=123&paypal=success');
 * }
 * ```
 */
export async function capturePayPalOrder(
  paypalOrderId: string,
  wcOrderId: number
): Promise<CapturePayPalOrderResult> {
  checkProxyConfig();

  try {
    const res = await fetch(`${PROXY_URL}/paypal/capture`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify({
        paypalOrderId,
        wcOrderId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error: ${res.status}`);
    }

    return {
      success:       data.success       ?? false,
      transactionId: data.transactionId,
      payerEmail:    data.payerEmail,
      payerName:     data.payerName,
      referenceId:   data.referenceId,
    };
  } catch (error) {
    console.error('Failed to capture PayPal order:', error);
    throw new Error(
      `Failed to capture PayPal order: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// PayPal Express Order erstellen
// ============================================================================

/**
 * Erstellt eine PayPal Express Order ohne vorab erstellte WooCommerce-Order.
 *
 * Verwendet den bestehenden /paypal/create-order Proxy-Endpoint, aber mit
 * shipping_preference: 'GET_FROM_FILE' — PayPal fragt den Kunden dann nach
 * der Versandadresse. Die WC-Order wird erst nach erfolgreichem Capture
 * (in /api/checkout/paypal/express-capture) erstellt.
 *
 * @param params - amount, lineItems (currencyCode optional, Default 'EUR')
 * @returns paypalOrderId, approvalUrl (Browser-Redirect), referenceId
 */
export async function createPayPalExpressOrder(
  params: CreatePayPalExpressOrderParams
): Promise<PayPalExpressOrderResult> {
  checkProxyConfig();

  const { amount, lineItems } = params;
  const referenceId =
    params.referenceId ??
    `express-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // PayPal v2 Schema: quantity MUSS integer-string sein, items[] MUSS
    // mit amount übereinstimmen. Da unsere Set-Items Float-Quantities haben
    // (z.B. 2.65 m²) und free Items rausgefiltert werden, bündeln wir alles
    // zu einem schema-konformen Composite-Eintrag.
    const transformedLineItems = [{
      name: 'Bodenjäger Bestellung',
      quantity: 1,
      unit_amount: Number(amount).toFixed(2),
    }];

    const requestBody = {
      orderId: referenceId, // Plugin nutzt diesen Wert als reference_id
      orderKey: referenceId,
      amount,
      lineItems: transformedLineItems,
      shipping_preference: 'GET_FROM_FILE', // Express-Flow Marker
      returnUrl: `${NEXT_PUBLIC_SITE_URL}/api/checkout/paypal/express-capture`,
      cancelUrl: `${NEXT_PUBLIC_SITE_URL}/checkout?cancelled=true`,
    };
    console.log('[PayPal Express] Request body:', JSON.stringify(requestBody, null, 2));
    const res = await fetch(`${PROXY_URL}/paypal/create-order`, {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error: ${res.status}`);
    }

    if (!data.approvalUrl) {
      throw new Error('PayPal approval URL not found in proxy response');
    }

    return {
      paypalOrderId: data.paypalOrderId,
      approvalUrl: data.approvalUrl,
      referenceId,
    };
  } catch (error) {
    console.error('Failed to create PayPal Express order:', error);
    throw new Error(
      `Failed to create PayPal Express order: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ============================================================================
// PayPal Express Zahlung erfassen (Capture)
// ============================================================================

/**
 * PayPal-Fehlercodes, die eine EINDEUTIGE Ablehnung bedeuten — die Zahlung
 * wurde nicht eingezogen, der Kunde kann es erneut versuchen.
 * Bewusst kurz gehalten: Alles, was hier nicht steht (auch z.B.
 * ORDER_ALREADY_CAPTURED), gilt als „unklar“.
 */
const PAYPAL_DECLINE_CODES = [
  'INSTRUMENT_DECLINED',
  'PAYER_ACTION_REQUIRED',
  'PAYER_CANNOT_PAY',
  'TRANSACTION_REFUSED',
  'ORDER_NOT_APPROVED',
  'PAYEE_BLOCKED_TRANSACTION',
] as const;

/** Capture-Status, die eindeutig „nicht eingezogen“ bedeuten. */
const PAYPAL_FAILED_STATUSES = ['DECLINED', 'FAILED'];

/**
 * Ausgang eines Express-Captures:
 * - `captured`: PayPal hat eingezogen, alle Käuferdaten liegen vor
 * - `declined`: PayPal hat eindeutig abgelehnt — nichts eingezogen
 * - `unknown`:  Timeout, Netzwerkfehler, 5xx, kein JSON oder unbekannte
 *               Antwort. Es KANN eingezogen worden sein (der Proxy zieht bei
 *               PayPal ein, bevor er antwortet) → wie „bezahlt“ behandeln.
 */
export type CaptureExpressOutcome =
  | { outcome: 'captured'; data: CapturePayPalExpressOrderResult }
  | { outcome: 'declined'; reason: string }
  | { outcome: 'unknown'; reason: string };

function findDeclineCode(data: unknown): string | null {
  let text: string;
  try {
    text = JSON.stringify(data) ?? '';
  } catch {
    return null;
  }
  return PAYPAL_DECLINE_CODES.find((code) => text.includes(code)) ?? null;
}

/**
 * Erfasst eine PayPal Express-Zahlung über den WordPress Proxy.
 *
 * Verwendet den NEUEN Endpoint /paypal/express-capture, der die WooCommerce
 * Order NICHT touchiert (existiert zum Capture-Zeitpunkt noch nicht).
 * Liefert alle PayPal-Daten (Email, Name, Adresse) zurück, mit denen die
 * Capture-Route danach die WC-Order erstellt.
 *
 * Wirft nur bei fehlender Konfiguration (dann wurde nichts gesendet). Alle
 * anderen Fehler landen als `declined` oder `unknown` im Ergebnis.
 *
 * @param paypalOrderId - PayPal Order ID (Query-Parameter "token" von PayPal)
 * @param timeoutMs     - eigenes Timeout für den Proxy-Aufruf
 */
export async function capturePayPalExpressOrder(
  paypalOrderId: string,
  timeoutMs: number
): Promise<CaptureExpressOutcome> {
  checkProxyConfig();

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${PROXY_URL}/paypal/express-capture`,
      {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify({ paypalOrderId }),
      },
      timeoutMs
    );
  } catch (error) {
    // Timeout oder Netzwerkfehler: Der Proxy kann bei PayPal schon
    // eingezogen haben, nur seine Antwort kam nicht an.
    return {
      outcome: 'unknown',
      reason: error instanceof Error ? error.message : 'Netzwerkfehler',
    };
  }

  if (res.status >= 500) {
    return { outcome: 'unknown', reason: `Proxy antwortete mit HTTP ${res.status}` };
  }

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    return { outcome: 'unknown', reason: `Proxy-Antwort ist kein JSON (HTTP ${res.status})` };
  }

  if (!res.ok) {
    const code = findDeclineCode(data);
    return code
      ? { outcome: 'declined', reason: code }
      : {
          outcome: 'unknown',
          reason: `Proxy antwortete mit HTTP ${res.status}: ${String(data.error ?? '').slice(0, 200)}`,
        };
  }

  if (!data.success) {
    const status = typeof data.status === 'string' ? data.status : '';
    const code = findDeclineCode(data);
    if (code) return { outcome: 'declined', reason: code };
    if (PAYPAL_FAILED_STATUSES.includes(status)) return { outcome: 'declined', reason: status };
    return { outcome: 'unknown', reason: `Capture nicht bestätigt (Status: ${status || 'unbekannt'})` };
  }

  return {
    outcome: 'captured',
    data: {
      success:         true,
      transactionId:   data.transactionId as string | undefined,
      paypalOrderId:   data.paypalOrderId as string | undefined,
      payerEmail:      data.payerEmail as string | undefined,
      payerGivenName:  data.payerGivenName as string | undefined,
      payerSurname:    data.payerSurname as string | undefined,
      payerPhone:      data.payerPhone as string | undefined,
      shippingName:    data.shippingName as string | undefined,
      shippingAddress: data.shippingAddress as PayPalShippingAddress | undefined,
      amount:          data.amount as CapturePayPalExpressOrderResult['amount'],
    },
  };
}

// ============================================================================
// PayPal Order abrufen (optional, für Debugging)
// ============================================================================

/**
 * Ruft Details einer PayPal Order ab.
 * HINWEIS: Diese Funktion ruft PayPal weiterhin direkt auf (nur für Debugging).
 * Im Produktionsbetrieb wird sie nicht verwendet.
 *
 * @deprecated Nur für Debugging. Credentials sind nicht auf diesem Server.
 */
export async function getPayPalOrder(_paypalOrderId: string): Promise<unknown> {
  throw new Error(
    'getPayPalOrder is not available via the proxy. ' +
    'Use the PayPal Developer Dashboard for debugging.'
  );
}
