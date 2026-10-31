'use client';

/**
 * Gutscheincode-Eingabe für OrderSummary.
 *
 * UI-States:
 *   default → Input + „Anwenden"-Button (immer sichtbar, kein Klapp-Pattern)
 *   applied → Status-Zeile „Code X angewendet (−€)" + „Entfernen"-Link
 *   pending → Status-Zeile „Code X vorgemerkt" + „Entfernen"-Link (MUSTER50
 *             ohne E-Mail; der Checkout prüft, sobald die E-Mail eingegeben ist)
 *   error   → rote Fehlermeldung unter dem Input; Code bleibt im Feld
 *
 * Replace-Logik bleibt erhalten: wird im selben Slot ein neuer Code applied
 * während appliedCoupon gesetzt ist, ruft der Component `onReplace` auf.
 *
 * Client-seitige Sanitization in `onChange` reicht; der Server saniert
 * dieselben Regeln nochmals (zentral in `coupon.ts.sanitizeCouponCode`).
 */

import { useState } from 'react';
import type { AppliedCoupon, CartItemForValidation, ValidateCouponResult } from '@/lib/coupon';

interface CouponInputProps {
  cartItems: CartItemForValidation[];
  /** Rechnungs-E-Mail aus dem Checkout (MUSTER50 prüft damit die Musterbestellung). */
  email?: string;
  appliedCoupon: AppliedCoupon | null;
  /** Vorgemerkter Code, der noch auf die E-Mail wartet. */
  pendingCode?: string | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  onReplace: (oldCode: string, newCoupon: AppliedCoupon) => void;
  onPending?: (code: string) => void;
  onRemovePending?: () => void;
}

const CODE_MAX_LENGTH = 50;

/** Client-seitig: trim → uppercase → Whitelist [A-Z0-9_-], max 50 Zeichen. */
function sanitizeInput(raw: string): string {
  const upper = raw.toUpperCase().slice(0, CODE_MAX_LENGTH);
  let cleaned = '';
  for (const ch of upper) {
    if (/[A-Z0-9_-]/.test(ch)) cleaned += ch;
  }
  return cleaned;
}

export default function CouponInput({
  cartItems,
  email,
  appliedCoupon,
  pendingCode = null,
  onApply,
  onRemove,
  onReplace,
  onPending,
  onRemovePending,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const cleanCode = sanitizeInput(code);
    if (!cleanCode) {
      setError('Bitte einen gültigen Code eingeben.');
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, cartItems, email }),
      });
      const result: ValidateCouponResult = await response.json();

      if (result.valid) {
        if (appliedCoupon && appliedCoupon.code !== result.coupon.code) {
          onReplace(appliedCoupon.code, result.coupon);
        } else {
          onApply(result.coupon);
        }
        setCode('');
        setError(null);
      } else if (result.errorCode === 'EMAIL_REQUIRED' && onPending) {
        // Code braucht die E-Mail (MUSTER50) — vormerken statt ablehnen.
        onPending(cleanCode);
        setCode('');
        setError(null);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('[CouponInput] Apply failed:', err);
      setError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setValidating(false);
    }
  };

  // Applied: Status-Zeile mit „Entfernen"-Link. Ersetzt den Input-Slot
  // vollständig — kein paralleles zweites Eingabefeld.
  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-3 mb-6 text-sm">
        <span className="text-mid">
          Code <strong className="text-dark">{appliedCoupon.code}</strong> angewendet
          {appliedCoupon.discountAmount > 0 && (
            <span className="text-brand ml-1">
              (−{appliedCoupon.discountAmount.toFixed(2).replace('.', ',')} €)
            </span>
          )}
          {appliedCoupon.freeShipping && (
            <span className="text-xs text-mid ml-1">+ kostenloser Versand</span>
          )}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-mid hover:text-brand hover:underline whitespace-nowrap"
        >
          Entfernen
        </button>
      </div>
    );
  }

  // Pending: Code wartet auf die E-Mail-Eingabe.
  if (pendingCode) {
    return (
      <div className="flex items-center justify-between gap-3 mb-6 text-sm">
        <span className="text-mid">
          Code <strong className="text-dark">{pendingCode}</strong> vorgemerkt – wir prüfen
          ihn, sobald du deine E-Mail-Adresse eingibst.
        </span>
        <button
          type="button"
          onClick={onRemovePending}
          className="text-mid hover:text-brand hover:underline whitespace-nowrap"
        >
          Entfernen
        </button>
      </div>
    );
  }

  // Default: Input + „Anwenden" — immer sichtbar. Optik wie alte origin/main.
  return (
    <div className="mb-6">
      <div className="flex flex-row gap-2">
        <input
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          placeholder="Rabattcode"
          value={code}
          onChange={(e) => {
            setCode(sanitizeInput(e.target.value));
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleApply();
            }
          }}
          disabled={validating}
          maxLength={CODE_MAX_LENGTH}
          className="flex-1 h-12 px-4 text-sm border border-ash rounded-lg focus:outline-none focus:border-brand disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={validating || code.length === 0}
          className="px-6 h-12 text-sm font-medium text-dark bg-pale border border-ash rounded-lg hover:bg-ash transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
        >
          {validating ? '…' : 'Anwenden'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
