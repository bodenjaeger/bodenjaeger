'use client';

import { useEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface MobileBuyBarProps {
  /** Großer Warenkorb-Button: Die Leiste erscheint, wenn er nicht im Bild ist */
  targetRef: RefObject<HTMLElement | null>;
  price: string;
  details: string;
  onAction: () => void;
  action: ReactNode;
}

/** Feste Kaufleiste am unteren Rand (nur mobil), liegt über der Seite und enthält den Kontakt. */
export default function MobileBuyBar({ targetRef, price, details, onAction, action }: MobileBuyBarProps) {
  const [targetVisible, setTargetVisible] = useState(true);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  // Mobil keine schwebenden Buttons im Kaufbereich, das Trustbadge rutscht über die Leiste (globals.css)
  useEffect(() => {
    document.body.classList.toggle('kaufleiste-sichtbar', !targetVisible);
    document.body.classList.add('kaufbereich');
    return () => document.body.classList.remove('kaufleiste-sichtbar', 'kaufbereich');
  }, [targetVisible]);

  // Mobile Browserleisten fahren beim Scrollen ein und aus: Leiste am sichtbaren Rand halten
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const verdeckt = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--kaufleiste-abstand', `${Math.round(verdeckt)}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--kaufleiste-abstand');
    };
  }, []);

  if (targetVisible) return null;

  return createPortal(
    <div
      style={{ bottom: 'var(--kaufleiste-abstand, 0px)' }}
      className="fixed inset-x-0 z-30 border-t border-ash bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('kontakt-oeffnen'))}
          aria-label="Kontakt öffnen"
          className="flex h-12 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand active:opacity-80"
        >
          <Image src="/images/Icons/kontakt-weiss.png" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-lg font-bold leading-tight text-dark">{price}</p>
          <p className="truncate text-xs text-mid">{details}</p>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="flex min-h-12 flex-shrink-0 items-center gap-2 rounded-lg bg-dark px-3 text-sm font-bold text-white sm:px-4"
        >
          {action}
        </button>
      </div>
    </div>,
    document.body
  );
}
