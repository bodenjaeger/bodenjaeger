'use client';

import { useState, useEffect, type ReactNode } from 'react';
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

  // Eine Set-Zeile: Bild links, „Label - Name“ mit Streichpreis darunter, Set-Preis rechts
  const zeile = (z: {
    key: string;
    bild: string;
    label: string;
    name: string;
    streichpreis?: string;
    setPreis: string;
    zusatz?: ReactNode;
    gedimmt?: boolean;
  }) => (
    <div key={z.key} className={`grid grid-cols-[auto_1fr_auto] gap-2.5 items-start py-2${z.gedimmt ? ' opacity-50' : ''}`}>
      <div className="w-10 h-10 relative overflow-hidden rounded bg-pale">
        <Image src={z.bild} alt={z.name} fill className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-dark break-words leading-snug">{z.label} - {z.name}</p>
        {z.streichpreis && (
          <p className="text-[11px] text-mid line-through whitespace-nowrap mt-0.5">{z.streichpreis}</p>
        )}
        {z.zusatz}
      </div>
      <span className="text-xs font-bold text-dark whitespace-nowrap">{z.setPreis}</span>
    </div>
  );

  return (
    <div className="w-full">
      {/* Kopf: Set-Titel links, Ersparnis-Badge rechts */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="inline-flex items-center px-3 py-1 text-sm font-bold text-white bg-brand rounded">
          {setangebotTitel}
        </div>
        {ersparnisProzent > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-bold text-white bg-dark rounded-full whitespace-nowrap">
            -{Math.round(ersparnisProzent)}%
          </span>
        )}
      </div>

      {/* Produktliste */}
      <div className="flex flex-col divide-y divide-ash">
        {/* Boden */}
        {zeile({
          key: 'boden',
          bild: productImage,
          label: 'Boden',
          name: productName,
          streichpreis: regularPrice > basePrice ? `${regularPrice.toFixed(2).replace('.', ',')} €/${einheit}` : undefined,
          setPreis: `${basePrice.toFixed(2).replace('.', ',')} €/${einheit}`,
        })}

        {/* Dämmung */}
        {hasDaemmung && zeile({
          key: 'daemmung',
          bild: selectedDaemmung?.images?.[0]?.src || daemmungImage,
          label: 'Dämmung',
          name: selectedDaemmung?.name || daemmungName,
          streichpreis: `${daemmungRegularPricePerUnit.toFixed(2).replace('.', ',')} €`,
          setPreis: daemmungSetPricePerUnit <= 0
            ? `0,00 €/${selectedDaemmung?.einheit_short || einheit}`
            : `+${daemmungSetPricePerUnit.toFixed(2).replace('.', ',')} €/${selectedDaemmung?.einheit_short || einheit}`,
          zusatz: daemmungOptions.length > 0 && (
            <button
              type="button"
              onClick={() => openModal('daemmung')}
              className="mt-1 border border-dark text-dark text-[10px] font-semibold py-1 px-2 rounded"
            >
              Andere Dämmung &gt;
            </button>
          ),
        })}

        {/* Sockelleiste */}
        {hasSockelleiste && zeile({
          key: 'sockelleiste',
          bild: selectedSockelleiste?.images?.[0]?.src || sockelleisteImage,
          label: 'Sockelleiste',
          name: selectedSockelleiste?.name || sockelleisteName,
          streichpreis: `${sockelleisteRegularPricePerUnit.toFixed(2).replace('.', ',')} €`,
          setPreis: sockelleisteSetPricePerUnit <= 0
            ? `0,00 €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`
            : `+${sockelleisteSetPricePerUnit.toFixed(2).replace('.', ',')} €/${selectedSockelleiste?.einheit_short || sockelleisteEinheit}`,
          zusatz: sockelleisteOptions.length > 0 && (
            <button
              type="button"
              onClick={() => openModal('sockelleiste')}
              className="mt-1 border border-dark text-dark text-[10px] font-semibold py-1 px-2 rounded"
            >
              Andere Sockelleiste &gt;
            </button>
          ),
        })}

        {/* Klebe-Vinyl Sparpaket */}
        {sparpaket?.zeilen.map((z) => zeile({
          key: z.typ,
          bild: z.image,
          label: z.label,
          name: z.name,
          streichpreis: `${z.regularPreisProM2.toFixed(2).replace('.', ',')} €`,
          setPreis: `0,00 €/${einheit}`,
          gedimmt: !sparpaket.aktiv,
          zusatz: !sparpaket.aktiv && (
            <p className="mt-0.5 text-[10px] text-mid">Kostenlos ab {sparpaket.mindestPakete} Paketen</p>
          ),
        }))}
      </div>

      {/* Set-Preis (STATISCHER M²-PREIS) */}
      <div className="mt-2 pt-2 border-t border-ash">
        <div className="text-right text-[11px] font-bold text-dark uppercase tracking-wide">Set-Preis</div>
        <div className="flex items-end justify-between gap-2">
          {vergleichspreisProM2 > setAngebotPreisProM2 ? (
            <span className="line-through text-xs text-mid whitespace-nowrap">
              {vergleichspreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
            </span>
          ) : <span />}
          <span className="text-2xl font-bold text-dark whitespace-nowrap">
            {setAngebotPreisProM2.toFixed(2).replace('.', ',')} €/{einheit}
          </span>
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
