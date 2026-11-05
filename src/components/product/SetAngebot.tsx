'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { formatPrice } from '@/lib/cart-utils';
import type { StoreApiProduct } from '@/lib/woocommerce';

// Klebe-Vinyl Sparpaket: kostenlose Zeilen unter der Sockelleiste
export interface SparpaketAnzeige {
  aktiv: boolean;           // false = unter Mindestmenge, Zeilen nur als Hinweis
  mindestPakete: number;
  fehlendePakete: number;    // bis zum Sparpaket, 0 wenn aktiv
  zeilen: {
    typ: string;
    label: string;
    name: string;
    image: string;
    regularPreisProM2: number;
  }[];
}

interface SetAngebotProps {
  setangebotTitel?: string;
  productName: string;
  productImage: string;
  basePrice: number;
  regularPrice: number;
  einheit: string;
  daemmungName: string;
  daemmungImage: string;
  daemmungSetPricePerUnit: number;  // ✅ NEU: Set-Preis (0 oder Aufpreis) - VOM PARENT
  daemmungRegularPricePerUnit: number;  // ✅ NEU: Regulärer Preis - VOM PARENT
  daemmungVE?: string;
  daemmungOptions?: StoreApiProduct[];
  sockelleisteName: string;
  sockelleisteImage: string;
  sockelleisteSetPricePerUnit: number;  // ✅ NEU: Set-Preis (0 oder Aufpreis) - VOM PARENT
  sockelleisteRegularPricePerUnit: number;  // ✅ NEU: Regulärer Preis - VOM PARENT
  sockelleisteVE?: string;
  sockelleisteEinheit?: string;
  sockelleisteOptions?: StoreApiProduct[];
  daemmungStandardPrice?: number;
  sockelleisteStandardPrice?: number;
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  // PREISE DIREKT VOM PARENT (ProductPageContent) - KEINE BERECHNUNG HIER!
  savingsPercent?: number;
  sparpaket?: SparpaketAnzeige | null;
}

const formatPreis = formatPrice;

interface SetZeile {
  key: string;
  label: string;
  name: string;
  image: string;
  regular: string | null;
  preis: string;
  aendern?: { text: string; onClick: () => void };
}

