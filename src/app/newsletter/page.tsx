import NewsletterSignup from '@/components/NewsletterSignup';
import { buildMetadata } from '@/lib/seo';

export default function NewsletterPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="content-container">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Newsletter
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Bleiben Sie auf dem Laufenden über neue Produkte, exklusive Angebote und
            Aktionen rund um Bodenbeläge.
          </p>
        </div>

        {/* Newsletter Anmeldung */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <NewsletterSignup />
        </div>

        {/* Vorteile Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Vorteile unseres Newsletters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Exklusive Angebote
                </h3>
                <p className="text-gray-700">
                  Erhalten Sie als Erster Zugang zu unseren Sale-Aktionen und
                  Sonderangeboten – nur für Newsletter-Abonnenten.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Neuheiten zuerst
                </h3>
                <p className="text-gray-700">
                  Seien Sie der Erste, der von neuen Produkten und Kollektionen
                  erfährt – bevor sie online gehen.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Tipps & Inspiration
                </h3>
                <p className="text-gray-700">
                  Regelmäßige Tipps zur Verlegung, Pflege und Design-Inspiration
                  für Ihren Traumboden.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Keine Spam-Mails
                </h3>
                <p className="text-gray-700">
                  Wir versenden maximal 2-3 Newsletter pro Monat – nur relevante
                  Informationen, keine Werbung-Flut.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Datenschutz & FAQ */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Häufig gestellte Fragen
          </h2>

          <div className="space-y-6">
            {/* FAQ 1 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Wie melde ich mich an?
              </h3>
              <p className="text-gray-700">
                Geben Sie einfach Ihre E-Mail-Adresse in das Formular oben ein und klicken
                Sie auf &quot;Anmelden&quot;. Sie erhalten anschließend eine Bestätigungs-E-Mail mit
                einem Link, den Sie anklicken müssen, um Ihre Anmeldung abzuschließen
                (Double Opt-In).
              </p>
            </div>

            {/* FAQ 2 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Wie oft erhalte ich Newsletter?
              </h3>
              <p className="text-gray-700">
                In der Regel versenden wir 2-3 Newsletter pro Monat. Bei besonderen
                Aktionen oder Sale-Events kann es auch mal ein Newsletter mehr sein.
              </p>
            </div>

            {/* FAQ 3 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Kann ich mich jederzeit wieder abmelden?
              </h3>
              <p className="text-gray-700">
                Ja, selbstverständlich! In jedem Newsletter finden Sie am Ende einen
                Abmelde-Link. Mit einem Klick können Sie den Newsletter jederzeit
                kostenlos abbestellen.
              </p>
            </div>

            {/* FAQ 4 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Was passiert mit meinen Daten?
              </h3>
              <p className="text-gray-700">
                Ihre Daten werden ausschließlich für den Newsletter-Versand verwendet
                und nicht an Dritte weitergegeben. Weitere Informationen finden Sie in
                unserer{' '}
                <a href="/datenschutz" className="text-red-600 hover:underline">
                  Datenschutzerklärung
                </a>
                .
              </p>
            </div>

            {/* FAQ 5 */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ich habe keine Bestätigungs-E-Mail erhalten
              </h3>
              <p className="text-gray-700">
                Bitte prüfen Sie Ihren Spam-Ordner. Falls Sie dort auch keine E-Mail
                finden, kontaktieren Sie uns bitte unter{' '}
                <a href="tel:+492433938884" className="text-red-600 hover:underline">
                  02433 938884
                </a>{' '}
                oder per E-Mail.
              </p>
            </div>
          </div>
        </div>

        {/* Backend Setup Info (nur für Entwicklung sichtbar) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mt-8">
            <h2 className="text-2xl font-bold text-yellow-900 mb-4">
              ⚠️ Backend Setup erforderlich
            </h2>
            <p className="text-yellow-800 mb-4">
              Diese Seite ist fertig, aber das WordPress-Backend muss noch konfiguriert werden.
            </p>
            <p className="text-yellow-800 mb-4">
              <strong>Anleitung:</strong> Siehe{' '}
              <code className="bg-yellow-200 px-2 py-1 rounded">
                NEWSLETTER_WORDPRESS_INTEGRATION.md
              </code>
            </p>
            <div className="bg-white rounded p-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Schnellstart:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>WordPress Newsletter Plugin installieren (z.B. &quot;Newsletter Plugin&quot;)</li>
                <li>
                  Custom Endpoint erstellen:{' '}
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm">
                    /wp-json/newsletter/v1/subscribe
                  </code>
                </li>
                <li>Double Opt-In E-Mail konfigurieren</li>
                <li>Testen: Newsletter-Anmeldung durchführen</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const metadata = buildMetadata({
  path: '/newsletter',
  title: 'Newsletter | Bodenjäger',
  description: 'Melden Sie sich für unseren Newsletter an und erhalten Sie exklusive Angebote, Neuheiten und Tipps rund um Bodenbeläge.',
});
