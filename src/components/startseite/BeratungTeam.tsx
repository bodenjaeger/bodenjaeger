'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MessageCircle, Phone } from 'lucide-react';
import { TEAM_REIHEN } from '@/content/karriere';
import { STANDORT } from '@/content/fachmarkt';
import type { TrustedShopsRating } from '@/lib/trusted-shops';
import type { GoogleReviewSummary } from '@/lib/google-reviews';

/* +49 15567 017510 – öffnet direkt den Chat in WhatsApp (Handy) bzw. WhatsApp Web, mit vorausgefülltem Text */
const WHATSAPP_HREF = `https://wa.me/4915567017510?text=${encodeURIComponent('Hallo Bodenjäger, ich habe eine Frage zu meinem neuen Boden:')}`;

/** Google-„G" als Herkunftsnachweis (wie auf der Fachmarktseite). */
function GoogleLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/** Fünf Sterne, anteilig gefüllt (4,7 → 94 %). */
function Sterne({ wert }: { wert: number }) {
  const anteil = Math.max(0, Math.min(100, (wert / 5) * 100));
  return (
    <span className="relative mt-2 inline-block text-lg leading-none tracking-widest" role="img" aria-label={`${wert.toLocaleString('de-DE')} von 5 Sternen`}>
      <span className="text-ash" aria-hidden="true">★★★★★</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-[#e8a600]" style={{ width: `${anteil}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}

function kurzName(name: string) {
  const teile = name.trim().split(/\s+/);
  return teile.length > 1 ? `${teile[0]} ${teile[teile.length - 1].charAt(0)}.` : teile[0];
}

/* Öffnungszeiten Telefon/Fachmarkt: Mo–Fr 9:00–18:30, Sa 9:00–14:00 (Berliner Zeit) */
function erreichbarkeit(datum: Date): { offen: boolean; text: string } {
  const teile = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(datum);
  const tagName = teile.find((t) => t.type === 'weekday')?.value ?? '';
  const tag = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].indexOf(tagName.slice(0, 2));
  const minuten = Number(teile.find((t) => t.type === 'hour')?.value) * 60 + Number(teile.find((t) => t.type === 'minute')?.value);

  const offen = (tag >= 1 && tag <= 5 && minuten >= 540 && minuten < 1110) || (tag === 6 && minuten >= 540 && minuten < 840);
  if (offen) return { offen, text: 'Jetzt erreichbar – wir sind für dich da' };

  let naechstes = 'Mo 9:00';
  if (tag >= 1 && tag <= 6 && minuten < 540) naechstes = 'heute 9:00';
  else if (tag >= 1 && tag <= 4) naechstes = 'morgen 9:00';
  else if (tag === 5) naechstes = 'Sa 9:00';
  return { offen, text: `Gerade geschlossen – wieder erreichbar ${naechstes}` };
}

export default function BeratungTeam({
  trustedShops,
  google,
}: {
  trustedShops: TrustedShopsRating | null;
  google: GoogleReviewSummary;
}) {
  const [status, setStatus] = useState<{ offen: boolean; text: string } | null>(null);

  useEffect(() => {
    const aktualisieren = () => setStatus(erreichbarkeit(new Date()));
    aktualisieren();
    const timer = setInterval(aktualisieren, 60_000);
    return () => clearInterval(timer);
  }, []);

  const auswahl = google.reviews;
  const note = google.rating.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <section className="content-container pt-20 lg:pt-24">
      <div className="grid items-center gap-10 rounded-2xl bg-dark p-6 text-white sm:p-10 lg:grid-cols-[5fr_6fr] lg:gap-12 lg:p-12">
        <div className="flex flex-col gap-2 lg:gap-3">
          {TEAM_REIHEN.map((reihe, index) => (
            <div key={index} className="flex justify-center gap-2 lg:gap-3">
              {reihe.map((person) => (
                <div key={person.foto} className="relative aspect-square w-[23%] overflow-hidden rounded-full ring-1 ring-white/15">
                  <Image src={`/images/team/${person.foto}.webp`} alt={person.alt} fill sizes="(max-width: 1024px) 25vw, 140px" className="object-cover" />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand">Echte Fachberatung</p>
          <h2 className="text-[clamp(2.2rem,4.2vw,3.6rem)] font-bold leading-none tracking-tight">
            Bodenprofis
            <span className="block text-brand">statt Hotline.</span>
          </h2>
          <p className="mt-5 max-w-[30em] text-lg text-ash">
            Hinter jedem Paket steht unser Team aus dem Fachmarkt Hückelhoven. Wir klären Untergrund, Menge und Zubehör mit dir – und sagen dir ehrlich, welcher Boden zu deinem Raum passt.
          </p>
          <p className="mt-5 flex min-h-6 items-center gap-2.5 font-bold">
            {status && (
              <>
                <span
                  className={`h-[11px] w-[11px] flex-shrink-0 rounded-full ${status.offen ? 'animate-pulse bg-success' : 'bg-[#9a9a9f]'}`}
                  aria-hidden="true"
                />
                {status.text}
              </>
            )}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href={STANDORT.telefonLink} className="flex items-center gap-3.5 rounded-xl bg-white p-4 text-dark transition-transform hover:-translate-y-0.5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand">
                <Phone className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13px] text-mid">Anrufen</span>
                <span className="block text-base font-bold leading-tight sm:text-lg">{STANDORT.telefonAnzeige}</span>
              </span>
            </a>
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 rounded-xl bg-white p-4 text-dark transition-transform hover:-translate-y-0.5">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand">
                <MessageCircle className="h-5 w-5 text-white" strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13px] text-mid">WhatsApp</span>
                <span className="block text-base font-bold leading-tight sm:text-lg">Foto vom Raum schicken</span>
              </span>
            </a>
          </div>
          <p className="mt-4 text-sm text-ash">Mo–Fr 9:00–18:30 · Sa 9:00–14:00 Uhr</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Zwei getrennte Quellen, jede mit eigenem Logo und eigener Note – damit nichts vermischt wirkt */}
        <div className="flex flex-col divide-y divide-ash rounded-xl bg-white px-6">
          <div className="py-5">
            <p className="flex items-center gap-2 text-sm font-bold text-dark">
              <GoogleLogo className="h-5 w-5" />
              Google
            </p>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold leading-none tracking-tight text-dark">{note}</span>
              <span className="text-sm text-mid">Ø Sternebewertung</span>
            </p>
            <Sterne wert={google.rating} />
            <p className="mt-1 text-sm text-mid">
              {google.reviewCount ? `${google.reviewCount.toLocaleString('de-DE')} Bewertungen bei Google` : 'Bewertungen bei Google'}
            </p>
          </div>
          {trustedShops && (
            <div className="py-5">
              <p className="flex items-center gap-2 text-sm font-bold text-dark">
                <Image src="/images/trusted-shops/Trustmark-RGB.png" alt="" width={1250} height={1250} className="h-5 w-5 object-contain" />
                Trusted Shops
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold leading-none tracking-tight text-dark">
                  {trustedShops.note.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span className="text-sm text-mid">Ø Sternebewertung</span>
              </p>
              <Sterne wert={trustedShops.note} />
              <p className="mt-1 text-sm text-mid">Geprüfter Shop mit Käuferschutz</p>
            </div>
          )}
        </div>
        {auswahl.map((r) => (
          <figure key={r.author} className="rounded-xl bg-white p-6">
            <p className="mb-2.5 tracking-widest text-[#e8a600]" aria-label={`${r.rating} von 5 Sternen`}>
              {'★'.repeat(r.rating)}
            </p>
            <blockquote className="mb-3.5 line-clamp-5 text-[15px] leading-relaxed text-dark">„{r.text}“</blockquote>
            <figcaption className="flex items-center gap-2 text-sm font-bold text-dark">
              <GoogleLogo className="h-4 w-4 flex-shrink-0" />
              {kurzName(r.author)} <span className="font-normal text-mid">· Bewertung bei Google</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
