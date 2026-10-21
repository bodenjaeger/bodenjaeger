'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

type Prefs = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const CookieConsent: React.FC = () => {
  const { isBannerOpen, acceptAll, rejectAll, savePreferences, closeBanner, hasDecided } =
    useCookieConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({
    functional: false,
    analytics: false,
    marketing: false,
  });

  if (!isBannerOpen) return null;

  const handleSave = () => {
    savePreferences(prefs);
    setShowSettings(false);
  };

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
    >
      <div className="relative w-full max-w-2xl bg-dark text-white rounded-lg shadow-2xl border-2 border-brand max-h-[90vh] overflow-y-auto p-6">
        {!showSettings ? (
          <div className="flex flex-col gap-6">
            <div className="text-sm leading-relaxed">
              <h2 className="font-bold text-xl mb-3">Wir verwenden Cookies</h2>
              <p className="text-white/90">
                Diese Website verwendet Cookies und ähnliche Technologien, um die Nutzung zu
                ermöglichen, Inhalte zu personalisieren, Funktionen für soziale Medien anzubieten
                und Zugriffe zu analysieren. Details findest du in unserer{' '}
                <Link href="/datenschutz" className="underline hover:text-brand">
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex-1 px-4 py-3 text-sm font-medium border border-white/40 hover:border-white rounded transition-colors"
              >
                Einstellungen
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="flex-1 px-4 py-3 text-sm font-medium border border-white/40 hover:border-white rounded transition-colors"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 px-4 py-3 text-sm font-bold bg-brand hover:bg-brand/90 text-white rounded transition-colors"
              >
                Alle akzeptieren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-base mb-1">Cookie-Einstellungen</h2>
                <p className="text-sm text-white/80">
                  Wähle selbst, welche Kategorien du zulassen möchtest. Notwendige Cookies sind
                  immer aktiv, da die Website sonst nicht funktioniert.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                aria-label="Einstellungen schließen"
                className="text-white/70 hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <CategoryRow
                title="Notwendig"
                description="Für den Betrieb der Website erforderlich (Warenkorb, Login, Sicherheit). Kann nicht deaktiviert werden."
                checked={true}
                disabled
              />
              <CategoryRow
                title="Funktional"
                description="Erweiterte Funktionen wie gespeicherte Präferenzen, Wunschliste und Komfort-Features."
                checked={prefs.functional}
                onChange={() => toggle('functional')}
              />
              <CategoryRow
                title="Analyse"
                description="Anonymisierte Statistiken über die Nutzung der Website, z.B. Seitenaufrufe und Verweildauer."
                checked={prefs.analytics}
                onChange={() => toggle('analytics')}
              />
              <CategoryRow
                title="Marketing"
                description="Personalisierte Werbung, Retargeting und Tracking-Pixel von Drittanbietern (z.B. Meta, TikTok, Google Ads, OpenAI/ChatGPT)."
                checked={prefs.marketing}
                onChange={() => toggle('marketing')}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                type="button"
                onClick={rejectAll}
                className="px-4 py-2 text-sm font-medium border border-white/40 hover:border-white rounded transition-colors"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium border border-white/40 hover:border-white rounded transition-colors"
              >
                Auswahl speichern
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-bold bg-brand hover:bg-brand/90 text-white rounded transition-colors"
              >
                Alle akzeptieren
              </button>
            </div>

            {hasDecided && (
              <button
                type="button"
                onClick={closeBanner}
                className="text-xs text-white/60 hover:text-white self-end"
              >
                Schließen ohne Änderung
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface CategoryRowProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}) => {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded border border-white/20 ${
        disabled ? 'opacity-80' : 'cursor-pointer hover:border-white/40'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 w-4 h-4 accent-brand shrink-0"
      />
      <div>
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-white/70 mt-0.5">{description}</div>
      </div>
    </label>
  );
};

export default CookieConsent;
