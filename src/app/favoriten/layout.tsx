import type { Metadata } from 'next';

// /favoriten ist eine Client-Seite (localStorage) und kann selbst keine Metadaten
// exportieren. Für Crawler immer leer → noindex, follow.
export const metadata: Metadata = {
  title: 'Meine Favoriten | Bodenjäger',
  description: 'Deine gemerkten Bodenbeläge bei Bodenjäger auf einen Blick.',
  robots: { index: false, follow: true },
};

export default function FavoritenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
