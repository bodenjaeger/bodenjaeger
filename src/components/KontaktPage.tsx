'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { WordPressPage } from '@/lib/wordpress';
import { demoteWpH1 } from '@/lib/wp-content';

interface KontaktPageProps {
  page: WordPressPage;
}

interface WordPressContentProps {
  html: string;
}

// Ausgelagert und memoisiert, damit der injizierte WordPress-HTML-Block (inkl. <img>)
// nicht bei jeder formData-Änderung (Tastatureingabe) neu gerendert wird.
const WordPressContent = memo(function WordPressContent({ html }: WordPressContentProps) {
  if (!html || html.trim().length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="content-container">
        <div
          className="prose prose-lg max-w-4xl mx-auto
            prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6
            prose-h2:text-2xl prose-h2:font-bold prose-h2:mb-4 prose-h2:mt-8
            prose-p:text-gray-700 prose-p:mb-4
            prose-a:text-brand prose-a:hover:underline
            prose-img:rounded-xl prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: demoteWpH1(html) }}
        />
      </div>
    </section>
  );
});

export default function KontaktPage({ page }: KontaktPageProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const isCurrentlyOpen = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hour + minutes / 60;

    if (day === 0) return false;
    if (day === 6) return currentTime >= 9 && currentTime < 14;
    return currentTime >= 9 && currentTime < 18.5;
  };

  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(isCurrentlyOpen());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');

    if (!turnstileToken) {
      setFormStatus('error');
      turnstileRef.current?.reset();
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, turnstileToken, website }),
      });
      const data = await res.json();

      if (res.ok && data.success === true) {
        setFormStatus('success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        setWebsite('');
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    } finally {
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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
              Kontaktiere uns
            </h1>
            <p className="text-lg md:text-xl text-gray-300">
              Wir sind für dich da – persönlich, telefonisch oder per E-Mail.
              Unser Team freut sich auf deine Anfrage!
            </p>

            {/* Availability Badge */}
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
              <span
                className={`w-3 h-3 rounded-full ${
                  open ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="text-sm font-medium text-white">
                {open ? 'Wir sind jetzt erreichbar' : 'Aktuell geschlossen'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="relative -mt-8 z-20">
        <div className="content-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Phone Card */}
            <a
              href="tel:+492433938884"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center border border-gray-100 hover:border-brand/20"
            >
              <div className="w-14 h-14 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
                <svg
                  className="w-6 h-6 text-brand group-hover:text-white transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">Telefon</h3>
              <p className="text-xl font-bold text-brand">02433 938884</p>
              <p className="text-sm text-gray-500 mt-2">Mo-Fr 9-18:30 &middot; Sa 9-14 Uhr</p>
            </a>

            {/* Email Card */}
            <a
              href="mailto:info@bodenjaeger.de"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center border border-gray-100 hover:border-brand/20"
            >
              <div className="w-14 h-14 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
                <svg
                  className="w-6 h-6 text-brand group-hover:text-white transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">E-Mail</h3>
              <p className="text-xl font-bold text-brand">info@bodenjaeger.de</p>
              <p className="text-sm text-gray-500 mt-2">Antwort innerhalb von 24h</p>
            </a>

            {/* Location Card */}
            <a
              href="https://maps.google.com/?q=Neckarstraße+9+41836+Hückelhoven"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-center border border-gray-100 hover:border-brand/20"
            >
              <div className="w-14 h-14 mx-auto mb-4 bg-brand/10 rounded-full flex items-center justify-center group-hover:bg-brand transition-colors duration-300">
                <svg
                  className="w-6 h-6 text-brand group-hover:text-white transition-colors duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-dark mb-1">Fachmarkt</h3>
              <p className="text-sm font-medium text-dark">Neckarstraße 9</p>
              <p className="text-sm text-gray-500">41836 Hückelhoven</p>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content: Form + Info */}
      <section className="py-16 md:py-20">
        <div className="content-container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Contact Form - 3 columns */}
            <div className="lg:col-span-3">
              <h2 className="text-2xl md:text-3xl font-bold text-dark mb-2">
                Schreib uns eine Nachricht
              </h2>
              <p className="text-gray-500 mb-8">
                Fülle das Formular aus und wir melden uns schnellstmöglich bei dir.
              </p>

              {formStatus === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">Nachricht gesendet!</h3>
                  <p className="text-green-600 mb-4">
                    Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.
                  </p>
                  <button
                    onClick={() => setFormStatus('idle')}
                    className="text-green-700 underline hover:no-underline text-sm"
                  >
                    Weitere Nachricht senden
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-dark mb-1.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Max Mustermann"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-dark placeholder:text-gray-400"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-dark mb-1.5">
                        E-Mail *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="max@beispiel.de"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-dark placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-dark mb-1.5">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-dark placeholder:text-gray-400"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-dark mb-1.5">
                        Betreff *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-dark bg-white"
                      >
                        <option value="">Bitte wählen...</option>
                        <option value="beratung">Produktberatung</option>
                        <option value="bestellung">Frage zur Bestellung</option>
                        <option value="reklamation">Reklamation</option>
                        <option value="lieferung">Versand & Lieferung</option>
                        <option value="verlegeservice">Verlegeservice</option>
                        <option value="fachmarkt">Fachmarkt Hückelhoven</option>
                        <option value="sonstiges">Sonstiges</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-dark mb-1.5">
                      Nachricht *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Wie können wir dir helfen?"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-dark placeholder:text-gray-400 resize-vertical"
                    />
                  </div>

                  {/* Honeypot — versteckt, nicht von Menschen ausfüllbar */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      left: '-10000px',
                      top: 'auto',
                      width: '1px',
                      height: '1px',
                      overflow: 'hidden',
                    }}
                  >
                    <label htmlFor="website">Website (bitte leer lassen)</label>
                    <input
                      type="text"
                      id="website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>

                  {/* Cloudflare Turnstile */}
                  <div>
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '').trim()}
                      onSuccess={(t) => setTurnstileToken(t)}
                      onError={() => setTurnstileToken(null)}
                      onExpire={() => setTurnstileToken(null)}
                    />
                  </div>

                  {formStatus === 'error' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      Es ist ein Fehler aufgetreten. Bitte versuche es erneut oder kontaktiere uns telefonisch.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formStatus === 'sending' || !turnstileToken}
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand text-white font-bold rounded-lg hover:bg-[#d11820] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {formStatus === 'sending' ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wird gesendet...
                      </span>
                    ) : (
                      'Nachricht senden'
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Opening Hours */}
              <div className="bg-pale rounded-xl p-6">
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Öffnungszeiten
                </h3>
                <div className="space-y-3">
                  {[
                    { day: 'Montag', time: '9:00 – 18:30 Uhr' },
                    { day: 'Dienstag', time: '9:00 – 18:30 Uhr' },
                    { day: 'Mittwoch', time: '9:00 – 18:30 Uhr' },
                    { day: 'Donnerstag', time: '9:00 – 18:30 Uhr' },
                    { day: 'Freitag', time: '9:00 – 18:30 Uhr' },
                    { day: 'Samstag', time: '9:00 – 14:00 Uhr' },
                    { day: 'Sonntag', time: 'Geschlossen' },
                  ].map(({ day, time }) => {
                    const now = new Date();
                    const dayIndex = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'].indexOf(day);
                    const isToday = now.getDay() === dayIndex;

                    return (
                      <div
                        key={day}
                        className={`flex justify-between items-center text-sm py-1.5 px-2 rounded ${
                          isToday ? 'bg-brand/5 font-medium' : ''
                        }`}
                      >
                        <span className={isToday ? 'text-brand' : 'text-gray-600'}>{day}</span>
                        <span className={isToday ? 'text-brand' : 'text-dark'}>{time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Address Card */}
              <div className="bg-pale rounded-xl p-6">
                <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Fachmarkt Hückelhoven
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>Neckarstraße 9</p>
                  <p>41836 Hückelhoven</p>
                </div>
                <div className="mt-4 space-y-2">
                  <a
                    href="tel:+492433938884"
                    className="flex items-center gap-2 text-sm text-dark hover:text-brand transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    02433 938884
                  </a>
                  <a
                    href="mailto:info@bodenjaeger.de"
                    className="flex items-center gap-2 text-sm text-dark hover:text-brand transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    info@bodenjaeger.de
                  </a>
                </div>
                <a
                  href="https://maps.google.com/?q=Neckarstraße+9+41836+Hückelhoven"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
                >
                  Route planen
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* CTA Phone */}
              <a
                href="tel:+492433938884"
                className="block bg-brand rounded-xl p-6 text-white text-center hover:bg-[#d11820] transition-colors shadow-sm hover:shadow-md"
              >
                <p className="text-sm font-medium mb-1 opacity-90">Schnelle Hilfe?</p>
                <p className="text-2xl font-bold">02433 938884</p>
                <p className="text-sm mt-1 opacity-80">Jetzt anrufen</p>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-pale py-12">
        <div className="content-container">
          <h2 className="text-2xl md:text-3xl font-bold text-dark text-center mb-8">
            Hier findest du uns
          </h2>
          <div className="rounded-xl overflow-hidden shadow-lg max-w-5xl mx-auto" style={{ height: '400px' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2507.5!2d6.2279!3d51.0567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bf5f9b1f1b1b1b%3A0x1234567890abcdef!2sNeckarstra%C3%9Fe+9%2C+41836+H%C3%BCckelhoven!5e0!3m2!1sde!2sde!4v1700000000000!5m2!1sde!2sde"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Bodenjäger Fachmarkt Hückelhoven"
            />
          </div>
        </div>
      </section>

      {/* WordPress Content (if any beyond hero image) */}
      <WordPressContent html={page.content.rendered} />
    </div>
  );
}
