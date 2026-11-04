'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  consent as consentApi,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  type ConsentDecisionAction,
} from '@/lib/analytics/track';

export interface CookieCategories {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsent {
  categories: CookieCategories;
  timestamp: number;
  version: number;
}

export interface CookieConsentContextType {
  consent: CookieConsent | null;
  hasDecided: boolean;
  isBannerOpen: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (prefs: Omit<CookieCategories, 'necessary'>) => void;
  openBanner: () => void;
  closeBanner: () => void;
  isAllowed: (category: keyof CookieCategories) => boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export const useCookieConsent = (): CookieConsentContextType => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

interface CookieConsentProviderProps {
  children: ReactNode;
}

export const CookieConsentProvider: React.FC<CookieConsentProviderProps> = ({ children }) => {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBannerOpen, setIsBannerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (raw) {
        const parsed: CookieConsent = JSON.parse(raw);
        if (parsed.version === CONSENT_VERSION) {
          setConsent(parsed);
        }
      }
    } catch {
      // ignore malformed storage
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!consent) {
      setIsBannerOpen(true);
    }
  }, [isLoaded, consent]);

  const persist = useCallback((categories: CookieCategories, action: ConsentDecisionAction) => {
    const next: CookieConsent = {
      categories,
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    setConsent(next);
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota errors
    }
    // Reihenfolge: erst Consent Mode Update, dann das Event — so werten Tags,
    // die auf `cookie_consent` feuern, schon den neuen Consent-Status aus.
    // Widerruf (Banner erneut öffnen) läuft ebenfalls hier durch und setzt
    // abgewählte Kategorien wieder auf denied.
    // Folgeseiten: Das Update aus dem gespeicherten Eintrag setzt das
    // Head-Script (CONSENT_HEAD_SCRIPT in app/layout.tsx).
    consentApi.update(categories);
    // Consent-Entscheidung als GA4-Event — bewusst nur hier (echte Nutzeraktion
    // über den Banner), nicht beim Re-Signaling des Consent Mode auf Folge-Seiten.
    consentApi.decision(action, categories);
    setIsBannerOpen(false);
  }, []);

  const acceptAll = useCallback(() => {
    persist({ necessary: true, functional: true, analytics: true, marketing: true }, 'accept_all');
  }, [persist]);

  const rejectAll = useCallback(() => {
    persist({ necessary: true, functional: false, analytics: false, marketing: false }, 'reject_all');
  }, [persist]);

  const savePreferences = useCallback(
    (prefs: Omit<CookieCategories, 'necessary'>) => {
      persist({ necessary: true, ...prefs }, 'save_preferences');
    },
    [persist]
  );

  const openBanner = useCallback(() => setIsBannerOpen(true), []);
  const closeBanner = useCallback(() => setIsBannerOpen(false), []);

  const isAllowed = useCallback(
    (category: keyof CookieCategories): boolean => {
      if (category === 'necessary') return true;
      return consent?.categories[category] === true;
    },
    [consent]
  );

  const value: CookieConsentContextType = {
    consent,
    hasDecided: consent !== null,
    isBannerOpen,
    acceptAll,
    rejectAll,
    savePreferences,
    openBanner,
    closeBanner,
    isAllowed,
  };

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
};
