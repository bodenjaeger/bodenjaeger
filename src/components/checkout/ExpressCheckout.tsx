'use client';

import { useEffect, useRef, useState } from 'react';
import { loadScript } from '@paypal/paypal-js';
import { useCart } from '@/contexts/CartContext';
import { buildOrderLineItems, sumLineItemTotals, type OrderLineItem } from '@/lib/order-line-items';
import { calculateShippingCost } from '@/lib/shippingConfig';
import { calculatePaketAktion } from '@/lib/promo';

/**
 * Express Checkout — PayPal Smart Button oben im /checkout-Layout.
 *
 * Flow:
 * 1. Browser zeigt Button (nach SDK-Load)
 * 2. Klick → createOrder-Callback → Positionen einmal bauen
 *    (`buildOrderLineItems`, dieselbe Funktion wie im normalen Checkout) →
 *    POST /api/checkout/paypal/express-create
 * 3. PayPal-Popup öffnet sich, Kunde bestätigt Adresse + Zahlung
 * 4. onApprove-Callback → POST /api/checkout/paypal/express-capture mit
 *    GENAU den Positionen aus Schritt 2 — so bildet die WC-Order den
 *    eingezogenen Betrag ab, auch wenn sich zwischendurch etwas ändert
 *    (z.B. eine Aktion um Mitternacht endet).
 * 5. Bei Erfolg: window.location.href = /checkout/success?order=...&paypal=success
 *    (Success-Page räumt den Cart auf)
 *
 * Erforderliche ENV (Browser): NEXT_PUBLIC_PAYPAL_CLIENT_ID
 *
 * Cart-Daten werden via Refs zur Submit-Zeit gelesen, NICHT zur SDK-Render-Zeit,
 * sonst hätte der PayPal-Button stale Closure-Daten, wenn der User nach dem
 * SDK-Load noch Items hinzufügt/entfernt.
 */

/** Timeout für den express-capture-Aufruf (Route: maxDuration 120 s). */
const CAPTURE_REQUEST_TIMEOUT_MS = 130_000;

