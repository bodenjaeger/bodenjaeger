'use client';

import { useMemo } from 'react';
import { WordPressPage } from '@/lib/wordpress';
import { demoteWpH1 } from '@/lib/wp-content';

interface VersandLieferzeitPageProps {
  page: WordPressPage;
}

const deliverySteps = [
  {
    step: '1',
    title: 'Bestellung aufgeben',
    description: 'Wähle deine Produkte und schließe die Bestellung ab.',
  },
  {
    step: '2',
    title: 'Auftragsbestätigung',
    description: 'Du erhältst eine Bestätigung per E-Mail mit allen Details.',
  },
  {
    step: '3',
    title: 'Versand & Tracking',
    description: 'Sobald deine Bestellung versendet wird, erhältst du eine Sendungsverfolgung.',
  },
  {
    step: '4',
    title: 'Lieferung',
    description: 'Deine Ware wird sicher zu dir nach Hause oder an den gewünschten Ort geliefert.',
  },
];

const faqs = [
  {
    question: 'Wie lange dauert die Lieferung?',
    answer: 'Standard-Paketversand dauert 3–5 Werktage. Speditionslieferungen benötigen 5–8 Werktage. Bei Sonderbestellungen kann es etwas länger dauern.',
  },
  {
    question: 'Kann ich meine Bestellung im Fachmarkt abholen?',
    answer: 'Ja! Wähle bei der Bestellung einfach "Abholung im Fachmarkt" als Versandoption. Wir informieren dich, sobald die Ware bereit liegt.',
  },
  {
    question: 'Wird bis in die Wohnung geliefert?',
    answer: 'Die Speditionslieferung erfolgt standardmäßig bis Bordsteinkante. Eine Lieferung bis zur Verwendungsstelle ist gegen Aufpreis möglich – sprich uns einfach an.',
  },
  {
    question: 'Was passiert bei beschädigter Ware?',
    answer: 'Bitte prüfe die Ware bei Annahme und notiere eventuelle Schäden auf dem Lieferschein. Kontaktiere uns umgehend – wir kümmern uns um den Ersatz.',
  },
];

export default function VersandLieferzeitPage({ page }: VersandLieferzeitPageProps) {
  const cleanContent = useMemo(() => {
    let clean = page.content.rendered;
    // Remove images to avoid duplicates
    clean = clean.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '');
    clean = clean.replace(/<img[^>]*>/gi, '');
    clean = clean.replace(/<div[^>]*>\s*<\/div>/gi, '');
    clean = clean.replace(/<p>\s*<\/p>/gi, '');
    // Lagerdauer: 12 Monate (WP-Inhalt nennt noch 6 Monate)
    clean = clean.replace(/Kostenlose Lagerung bis zu 6 Monate/gi, 'Kostenlose Lagerung bis zu 12 Monate');
    clean = clean.replace(/bis zu 6 Monate kostenlos/gi, 'bis zu 12 Monate kostenlos');
    // Zwischenüberschriften sind im WP-Editor als H1 angelegt → H2 (eine H1 pro Seite)
    return demoteWpH1(clean);
  }, [page.content.rendered]);

  const hasContent = cleanContent.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section
        className="relative w-full py-16 md:py-24"
        style={{ background: 'var(--gradient-dark)' }}
      >
        <div className="content-container relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              Versand & Lieferzeit
            </h1>
            <p className="text-lg md:text-xl text-gray-300">
              Schnell, sicher und zuverlässig – so kommt dein neuer Boden zu dir nach Hause.
            </p>
          </div>
        </div>
      </section>

      {/* WordPress Content */}
      {hasContent && (
        <section className="py-16 md:py-20">
          <div className="content-container">
            <div
              suppressHydrationWarning
              className="prose prose-lg max-w-3xl mx-auto
                [&_.wp-h1]:text-4xl [&_.wp-h1]:font-bold [&_.wp-h1]:text-dark [&_.wp-h1]:mb-6 [&_.wp-h1]:mt-10
                [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-bold [&_h2]:text-dark [&_h2]:mb-4 [&_h2]:mt-14
                [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:font-bold [&_h3]:text-dark [&_h3]:mb-3 [&_h3]:mt-10
                [&_p]:text-gray-600 [&_p]:mb-4 [&_p]:leading-relaxed
                [&_a]:text-brand [&_a]:hover:underline
                [&_ul]:text-gray-600 [&_ul]:mb-4
                [&_ol]:text-gray-600 [&_ol]:mb-4
                [&_li]:mb-2
                [&_strong]:text-dark
                [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-lg [&_table]:overflow-hidden
                [&_th]:bg-dark [&_th]:text-white [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-bold
                [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm [&_td]:border-b [&_td]:border-gray-100
                [&_tr:nth-child(even)]:bg-pale"
              dangerouslySetInnerHTML={{ __html: cleanContent }}
            />
          </div>
        </section>
      )}

      {/* Delivery Process */}
      <section className="py-16 md:py-20 bg-pale">
        <div className="content-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-3">
              So funktioniert die Lieferung
            </h2>
            <p className="text-gray-500 text-lg">
              Von der Bestellung bis zur Lieferung – in vier einfachen Schritten.
            </p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {deliverySteps.map((step, index) => (
              <div key={step.step} className="relative text-center">
                {/* Connector line */}
                {index < deliverySteps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] h-[2px] bg-gray-200" />
                )}
                <div className="w-14 h-14 mx-auto mb-4 bg-brand rounded-full flex items-center justify-center text-white text-xl font-bold relative z-10">
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-dark mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20">
        <div className="content-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-3">
              Häufige Fragen
            </h2>
            <p className="text-gray-500 text-lg">
              Antworten auf die wichtigsten Fragen rund um Versand und Lieferung.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                  <h3 className="text-base font-bold text-dark pr-4">{faq.question}</h3>
                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-pale">
        <div className="content-container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-3">
              Noch Fragen zum Versand?
            </h2>
            <p className="text-gray-500 text-lg mb-8">
              Unser Team hilft dir gerne weiter – persönlich, telefonisch oder per E-Mail.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+492433938884"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand text-white font-bold rounded-lg hover:bg-[#d11820] transition-colors shadow-sm hover:shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                02433 938884
              </a>
              <a
                href="/kontakt"
                className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-dark text-dark font-bold rounded-lg hover:bg-dark hover:text-white transition-colors"
              >
                Zum Kontaktformular
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
