import Image from 'next/image';
import { PAYMENT_BADGES } from '@/lib/footer-nav';

/**
 * Kleine Reihe der Zahlungsarten auf der Produktseite (rechte Spalte unter dem
 * Warenkorb-Bereich).
 *
 * Quelle ist dieselbe Liste wie im Footer (`PAYMENT_BADGES`) – alle dort
 * sichtbaren Einträge, Logo- wie Textkacheln, damit beide immer übereinstimmen
 * und nur Zahlarten zeigen, die der Checkout anbietet. Darstellung wie
 * BadgeGrid, nur kleiner (24px statt 36px).
 *
 * `unoptimized`: Der Next-Image-Optimizer lehnt SVG ab (siehe BadgeGrid).
 */

// Feiner Rahmen: Die weißen Kacheln verschwimmen sonst auf dem hellen
// Seitenhintergrund (im dunklen Footer nicht nötig).
const KACHEL = 'h-6 rounded-[3px] ring-1 ring-ash';

export default function ZahlungsIcons() {
  const badges = PAYMENT_BADGES.filter((badge) => badge.enabled);

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Zahlungsarten">
      {badges.map((badge) => (
        // „PayPal" kommt zweimal vor (Logo und „Später Bezahlen"), daher sublabel im Key
        <li key={`${badge.label}-${badge.sublabel ?? ''}`}>
          {badge.src ? (
            <Image
              src={badge.src}
              alt={badge.label}
              width={128}
              height={64}
              unoptimized
              className={`${KACHEL} w-auto`}
            />
          ) : (
            <div className={`${KACHEL} flex items-center justify-center bg-white px-1.5`}>
              <span className="flex flex-col items-center text-center leading-none text-dark">
                <span className="text-[9px] font-bold">{badge.label}</span>
                {badge.sublabel && (
                  <span className="text-[7px] font-bold text-mid">{badge.sublabel}</span>
                )}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
