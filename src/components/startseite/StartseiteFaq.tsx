import { Plus } from 'lucide-react';

/* Aufklappen ohne JavaScript über <details>. */
export default function StartseiteFaq({ promoEndeLabel }: { promoEndeLabel: string | null }) {
  const fragen: Array<{ frage: string; antwort: string }> = [
    ...(promoEndeLabel
      ? [{ frage: 'Bis wann gelten die Black-Weeks-Preise?', antwort: `Bis zum ${promoEndeLabel} – online und im Fachmarkt in Hückelhoven.` }]
      : []),
    {
      frage: 'Was ist im Set enthalten?',
      antwort:
        'Bei Laminat und Klick-Vinyl sind Dämmung und Sockelleiste gratis dabei. Klebe-Vinyl gibt es im Sparpaket mit Sockelleiste, Grundierung, Spachtelmasse und Kleber (ab 5 Paketen).',
    },
    {
      frage: 'Was kostet der Versand?',
      antwort: 'Shopbestellungen ab 999 € sind versandkostenfrei. Darunter siehst du die Versandkosten im Warenkorb.',
    },
    {
      frage: 'Ich renoviere erst später – was jetzt?',
      antwort: 'Jetzt kaufen und den Boden bis zu 12 Monate kostenfrei bei uns einlagern.',
    },
    {
      frage: 'Kann ich den Boden vorher sehen?',
      antwort: 'Ja: kostenlose Musterbox nach Hause, Boden virtuell in deinem Raum verlegen oder direkt im Fachmarkt anfassen.',
    },
  ];

  return (
    <section className="content-container pb-20 pt-20 lg:pb-24 lg:pt-24">
      <div className="mx-auto max-w-[860px]">
        <h2 className="mb-6 text-center text-[clamp(1.9rem,3.4vw,2.6rem)] font-bold tracking-tight text-dark">Kurz gefragt</h2>
        <div className="flex flex-col gap-2.5">
          {fragen.map((f, index) => (
            <details key={f.frage} open={index === 0} className="group rounded-xl bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-bold text-dark [&::-webkit-details-marker]:hidden">
                {f.frage}
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pale text-dark transition-transform group-open:rotate-45 group-open:bg-brand group-open:text-white">
                  <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </span>
              </summary>
              <p className="px-5 pb-5 text-mid">{f.antwort}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
