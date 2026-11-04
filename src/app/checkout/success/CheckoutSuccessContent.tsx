'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { track } from '@/lib/analytics/track';
import type { PurchaseTrackingPayload } from '@/lib/analytics/types';

export default function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');  // Changed from 'orderId' to 'order'
  const paypalSuccess = searchParams.get('paypal');
  const stripeSessionId = searchParams.get('session_id');
  // PayPal Express: bezahlt, aber die Bestellung wird vom Team manuell
  // angelegt (WooCommerce hat sie nach dem Capture abgelehnt). Keine
  // Bestellnummer, stattdessen die PayPal-Transaktions-ID.
  const paypalPending = paypalSuccess === 'pending';
  const paypalTransactionId = searchParams.get('tx');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (paypalPending) {
      // Warenkorb in jedem Fall leeren — bezahlt ist bezahlt, sonst droht
      // eine zweite Zahlung.
      try {
        localStorage.removeItem('woocommerce-cart');
      } catch {
        // ignore
      }
      return;
    }

    // If no order ID is present, redirect to home
    if (!orderId) {
      router.push('/');
      return;
    }

    // GA4 purchase — Doppel-Event-Schutz via sessionStorage.
    const flagKey = `purchase_tracked_${orderId}`;
    const trackingKey = `order_${orderId}_tracking`;
    const alreadyTracked = sessionStorage.getItem(flagKey) === '1';

    if (!alreadyTracked) {
      try {
        const raw = localStorage.getItem(trackingKey);
        if (raw) {
          const payload = JSON.parse(raw) as PurchaseTrackingPayload;
          track.purchase({
            orderId: Number(orderId),
            items: payload.items,
            value: payload.value,
            currency: payload.currency,
            paymentType: payload.paymentType,
            shipping: payload.shipping,
            tax: payload.tax,
          });
          sessionStorage.setItem(flagKey, '1');
        } else {
          // Kein Puffer — Tracking-Event entfällt; User soll trotzdem Success sehen.
          console.warn('[track.purchase] tracking payload missing for order', orderId);
        }
      } catch (err) {
        console.warn('[track.purchase] failed:', err);
      }
    }

    // Reihenfolge: erst Tracking-Puffer wegräumen, dann den Cart clearen.
    try {
      localStorage.removeItem(trackingKey);
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('woocommerce-cart');
    } catch {
      // ignore
    }
  }, [orderId, paypalPending, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="font-bold text-2xl text-dark">Bodenjäger</div>
          </Link>
        </div>
      </header>

      {/* Success Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-brand rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          {paypalPending ? (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark mb-4">
              Vielen Dank – Ihre Zahlung ist eingegangen!
            </h1>
            <p className="text-lg text-gray-700 mb-2">
              Ihre Bestellung wird von unserem Team bearbeitet. Sie erhalten die
              Bestellbestätigung in Kürze per E-Mail.
            </p>
            {paypalTransactionId && (
              <p className="text-gray-600">
                PayPal-Transaktions-ID:{' '}
                <span className="font-semibold text-dark">{paypalTransactionId}</span>
              </p>
            )}
            <p className="text-brand text-sm mt-2">✅ PayPal Zahlung erfolgreich</p>
          </div>
          ) : (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark mb-4">
              Vielen Dank für Ihre Bestellung!
            </h1>
            <p className="text-lg text-gray-700 mb-2">
              Ihre Bestellung wurde erfolgreich aufgegeben.
            </p>
            {orderId && (
              <p className="text-gray-600">
                Bestellnummer: <span className="font-semibold text-dark">#{orderId}</span>
              </p>
            )}
            {(paypalSuccess || stripeSessionId) && (
              <p className="text-brand text-sm mt-2">
                {paypalSuccess && '✅ PayPal Zahlung erfolgreich'}
                {stripeSessionId && '✅ Kreditkarten-Zahlung erfolgreich'}
              </p>
            )}
          </div>
          )}

          {/* Order Confirmation Details */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-bold text-dark mb-6">Was passiert jetzt?</h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark mb-1">
                    📧 Bestellbestätigung
                  </h3>
                  <p className="text-gray-600">
                    Sie erhalten in Kürze eine E-Mail mit allen Details zu Ihrer Bestellung.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark mb-1">⚙️ Bearbeitung</h3>
                  <p className="text-gray-600">
                    Unser Team prüft Ihre Bestellung und bereitet diese für Versand, Lieferung oder Abholung im Markt vor.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark mb-1">🚚 Versand / Terminabstimmung</h3>
                  <p className="text-gray-600">
                    Je nach gewählter Option erfolgt der Versand, die Terminabstimmung für die Lieferung oder die Bereitstellung zur Abholung.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark mb-1">📦 Versand- oder Abholinformation</h3>
                  <p className="text-gray-600">
                    Sobald Ihre Bestellung versandt wurde oder zur Abholung bereitsteht, erhalten Sie eine weitere E-Mail mit allen wichtigen Informationen.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Kontakt */}
          <div className="text-center text-gray-600 mb-8">
            <p>
              Bei Fragen zu Ihrer Bestellung erreichen Sie unser Team jederzeit unter{' '}
              <a href="tel:+492433938884" className="font-semibold text-dark hover:text-brand transition-colors">02433 938884</a>{' '}
              oder{' '}
              <a href="mailto:service@bodenjaeger.de" className="font-semibold text-dark hover:text-brand transition-colors">service@bodenjaeger.de</a>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-8 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-[#d11920] focus:outline-none focus:ring-4 focus:ring-brand/30 transition-all text-center"
            >
              Zurück zur Startseite
            </Link>
            <Link
              href="/"
              className="px-8 py-3 bg-white text-dark font-semibold rounded-lg border-2 border-dark hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-dark/30 transition-all text-center"
            >
              Weiter einkaufen
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <Link href="/agb" className="hover:text-dark transition-colors">
              AGB
            </Link>
            <Link href="/datenschutz" className="hover:text-dark transition-colors">
              Datenschutz
            </Link>
            <Link href="/widerruf" className="hover:text-dark transition-colors">
              Widerrufsbelehrung
            </Link>
            <Link href="/impressum" className="hover:text-dark transition-colors">
              Impressum
            </Link>
          </div>
          <div className="text-center text-sm text-gray-500 mt-4">
            © {new Date().getFullYear()} Bodenjäger. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </div>
  );
}
