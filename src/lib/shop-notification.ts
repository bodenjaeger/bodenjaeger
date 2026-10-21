/**
 * Interne Benachrichtigung an das Shop-Team per Mail — server-side ONLY.
 *
 * Nutzt den bestehenden Kontakt-Endpoint des Jäger-Plugins
 * (`/wp-json/jaeger/v1/contact`, `wp_mail()`), damit kein Plugin-Deploy nötig
 * ist. Folgen davon:
 * - Das Plugin stellt dem Betreff fest „[Kontaktformular] “ voran.
 * - Der Betreff passt zu keinem Routing-Slug → Empfänger ist das
 *   Fallback-Postfach des Plugins (info@, CC dd@).
 * - `replyTo` landet als Reply-To-Header — bei Bestellproblemen die
 *   Kunden-Mail, damit das Team direkt antworten kann.
 *
 * Wirft NIE: Ein Mail-Fehler darf den Aufrufer (z.B. den Checkout nach einem
 * PayPal-Capture) nicht abbrechen. Rückgabe `false` = nicht zugestellt,
 * Details stehen im Log.
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

/** Absender-Angaben, falls kein Kunde bekannt ist. */
const FALLBACK_NAME = 'Bodenjäger Shop';
const FALLBACK_EMAIL = 'service@bodenjaeger.de';
/** Standard-Timeout für den Mail-Aufruf an WordPress. */
const DEFAULT_TIMEOUT_MS = 6000;

export interface ShopNotification {
  /** Betreff OHNE „[Kontaktformular] “ — den setzt das Plugin selbst. */
  subject: string;
  /** Plain-Text-Inhalt, Zeilenumbrüche bleiben erhalten. */
  message: string;
  replyTo?: { name?: string; email?: string; phone?: string };
  /** Eigenes Timeout in ms (Standard 6000). */
  timeoutMs?: number;
}

export async function notifyShop(notification: ShopNotification): Promise<boolean> {
  const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
  const sharedSecret = process.env.JAEGER_CONTACT_SECRET?.trim();

  if (!wpUrl || !sharedSecret) {
    console.error('[shop-notification] NEXT_PUBLIC_WORDPRESS_URL oder JAEGER_CONTACT_SECRET fehlt — Mail nicht gesendet', {
      subject: notification.subject,
    });
    return false;
  }

  const name = notification.replyTo?.name?.trim() || FALLBACK_NAME;
  const email = notification.replyTo?.email?.trim() || FALLBACK_EMAIL;

  try {
    // Eigenes Timeout: Hängt WordPress, darf die Mail den Aufrufer nicht
    // mit in den maxDuration-Abbruch ziehen.
    const res = await fetchWithTimeout(
      `${wpUrl}/wp-json/jaeger/v1/contact`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Jaeger-Secret': sharedSecret,
        },
        body: JSON.stringify({
          name,
          email,
          phone: notification.replyTo?.phone ?? '',
          subject: notification.subject,
          message: notification.message,
        }),
      },
      notification.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[shop-notification] WordPress error:', res.status, text, {
        subject: notification.subject,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[shop-notification] fetch error:', error, { subject: notification.subject });
    return false;
  }
}
