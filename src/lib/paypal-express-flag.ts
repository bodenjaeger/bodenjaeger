/**
 * Notschalter für PayPal Express.
 *
 * Express ist nur aktiv, wenn `NEXT_PUBLIC_PAYPAL_EXPRESS_ENABLED=true` gesetzt
 * ist (Vercel → Environment Variables, danach neu deployen — die Variable wird
 * beim Build in den Browser-Code eingebacken). Nicht gesetzt = aus:
 * - der Express-Button auf /checkout wird nicht gerendert
 * - /api/checkout/paypal/express-create und /express-capture antworten sofort
 *   mit 503, OHNE PayPal anzusprechen (kein Capture)
 *
 * Hintergrund: Live-Test 21.10.2026 — PayPal hat eingezogen, aber es entstand
 * weder eine WooCommerce-Bestellung noch griff der Fehlerpfad.
 */
export const PAYPAL_EXPRESS_ENABLED = process.env.NEXT_PUBLIC_PAYPAL_EXPRESS_ENABLED === 'true';

export const PAYPAL_EXPRESS_DISABLED_MESSAGE =
  'PayPal Express ist vorübergehend nicht verfügbar. Bitte nutze den normalen Checkout.';
