'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';

// Klebe-Vinyl Sparpaket: kostenlose Zeilen unter der Sockelleiste
export interface SparpaketAnzeige {
  aktiv: boolean;           // false = unter Mindestmenge, Zeilen nur als Hinweis
  mindestPakete: number;
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
  gesamtVergleichspreisProM2?: number;
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  // BACKEND PRICES - DIREKT VOM PARENT (ProductPageContent) - KEINE BERECHNUNG HIER!
  comparisonPriceTotal?: number;
  totalDisplayPrice?: number;
  savingsAmount?: number;
  savingsPercent?: number;
  sparpaket?: SparpaketAnzeige | null;
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
  gesamtVergleichspreisProM2,
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
  // (gesamtVergleichspreisProM2 ist statisch und kennt keine Premium-Optionen)
  // Sparpaket zählt nur ab Mindestmenge in den Streichpreis
  const sparpaketRegularProM2 = sparpaket?.aktiv
    ? sparpaket.zeilen.reduce((sum, z) => sum + z.regularPreisProM2, 0)
    : 0;
  const vergleichspreisProM2 = regularPrice + daemmungRegularPricePerUnit + sockelleisteRegularPricePerUnit + sparpaketRegularProM2;
  // ✅ Backend-Wert verwenden (savingsPercent = setangebot_ersparnis_prozent)
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
    <div className="bg-ash rounded-lg p-4 sm:p-5 w-full">
      {/* Badge Header */}
      <div className="inline-flex items-center px-4 py-1.5 mb-4 text-base font-semibold text-white bg-brand rounded">
        {setangebotTitel}
      </div>

      {/* Produktliste */}
      <div className="flex flex-col gap-3">
        {/* Boden */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 rounded-lg items-stretch">
          {/* Bild */}
          <div className="w-[72px] relative overflow-hidden rounded">
            <Image
              src={productImage}
              alt={productName}
              fill
              className="object-cover"
            />
          </div>
          {/* Kategorie + Name */}
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Boden</h3>
            <p className="text-sm text-dark break-words leading-tight">{productName}</p>
          </div>
          {/* Preise */}
          <div className="flex flex-col items-end flex-shrink-0">
            {regularPrice > basePrice && (
              <span className="text-xs text-mid line-through whitespace-nowrap">
                {regularPrice.toFixed(2).replace('.', ',')} €/{einheit}
              </span>
            )}
            <span className="text-sm font-semibold text-brand whitespace-nowrap">
              {basePrice.toFixed(2).replace('.', ',')} €/{einheit}
            </span>
          </div>
        </div>

        {/* Dämmung */}
        {hasDaemmung && (
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 rounded-lg items-stretch">
            {/* Bild */}
            <div className="w-[72px] relative overflow-hidden rounded">
              <Image
                src={selectedDaemmung?.images?.[0]?.src || daemmungImage}
                alt={selectedDaemmung?.name || daemmungName}
                fill
                className="object-cover"
              />
            </div>
            {/* Kategorie + Name + Button */}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dämmung</h3>
              <p className="text-sm text-dark break-words leading-tight">{selectedDaemmung?.name || daemmungName}</p>
              {daemmungOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal('daemmung')}
                  className="mt-2 bg-dark text-white text-xs font-semibold py-2 px-4 rounded hover:bg-[#1a1a1d] transition-colors"
                >
                  Andere Dämmung &gt;
                </button>
              )}
            </div>
            {/* Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-xs text-mid line-through whitespace-nowrap">
                {daemmungRegularPricePerUnit.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-sm font-semibold text-brand whitespace-nowrap">
                {daemmungSetPricePerUnit <= 0
                  ? `0,00 €/${selectedDaemmung?.einheit_short || einheit}`
                  : `+${daemmungSetPricePerUnit.toFixed(2).replace('.', ',')} €/${selectedDaemmung?.einheit_short || einheit}`
                }
              </span>
            </div>
          </div>
        )}

        {/* Sockelleiste */}
        {hasSockelleiste && (
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 rounded-lg items-stretch">
            {/* Bild */}
            <div className="w-[72px] relative overflow-hidden rounded">
              <Image
                src={selectedSockelleiste?.images?.[0]?.src || sockelleisteImage}
                alt={selectedSockelleiste?.name || sockelleisteName}
                fill
                className="object-cover"
              />
            </div>
            {/* Kategorie + Name + Button */}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sockelleiste</h3>
              <p className="text-sm text-dark break-words leading-tight">{selectedSockelleiste?.name || sockelleisteName}</p>
              {sockelleisteOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal('sockelleiste')}
                  className="mt-2 bg-dark text-white text-xs font-semibold py-2 px-4 rounded hover:bg-[#1a1a1d] transition-colors"
                >
                  Andere Sockelleiste &gt;
                </button>
              )}
            </div>
            {/* Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-xs text-mid line-through whitespace-nowrap">
                {sockelleisteRegularPricePerUnit.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-sm font-semibold text-brand whitespace-nowrap">
                {sockelleisteSetPricePerUnit <= 0
                  ? `0,00 €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`
                  : `+${sockelleisteSetPricePerUnit.toFixed(2).replace('.', ',')} €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`
                }
              </span>
            </div>
          </div>
        )}
        {/* Klebe-Vinyl Sparpaket */}
        {sparpaket?.zeilen.map((zeile) => (
          <div
            key={zeile.typ}
            className={`grid grid-cols-[auto_1fr_auto] gap-4 p-4 rounded-lg items-stretch${sparpaket.aktiv ? '' : ' opacity-50'}`}
          >
            {/* Bild */}
            <div className="w-[72px] relative overflow-hidden rounded">
              <Image
                src={zeile.image}
                alt={zeile.name}
                fill
                className="object-cover"
              />
            </div>
            {/* Kategorie + Name */}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{zeile.label}</h3>
              <p className="text-sm text-dark break-words leading-tight">{zeile.name}</p>
              {!sparpaket.aktiv && (
                <p className="mt-1 text-xs text-mid">Kostenlos ab {sparpaket.mindestPakete} Paketen</p>
              )}
            </div>
            {/* Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-xs text-mid line-through whitespace-nowrap">
                {zeile.regularPreisProM2.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-sm font-semibold text-brand whitespace-nowrap">
                0,00 €/{einheit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gesamt-Preiszeile (STATISCHER M²-PREIS) */}
      <div className="mt-4 pt-4 border-t-2 border-gray-300">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-dark flex-shrink-0">Gesamt</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {vergleichspreisProM2 > setAngebotPreisProM2 && (
              <span className="line-through text-xs text-mid whitespace-nowrap">
                {vergleichspreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
              </span>
            )}
            <span className="text-base font-bold text-brand whitespace-nowrap">
              {setAngebotPreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
            </span>
            {ersparnisProzent > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-white bg-brand rounded whitespace-nowrap">
                -{Math.round(ersparnisProzent)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal für Produktauswahl */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
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
