'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SERVICE_LINKS } from '@/content/service';
import { ChevronRight, CirclePlay, FileText, HandHelping, Package, Truck, Warehouse, Wrench } from 'lucide-react';
import { FREE_SAMPLE_LIMIT } from '@/lib/sampleUtils';
import type { ProductMedia } from '@/lib/product-media';
import type { StoreApiProduct } from '@/lib/woocommerce';

// Aus dem Backend kommt teils kopiertes UI-HTML: Wrapper und Attribute entfernen
function cleanDescription(html: string): string {
  const cleaned = html
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<(\w+)\s+[^>]*?>/gi, '<$1>')
    .trim();
  return cleaned.includes('<p') ? cleaned : cleaned.replace(/\r?\n\r?\n/g, '<br/><br/>').replace(/\r?\n/g, '<br/>');
}

interface Section {
  id: string;
  label: string;
  content: ReactNode;
}

// Mobil Akkordeon, Desktop Reiter. Der Inhalt bleibt immer im HTML, damit ihn auch Google liest.
function DetailSection({ section, desktopActive }: { section: Section; desktopActive: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <section id={section.id} className="scroll-mt-24 border-b border-ash lg:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between text-left text-base font-bold text-dark lg:hidden"
      >
        {section.label}
        <ChevronRight className={`h-5 w-5 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      <div className={`${open ? 'block' : 'hidden'} ${desktopActive ? 'lg:block' : 'lg:hidden'} pb-6 lg:pb-0`}>
        {section.content}
      </div>
    </section>
  );
}

function DocumentLink({ href, label, action, icon }: { href: string; label: string; action: string; icon: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 border-b border-ash py-3 last:border-0 hover:text-brand">
      <span className="text-brand">{icon}</span>
      <span>
        <span className="block text-sm text-dark">{label}</span>
        <span className="block text-sm font-bold text-brand">{action}</span>
      </span>
    </a>
  );
}

interface ProductDetailSectionsProps {
  product: StoreApiProduct;
  features: string[];
  media: ProductMedia;
}

export default function ProductDetailSections({ product, features, media }: ProductDetailSectionsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const description = cleanDescription(product.artikelbeschreibung || '');
  const specs = product.description || '';
  const hasSpecs = specs.includes('<table') || specs.includes('bj-specs');
  const hasDocs = !!(media.verlegeanleitung || media.pflegeanleitung || media.datenblatt || media.video);

  const sections: Section[] = [];

  if (description || features.length > 0) {
    sections.push({
      id: 'produktbeschreibung',
      label: 'Produktbeschreibung',
      content: (
        <div className={`grid gap-8 ${description && features.length > 0 ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : ''}`}>
          {description && (
            <div
              className="text-sm leading-relaxed text-mid [&_p]:mb-3 [&_strong]:text-dark"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
          {features.length > 0 && (
            <div className="self-start rounded-xl bg-pale p-5">
              <h2 className="mb-4 text-lg font-bold text-dark">Vorteile auf einen Blick</h2>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-dark">
                    <Image src="/images/Icons/haken-rot.png" alt="" width={18} height={18} className="mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    });
  }

  if (hasSpecs) {
    sections.push({
      id: 'technische-daten',
      label: 'Technische Daten',
      content: (
        <>
          <div className="bj-specs-table" dangerouslySetInnerHTML={{ __html: specs }} />
        </>
      ),
    });
  }

  if (hasDocs) {
    sections.push({
      id: 'verlegung-pflege',
      label: 'Verlegung & Pflege',
      content: (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-ash bg-white px-4">
              {media.verlegeanleitung && <DocumentLink href={media.verlegeanleitung} label="Verlegeanleitung (PDF)" action="Download" icon={<FileText className="h-7 w-7" aria-hidden="true" />} />}
              {media.pflegeanleitung && <DocumentLink href={media.pflegeanleitung} label="Pflegeanleitung (PDF)" action="Download" icon={<FileText className="h-7 w-7" aria-hidden="true" />} />}
              {media.datenblatt && <DocumentLink href={media.datenblatt} label="Hersteller-Datenblatt (PDF)" action="Download" icon={<FileText className="h-7 w-7" aria-hidden="true" />} />}
              {media.video && <DocumentLink href={media.video} label="Verlegevideo" action="Video ansehen" icon={<CirclePlay className="h-7 w-7" aria-hidden="true" />} />}
            </div>
            <div className="self-start rounded-xl bg-pale p-5">
              <h3 className="mb-2 font-bold text-dark">Wichtige Hinweise</h3>
              <p className="text-sm leading-relaxed text-mid">
                Der Untergrund muss eben, trocken, sauber und fest sein. Bitte beachte die vollständige
                Verlegeanleitung des Herstellers, um ein optimales Ergebnis zu erzielen.
              </p>
            </div>
          </div>
        </>
      ),
    });
  }

  if (sections.length === 0) return null;

  const currentId = activeId ?? sections[0].id;
  const benefits = [
    { icon: Package, title: 'Kostenlose Muster', text: `Bis zu ${FREE_SAMPLE_LIMIT} Muster gratis`, href: SERVICE_LINKS.musterBestellen },
    { icon: Truck, title: 'Schnelle Lieferung', text: product.lieferzeit || '3-7 Arbeitstage', href: SERVICE_LINKS.lieferung },
    { icon: HandHelping, title: 'Fachberatung', text: 'Persönlich & kompetent', href: SERVICE_LINKS.fachberatung },
    { icon: Warehouse, title: 'Einlagerung', text: 'Bis zu 12 Monate kostenfrei', href: SERVICE_LINKS.einlagerung },
    { icon: Wrench, title: 'Verlegeservice', text: 'Im Umkreis von ca. 50 km', href: SERVICE_LINKS.verlegeservice },
  ];

  return (
    <div className="mt-8 lg:mt-10">
      <div role="tablist" aria-label="Produktinformationen" className="mb-6 hidden gap-2 lg:flex">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={currentId === section.id}
            onClick={() => setActiveId(section.id)}
            className={`rounded-lg px-5 py-2.5 text-sm transition-colors ${
              currentId === section.id ? 'bg-dark font-bold text-white' : 'bg-pale text-mid hover:bg-ash hover:text-dark'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {sections.map((section) => (
        <DetailSection key={section.id} section={section} desktopActive={currentId === section.id} />
      ))}

      <ul className="mt-10 hidden grid-cols-5 gap-2 rounded-xl border border-ash p-3 lg:grid">
        {benefits.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link href={href} className="flex h-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-pale">
              <Icon className="h-8 w-8 flex-shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
              <span>
                <span className="block text-sm font-bold text-dark">{title}</span>
                <span className="block text-xs text-mid">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
