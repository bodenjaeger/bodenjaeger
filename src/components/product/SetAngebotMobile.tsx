'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { StoreApiProduct } from '@/lib/woocommerce';
import type { SparpaketAnzeige } from './SetAngebot';

interface SetAngebotMobileProps {
  setangebotTitel?: string;
  productName: string;
  productImage: string;
  basePrice: number;
  regularPrice: number;
  einheit: string;
  daemmungName: string;
  daemmungImage: string;
  daemmungSetPricePerUnit: number;
  daemmungRegularPricePerUnit: number;
  sockelleisteName: string;
  sockelleisteImage: string;
  sockelleisteSetPricePerUnit: number;
  sockelleisteRegularPricePerUnit: number;
  sockelleisteEinheit?: string;
  comparisonPriceTotal?: number;
  totalDisplayPrice?: number;
  savingsPercent?: number;
  daemmungOptions?: StoreApiProduct[];
  sockelleisteOptions?: StoreApiProduct[];
  onProductSelection?: (daemmung: StoreApiProduct | null, sockelleiste: StoreApiProduct | null) => void;
  sparpaket?: SparpaketAnzeige | null;
}

export default function SetAngebotMobile({
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
  sockelleisteName,
  sockelleisteImage,
  sockelleisteSetPricePerUnit,
  sockelleisteRegularPricePerUnit,
  sockelleisteEinheit = 'lfm',
  daemmungOptions = [],
  sockelleisteOptions = [],
  onProductSelection,
  savingsPercent,
  sparpaket = null
}: SetAngebotMobileProps) {
  const hasDaemmung = daemmungName !== 'Trittschalldämmung';
  const hasSockelleiste = sockelleisteName !== 'Sockelleiste';

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'daemmung' | 'sockelleiste' | null>(null);

  // Selected products state
  const [selectedDaemmung, setSelectedDaemmung] = useState<StoreApiProduct | null>(
    daemmungOptions.find(opt => opt.name === daemmungName) || null
  );
  const [selectedSockelleiste, setSelectedSockelleiste] = useState<StoreApiProduct | null>(
    sockelleisteOptions.find(opt => opt.name === sockelleisteName) || null
  );

  // Notify parent of selection changes
  // onProductSelection bewusst NICHT in deps: ist stabil (useCallback) und soll
  // nicht als Trigger dienen (verhindert Race Condition mit Desktop-Komponente)
  useEffect(() => {
    if (onProductSelection) {
      onProductSelection(
        hasDaemmung ? selectedDaemmung : null,
        hasSockelleiste ? selectedSockelleiste : null
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDaemmung, selectedSockelleiste, hasDaemmung, hasSockelleiste]);

  const openModal = (type: 'daemmung' | 'sockelleiste') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
  };

  // STATISCHER M²-PREIS (dynamisch berechnet aus gewählten Produkten)
  const setAngebotPreisProM2 = basePrice + daemmungSetPricePerUnit + sockelleisteSetPricePerUnit;
  // Sparpaket zählt nur ab Mindestmenge in den Streichpreis
  const sparpaketRegularProM2 = sparpaket?.aktiv
    ? sparpaket.zeilen.reduce((sum, z) => sum + z.regularPreisProM2, 0)
    : 0;
  const vergleichspreisProM2 = regularPrice + daemmungRegularPricePerUnit + sockelleisteRegularPricePerUnit + sparpaketRegularProM2;
  // ✅ Backend-Wert verwenden (savingsPercent = setangebot_ersparnis_prozent)
  const ersparnisProzent = savingsPercent || 0;

  return (
    <div className="bg-ash rounded-lg p-3">
      {/* Badge Header */}
      <div className="inline-flex items-center px-3 py-1 mb-3 text-sm font-semibold text-white bg-brand rounded">
        {setangebotTitel}
      </div>

      {/* Produktkarten */}
      <div className="flex flex-col gap-2">
        {/* Boden */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-2 p-3 rounded-lg items-stretch">
          {/* 1. Bild */}
          <div className="w-12 relative overflow-hidden rounded">
            <Image
              src={productImage}
              alt={productName}
              fill
              className="object-cover"
            />
          </div>
          {/* 2. Kategorie + Name */}
          <div className="min-w-0">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Boden</h3>
            <p className="text-xs text-dark break-words leading-tight">{productName}</p>
          </div>
          {/* 3. Preise */}
          <div className="flex flex-col items-end flex-shrink-0">
            {regularPrice > basePrice && (
              <span className="text-[10px] text-mid line-through whitespace-nowrap">
                {regularPrice.toFixed(2).replace('.', ',')} €/{einheit}
              </span>
            )}
            <span className="text-[11px] font-semibold text-brand whitespace-nowrap">
              {basePrice.toFixed(2).replace('.', ',')} €/{einheit}
            </span>
          </div>
        </div>

        {/* Dämmung */}
        {hasDaemmung && (
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 p-3 rounded-lg items-stretch">
            {/* 1. Bild */}
            <div className="w-12 relative overflow-hidden rounded">
              <Image
                src={selectedDaemmung?.images?.[0]?.src || daemmungImage}
                alt={selectedDaemmung?.name || daemmungName}
                fill
                className="object-cover"
              />
            </div>
            {/* 2. Kategorie + Name + Button */}
            <div className="min-w-0">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Dämmung</h3>
              <p className="text-xs text-dark break-words leading-tight">{selectedDaemmung?.name || daemmungName}</p>
              {daemmungOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal('daemmung')}
                  className="mt-1.5 bg-dark text-white text-[10px] font-semibold py-1.5 px-3 rounded hover:bg-[#1a1a1d] transition-colors"
                >
                  Andere Dämmung &gt;
                </button>
              )}
            </div>
            {/* 3. Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[10px] text-mid line-through whitespace-nowrap">
                {daemmungRegularPricePerUnit.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-[11px] font-semibold text-brand whitespace-nowrap">
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
          <div className="grid grid-cols-[auto_1fr_auto] gap-2 p-3 rounded-lg items-stretch">
            {/* 1. Bild */}
            <div className="w-12 relative overflow-hidden rounded">
              <Image
                src={selectedSockelleiste?.images?.[0]?.src || sockelleisteImage}
                alt={selectedSockelleiste?.name || sockelleisteName}
                fill
                className="object-cover"
              />
            </div>
            {/* 2. Kategorie + Name + Button */}
            <div className="min-w-0">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Sockelleiste</h3>
              <p className="text-xs text-dark break-words leading-tight">{selectedSockelleiste?.name || sockelleisteName}</p>
              {sockelleisteOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => openModal('sockelleiste')}
                  className="mt-1.5 bg-dark text-white text-[10px] font-semibold py-1.5 px-3 rounded hover:bg-[#1a1a1d] transition-colors"
                >
                  Andere Sockelleiste &gt;
                </button>
              )}
            </div>
            {/* 3. Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[10px] text-mid line-through whitespace-nowrap">
                {sockelleisteRegularPricePerUnit.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-[11px] font-semibold text-brand whitespace-nowrap">
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
            className={`grid grid-cols-[auto_1fr_auto] gap-2 p-3 rounded-lg items-stretch${sparpaket.aktiv ? '' : ' opacity-50'}`}
          >
            {/* 1. Bild */}
            <div className="w-12 relative overflow-hidden rounded">
              <Image
                src={zeile.image}
                alt={zeile.name}
                fill
                className="object-cover"
              />
            </div>
            {/* 2. Kategorie + Name + Menge */}
            <div className="min-w-0">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{zeile.label}</h3>
              <p className="text-xs text-dark break-words leading-tight">{zeile.name}</p>
              <p className="mt-0.5 text-[10px] text-mid">
                {sparpaket.aktiv ? zeile.mengeText : `Kostenlos ab ${sparpaket.mindestPakete} Paketen`}
              </p>
            </div>
            {/* 3. Preise */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span className="text-[10px] text-mid line-through whitespace-nowrap">
                {zeile.regularPreisProM2.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-[11px] font-semibold text-brand whitespace-nowrap">
                0,00 €/{einheit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Gesamt-Block */}
      <div className="mt-3 pt-3 border-t-2 border-gray-300">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-dark flex-shrink-0">Gesamt</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {vergleichspreisProM2 > setAngebotPreisProM2 && (
              <span className="line-through text-[10px] text-mid whitespace-nowrap">
                {vergleichspreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
              </span>
            )}
            <span className="text-sm font-bold text-brand whitespace-nowrap">
              {setAngebotPreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
            </span>
            {ersparnisProzent > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-white bg-brand rounded whitespace-nowrap">
                -{Math.round(ersparnisProzent)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal für Produktauswahl */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {modalType === 'daemmung' ? 'Dämmung wählen' : 'Sockelleiste wählen'}
              </h3>
              <button
                onClick={closeModal}
                className="text-white text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(85vh-140px)]">
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
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      isSelected ? 'border-red-600 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="daemmung-option"
                        checked={isSelected}
                        onChange={() => setSelectedDaemmung(option)}
                        className="w-4 h-4 accent-red-600 flex-shrink-0"
                      />
                      <Image
                        src={option.images?.[0]?.src || '/images/placeholder.jpg'}
                        alt={option.name}
                        width={50}
                        height={50}
                        className="rounded-lg object-contain flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm">{option.name}</h4>
                        <p className="text-xs text-gray-500">
                          {optionPrice.toFixed(2).replace('.', ',')} €/{option.einheit_short || einheit}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {priceDifference <= 0 ? (
                          <div className="text-green-600 font-bold text-sm">
                            0,00 €
                            <div className="text-[10px] font-normal">(kostenlos)</div>
                          </div>
                        ) : (
                          <div className="text-red-600 font-bold text-sm">
                            +{priceDifference.toFixed(2).replace('.', ',')} €
                            <div className="text-[10px] font-normal">(Aufpreis)</div>
                          </div>
                        )}
                        {isStandard && (
                          <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold mt-1 inline-block">
                            Standard
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
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      isSelected ? 'border-red-600 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="sockelleiste-option"
                        checked={isSelected}
                        onChange={() => setSelectedSockelleiste(option)}
                        className="w-4 h-4 accent-red-600 flex-shrink-0"
                      />
                      <Image
                        src={option.images?.[0]?.src || '/images/placeholder.jpg'}
                        alt={option.name}
                        width={50}
                        height={50}
                        className="rounded-lg object-contain flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm">{option.name}</h4>
                        <p className="text-xs text-gray-500">
                          {optionPrice.toFixed(2).replace('.', ',')} €/{option.einheit_short || sockelleisteEinheit}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {priceDifference <= 0 ? (
                          <div className="text-green-600 font-bold text-sm">
                            0,00 €
                            <div className="text-[10px] font-normal">(kostenlos)</div>
                          </div>
                        ) : (
                          <div className="text-red-600 font-bold text-sm">
                            +{priceDifference.toFixed(2).replace('.', ',')} €
                            <div className="text-[10px] font-normal">(Aufpreis)</div>
                          </div>
                        )}
                        {isStandard && (
                          <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold mt-1 inline-block">
                            Standard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-gray-200 p-4 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm"
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
