/** Sperrt die Seite im Hintergrund zuverlässig, auch auf iPhones. Liefert die Freigabe zurück. */
export function lockPageScroll(): () => void {
  const scrollY = window.scrollY;
  const { position, top, width, overflowY } = document.body.style;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll';
  return () => {
    Object.assign(document.body.style, { position, top, width, overflowY });
    window.scrollTo({ top: scrollY, behavior: 'instant' });
  };
}
