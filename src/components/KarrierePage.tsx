import Image from 'next/image';
import { ArrowRight, Check, Mail, Phone } from 'lucide-react';
import {
  BENEFITS,
  INITIATIV_URL,
  KARRIERE_MAIL,
  LAUFBAND,
  TEAM_REIHEN,
  WEG,
  type Stelle,
} from '@/content/karriere';
import { OEFFNUNGSZEITEN, STANDORT } from '@/content/fachmarkt';

const KICKER = 'mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand';
const H2_STYLE = { fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)' };
const BTN_ROT =
  'inline-flex min-h-[52px] items-center justify-center rounded-xl bg-brand px-7 py-3 text-center font-bold text-white transition-colors hover:bg-[#c8161e]';

function Haken() {
  return (
    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand">
      <Check className="h-4 w-4 text-white" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

function StellenPfeil() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand transition-transform group-hover:translate-x-1 lg:h-12 lg:w-12">
      <ArrowRight className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

export default function KarrierePage({ stellen }: { stellen: Stelle[] }) {
  const zeiten = OEFFNUNGSZEITEN.filter((zeile) => zeile.tag !== 'Sonntag')
    .map((zeile) => `${zeile.tag} ${zeile.zeit}`)
    .join(', ');

  return (
    <div className="bg-white">
      {/* Einstieg */}
      <section className="pt-4 lg:pt-6">
        <div className="content-container">
          <div className="overflow-hidden rounded-[28px] bg-dark px-5 pb-28 pt-8 text-white lg:px-14 lg:pb-36 lg:pt-14">
          <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-8 lg:grid-cols-[6fr_5fr] lg:gap-14">
            <div>
              <h1
                className="font-bold tracking-[-0.035em] text-white"
                style={{ fontSize: 'clamp(2.9rem, 6.6vw, 6.25rem)', lineHeight: 0.98 }}
              >
                Wir suchen die nächsten <span className="block text-brand">Bodenjäger.</span>
              </h1>
              <p className="mt-5 max-w-[30em] text-[17px] leading-normal text-ash lg:mt-7 lg:text-xl">
                Werde Teil eines engagierten Teams, das Handwerksqualität und digitale Innovation vereint.
                Bewirb dich in nur wenigen Minuten, ein Anschreiben brauchst du nicht.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 lg:mt-8">
                <a href="#stellen" className={`${BTN_ROT} w-full sm:w-auto`}>
                  Offene Stellen ansehen
                </a>
                <a
                  href="#kontakt"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/50 px-7 py-3 font-bold text-white transition-colors hover:border-white sm:w-auto"
                >
                  Erst mal kurz sprechen
                </a>
              </div>
            </div>
            <div>
              <div className="flex flex-col gap-2 lg:gap-3">
                {TEAM_REIHEN.map((reihe, index) => (
                  <div key={index} className="flex justify-center gap-2 lg:gap-3">
                    {reihe.map((person) => (
                      <div
                        key={person.foto}
                        className="relative aspect-square w-[23%] overflow-hidden rounded-full ring-1 ring-white/15"
                      >
                        <Image
                          src={`/images/team/${person.foto}.webp`}
                          alt={person.alt}
                          fill
                          priority
                          quality={90}
                          sizes="(max-width: 1024px) 25vw, 160px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Offene Stellen */}
      <section id="stellen" className="relative z-[2] -mt-[72px] scroll-mt-40 lg:-mt-[88px]">
        <div className="content-container">
          <div className="mx-2 rounded-[22px] bg-white p-2 shadow-[0_24px_60px_rgba(46,45,50,0.16)] lg:mx-8 lg:rounded-[28px] lg:p-4">
            <h2 className="p-3 text-[22px] font-bold text-dark lg:px-5 lg:py-4 lg:text-[28px]">Offene Stellen</h2>
            {stellen.map((stelle) => (
              <a
                key={stelle.id}
                href={stelle.joinUrl} target="_blank" rel="noopener noreferrer"
                className="group grid grid-cols-[48px_minmax(0,1fr)_40px] items-center gap-3 border-t border-ash px-3 py-3.5 transition-colors hover:bg-pale lg:grid-cols-[64px_minmax(0,1fr)_48px] lg:gap-5 lg:px-5 lg:py-4"
              >
                <span className="relative h-12 w-12 overflow-hidden rounded-full lg:h-16 lg:w-16">
                  <Image
                    src={stelle.bild}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-cover"
                    style={{ objectPosition: stelle.bildPosition }}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold leading-snug text-dark lg:text-xl">{stelle.titel}</span>
                  <span className="mt-0.5 flex items-center gap-2.5 text-[13px] text-mid lg:text-sm">
                    <span className="rounded-full bg-dark px-2.5 py-0.5 text-xs font-bold text-white">Ab sofort</span>
                    {stelle.umfang}
                  </span>
                </span>
                <StellenPfeil />
              </a>
            ))}
            <a
              href={INITIATIV_URL} target="_blank" rel="noopener noreferrer"
              className="group grid grid-cols-[48px_minmax(0,1fr)_40px] items-center gap-3 border-t border-ash px-3 py-3.5 transition-colors hover:bg-pale lg:grid-cols-[64px_minmax(0,1fr)_48px] lg:gap-5 lg:px-5 lg:py-4"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-ash text-2xl font-bold text-dark lg:h-16 lg:w-16 lg:text-[32px]"
              >
                ?
              </span>
              <span className="min-w-0">
                <span className="block font-bold leading-snug text-dark lg:text-xl">Initiativbewerbung</span>
                <span className="text-[13px] text-mid lg:text-sm">
                  Marketing, Kundenservice, Logistik, Handwerk oder IT
                </span>
              </span>
              <StellenPfeil />
            </a>
          </div>
        </div>
      </section>

      {/* Laufband */}
      <div className="mt-10 overflow-hidden bg-brand font-bold text-white lg:mt-[72px] lg:text-xl" aria-hidden="true">
        <div className="karriere-laufband flex w-max">
          {[...LAUFBAND, ...LAUFBAND].map((text, index) => (
            <span key={index} className="flex items-center gap-5 whitespace-nowrap px-2.5 py-3 lg:gap-7 lg:px-3.5 lg:py-4">
              {text}
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          ))}
        </div>
      </div>

      {/* Stellen im Detail */}
      {stellen.length > 0 && (
        <section className="py-14 lg:py-24">
          <div className="content-container">
            <p className={KICKER}>Dein Alltag</p>
            <h2 className="mb-10 font-bold text-dark lg:mb-14" style={H2_STYLE}>
              Was du bei uns machst
            </h2>
            <div className="space-y-14 lg:space-y-24">
              {stellen.map((stelle, index) => (
                <article key={stelle.id} className="grid grid-cols-[minmax(0,1fr)] items-center gap-5 lg:grid-cols-2 lg:gap-[72px]">
                  <div
                    className={`relative aspect-[5/4] overflow-hidden rounded-[28px] ${index % 2 ? 'lg:order-2' : ''}`}
                  >
                    <Image
                      src={stelle.bild}
                      alt={stelle.bildAlt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 680px"
                      className="object-cover"
                      style={{ objectPosition: stelle.bildPosition }}
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-1.5 text-[13px] font-bold">
                      <span className="rounded-full bg-dark px-3 py-1 text-white">{stelle.umfang}</span>
                      <span className="rounded-full bg-ash px-3 py-1 text-dark">Hückelhoven</span>
                    </div>
                    <h3
                      className="mb-5 mt-3.5 font-bold tracking-[-0.02em] text-dark"
                      style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.9rem)', lineHeight: 1.1 }}
                    >
                      {stelle.headline}
                    </h3>
                    <ul className="mb-5 space-y-2.5">
                      {stelle.aufgaben.map((aufgabe) => (
                        <li key={aufgabe} className="flex gap-3 text-dark">
                          <Haken />
                          <span>{aufgabe}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-mid">
                      <strong className="text-dark">Das brauchst du:</strong> {stelle.anforderung}
                    </p>
                    <a href={stelle.joinUrl} target="_blank" rel="noopener noreferrer" className={`${BTN_ROT} mt-6 w-full sm:w-auto`}>
                      {stelle.cta}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      <section className="bg-pale py-14 lg:py-24">
        <div className="content-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className={KICKER}>Benefits</p>
            <h2 className="font-bold text-dark" style={H2_STYLE}>
              Darauf kannst du dich freuen
            </h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-8">
            {BENEFITS.map((benefit) => (
              <div key={benefit.titel} className="flex gap-3">
                <Haken />
                <div>
                  <h3 className="font-bold text-dark">{benefit.titel}</h3>
                  <p className="mt-1 text-[15px] text-mid">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Arbeitsplatz */}
      <section className="py-14 lg:py-24">
        <div className="content-container grid grid-cols-[minmax(0,1fr)] items-center gap-6 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl">
            <Image
              src="/images/jobs/fachmarkt-aussen-original.png"
              alt="Der Bodenjäger-Fachmarkt in Hückelhoven"
              fill
              sizes="(max-width: 1024px) 100vw, 780px"
              className="object-cover"
            />
          </div>
          <div>
            <p className={KICKER}>Dein Arbeitsplatz</p>
            <h2 className="font-bold text-dark" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', lineHeight: 1.15 }}>
              Willkommen bei Bodenjäger!
            </h2>
            <p className="mt-4 text-mid lg:text-lg">
              Aus einem traditionellen Handwerksbetrieb gewachsen, sind wir heute im stationären und digitalen Handel
              aktiv. Unser Antrieb? Die Leidenschaft für hochwertige Bodenbeläge und der Anspruch, unseren Kunden den
              besten Service zu bieten.
            </p>
            <p className="mt-4 text-mid lg:text-lg">
              Unser Erfolg basiert auf einem Team, das hinter unserer Mission steht. Deshalb setzen wir auf eine offene
              und motivierende Arbeitskultur, die auf Wertschätzung, Zusammenarbeit und Innovation basiert.
            </p>
            <p className="mt-5 font-bold text-dark">
              {STANDORT.strasse}, {STANDORT.plz} {STANDORT.ort}
            </p>
          </div>
        </div>
      </section>

      {/* Dein Weg */}
      <section className="bg-pale py-14 lg:py-24">
        <div className="content-container">
          <p className={KICKER}>Dein Weg zu uns</p>
          <h2 className="font-bold text-dark" style={H2_STYLE}>
            Bereit? Das geht schnell.
          </h2>
          <ol className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-7 border-l-[3px] border-dark lg:mt-14 lg:grid-cols-3 lg:gap-0 lg:border-l-0 lg:border-t-[3px]">
            {WEG.map((schritt, index) => (
              <li key={schritt.titel} className="relative pl-5 lg:pl-0 lg:pr-8">
                <span className="absolute -left-2.5 top-1.5 h-[17px] w-[17px] rounded-full bg-brand lg:-top-2.5 lg:left-0" />
                <div className="mb-1.5 text-[44px] font-bold leading-none tracking-[-0.04em] text-dark lg:mb-3 lg:mt-6 lg:text-7xl">
                  {index + 1}
                </div>
                <h3 className="mb-1.5 text-xl font-bold text-dark">{schritt.titel}</h3>
                <p className="text-mid">{schritt.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Kontakt */}
      <section id="kontakt" className="scroll-mt-40 pb-14 pt-14 lg:py-24">
        <div className="content-container">
          <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[28px] bg-dark text-white lg:grid-cols-[5fr_7fr]">
            <div className="relative aspect-square lg:aspect-auto lg:min-h-[560px]">
              <Image
                src="/images/fachmarkt-hueckelhoven/team/dominik-jaeger.png"
                alt="Dominik Jäger, Geschäftsführer"
                fill
                quality={90}
                sizes="(max-width: 1024px) 100vw, 760px"
                className="object-cover object-[50%_15%]"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-5 p-5 lg:p-14">
              <h2
                className="font-bold tracking-[-0.02em] text-white"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 2.9rem)', lineHeight: 1.1 }}
              >
                Noch nicht sicher? Lass uns kurz sprechen.
              </h2>
              <p className="text-ash">Ruf einfach an oder schreib uns eine Mail. Ohne Lebenslauf und ohne Verpflichtung.</p>
              <div className="flex flex-col gap-3">
                <a
                  href={STANDORT.telefonLink}
                  className="flex items-center gap-3 rounded-[18px] bg-white p-4 text-dark transition-transform hover:-translate-y-0.5 lg:gap-[18px] lg:px-6 lg:py-[22px]"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand lg:h-14 lg:w-14">
                    <Phone className="h-6 w-6 text-white" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-mid">Anrufen</span>
                    <span className="block text-lg font-bold leading-tight lg:text-2xl">{STANDORT.telefonAnzeige}</span>
                    <span className="block text-sm text-mid">{zeiten}</span>
                  </span>
                </a>
                <a
                  href={`mailto:${KARRIERE_MAIL}?subject=Frage%20zu%20einer%20Stelle`}
                  className="flex items-center gap-3 rounded-[18px] bg-white p-4 text-dark transition-transform hover:-translate-y-0.5 lg:gap-[18px] lg:px-6 lg:py-[22px]"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand lg:h-14 lg:w-14">
                    <Mail className="h-6 w-6 text-white" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-mid">Mail schreiben</span>
                    <span className="block text-base font-bold leading-tight [overflow-wrap:anywhere] lg:text-2xl">{KARRIERE_MAIL}</span>
                    <span className="block text-sm text-mid">Stell deine Frage einfach formlos</span>
                  </span>
                </a>
              </div>
              <div className="border-t border-white/15 pt-5">
                <p className="font-bold">Dominik Jäger</p>
                <p className="text-sm text-ash">Geschäftsführer, dein Ansprechpartner</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
