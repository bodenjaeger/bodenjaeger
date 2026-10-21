/**
 * WooCommerce Checkout API Integration - REST API v3
 *
 * Kommuniziert mit der WooCommerce REST API v3 für Order-Management
 * Alle API-Calls verwenden Basic Auth mit Consumer Key + Secret
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface WooCommerceOrderLineItem {
  product_id: number;
  quantity: number;
  subtotal?: string;
  total?: string;
  name?: string;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooCommerceAddress {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state?: string;
  postcode: string;
  country: string;  // "DE" für Deutschland
  email?: string;   // nur bei billing
  phone?: string;   // nur bei billing
}

export interface WooCommerceOrderData {
  customer_id?: number;             // WooCommerce Kunden-ID (falls eingeloggt)
  payment_method: string;           // "bacs" (Vorkasse), "paypal", "stripe"
  payment_method_title: string;     // "Vorkasse", "PayPal", etc.
  set_paid: boolean;                // false für Vorkasse, true nach Payment
  status?: string;                  // "pending", "processing", "on-hold", etc.
  billing: WooCommerceAddress & { email: string; phone: string };
  shipping: WooCommerceAddress;
  line_items: WooCommerceOrderLineItem[];
  shipping_lines?: Array<{
    method_id: string;
    method_title: string;
    total: string;
  }>;
  coupon_lines?: Array<{
    code: string;
  }>;
  /**
   * Zusatzposten. Wird für den Rabatt aus zeitgesteuerten Aktionen mit
   * NEGATIVEM `total` genutzt (z.B. „Jedes 7. Paket gratis"), wenn der Rabatt
   * nicht direkt in den Line-Item-Totals steckt — aktuell nur im
   * PayPal-Express-Pfad. Beträge sind wie überall in dieser Datei NETTO.
   */
  fee_lines?: Array<{
    name: string;
    total: string;
    tax_status?: 'taxable' | 'none';
  }>;
  customer_note?: string;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooCommerceOrder {
  id: number;
  order_key: string;
  status: string;
  total: string;
  currency: string;
  date_created: string;
  payment_url?: string;
  payment_method?: string;        // interne Methode: "stripe", "stripe_sofort", "paypal", "bacs", ...
  payment_method_title?: string;  // Anzeige-Titel der Zahlart
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    total: string;
  }>;
  billing: WooCommerceAddress & { email: string; phone: string };
  shipping: WooCommerceAddress;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface WCCoupon {
  id: number;
  code: string;                                              // gespeichert in lowercase
  amount: string;                                            // numeric string, z.B. "10.00"
  status: string;                                            // 'publish' | 'draft' | 'pending' | ...
  discount_type: 'percent' | 'fixed_cart' | 'fixed_product';
  description: string;
  date_expires: string | null;                               // ISO datetime in Site-Lokalzeit
  date_expires_gmt: string | null;                           // ISO datetime in GMT (ohne Z-Suffix)
  usage_count: number;
  individual_use: boolean;
  product_ids: number[];
  excluded_product_ids: number[];
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  limit_usage_to_x_items: number | null;
  free_shipping: boolean;
  product_categories: number[];
  excluded_product_categories: number[];
  exclude_sale_items: boolean;
  minimum_amount: string;                                    // numeric string, "0.00" = keine Schwelle
  maximum_amount: string;                                    // numeric string, "0.00" = keine Schwelle
  email_restrictions: string[];
  used_by: string[];
}

// ============================================================================
// API Configuration
// ============================================================================

const WC_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

if (!WC_BASE_URL) {
  throw new Error('NEXT_PUBLIC_WORDPRESS_URL is not defined');
}

if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
  throw new Error('WooCommerce API credentials are not configured');
}

/**
 * Generiert die Authorization Header für WooCommerce REST API
 */
function getWCAuthHeaders(): HeadersInit {
  const credentials = Buffer.from(
    `${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`
  ).toString('base64');

  return {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`,
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Erstellt eine neue WooCommerce Order
 *
 * @param orderData - Die Order-Daten (Billing, Shipping, Line Items, etc.)
 * @returns Die erstellte Order mit ID und Order Key
 *
 * @example
 * ```typescript
 * const order = await createWooCommerceOrder({
 *   payment_method: 'bacs',
 *   payment_method_title: 'Vorkasse',
 *   set_paid: false,
 *   billing: { ... },
 *   shipping: { ... },
 *   line_items: [{ product_id: 123, quantity: 1 }]
 * });
 * console.log(`Order created: ${order.id}`);
 * ```
 */
export async function createWooCommerceOrder(
  orderData: WooCommerceOrderData,
  options: { timeoutMs?: number } = {}
): Promise<WooCommerceOrder> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3/orders`;

  try {
    const init: RequestInit = {
      method: 'POST',
      headers: getWCAuthHeaders(),
      body: JSON.stringify(orderData),
    };
    // Ohne timeoutMs wie bisher ohne eigenes Timeout (normaler Checkout).
    const response = options.timeoutMs
      ? await fetchWithTimeout(url, init, options.timeoutMs)
      : await fetch(url, init);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WooCommerce API Error:', errorData);
      throw new Error(
        `Order creation failed: ${response.status} ${response.statusText}`
      );
    }

    const order: WooCommerceOrder = await response.json();
    return order;
  } catch (error) {
    console.error('Failed to create WooCommerce order:', error);
    throw error;
  }
}

