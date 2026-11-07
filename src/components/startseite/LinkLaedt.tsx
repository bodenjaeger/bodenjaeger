'use client';

import { useLinkStatus } from 'next/link';

/* Markierung für den gerade angeklickten Link, solange die Zielseite lädt.
   Muss innerhalb eines <Link> stehen (der Link braucht `relative`).
   - "chip": roter Rahmen und zarte, pulsierende rote Fläche über dem ganzen Chip
   - "kreis": roter Rand im runden Bild, aufgehellt, mit Kreisel in der Mitte (das Element braucht `relative`) */
export default function LinkLaedt({ form }: { form: 'chip' | 'kreis' }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  const kreisel = (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d11820] border-t-transparent" aria-hidden="true" />
  );

  if (form === 'kreis') {
    return (
      <span className="absolute inset-0 flex items-center justify-center rounded-full border-[3px] border-[#d11820] bg-white/60">
        <span className="sr-only">Lädt …</span>
        {kreisel}
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute inset-0 animate-pulse rounded-[inherit] border-2 border-[#d11820] bg-[#d11820]/10">
      <span className="sr-only">Lädt …</span>
    </span>
  );
}
