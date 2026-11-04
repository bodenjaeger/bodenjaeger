/**
 * API Route: Gutschein interaktiv im Checkout validieren.
 *
 * POST /api/checkout/validate-coupon
 *
 * Wird vom Coupon-Input ausgelöst (Apply-Button) und bei kritischen Cart-/
 * Versandänderungen (`cartItems.length`, `totalPrice`, `shippingMethod`)
 * vom Checkout-State erneut aufgerufen.
 *
 * Verträge:
 *  - HTTP 429 nur bei Rate-Limit-Verletzung.
 *  - HTTP 400 bei strukturell ungültigem Body (kein Coupon-Fehler).
 *  - HTTP 200 für alle Validierungsergebnisse — Fehler stecken im Response-Body
 *    (`{ valid: false, errorCode, message }`).
 *
 * Der Endpoint legt KEINEN State an. Er ist eine reine Funktion vom
 * `(code, cartItems)` zur `ValidateCouponResult`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';
import {
  validateAndCalculateCoupon,
  type CartItemForValidation,
  type ValidateCouponResult,
} from '@/lib/coupon';

export const runtime = 'nodejs';

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// ============================================================================
// Body Parsing
// ============================================================================

interface RequestBody {
  code: string;
  cartItems: CartItemForValidation[];
  /** Rechnungs-E-Mail (optional; Pflicht nur für MUSTER50). */
  email?: string;
}

function isCartItem(x: unknown): x is CartItemForValidation {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.productId === 'number' &&
    Number.isFinite(o.productId) &&
    typeof o.price === 'number' &&
    Number.isFinite(o.price) &&
    typeof o.quantity === 'number' &&
    Number.isFinite(o.quantity) &&
    typeof o.isSample === 'boolean' &&
    typeof o.isOnSale === 'boolean' &&
    Array.isArray(o.categoryIds) &&
    o.categoryIds.every((c) => typeof c === 'number')
  );
}

function parseBody(body: unknown): RequestBody | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.code !== 'string') return null;
  if (!Array.isArray(o.cartItems)) return null;
  if (!o.cartItems.every(isCartItem)) return null;
  if (o.email !== undefined && typeof o.email !== 'string') return null;
  return {
    code: o.code,
    cartItems: o.cartItems as CartItemForValidation[],
    email: o.email as string | undefined,
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  // 1. Rate-Limit
  const ip = getClientIp(request);
  if (isRateLimited(ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    const result: ValidateCouponResult = {
      valid: false,
      errorCode: 'RATE_LIMIT',
      message: 'Zu viele Versuche. Bitte einen Moment warten.',
    };
    return NextResponse.json(result, { status: 429 });
  }

  // 2. Parse + Validate Body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const result: ValidateCouponResult = {
      valid: false,
      errorCode: 'UNKNOWN',
      message: 'Ungültige Anfrage.',
    };
    return NextResponse.json(result, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    const result: ValidateCouponResult = {
      valid: false,
      errorCode: 'UNKNOWN',
      message: 'Ungültige Anfrage.',
    };
    return NextResponse.json(result, { status: 400 });
  }

  // 3. Validate Coupon
  const result = await validateAndCalculateCoupon(parsed.code, parsed.cartItems, {
    email: parsed.email,
  });
  return NextResponse.json(result, { status: 200 });
}
