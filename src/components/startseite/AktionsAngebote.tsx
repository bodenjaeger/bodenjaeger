'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import UnifiedProductCard from '@/components/UnifiedProductCard';
import type { StoreApiProduct } from '@/lib/woocommerce';

export type AngebotsReiter = 'vinyl' | 'laminat' | 'parkett';

const REITER: Array<{ value: AngebotsReiter; label: string }> = [
  { value: 'vinyl', label: 'Vinyl' },
  { value: 'laminat', label: 'Laminat' },
  { value: 'parkett', label: 'Parkett' },
];

interface Props {
  gruppen: Record<AngebotsReiter, StoreApiProduct[]>;
  /** Zubehör (Dämmung/Sockelleiste) je Produkt-ID, für den Streichpreis auf der Karte */
  zubehoer: Record<number, StoreApiProduct>;
  promoActive: boolean;
  /** ISO-Zeitpunkt des Aktionsendes, nur während der Aktion */
  promoEnde: string | null;
  promoEndeLabel: string | null;
  alleHref: string;
  alleLabel: string;
}

function zweistellig(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/* Countdown erst nach dem Laden rechnen: Server und Browser haben
   unterschiedliche Uhrzeiten, sonst passt das HTML nicht zusammen. */
function Countdown({ ende }: { ende: string }) {
  const [jetzt, setJetzt] = useState<number | null>(null);

  useEffect(() => {
    setJetzt(Date.now());
    const timer = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rest = jetzt === null ? null : Math.max(0, new Date(ende).getTime() - jetzt);
  const felder = [
    { label: 'Tage', wert: rest === null ? '–' : String(Math.floor(rest / 864e5)) },
    { label: 'Std.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 864e5) / 36e5)) },
    { label: 'Min.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 36e5) / 6e4)) },
    { label: 'Sek.', wert: rest === null ? '–' : zweistellig(Math.floor((rest % 6e4) / 1e3)) },
  ];

  return (
    <div className="flex gap-2" role="timer" aria-label="Verbleibende Zeit der Black Weeks">
      {felder.map((f) => (
        <div key={f.label} className="min-w-[60px] rounded-xl bg-dark px-1.5 py-2 text-center text-white lg:min-w-[66px]">
          <p className="text-2xl font-bold leading-none tabular-nums">{f.wert}</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-wider text-ash">{f.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AktionsAngebote({
  gruppen,
  zubehoer,
  promoActive,
  promoEnde,
  promoEndeLabel,
  alleHref,
  alleLabel,
}: Props) {
  const verfuegbar = REITER.filter((r) => gruppen[r.value].length > 0);
  const [reiter, setReiter] = useState<AngebotsReiter | null>(verfuegbar[0]?.value ?? null);

  if (!reiter) return null;
  const produkte = gruppen[reiter];

  return (
    <section className="content-container pt-16 lg:pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand">
            {promoActive ? `Black Weeks${promoEndeLabel ? ` · nur bis ${promoEndeLabel}` : ''}` : 'Angebote'}
          </p>
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold leading-[1.05] tracking-tight text-dark">
            {promoActive ? 'Unsere stärksten Preise des Jahres.' : 'Unsere aktuellen Angebote.'}
          </h2>
        </div>
        {promoActive && promoEnde && <Countdown ende={promoEnde} />}
      </div>

      {verfuegbar.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Bodenart wählen">
          {verfuegbar.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={reiter === r.value}
              onClick={() => setReiter(r.value)}
              className={`min-h-11 rounded-full border px-5 text-sm font-bold transition-colors ${
                reiter === r.value
                  ? 'border-[#d11820] bg-[#d11820] text-white'
                  : 'border-ash bg-white text-dark hover:border-mid'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {produkte.map((product) => (
          <UnifiedProductCard
            key={product.id}
            product={product}
            daemmungProduct={product.daemmung_id ? (zubehoer[product.daemmung_id] ?? null) : null}
            sockelleisteProduct={product.sockelleisten_id ? (zubehoer[product.sockelleisten_id] ?? null) : null}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href={alleHref}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-brand px-7 font-bold text-white transition-colors hover:bg-[#d11820]"
        >
          {alleLabel}
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