/**
 * Ruft den Status einer Order ab
 *
 * @param orderId - Die WooCommerce Order ID
 * @returns Die vollständige Order mit aktuellem Status
 *
 * @example
 * ```typescript
 * const order = await getOrderStatus(123);
 * console.log(`Order status: ${order.status}`);
 * ```
 */
export async function getOrderStatus(
  orderId: number
): Promise<WooCommerceOrder> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3/orders/${orderId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getWCAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch order: ${response.status} ${response.statusText}`
      );
    }

    const order: WooCommerceOrder = await response.json();
    return order;
  } catch (error) {
    console.error(`Failed to get order status for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Ruft eine Order ab und verifiziert sie mit der E-Mail-Adresse
 *
 * WICHTIG: Diese Funktion dient der Sicherheit, damit Kunden nur ihre eigenen
 * Orders abrufen können (per Order ID + E-Mail Kombination)
 *
 * @param orderId - Die WooCommerce Order ID
 * @param email - Die Billing E-Mail Adresse der Order
 * @returns Die Order falls verifiziert, sonst null
 *
 * @example
 * ```typescript
 * const order = await getOrderByIdAndEmail(123, 'kunde@example.com');
 * if (order) {
 *   console.log('Order verified and found');
 * } else {
 *   console.log('Order not found or email mismatch');
 * }
 * ```
 */
export async function getOrderByIdAndEmail(
  orderId: number,
  email: string
): Promise<WooCommerceOrder | null> {
  try {
    const order = await getOrderStatus(orderId);

    // E-Mail Verifizierung (Case-Insensitive)
    const orderEmail = order.billing.email?.toLowerCase();
    const inputEmail = email.toLowerCase();

    if (orderEmail !== inputEmail) {
      console.warn(`Email mismatch for order ${orderId}`);
      return null;
    }

    return order;
  } catch (error) {
    console.error('Failed to get order by ID and email:', error);
    return null;
  }
}

/**
 * Aktualisiert den Status einer Order
 *
 * Wird z.B. von Payment Webhooks verwendet, um nach erfolgreicher Zahlung
 * den Status von "pending" auf "processing" zu setzen
 *
 * @param orderId - Die WooCommerce Order ID
 * @param status - Der neue Order-Status
 * @returns Die aktualisierte Order
 *
 * @example
 * ```typescript
 * // Nach erfolgreicher Stripe-Zahlung:
 * await updateOrderStatus(123, 'processing');
 *
 * // Bei Vorkasse:
 * await updateOrderStatus(123, 'on-hold');
 * ```
 */
export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus
): Promise<WooCommerceOrder> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3/orders/${orderId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: getWCAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WooCommerce API Error:', errorData);
      throw new Error(
        `Failed to update order status: ${response.status} ${response.statusText}`
      );
    }

    const order: WooCommerceOrder = await response.json();
    return order;
  } catch (error) {
    console.error(`Failed to update order ${orderId} status:`, error);
    throw error;
  }
}

/**
 * Fügt eine Notiz zu einer Order hinzu
 *
 * Nützlich für:
 * - Payment Gateway Transaktions-IDs
 * - Interne Notizen
 * - Kundenhinweise
 *
 * @param orderId - Die WooCommerce Order ID
 * @param note - Der Notiz-Text
 * @param customerNote - Falls true, ist die Notiz für Kunde sichtbar (default: false)
 *
 * @example
 * ```typescript
 * // Interne Notiz (nur für Admin):
 * await addOrderNote(123, 'PayPal Transaction ID: ABC123');
 *
 * // Kundennotiz (sichtbar in E-Mail):
 * await addOrderNote(123, 'Lieferung erfolgt in 3-5 Werktagen', true);
 * ```
 */
export async function addOrderNote(
  orderId: number,
  note: string,
  customerNote: boolean = false,
  options: { timeoutMs?: number } = {}
): Promise<void> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3/orders/${orderId}/notes`;

  try {
    const init: RequestInit = {
      method: 'POST',
      headers: getWCAuthHeaders(),
      body: JSON.stringify({
        note,
        customer_note: customerNote,
      }),
    };
    const response = options.timeoutMs
      ? await fetchWithTimeout(url, init, options.timeoutMs)
      : await fetch(url, init);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WooCommerce API Error:', errorData);
      throw new Error(
        `Failed to add order note: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error(`Failed to add note to order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Lädt einen WooCommerce-Coupon anhand seines Codes.
 *
 * WooCommerce speichert Codes case-insensitiv (intern lowercase). Der Filter
 * `?code=` matched daher auch bei abweichender Schreibweise.
 *
 * @returns Den Coupon oder `null`, wenn kein Coupon mit diesem Code existiert.
 *          Wirft bei Netz-/Auth-Fehlern.
 */
export async function getCouponByCode(code: string): Promise<WCCoupon | null> {
  const url = `${WC_BASE_URL}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getWCAuthHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('WooCommerce API Error:', errorData);
      throw new Error(
        `Failed to fetch coupon: ${response.status} ${response.statusText}`
      );
    }

    const coupons = await response.json();
    if (!Array.isArray(coupons) || coupons.length === 0) return null;
    return coupons[0] as WCCoupon;
  } catch (error) {
    console.error(`Failed to get coupon for code "${code}":`, error);
    throw error;
  }
}
