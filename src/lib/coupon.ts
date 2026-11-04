/**
 * Coupon-Validierung (server-side only).
 *
 * Reine Server-side-Logik — wird sowohl vom `validate-coupon`-Endpoint
 * (interaktive Validierung im Checkout) als auch vom `create-order`-Endpoint
 * (Re-Validation kurz vor Order-Submit) genutzt.
 *
 * WooCommerce bleibt Source of Truth: Der gefundene Coupon stammt direkt aus
 * der WC-REST-API. Die hier berechneten Beträge dienen der Frontend-Anzeige;
 * die finale Verrechnung übernimmt WC selbst über `coupon_lines`.
 */

import { MUSTER50, hasRecentSampleOrder } from '@/lib/muster50';
import { SAMPLE_CATEGORY_ID } from '@/lib/sampleUtils';
import { wooCommerceClient } from '@/lib/woocommerce';
import { getCouponByCode, type WCCoupon } from '@/lib/woocommerce-checkout';

// ============================================================================
// Public Types
// ============================================================================

export type CouponErrorCode =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'USAGE_LIMIT_REACHED'
  | 'MIN_AMOUNT_NOT_REACHED'
  | 'MAX_AMOUNT_EXCEEDED'
  | 'EXCLUDED_PRODUCTS_ONLY'
  | 'CONFIG_ERROR'
  | 'RATE_LIMIT'
  | 'EMAIL_REQUIRED'
  | 'FLOOR_REQUIRED'
  | 'NOT_ELIGIBLE'
  | 'GIFT_MISSING'
  | 'UNKNOWN';

export interface CartItemForValidation {
  productId: number;
  /** Brutto-Preis pro Einheit; bei Set-Items: reduzierter Set-Preis. */
  price: number;
  quantity: number;
  isSample: boolean;
  isOnSale: boolean;
  categoryIds: number[];
}

export interface AppliedCoupon {
  code: string;
  discountType: 'percent' | 'fixed_cart' | 'fixed_product';
  discountAmount: number;
  freeShipping: boolean;
  /** Produkt, das der Gutschein gratis in den Warenkorb legt (MUSTER50). */
  giftProductId?: number;
}

export interface ValidateCouponOptions {
  /** Rechnungs-E-Mail aus dem Checkout (Pflicht für MUSTER50). */
  email?: string;
  /** Beim Order-Submit: Gratis-Produkt muss bereits im Warenkorb liegen. */
  requireGiftInCart?: boolean;
}

export type ValidateCouponResult =
  | { valid: true; coupon: AppliedCoupon }
  | { valid: false; errorCode: CouponErrorCode; message: string };

// ============================================================================
// Sanitization
// ============================================================================

const CODE_MAX_LENGTH = 50;
const CODE_PATTERN = /^[A-Z0-9_-]+$/;

/**
 * Normalisiert einen Coupon-Code: `trim` → `toUpperCase` → Whitelist-Check.
 * Gibt den normalisierten Code zurück oder `''`, wenn er das Format verletzt.
 */
export function sanitizeCouponCode(input: string): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().toUpperCase();
  if (trimmed.length === 0 || trimmed.length > CODE_MAX_LENGTH) return '';
  if (!CODE_PATTERN.test(trimmed)) return '';
  return trimmed;
}

