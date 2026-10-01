'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { SHIPPING_TIERS } from '@/lib/shippingConfig';
import { formatPrice } from '@/lib/cart-utils';
import { STANDORT } from '@/content/fachmarkt';

interface ProductDescriptionProps {
  product: StoreApiProduct;
  showSample: boolean;            // nur Böden haben Muster
  onOrderSample: () => void;
  isOrderingSample: boolean;
}

interface Spec {
  label: string;
  value: string;
}

// Eckdaten für die Kacheln oben – Reihenfolge = Anzeigereihenfolge
const HIGHLIGHTS: { match: RegExp; label: string }[] = [
  { match: /^stärke/i, label: 'Stärke' },
  { match: /^nutzschicht/i, label: 'Nutzschicht' },
  { match: /^nutzungsklasse/i, label: 'Nutzungsklasse' },
  { match: /^verlegeart/i, label: 'Verlegung' },
  { match: /^fußbodenheizung/i, label: 'Fußbodenheizung' },
  { match: /^feuchtraum/i, label: 'Feuchtraum' },
];

// Text erst ab dieser Länge einklappen
const COLLAPSE_FROM_CHARS = 900;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ChatGPT-UI-HTML bereinigen: Wrapper-divs und alle Attribute entfernen
function cleanHtml(html: string): string {
  let cleaned = html.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
  cleaned = cleaned.replace(/<(\w+)\s+[^>]*?>/gi, '<$1>');
  cleaned = cleaned.trim();
  return cleaned.includes('<p')
    ? cleaned
    : cleaned.replace(/\r?\n\r?\n/g, '<br/><br/>').replace(/\r?\n/g, '<br/>');
}

/**
 * Liest die Eigenschaften-Tabelle aus der WooCommerce-Beschreibung und
 * vereinheitlicht sie: Doppelpunkte weg, Einheit vom Label an den Wert
 * („Stärke in mm: 2,5“ → „Stärke: 2,5 mm“), Dezimalpunkt → Komma.
 */
function parseSpecs(html: string, einheit: string): Spec[] {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const specs: Spec[] = [];

  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 2 || !cells[0] || !cells[1]) continue;

    let label = cells[0].replace(/:\s*$/, '').trim();
    let value = /^\d+\.\d+$/.test(cells[1]) ? cells[1].replace('.', ',') : cells[1];

    const unitMatch = label.match(/\s+in\s+(mm|cm|m|Jahren)\b/i);
    if (unitMatch) {
      label = label.replace(unitMatch[0], '').trim();
      const unit = unitMatch[1].toLowerCase() === 'jahren' ? 'Jahre' : unitMatch[1];
      if (/^[\d.,]+$/.test(value)) value = `${value} ${unit}`;
    }
    if (/^paketinhalt$/i.test(label) && /^[\d.,]+$/.test(value)) {
      value = `${value.replace('.', ',')} ${einheit}`;
    }

    specs.push({ label, value: value.charAt(0).toUpperCase() + value.slice(1) });
  }

  return specs;
}

