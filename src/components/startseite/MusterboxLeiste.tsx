import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* Schmale grüne Leiste direkt unter dem Aktions-Slider.
   Grün wie der Muster-Button auf Karten und Produktseite (bg-cta), damit
   die Funktion überall gleich aussieht. Bewusst flach gehalten: Sie soll
   auffallen, aber dem Slider nicht die Bühne nehmen. */
export default function MusterboxLeiste() {
  return (
    <section aria-label="Gratis Musterbox" className="content-container pt-4">
      <Link
        href="/category/musterbox"
        className="group flex flex-col gap-3 rounded-xl bg-cta px-5 py-4 text-white transition-colors hover:bg-cta-dark sm:flex-row sm:items-center sm:gap-5 sm:px-6"
      >
        <span className="flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
            <Image src="/images/Icons/musterbox-weiss.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight">Gratis Musterbox: erst fühlen, dann kaufen.</span>
            <span className="block text-sm leading-snug text-white/90">
              Bis zu 3 Muster kostenlos nach Hause – bei deinem Licht, neben deinen Möbeln.
            </span>
          </span>
        </span>
        <span className="flex min-h-11 items-center justify-center gap-2 self-stretch rounded-lg bg-white px-5 text-sm font-bold text-cta sm:ml-auto sm:self-auto">
          Muster auswählen
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2.5} aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
