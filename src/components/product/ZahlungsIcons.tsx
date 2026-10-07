import Image from 'next/image';
import { PAYMENT_BADGES } from '@/lib/footer-nav';

/**
 * Kleine Reihe der Zahlungs-Logos auf der Produktseite (unter "Muster bestellen").
 *
 * Quelle ist dieselbe Liste wie im Footer (`PAYMENT_BADGES`), damit beide immer
 * übereinstimmen und nur Zahlarten zeigen, die der Checkout anbietet. Hier nur
 * die Logo-Karten (mit `src`) – Textkacheln wie "Vorkasse" wären in 24px Höhe
 * nicht lesbar.
 *
 * `unoptimized`: Der Next-Image-Optimizer lehnt SVG ab (siehe BadgeGrid).
 */
export default function ZahlungsIcons() {
  const logos = PAYMENT_BADGES.filter((badge) => badge.enabled && badge.src);

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Zahlungsarten">
      {logos.map((badge) => (
        <li key={badge.label}>
          <Image
            src={badge.src as string}
            alt={badge.label}
            width={128}
            height={64}
            unoptimized
            // Feiner Rahmen wie im Beispiel: Die weißen Karten verschwimmen sonst
            // auf dem hellen Seitenhintergrund (im dunklen Footer nicht nötig).
            className="h-6 w-auto rounded-[3px] ring-1 ring-ash"
          />
        </li>
      ))}
    </ul>
  );
}