export default function ProductDescription({
  product,
  showSample,
  onOrderSample,
  isOrderingSample,
}: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const beschreibung = useMemo(() => cleanHtml(product.artikelbeschreibung || ''), [product.artikelbeschreibung]);
  const descriptionHtml = product.description || '';
  const specs = useMemo(
    () => parseSpecs(descriptionHtml, product.einheit_short || 'm²'),
    [descriptionHtml, product.einheit_short]
  );
  const highlights = useMemo(
    () =>
      HIGHLIGHTS.map((h) => {
        const spec = specs.find((s) => h.match.test(s.label));
        return spec ? { label: h.label, value: spec.value } : null;
      }).filter((h): h is Spec => h !== null),
    [specs]
  );

  const hasText = !!beschreibung;
  // Tabelle, die sich nicht zerlegen lässt (z. B. bj-specs-Markup): wie bisher roh anzeigen
  const hasRawSpecs = specs.length === 0 && (descriptionHtml.includes('<table') || descriptionHtml.includes('bj-specs'));
  const hasSpecs = specs.length > 0 || hasRawSpecs;
  const isLongText = stripTags(beschreibung).length > COLLAPSE_FROM_CHARS;

  const freeShippingFrom = SHIPPING_TIERS.find((tier) => tier.cost === 0)?.minAmount;

  return (
    <div className="space-y-6">
      {(hasText || hasSpecs) && (
        <section aria-labelledby="produktbeschreibung" className="bg-white rounded-2xl p-5 sm:p-8 lg:p-10">
          <h2 id="produktbeschreibung" className="text-2xl md:text-3xl font-bold text-dark mb-6">
            Produktbeschreibung
          </h2>

          {/* Eckdaten auf einen Blick */}
          {highlights.length >= 2 && (
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {highlights.map((h) => (
                <div key={h.label} className="bg-pale rounded-xl p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-mid">{h.label}</dt>
                  <dd className="mt-1 text-base font-bold text-dark break-words">{h.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className={hasText && hasSpecs ? 'grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}>
            {/* Beschreibungstext */}
            {hasText && (
              <div>
                <div className={`relative ${isLongText && !expanded ? 'max-h-[26rem] overflow-hidden' : ''}`}>
                  <div
                    className="text-[15px] leading-relaxed text-dark [&_p]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3 [&_h4]:font-bold [&_h4]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_li]:mb-1 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: beschreibung }}
                  />
                  {isLongText && !expanded && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {isLongText && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    aria-expanded={expanded}
                    className="mt-3 text-sm font-semibold text-brand hover:underline"
                  >
                    {expanded ? 'Weniger anzeigen' : 'Weiterlesen'}
                  </button>
                )}
              </div>
            )}

            {/* Technische Daten */}
            {hasSpecs && (
              <div>
                <h3 className="text-lg font-bold text-dark mb-4">Technische Daten</h3>
                {specs.length > 0 ? (
                  <table className="w-full text-sm text-dark border-t border-ash">
                    <tbody>
                      {specs.map((spec) => (
                        <tr key={spec.label} className="border-b border-ash even:bg-pale">
                          <th scope="row" className="w-1/2 py-3 px-4 text-left font-semibold align-top">
                            {spec.label}
                          </th>
                          <td className="py-3 px-4 align-top break-words">{spec.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="bj-specs-table" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Vertrauensblock für Fernkäufer: Muster + Lieferung */}
      <div className="grid gap-4 md:grid-cols-2">
        {showSample && (
          <div className="bg-dark text-white rounded-2xl p-6 flex flex-col">
            <Image
              src="/images/Icons/musterbox-weiss.png"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <h3 className="mt-4 text-xl font-bold">Farbe noch unsicher?</h3>
            <p className="mt-2 text-sm text-white/80 leading-relaxed">
              Bestell dir ein kostenloses Muster und prüfe Farbe, Oberfläche und Haptik in Ruhe bei dir zuhause.
            </p>
            <button
              type="button"
              onClick={onOrderSample}
              disabled={isOrderingSample}
              className="mt-5 self-start rounded-lg bg-white px-5 py-3 text-sm font-bold text-dark hover:bg-ash transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOrderingSample ? 'Lädt...' : 'Kostenloses Muster bestellen'}
            </button>
          </div>
        )}

        <div className={`bg-white rounded-2xl p-6${showSample ? '' : ' md:col-span-2'}`}>
          <h3 className="text-xl font-bold text-dark">Lieferung &amp; Abholung</h3>
          <ul className="mt-4 space-y-3 text-sm text-dark">
            {product.show_lieferzeit && (
              <li className="flex items-start gap-3">
                <Image src="/images/Icons/lieferung-schieferschwarz.png" alt="" width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
                <span><span className="font-bold">Lieferzeit:</span> {product.lieferzeit || '3-7 Arbeitstage'}</span>
              </li>
            )}
            {freeShippingFrom !== undefined && (
              <li className="flex items-start gap-3">
                <Image src="/images/Icons/lieferung-schieferschwarz.png" alt="" width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
                <span>Versandkostenfrei ab {formatPrice(freeShippingFrom)} €</span>
              </li>
            )}
            <li className="flex items-start gap-3">
              <Image src="/images/Icons/termin-schieferschwarz.png" alt="" width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
              <span>Lieferung zum Wunschtermin oder Abholung im Markt in {STANDORT.ort}</span>
            </li>
            <li className="flex items-start gap-3">
              <Image src="/images/Icons/lager-schieferschwarz.png" alt="" width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
              <span>Kostenlose Einlagerung bis zu 12 Monate</span>
            </li>
            <li className="flex items-start gap-3">
              <Image src="/images/Icons/telefon-schieferschwarz.png" alt="" width={20} height={20} className="w-5 h-5 object-contain flex-shrink-0" />
              <span>Fragen? Persönliche Beratung unter <a href={STANDORT.telefonLink} className="font-bold hover:text-brand">{STANDORT.telefonAnzeige}</a></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