// ============================================================================
// Helpers
// ============================================================================

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatEuro(n: number): string {
  return `${n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function fail(errorCode: CouponErrorCode, message: string): ValidateCouponResult {
  return { valid: false, errorCode, message };
}

/**
 * Prüft, ob ein einzelnes CartItem unter die Rabattregeln des Coupons fällt.
 * Reihenfolge der Checks entspricht der Discovery-Spec.
 */
function isDiscountable(item: CartItemForValidation, coupon: WCCoupon): boolean {
  if (item.isSample) return false;
  if (coupon.excluded_product_ids.includes(item.productId)) return false;
  if (item.categoryIds.some((c) => coupon.excluded_product_categories.includes(c))) return false;
  if (coupon.exclude_sale_items && item.isOnSale) return false;
  if (coupon.product_ids.length > 0 && !coupon.product_ids.includes(item.productId)) return false;
  if (
    coupon.product_categories.length > 0 &&
    !item.categoryIds.some((c) => coupon.product_categories.includes(c))
  ) {
    return false;
  }
  return true;
}

/**
 * Liefert das gültige Ablauf-Datum eines Coupons als Date-Objekt oder null.
 * WC liefert `date_expires` in Site-Lokalzeit und `date_expires_gmt` in GMT
 * (jeweils ohne Z-Suffix). Wir bevorzugen die GMT-Variante und ergänzen "Z",
 * damit JS sie als UTC interpretiert.
 */
function getExpiryDate(coupon: WCCoupon): Date | null {
  if (!coupon.date_expires && !coupon.date_expires_gmt) return null;
  const raw = coupon.date_expires_gmt
    ? `${coupon.date_expires_gmt}Z`
    : (coupon.date_expires as string);
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sonderregeln für MUSTER50 (siehe `muster50.ts`). Läuft nach den generischen
 * Checks 1–5; ersetzt die Rabattberechnung (6–9), weil das Verlegeset beim
 * ersten Anwenden noch nicht im Warenkorb liegt.
 */
async function validateMuster50(
  wcCoupon: WCCoupon,
  cartItems: CartItemForValidation[],
  options: ValidateCouponOptions
): Promise<ValidateCouponResult> {
  const giftId = MUSTER50.giftProductId;

  // Nur beim Kauf eines Bodens — Muster zählen nicht (eigene Kategorie).
  const hasFloor = cartItems.some(
    (item) =>
      !item.isSample &&
      item.quantity > 0 &&
      item.categoryIds.some((c) => MUSTER50.floorCategoryIds.includes(c))
  );
  if (!hasFloor) {
    return fail('FLOOR_REQUIRED', MUSTER50.messages.floorRequired);
  }

  // Ohne E-Mail lehnt der Checkout nicht ab, sondern merkt den Code vor
  // und prüft ihn, sobald die E-Mail eingegeben ist.
  const email = (options.email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return fail('EMAIL_REQUIRED', MUSTER50.messages.emailPending);
  }

  // Einmal pro Kunde. WC prüft beim Anlegen der Order nochmals autoritativ
  // (`usage_limit_per_user`), meldet das aber nur auf Englisch.
  const limitPerUser = wcCoupon.usage_limit_per_user ?? 0;
  if (limitPerUser > 0) {
    const used = (wcCoupon.used_by || []).filter((u) => String(u).trim().toLowerCase() === email).length;
    if (used >= limitPerUser) {
      return fail('USAGE_LIMIT_REACHED', MUSTER50.messages.alreadyUsed);
    }
  }

  if (options.requireGiftInCart && !cartItems.some((item) => item.productId === giftId)) {
    return fail(
      'GIFT_MISSING',
      'Das Verlegeset fehlt im Warenkorb. Bitte den Code erneut eingeben.'
    );
  }

  let eligible: boolean;
  let gift;
  try {
    [eligible, gift] = await Promise.all([
      hasRecentSampleOrder(email),
      wooCommerceClient.getProductsByIds([giftId]).then((map) => map.get(giftId)),
    ]);
  } catch {
    return fail('UNKNOWN', 'Dieser Gutschein kann gerade nicht angewendet werden.');
  }
  if (!eligible) {
    return fail('NOT_ELIGIBLE', MUSTER50.messages.notEligible);
  }
  if (!gift) {
    return fail('UNKNOWN', 'Dieser Gutschein kann gerade nicht angewendet werden.');
  }

  // Rabatt = ein Set zum Shop-Preis (Server-Preis, nicht der vom Client).
  // Entspricht dem WC-Gutschein: 100 % auf das Set, höchstens 1 Artikel.
  const discountAmount = round2(gift.price * (gift.paketinhalt || 1));

  return {
    valid: true,
    coupon: {
      code: wcCoupon.code.toUpperCase(),
      discountType: wcCoupon.discount_type,
      discountAmount,
      freeShipping: wcCoupon.free_shipping,
      giftProductId: giftId,
    },
  };
}

// ============================================================================
// Main Entry
// ============================================================================

/**
 * Validierungs-Pipeline (erste Verletzung wins):
 *   1. Sanitization → leer → NOT_FOUND
 *   2. WC-Coupon laden → null → NOT_FOUND
 *   3. `date_expires` < jetzt → EXPIRED
 *   4. `usage_limit` erreicht → USAGE_LIMIT_REACHED
 *   5. `SAMPLE_CATEGORY_ID` nicht in `excluded_product_categories` → CONFIG_ERROR
 *   6. Rabattfähige Items leer → EXCLUDED_PRODUCTS_ONLY
 *   7. `discountableSubtotal` < `minimum_amount` → MIN_AMOUNT_NOT_REACHED
 *   8. `discountableSubtotal` > `maximum_amount` → MAX_AMOUNT_EXCEEDED
 *
 * MUSTER50 läuft ab Schritt 6 über `validateMuster50`.
 */
export async function validateAndCalculateCoupon(
  code: string,
  cartItems: CartItemForValidation[],
  options: ValidateCouponOptions = {}
): Promise<ValidateCouponResult> {
  // 1. Sanitize
  const cleanCode = sanitizeCouponCode(code);
  if (!cleanCode) {
    return fail('NOT_FOUND', 'Gutscheincode ungültig oder nicht gefunden.');
  }

  // 2. Load
  let wcCoupon: WCCoupon | null;
  try {
    wcCoupon = await getCouponByCode(cleanCode);
  } catch {
    return fail('UNKNOWN', 'Dieser Gutschein kann gerade nicht angewendet werden.');
  }
  if (!wcCoupon) {
    return fail('NOT_FOUND', 'Gutscheincode ungültig oder nicht gefunden.');
  }

  // 3. Expired
  const expiry = getExpiryDate(wcCoupon);
  if (expiry !== null && expiry.getTime() < Date.now()) {
    return fail('EXPIRED', 'Dieser Gutschein ist abgelaufen.');
  }

  // 4. Usage limit
  if (
    wcCoupon.usage_limit !== null &&
    wcCoupon.usage_limit > 0 &&
    wcCoupon.usage_count >= wcCoupon.usage_limit
  ) {
    return fail('USAGE_LIMIT_REACHED', 'Dieser Gutschein wurde bereits zu oft eingelöst.');
  }

  // 5. Muster-Ausschluss Pflicht (Backend-Setup-Garantie).
  // Ohne diesen Ausschluss könnten Coupons auf kostenlose Muster angewendet werden,
  // was zu negativen Order-Totals oder unbeabsichtigten Rabatten führt.
  if (!wcCoupon.excluded_product_categories.includes(SAMPLE_CATEGORY_ID)) {
    console.error(
      `[coupon] CONFIG_ERROR: coupon "${wcCoupon.code}" does not exclude SAMPLE_CATEGORY_ID (${SAMPLE_CATEGORY_ID}). ` +
        `Open the coupon in WooCommerce admin → "Nutzungseinschränkung" → "Ausgeschlossene Kategorien" → add "Muster".`
    );
    return fail('CONFIG_ERROR', 'Dieser Gutschein ist aktuell nicht verfügbar.');
  }

  if (cleanCode === MUSTER50.code) {
    return validateMuster50(wcCoupon, cartItems, options);
  }

  // 6. Discountable items
  const discountableItems = cartItems.filter((item) => isDiscountable(item, wcCoupon));
  if (discountableItems.length === 0) {
    return fail(
      'EXCLUDED_PRODUCTS_ONLY',
      'Dieser Gutschein gilt nicht für die Produkte in deinem Warenkorb.'
    );
  }

  const discountableSubtotal = round2(
    discountableItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  // 7. Minimum amount
  const minimum = parseFloat(wcCoupon.minimum_amount || '0');
  if (minimum > 0 && discountableSubtotal < minimum) {
    return fail(
      'MIN_AMOUNT_NOT_REACHED',
      `Der Mindestbestellwert von ${formatEuro(minimum)} ist nicht erreicht.`
    );
  }

  // 8. Maximum amount
  const maximum = parseFloat(wcCoupon.maximum_amount || '0');
  if (maximum > 0 && discountableSubtotal > maximum) {
    return fail(
      'MAX_AMOUNT_EXCEEDED',
      `Der maximale Bestellwert von ${formatEuro(maximum)} ist überschritten.`
    );
  }

  // 9. Calculate discount
  const amount = parseFloat(wcCoupon.amount || '0');
  let rawDiscount: number;
  switch (wcCoupon.discount_type) {
    case 'percent':
      rawDiscount = Math.min(discountableSubtotal, (discountableSubtotal * amount) / 100);
      break;
    case 'fixed_cart':
      rawDiscount = Math.min(discountableSubtotal, amount);
      break;
    case 'fixed_product': {
      const totalQty = discountableItems.reduce((sum, i) => sum + i.quantity, 0);
      // Cap überschreibt die formale Spec-Formel (`amount * Σ(qty)`) zur UI-Konsistenz —
      // verhindert negative Gesamtsummen bei fehlkonfigurierten Coupons.
      rawDiscount = Math.min(discountableSubtotal, amount * totalQty);
      break;
    }
    default:
      return fail('UNKNOWN', 'Dieser Gutscheintyp wird nicht unterstützt.');
  }

  const discountAmount = round2(Math.max(0, rawDiscount));

  return {
    valid: true,
    coupon: {
      code: wcCoupon.code.toUpperCase(),
      discountType: wcCoupon.discount_type,
      discountAmount,
      freeShipping: wcCoupon.free_shipping,
    },
  };
}
