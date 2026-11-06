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
        <div className="rounded-xl bg-white p-6">
          <p className="text-6xl font-bold leading-none tracking-tight text-dark">{note}</p>
          <p className="mt-2.5 text-xl tracking-widest text-[#e8a600]" aria-label={`${note} von 5 Sternen`}>★★★★★</p>
          <p className="mt-1.5 text-sm text-mid">
            {google.reviewCount ? `aus ${google.reviewCount.toLocaleString('de-DE')} Google-Bewertungen` : 'Google-Bewertung'}
          </p>
          {trustedShops && (
            <p className="mt-4 flex items-center gap-2.5 border-t border-ash pt-4 text-sm text-dark">
              <Image src="/images/trusted-shops/Trustmark-RGB.png" alt="" width={1250} height={1250} className="h-8 w-8 object-contain" />
              <span>
                <strong className="font-bold">
                  {trustedShops.note.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </strong>{' '}
                Trusted Shops · Käuferschutz
              </span>
            </p>
          )}
        </div>
        {auswahl.map((r) => (
          <figure key={r.author} className="rounded-xl bg-white p-6">
            <p className="mb-2.5 tracking-widest text-[#e8a600]" aria-label={`${r.rating} von 5 Sternen`}>
              {'★'.repeat(r.rating)}
            </p>
            <blockquote className="mb-3.5 line-clamp-5 text-[15px] leading-relaxed text-dark">„{r.text}“</blockquote>
            <figcaption className="text-sm font-bold text-dark">
              {kurzName(r.author)} <span className="font-normal text-mid">· Google</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