function renderZeile({ key, label, name, image, regular, preis, aendern }: SetZeile) {
  return (
    <div key={key} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <div className="relative h-[52px] w-[52px] overflow-hidden rounded bg-pale">
        <Image src={image} alt={name} fill sizes="52px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-tight text-dark">
          <span className="text-mid">{label} – </span>{name}
        </p>
        {regular && <p className="mt-0.5 text-xs text-mid line-through">{regular}</p>}
        {aendern && (
          <button type="button" onClick={aendern.onClick} className="mt-1.5 inline-flex min-h-9 items-center gap-1 rounded-lg border border-ash bg-white px-2.5 text-xs font-bold text-dark transition-colors hover:border-dark">
            {aendern.text}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="whitespace-nowrap text-sm font-bold text-dark">{preis}</p>
    </div>
  );
}

export default function SetAngebot({
  setangebotTitel = 'Dein Set-Angebot',
  productName,
  productImage,
  basePrice,
  regularPrice,
  einheit,
  daemmungName,
  daemmungImage,
  daemmungSetPricePerUnit,
  daemmungRegularPricePerUnit,
  daemmungVE,
  daemmungOptions = [],
  sockelleisteName,
  sockelleisteImage,
  sockelleisteSetPricePerUnit,
  sockelleisteRegularPricePerUnit,
  sockelleisteVE,
  sockelleisteEinheit = 'lfm',
  sockelleisteOptions = [],
  daemmungStandardPrice = 0,
  sockelleisteStandardPrice = 0,
  onProductSelection,
  savingsPercent,
  sparpaket = null
}: SetAngebotProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'daemmung' | 'sockelleiste' | null>(null);
  const [modalAuswahl, setModalAuswahl] = useState<StoreApiProduct | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
        setModalType(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  // Selected products state (starts with standard products)
  const [selectedDaemmung, setSelectedDaemmung] = useState<StoreApiProduct | null>(
    daemmungOptions.find(opt => opt.name === daemmungName) || null
  );
  const [selectedSockelleiste, setSelectedSockelleiste] = useState<StoreApiProduct | null>(
    sockelleisteOptions.find(opt => opt.name === sockelleisteName) || null
  );

  // Check if we have at least one addition product (not a placeholder)
  const hasDaemmung = daemmungName !== 'Trittschalldämmung';
  const hasSockelleiste = sockelleisteName !== 'Sockelleiste';

  // ✅ PREISE KOMMEN DIREKT VOM PARENT - KEINE BERECHNUNG HIER!
  // daemmungSetPricePerUnit: 0 (kostenlos) oder Aufpreis (z.B. 5.00)
  // sockelleisteSetPricePerUnit: 0 (kostenlos) oder Aufpreis (z.B. 2.50)
  // Diese Werte wurden bereits in ProductPageContent korrekt berechnet

  // Notify parent component of product selection changes
  // onProductSelection bewusst NICHT in deps: ist stabil (useCallback) und soll
  // nicht als Trigger dienen (verhindert Race Condition mit Mobile-Komponente)
  useEffect(() => {
    if (onProductSelection) {
      onProductSelection(
        hasDaemmung ? selectedDaemmung : null,
        hasSockelleiste ? selectedSockelleiste : null
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDaemmung, selectedSockelleiste, hasDaemmung, hasSockelleiste]);

  // Don't render if no addition products
  if (!hasDaemmung && !hasSockelleiste && !sparpaket) {
    return null;
  }

  // ✅ DYNAMISCHER M²-PREIS für Set-Angebot (ändert sich bei Produktwechsel)
  // Zeigt: "Boden €/m² + Dämmung Aufpreis + Sockelleiste Aufpreis = Gesamt €/m²"
  const setAngebotPreisProM2 = basePrice + daemmungSetPricePerUnit + sockelleisteSetPricePerUnit;
  // Streichpreis immer dynamisch berechnen: Boden-UVP + voller Preis des gewählten Zubehörs
  // Sparpaket zählt nur ab Mindestmenge in den Streichpreis
  const sparpaketRegularProM2 = sparpaket?.aktiv
    ? sparpaket.zeilen.reduce((sum, z) => sum + z.regularPreisProM2, 0)
    : 0;
  const vergleichspreisProM2 = regularPrice + daemmungRegularPricePerUnit + sockelleisteRegularPricePerUnit + sparpaketRegularProM2;
  // Rabatt = Summe der Einzelpreise gegenüber Verkaufspreis (vom Parent berechnet)
  const ersparnisProzent = savingsPercent || 0;

  // Handle button clicks
  const openModal = (type: 'daemmung' | 'sockelleiste') => {
    setModalAuswahl(type === 'daemmung' ? selectedDaemmung : selectedSockelleiste);
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  // Auswahl gilt erst nach „Auswählen“, „Abbrechen“ lässt alles unverändert
  const confirmModal = () => {
    if (modalType === 'daemmung') setSelectedDaemmung(modalAuswahl);
    if (modalType === 'sockelleiste') setSelectedSockelleiste(modalAuswahl);
    closeModal();
  };

  return (
    <div className="w-full">
      {/* Label sitzt halb auf dem oberen Rand des Kastens */}
      <div className={`relative ${sparpaket ? 'h-3' : 'h-1'}`}>
        <div className="absolute -top-4 left-0 z-10 -translate-y-1/2 lg:-top-5">
          {sparpaket ? (
            <Image src="/images/labels/klebevinyl-sparpaket.png" alt="KlebeVinyl Sparpaket" width={722} height={265} className="h-14 w-auto max-w-none" />
          ) : (
            <Image src="/images/labels/dein-set-angebot.png" alt="Dein Set-Angebot" width={686} height={125} className="h-8 w-auto max-w-none" />
          )}
        </div>
      </div>
      {sparpaket?.aktiv && (
        <p className="mt-2 text-xs text-mid">Alles, was du für die Verlegung brauchst – im Set unschlagbar günstig</p>
      )}

      {/* Produktliste */}
      <div className="mt-3 divide-y divide-ash">
        {renderZeile({
          key: 'boden',
          label: 'Boden',
          name: productName,
          image: productImage,
          regular: regularPrice > basePrice ? `${formatPreis(regularPrice)} €/${einheit}` : null,
          preis: `${formatPreis(basePrice)} €/${einheit}`,
        })}

        {hasDaemmung && renderZeile({
          key: 'daemmung',
          label: 'Dämmung',
          name: selectedDaemmung?.name || daemmungName,
          image: selectedDaemmung?.images?.[0]?.src || daemmungImage,
          regular: `${formatPreis(daemmungRegularPricePerUnit)} €/${selectedDaemmung?.einheit_short || einheit}`,
          preis: `${daemmungSetPricePerUnit > 0 ? '+' : ''}${formatPreis(Math.max(0, daemmungSetPricePerUnit))} €/${selectedDaemmung?.einheit_short || einheit}`,
          aendern: daemmungOptions.length > 0 ? { text: 'Andere Dämmung', onClick: () => openModal('daemmung') } : undefined,
        })}

        {hasSockelleiste && renderZeile({
          key: 'sockelleiste',
          label: 'Sockelleiste',
          name: selectedSockelleiste?.name || sockelleisteName,
          image: selectedSockelleiste?.images?.[0]?.src || sockelleisteImage,
          regular: `${formatPreis(sockelleisteRegularPricePerUnit)} €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`,
          preis: `${sockelleisteSetPricePerUnit > 0 ? '+' : ''}${formatPreis(Math.max(0, sockelleisteSetPricePerUnit))} €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`,
          aendern: sockelleisteOptions.length > 0 ? { text: 'Andere Sockelleiste', onClick: () => openModal('sockelleiste') } : undefined,
        })}

        {sparpaket?.zeilen.map((zeile) => renderZeile({
          key: zeile.typ,
          label: zeile.label,
          name: zeile.name,
          image: zeile.image,
          regular: `${formatPreis(zeile.regularPreisProM2)} €/${einheit}`,
          preis: `0,00 €/${einheit}`,
        }))}
      </div>

      {/* Set-Preis (STATISCHER M²-PREIS) */}
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-ash pt-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-dark">Set-Preis</p>
          {vergleichspreisProM2 > setAngebotPreisProM2 && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mid">
              {ersparnisProzent > 0 && (
                <span className="rounded bg-brand px-1.5 py-0.5 text-xs font-bold text-white">-{Math.round(ersparnisProzent)}%</span>
              )}
              <span>statt <span className="line-through">{formatPreis(vergleichspreisProM2)} €/{einheit}</span></span>
            </p>
          )}
        </div>
        <p className="whitespace-nowrap font-bold">
          <span className="text-2xl text-brand">{formatPreis(setAngebotPreisProM2)} €</span>
          <span className="text-sm font-normal text-mid"> /{einheit}</span>
        </p>
      </div>

      {sparpaket && !sparpaket.aktiv && (
        <p className="mt-3 rounded-lg bg-pale px-3 py-2 text-sm text-dark">
          <span className="font-bold">Noch {sparpaket.fehlendePakete} {sparpaket.fehlendePakete === 1 ? 'Paket' : 'Pakete'} bis zum Sparpaket:</span>{' '}
          Grundierung, Spachtelmasse und Kleber gratis dazu.
        </p>
      )}

      {/* Auswahlfenster über der ganzen Seite, auch über dem Kopfbereich */}
      {isModalOpen && modalType && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="set-auswahl-titel"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ash px-4 py-3 sm:px-6 sm:py-4">
              <h3 id="set-auswahl-titel" className="text-lg font-bold text-dark sm:text-xl">
                {modalType === 'daemmung' ? 'Dämmung wählen' : 'Sockelleiste wählen'}
              </h3>
              <button type="button" onClick={closeModal} aria-label="Schließen" className="flex h-10 w-10 items-center justify-center rounded-lg text-dark hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:space-y-3 sm:p-6">
              {(modalType === 'daemmung' ? daemmungOptions : sockelleisteOptions).map((option) => {
                const isDaemmung = modalType === 'daemmung';
                const standardName = isDaemmung ? daemmungName : sockelleisteName;
                const standardPrice = isDaemmung ? daemmungStandardPrice : sockelleisteStandardPrice;
                const unit = option.einheit_short || (isDaemmung ? einheit : sockelleisteEinheit);
                const optionPrice = option.price || 0;
                // Gleiche Rechnung wie in ProductPageContent, immer gegenüber dem Standardprodukt
                const aufpreis = option.verrechnung ?? Math.max(0, optionPrice - standardPrice);
                const isSelected = modalAuswahl?.id === option.id;
                const isStandard = option.name === standardName;

                return (
                  <label
                    key={option.id}
                    className={`grid cursor-pointer grid-cols-[20px_56px_minmax(0,1fr)] items-center gap-x-3 rounded-xl border p-3 transition-colors sm:grid-cols-[20px_80px_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-4 ${
                      isSelected ? 'border-brand bg-brand/5' : 'border-ash hover:border-mid'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`set-auswahl-${modalType}`}
                      checked={isSelected}
                      onChange={() => setModalAuswahl(option)}
                      className="h-5 w-5 accent-[#ed1b24]"
                    />
                    <Image
                      src={option.images?.[0]?.src || '/images/placeholder.jpg'}
                      alt=""
                      width={80}
                      height={80}
                      className="h-14 w-14 rounded-lg object-cover sm:h-20 sm:w-20"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-snug text-dark sm:text-base">{option.name}</p>
                      <p className="mt-0.5 text-xs text-mid sm:text-sm">
                        {formatPreis(optionPrice)} €/{unit}
                        {option.paketinhalt ? ` · VE: ${String(option.paketinhalt).replace('.', ',')} ${unit}` : ''}
                      </p>
                    </div>
                    <div className="col-start-3 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-start-4 sm:row-start-1 sm:mt-0 sm:flex-col sm:items-end">
                      <p className={`whitespace-nowrap text-sm font-bold sm:text-base ${aufpreis > 0 ? 'text-brand' : 'text-cta'}`}>
                        {aufpreis > 0 ? `+${formatPreis(aufpreis)} € Aufpreis` : 'Kostenlos im Set'}
                      </p>
                      {isStandard && (
                        <span className="rounded bg-pale px-2 py-0.5 text-xs font-bold text-mid">Standard</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-ash p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex sm:justify-end sm:p-4">
              <button type="button" onClick={closeModal} className="min-h-12 rounded-lg border border-ash px-6 text-sm font-bold text-dark hover:bg-gray-100">
                Abbrechen
              </button>
              <button type="button" onClick={confirmModal} className="min-h-12 rounded-lg bg-dark px-6 text-sm font-bold text-white hover:bg-[#1a1a1d]">
                Auswählen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
