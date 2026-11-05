'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

const ABSTAND_OBEN = 96;
const ABSTAND_UNTEN = 16;

/**
 * Spalte, die am Desktop mitläuft und bündig mit den Nachbarspalten endet.
 * Ist sie höher als das Fenster, scrollt sie erst bis zu ihrem unteren Rand.
 */
export default function StickyColumn({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(ABSTAND_OBEN);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      setTop(Math.min(ABSTAND_OBEN, window.innerHeight - element.offsetHeight - ABSTAND_UNTEN));
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
    <div ref={ref} style={{ top }} className={className}>
      {children}
    </div>
  );
}