export default function ExpressCheckout() {
  const { cartItems, totalPrice, customerNote, deliveryNote } = useCart();
  console.log('[ExpressCheckout] mounting — cartItems:', cartItems?.length ?? 'undef');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRenderedRef = useRef(false);
  const [sdkStatus, setSdkStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live-Refs für Submit-Zeit-Werte (kein stale Closure in PayPal-Callbacks)
  const cartItemsRef = useRef(cartItems);
  const totalPriceRef = useRef(totalPrice);
  const customerNoteRef = useRef(customerNote);
  const deliveryNoteRef = useRef(deliveryNote);

  // Positionen + Versand, mit denen die PayPal-Order erstellt wurde.
  const pendingOrderRef = useRef<{ lineItems: OrderLineItem[]; shippingCost: number } | null>(null);

  useEffect(() => {
    cartItemsRef.current = cartItems;
    totalPriceRef.current = totalPrice;
    customerNoteRef.current = customerNote;
    deliveryNoteRef.current = deliveryNote;
  });

  // SDK genau EINMAL laden (Cart-Daten kommen via Refs)
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) {
      console.warn(
        '[ExpressCheckout] NEXT_PUBLIC_PAYPAL_CLIENT_ID nicht gesetzt — Button deaktiviert.'
      );
      setSdkStatus('error');
      return;
    }

    let cancelled = false;

    loadScript({
      clientId,
      currency: 'EUR',
      intent: 'capture',
      components: 'buttons',
      locale: 'de_DE',
    })
      .then((paypal) => {
        console.log('[ExpressCheckout] SDK loaded, paypal:', !!paypal, 'Buttons:', !!paypal?.Buttons, 'container:', !!containerRef.current);
        if (cancelled) return;
        if (!paypal || !paypal.Buttons || !containerRef.current) {
          console.warn('[ExpressCheckout] silent fail: paypal.Buttons or containerRef missing');
          setSdkStatus('error');
          return;
        }
        if (buttonsRenderedRef.current) return;

        const buttons = paypal.Buttons({
          style: {
            layout: 'horizontal',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 48,
            tagline: false,
          },

          createOrder: async () => {
            setErrorMsg(null);

            const lineItems = buildOrderLineItems(cartItemsRef.current);

            if (sumLineItemTotals(lineItems) <= 0) {
              const msg = 'Keine bezahlbaren Artikel im Warenkorb.';
              setErrorMsg(msg);
              throw new Error(msg);
            }

            // Paket-Aktion: mindert den PayPal-Betrag und — wie im normalen
            // Checkout — die Basis der Versandstaffel.
            const aktionDiscount = calculatePaketAktion(cartItemsRef.current).discount;
            const shippingCost = calculateShippingCost(
              Math.max(0, totalPriceRef.current - aktionDiscount),
              cartItemsRef.current
            );

            const res = await fetch('/api/checkout/paypal/express-create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                line_items: lineItems,
                shipping_cost: shippingCost,
              }),
            });

            const data = await res.json();
            if (!data.success || !data.paypalOrderId) {
              const msg = data.error || 'Bestellung konnte nicht angelegt werden.';
              setErrorMsg(msg);
              throw new Error(msg);
            }
            pendingOrderRef.current = { lineItems, shippingCost };
            return data.paypalOrderId as string;
          },

          onApprove: async (data) => {
            const pending = pendingOrderRef.current;
            if (!pending) {
              setErrorMsg(
                'Die Zahlung konnte nicht zugeordnet werden. Bitte nicht erneut bezahlen, sondern uns kontaktieren.'
              );
              return;
            }

            try {

              const note = [
                deliveryNoteRef.current.trim() && `Lieferwunsch: ${deliveryNoteRef.current.trim()}`,
                customerNoteRef.current.trim() && `Anmerkung: ${customerNoteRef.current.trim()}`,
              ]
                .filter(Boolean)
                .join('\n\n');

              // Eigenes Timeout knapp über maxDuration der Route (120 s): Die
              // Route antwortet dank eigener Timeouts vorher. Kommt trotzdem
              // nichts, ist der Ausgang unklar → unten wie „bezahlt“ behandeln.
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), CAPTURE_REQUEST_TIMEOUT_MS);
              let result;
              try {
                const res = await fetch('/api/checkout/paypal/express-capture', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paypalOrderId: data.orderID,
                    line_items: pending.lineItems,
                    shipping_cost: pending.shippingCost,
                    customer_note: note,
                  }),
                  signal: controller.signal,
                });
                result = await res.json();
              } finally {
                clearTimeout(timer);
              }

              // Auch wenn die Bestellung nach dem Capture nicht angelegt werden
              // konnte, kommt `success` + redirectUrl (?paypal=pending) — die
              // Bestätigungsseite leert den Warenkorb.
              if (result.success && result.redirectUrl) {
                window.location.href = result.redirectUrl;
                return;
              }

              // success:false kommt nur, wenn sicher nichts eingezogen wurde
              // (Prüfung vor dem Capture, eindeutige Ablehnung, Notschalter).
              setErrorMsg(
                result.error ||
                  'Die Zahlung konnte nicht abgeschlossen werden. Es wurde nichts abgebucht. Bitte versuche es erneut.'
              );
            } catch (err) {
              // Keine (verwertbare) Antwort vom Server — Timeout, Netzwerk,
              // kein JSON. Ob PayPal eingezogen hat, ist unklar: wie „bezahlt“
              // behandeln, Bestätigungsseite leert den Warenkorb, damit der
              // Kunde nicht ein zweites Mal bezahlt.
              console.error('[ExpressCheckout] express-capture request failed:', err);
              window.location.href = `/checkout/success?paypal=pending&tx=${encodeURIComponent(data.orderID)}`;
            }
          },

          onError: (err) => {
            console.error('[ExpressCheckout] PayPal SDK Error:', err);
            setErrorMsg('Bei der PayPal-Zahlung ist ein Fehler aufgetreten.');
          },

          onCancel: () => {
            // User hat im PayPal-Popup abgebrochen — keine UI-Aktion, kein Error.
          },
        });

        if (!buttons.isEligible()) {
          console.warn('[ExpressCheckout] silent fail: buttons.isEligible() returned false');
          setSdkStatus('error');
          return;
        }

        buttons
          .render(containerRef.current)
          .then(() => {
            if (cancelled) return;
            buttonsRenderedRef.current = true;
            setSdkStatus('ready');
          })
          .catch((err) => {
            if (cancelled) return;
            console.error('[ExpressCheckout] PayPal render failed:', err);
            setSdkStatus('error');
          });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[ExpressCheckout] PayPal SDK load failed:', err);
        setSdkStatus('error');
      });

    return () => {
      cancelled = true;
    };
    // SDK nur EINMAL laden — Cart-Updates fließen via Refs ein.
  }, []);

  // Bei leerem Cart oder SDK-Error: Komponente komplett ausblenden.
  // Auch bei 0€-Warenkorb (z. B. nur Muster) ausblenden — PayPal lehnt
  // Orders ohne bezahlbare Items ab, und 0€-Orders gehen ohnehin am
  // Gateway vorbei (siehe /api/checkout/create-order, Commit 925ede9).
  if (cartItems.length === 0) {
    console.log('[ExpressCheckout] render skipped: cart empty');
    return null;
  }
  if (totalPrice === 0) {
    console.log('[ExpressCheckout] render skipped: totalPrice is 0 (nur Gratis-Items)');
    return null;
  }
  if (sdkStatus === 'error') {
    console.log('[ExpressCheckout] render skipped: sdkStatus is error');
    return null;
  }

  return (
    // `isolate` erzeugt einen eigenen Stacking-Context, damit die PayPal-iframes
    // (zoid setzt sehr hohe z-indexes) nicht über den sticky Header (z-50) gehen.
    <div className="mb-6 relative isolate">
      <p className="text-center text-sm text-mid mb-4">Express Checkout</p>

      {/* Container IMMER im DOM, damit containerRef.current verfügbar ist
          (sonst silent-fail beim SDK-Render). Bei 'loading' via CSS verstecken
          und Skelett separat anzeigen. */}
      {sdkStatus === 'loading' && (
        <div
          className="h-12 bg-pale animate-pulse rounded-lg"
          aria-label="PayPal wird geladen"
        />
      )}
      <div
        ref={containerRef}
        className={sdkStatus === 'loading' ? 'w-full hidden' : 'w-full'}
      />


      {errorMsg && (
        <p className="mt-3 text-sm text-brand text-center" role="alert">
          {errorMsg}
        </p>
      )}

      {/* Trennlinie zum Standard-Checkout darunter */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-ash" />
        <span className="text-sm text-mid">ODER</span>
        <div className="flex-1 h-px bg-ash" />
      </div>
    </div>
  );
}
