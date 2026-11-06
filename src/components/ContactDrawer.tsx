'use client';

import { FensterKopf } from '@/components/shared/SchliessenButton';
import { useEffect } from 'react';
import Link from 'next/link';

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactDrawer({ isOpen, onClose }: ContactDrawerProps) {
  // Escape key handler
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);

      // Seite dahinter sperren – am <html> wie beim Warenkorb, sonst springt der klebende Kopf
      const root = document.documentElement;
      const previousOverflow = root.style.overflow;
      root.style.overflow = 'hidden';

      return () => {
        window.removeEventListener('keydown', handleEscape);
        root.style.overflow = previousOverflow;
      };
    }
  }, [isOpen, onClose]);

  // Check if currently open (Mo-Fr 9-18:30, Sa 9-14, So closed)
  const isCurrentlyOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hour + minutes / 60;

    if (day === 0) return false; // Sonntag geschlossen
    if (day === 6) return currentTime >= 9 && currentTime < 14; // Samstag 9-14
    return currentTime >= 9 && currentTime < 18.5; // Mo-Fr 9-18:30
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-white z-[61] shadow-2xl overflow-y-auto overscroll-contain transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-drawer-title"
      >
        {/* Header */}
        <FensterKopf titel="Kontakt" titelId="contact-drawer-title" onClose={onClose} schliessenLabel="Kontakt schließen" className="sticky top-0 z-10" />

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Intro Text */}
          <p className="text-base text-dark">
            Du brauchst Hilfe oder hast Fragen? Unser Team freut sich darauf, dir weiterzuhelfen!
          </p>

          {/* Availability Indicator */}
          <div className="flex items-center gap-2 p-3 bg-pale rounded-lg">
            <span
              className={`w-3 h-3 rounded-full ${
                isCurrentlyOpen() ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-bold text-dark">
              {isCurrentlyOpen() ? 'Wir sind jetzt erreichbar' : 'Aktuell geschlossen'}
            </span>
          </div>

          {/* Call Section */}
          <div className="space-y-3 p-4 bg-pale rounded-lg">
            <h3 className="text-lg font-bold text-dark">Ruf uns an:</h3>
            <p className="text-sm text-[#666666]">
              Unsere Experten beraten dich gerne persönlich.
            </p>
            <a
              href="tel:+492433938884"
              className="text-3xl font-bold text-dark hover:text-brand transition-colors block"
            >
              02433 938884
            </a>
            <a
              href="tel:+492433938884"
              className="inline-block w-full text-center bg-brand text-white px-6 py-3 rounded-lg hover:bg-[#d11820] transition-colors font-bold"
            >
              Jetzt anrufen
            </a>
          </div>

          {/* Email Section */}
          <div className="space-y-3 p-4 bg-pale rounded-lg">
            <h3 className="text-lg font-bold text-dark">Schreibe uns:</h3>
            <p className="text-sm text-[#666666]">
              Sende uns eine Nachricht, und wir antworten dir so schnell wie möglich.
            </p>
            <Link
              href="/kontakt"
              onClick={onClose}
              className="inline-block w-full text-center bg-brand text-white px-6 py-3 rounded-lg hover:bg-[#d11820] transition-colors font-bold"
            >
              Zum Kontaktformular
            </Link>
          </div>

          {/* Opening Hours Section */}
          <div className="space-y-3 p-4 border border-ash rounded-lg">
            <h3 className="text-lg font-bold text-dark">Service- und Beratungszeiten:</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Mo. bis Fr.</span>
                <span className="font-bold text-dark">9:00 - 18:30 Uhr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Sa.</span>
                <span className="font-bold text-dark">9:00 - 14:00 Uhr</span>
              </div>
            </div>
          </div>

          {/* Additional Contact Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-dark">Weitere Kontaktmöglichkeiten:</h3>

            {/* Address */}
            <div className="flex items-start gap-3 p-3 hover:bg-pale rounded-lg transition-colors">
              <svg
                className="w-6 h-6 text-brand flex-shrink-0 mt-0.5"
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
              <div>
                <p className="font-bold text-dark">Fachmarkt Hückelhoven</p>
                <p className="text-sm text-[#666666]">Neckarstraße 9</p>
                <p className="text-sm text-[#666666]">41836 Hückelhoven</p>
              </div>
            </div>

            {/* Email */}
            <a
              href="mailto:info@bodenjaeger.de"
              className="flex items-start gap-3 p-3 hover:bg-pale rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-brand flex-shrink-0 mt-0.5"
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
              <div>
                <p className="font-bold text-dark">E-Mail</p>
                <p className="text-sm text-brand hover:underline">info@bodenjaeger.de</p>
              </div>
            </a>
          </div>

          {/* Quick Links */}
          <div className="pt-4 border-t border-ash">
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/fachmarkt-hueckelhoven"
                onClick={onClose}
                className="text-center px-4 py-2 border border-ash rounded-lg hover:border-brand hover:text-brand transition-colors text-sm font-bold"
              >
                Fachmarkt
              </Link>
              <Link
                href="/fachmarkt-hueckelhoven/service"
                onClick={onClose}
                className="text-center px-4 py-2 border border-ash rounded-lg hover:border-brand hover:text-brand transition-colors text-sm font-bold"
              >
                Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
