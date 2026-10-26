'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Hammer, PackageCheck, Truck, Users, Warehouse, type LucideIcon } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { SERVICE_GRID, SERVICE_LINKS } from '@/content/service';
import { TRUST_ZONE_TEXTE } from '@/lib/footer-nav';

// Ersetzt die frühere ProductTabs-Komponente (war in ProductPageContent definiert und wurde
// bei jedem Render neu gemountet). Desktop: Anker-Leiste, beide Abschnitte untereinander sichtbar.
// Mobil: Akkordeons, standardmäßig zu.

type AbschnittId = 'artikelbeschreibung' | 'weitere-artikeldetails';

const ABSCHNITTE: { id: AbschnittId; label: string }[] = [
  { id: 'artikelbeschreibung', label: 'Artikelbeschreibung' },
  { id: 'weitere-artikeldetails', label: 'Weitere Artikeldetails' },
];

// Trust-Leiste: nur vorhandene Titel/Links aus content/service.ts (SERVICE_GRID) bzw. footer-nav.ts
const ICONS: Record<string, LucideIcon> = { PackageCheck, Truck, Users, Warehouse, Hammer };
const TRUST_HREFS = [
  SERVICE_LINKS.musterBestellen,
  SERVICE_LINKS.lieferung,
  SERVICE_LINKS.fachberatung,
  SERVICE_LINKS.einlagerung,
  SERVICE_LINKS.verlegeservice,
];
const TRUST_ITEMS = TRUST_HREFS
  .map((href) => SERVICE_GRID.karten.find((karte) => karte.href === href))
  .filter((karte): karte is (typeof SERVICE_GRID.karten)[number] => karte !== undefined)
  .map((karte) =>
    karte.href === SERVICE_LINKS.lieferung
      ? { ...karte, titel: TRUST_ZONE_TEXTE.lieferung.titel, zusatz: TRUST_ZONE_TEXTE.lieferung.zusatz }
      : { ...karte, zusatz: undefined }
  );

export default function ProduktDetails({ product }: { product: StoreApiProduct }) {
  const [mobilOffen, setMobilOffen] = useState<Record<AbschnittId, boolean>>({
    'artikelbeschreibung': false,
    'weitere-artikeldetails': false,
  });
  const [aktiv, setAktiv] = useState<AbschnittId>('artikelbeschreibung');

  // ── HTML-Aufbereitung unverändert aus ProductTabs übernommen ──
  const rawBeschreibung = product.artikelbeschreibung || '';
  // ChatGPT-UI-HTML bereinigen: Nur <p>, <strong>, <em>, <br>, <ul>, <li>, <ol> behalten
  const cleanHtml = (html: string): string => {
    // Entferne alle div-Wrapper (ChatGPT kopiert UI-Container mit)
    let cleaned = html.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
    // Entferne class/style/data-Attribute von allen Tags
    cleaned = cleaned.replace(/<(\w+)\s+[^>]*?>/gi, '<$1>');
    return cleaned.trim();
  };
  const cleanedBeschreibung = cleanHtml(rawBeschreibung);
  const beschreibung = cleanedBeschreibung.includes('<p')
    ? cleanedBeschreibung
    : cleanedBeschreibung.replace(/\r?\n\r?\n/g, '<br/><br/>').replace(/\r?\n/g, '<br/>');
  const descriptionHtml = product.description || '';
  const hasBeschreibung = !!beschreibung;
  const hasEigenschaften = descriptionHtml.includes('<table') || descriptionHtml.includes('bj-specs');

  const vorhanden = ABSCHNITTE.filter((a) =>
    a.id === 'artikelbeschreibung' ? hasBeschreibung : hasEigenschaften
  );

  // Anker-Leiste: rote Markierung folgt der Scrollposition (nur Anzeige)
  useEffect(() => {
    const elemente = vorhanden
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elemente.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries.filter((e) => e.isIntersecting);
        if (sichtbar.length > 0) setAktiv(sichtbar[0].target.id as AbschnittId);
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    elemente.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [hasBeschreibung, hasEigenschaften]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: AbschnittId) => setMobilOffen((s) => ({ ...s, [id]: !s[id] }));

  const kopf = (id: AbschnittId, label: string) => (
    <>
      {/* Mobil: Akkordeon-Kopf */}
      <button
        type="button"
        onClick={() => toggle(id)}
        aria-expanded={mobilOffen[id]}
        className="lg:hidden w-full flex items-center justify-between py-4 border-b border-ash text-left"
      >
        <span className="text-base font-bold text-dark">{label}</span>
        <ChevronRight className={`w-5 h-5 text-dark transition-transform ${mobilOffen[id] ? 'rotate-90' : ''}`} />
      </button>
      {/* Desktop: Überschrift */}
      <h2 className="hidden lg:block text-2xl font-bold text-dark mb-4">{label}</h2>
    </>
  );

  return (
    <div className="w-full">
      {/* Anker-Leiste (Desktop) */}
      {vorhanden.length > 0 && (
        <nav className="hidden lg:flex gap-8 border-b border-ash mb-8" aria-label="Produktinformationen">
          {vorhanden.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              onClick={() => setAktiv(a.id)}
              className={`py-3 -mb-px border-b-2 text-sm transition-colors ${
                aktiv === a.id ? 'border-brand font-bold text-dark' : 'border-transparent text-mid hover:text-dark'
              }`}
            >
              {a.label}
            </a>
          ))}
        </nav>
      )}

      {hasBeschreibung && (
        <section id="artikelbeschreibung" className="scroll-mt-24 lg:mb-10">
          {kopf('artikelbeschreibung', 'Artikelbeschreibung')}
          <div className={`${mobilOffen['artikelbeschreibung'] ? '' : 'hidden'} lg:block py-4 lg:py-0 max-w-4xl`}>
            <div
              className="bj-beschreibung"
              style={{ color: '#2e2d32', fontSize: '14px', lineHeight: '1.75' }}
              dangerouslySetInnerHTML={{ __html: beschreibung }}
            />
          </div>
        </section>
      )}

      {/* Trust-Leiste (ab md, im Entwurf nur Desktop) */}
      {TRUST_ITEMS.length > 0 && (
        <ul className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-3 my-8 lg:mt-0 lg:mb-10 p-4 bg-pale rounded-xl border border-ash">
          {TRUST_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center gap-3 group">
                  {Icon && <Icon className="w-7 h-7 text-brand flex-shrink-0" strokeWidth={1.5} />}
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-dark group-hover:text-brand transition-colors">{item.titel}</span>
                    {item.zusatz && <span className="block text-xs text-mid">{item.zusatz}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {hasEigenschaften && (
        <section id="weitere-artikeldetails" className="scroll-mt-24">
          {kopf('weitere-artikeldetails', 'Weitere Artikeldetails')}
          <div className={`${mobilOffen['weitere-artikeldetails'] ? '' : 'hidden'} lg:block py-4 lg:py-0`}>
            <div
              className="bj-specs-table"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
