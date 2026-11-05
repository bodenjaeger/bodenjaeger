'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  // PREISE DIREKT VOM PARENT (ProductPageContent) - KEINE BERECHNUNG HIER!
  savingsPercent?: number;
  sparpaket?: SparpaketAnzeige | null;
}

const formatPreis = (preis: number) => preis.toFixed(2).replace('.', ',');

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
          <button type="button" onClick={aendern.onClick} className="mt-1 text-xs font-bold text-dark underline hover:text-brand">
            {aendern.text}
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
  onProductSelection,
  savingsPercent,
  sparpaket = null
}: SetAngebotProps) {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'daemmung' | 'sockelleiste' | null>(null);

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
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  return (
    <div className="w-full">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-3">
        {sparpaket ? (
          <Image src="/images/labels/klebevinyl-sparpaket.png" alt="KlebeVinyl Sparpaket" width={722} height={265} className="h-14 w-auto" />
        ) : (
          <Image src="/images/labels/dein-set-angebot.png" alt="Dein Set-Angebot" width={686} height={125} className="h-8 w-auto" />
        )}
        {ersparnisProzent > 0 && (
          <span className="rounded-full bg-dark px-3 py-1.5 text-sm font-bold text-white">-{Math.round(ersparnisProzent)}%</span>
        )}
      </div>
      {sparpaket?.aktiv && (
        <p className="mt-2 text-xs text-mid">Alles, was du für die Verlegung brauchst – im Set unschlagbar günstig</p>
      )}

      {sparpaket && !sparpaket.aktiv && (
        <p className="mt-3 rounded-lg bg-pale px-3 py-2 text-sm text-dark">
          <span className="font-bold">Noch {sparpaket.fehlendePakete} {sparpaket.fehlendePakete === 1 ? 'Paket' : 'Pakete'} bis zum Sparpaket:</span>{' '}
          Grundierung, Spachtelmasse und Kleber gratis dazu.
        </p>
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
      <div className="mt-3 border-t border-ash pt-3 text-right">
        <p className="text-xs font-bold uppercase tracking-wide text-dark">Set-Preis</p>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-mid">
            {vergleichspreisProM2 > setAngebotPreisProM2 && (
              <>statt <span className="line-through">{formatPreis(vergleichspreisProM2)} €/{einheit}</span></>
            )}
          </span>
          <span className="whitespace-nowrap text-3xl font-bold text-dark">
            {formatPreis(setAngebotPreisProM2)} €/{einheit}
          </span>
        </div>
      </div>

      {/* Modal für Produktauswahl */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 p-6 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">
                {modalType === 'daemmung' ? 'Dämmung wählen' : 'Sockelleiste wählen'}
              </h3>
              <button
                onClick={closeModal}
                className="text-white hover:text-red-100 text-3xl font-bold leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-200px)]">
              {modalType === 'daemmung' && daemmungOptions.map((option) => {
                const optionPrice = option.prices?.price
                  ? parseFloat(option.prices.price) / 100
                  : (option.price || 0);
                const standardPrice = daemmungRegularPricePerUnit;
                const priceDifference = optionPrice - standardPrice;
                const isSelected = selectedDaemmung?.id === option.id;
                const isStandard = option.name === daemmungName;

                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedDaemmung(option)}
                    className={`border-2 rounded-xl p-5 hover:border-red-600 hover:shadow-lg cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      {/* Radio Button */}
                      <input
                        type="radio"
                        name="daemmung-option"
                        checked={isSelected}
                        onChange={() => setSelectedDaemmung(option)}
                        className="w-5 h-5 accent-red-600"
                      />

                      {/* Product Image */}
                      <Image
                        src={option.images?.[0]?.src || '/images/placeholder.jpg'}
                        alt={option.name}
                        width={90}
                        height={90}
                        className="rounded-lg object-contain"
                      />

                      {/* Product Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{option.name}</h4>
                        {option.paketinhalt && (
                          <p className="text-sm text-gray-500 mb-0.5">
                            VE: {option.paketinhalt}
                            {option.einheit_short || 'm²'}
                          </p>
                        )}
                        <p className="text-base font-medium text-gray-700">
                          {optionPrice.toFixed(2).replace('.', ',')} €/{option.einheit_short || einheit}
                        </p>
                      </div>

                      {/* Price Difference */}
                      <div className="text-right flex flex-col items-end gap-2">
                        {priceDifference <= 0 ? (
                          <div className="text-green-600 font-bold text-lg">
                            <div>0,00 €</div>
                            <div className="text-xs font-normal">(kostenlos)</div>
                          </div>
                        ) : (
                          <div className="text-red-600 font-bold text-lg">
                            <div>+{priceDifference.toFixed(2).replace('.', ',')} €</div>
                            <div className="text-xs font-normal">(Aufpreis)</div>
                          </div>
                        )}
                        {isStandard && (
                          <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-semibold">
                            ✓ Standard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {modalType === 'sockelleiste' && sockelleisteOptions.map((option) => {
                const optionPrice = option.prices?.price
                  ? parseFloat(option.prices.price) / 100
                  : (option.price || 0);
                const standardPrice = sockelleisteRegularPricePerUnit;
                const priceDifference = optionPrice - standardPrice;
                const isSelected = selectedSockelleiste?.id === option.id;
                const isStandard = option.name === sockelleisteName;

                return (
                  <div
                    key={option.id}
                    onClick={() => setSelectedSockelleiste(option)}
                    className={`border-2 rounded-xl p-5 hover:border-red-600 hover:shadow-lg cursor-pointer transition-all duration-200 ${
                      isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      {/* Radio Button */}
                      <input
                        type="radio"
                        name="sockelleiste-option"
                        checked={isSelected}
                        onChange={() => setSelectedSockelleiste(option)}
                        className="w-5 h-5 accent-red-600"
                      />

                      {/* Product Image */}
                      <Image
                        src={option.images?.[0]?.src || '/images/placeholder.jpg'}
                        alt={option.name}
                        width={90}
                        height={90}
                        className="rounded-lg object-contain"
                      />

                      {/* Product Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{option.name}</h4>
                        {option.paketinhalt && (
                          <p className="text-sm text-gray-500 mb-0.5">
                            VE: {option.paketinhalt}
                            {option.einheit_short || 'lfm'}
                          </p>
                        )}
                        <p className="text-base font-medium text-gray-700">
                          {optionPrice.toFixed(2).replace('.', ',')} €/{option.einheit_short || sockelleisteEinheit}
                        </p>
                      </div>

                      {/* Price Difference */}
                      <div className="text-right flex flex-col items-end gap-2">
                        {priceDifference <= 0 ? (
                          <div className="text-green-600 font-bold text-lg">
                            <div>0,00 €</div>
                            <div className="text-xs font-normal">(kostenlos)</div>
                          </div>
                        ) : (
                          <div className="text-red-600 font-bold text-lg">
                            <div>+{priceDifference.toFixed(2).replace('.', ',')} €</div>
                            <div className="text-xs font-normal">(Aufpreis)</div>
                          </div>
                        )}
                        {isStandard && (
                          <span className="text-xs bg-green-600 text-white px-3 py-1 rounded-full font-semibold">
                            ✓ Standard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-8 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 hover:border-gray-400 transition-all font-semibold text-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={closeModal}
                className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Auswählen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
