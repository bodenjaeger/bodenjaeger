'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const ABSTAND_FALLBACK = 96;
const ABSTAND_UNTEN = 16;

/**
 * Spalte, die am Desktop mitläuft und bündig mit den Nachbarspalten endet.
 * Ist sie höher als das Fenster, scrollt sie erst bis zu ihrem unteren Rand.
 */
export default function StickyColumn({
  className = '',
  keepInPlace = false,
  children,
}: {
  className?: string;
  /** Spalte bleibt direkt unter dem Kopfbereich stehen, auch wenn sie höher als das Fenster ist */
  keepInPlace?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(ABSTAND_FALLBACK);
  const [headerOffset, setHeaderOffset] = useState(ABSTAND_FALLBACK);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      // Der Kopfbereich klebt oben: Abstand aus seiner sichtbaren Höhe, sonst läge die Spalte darunter
      const header = document.querySelector('header');
      const oben = header
        ? header.offsetHeight + (parseFloat(getComputedStyle(header).top) || 0) + 16
        : ABSTAND_FALLBACK;
      setHeaderOffset(oben);
      setTop(Math.min(oben, window.innerHeight - element.offsetHeight - ABSTAND_UNTEN));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={ref} style={{ top: keepInPlace ? headerOffset : top }} className={className}>
      {children}
    </div>
  );
}
