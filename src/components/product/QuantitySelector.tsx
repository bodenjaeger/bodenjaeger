'use client';

import { useState } from 'react';

interface QuantitySelectorProps {
  paketinhalt: number;
  einheit: string;
  einheitFull?: string;          // Ausgeschrieben, z.B. "Quadratmeter", "Kilogramm"
  verpackungsartFull?: string;   // Ausgeschrieben, z.B. "Paket(e)", "Stück"
  initialPackages?: number;      // Startwert (Klebe-Vinyl: 5 für das Sparpaket)
  onQuantityChange?: (packages: number, sqm: number) => void;
}

export default function QuantitySelector({
  paketinhalt,
  einheit,
  einheitFull,
  verpackungsartFull,
  initialPackages = 1,
  onQuantityChange
}: QuantitySelectorProps) {
  // Ausgeschriebene Labels für über den +/- Feldern
  const packageLabel = verpackungsartFull || 'Paket(e)';
  const unitLabel = einheitFull || 'Quadratmeter';

  // Wenn einheit "-" oder leer → kein Einheiten-Feld
  const showUnitField = einheit !== '-' && einheit.trim() !== '';
  // Wenn paketinhalt === 1 und beide Labels identisch → nur ein Feld
  const showBothFields = showUnitField && !(paketinhalt === 1 && packageLabel === unitLabel);
  const [showInfo, setShowInfo] = useState(false);
  const [sqm, setSqm] = useState<number>(initialPackages * paketinhalt);
  const [sqmInputValue, setSqmInputValue] = useState<string>((initialPackages * paketinhalt).toFixed(2));
  const [packagesInputValue, setPackagesInputValue] = useState<string>(initialPackages.toString());

  // FP-sicheres Aufrunden: behebt Fälle wie 10 * 1.92 = 19.200000000000003 → ceil(10.000000000000002) wäre fälschlich 11
  const ceilPackages = (m2: number) => Math.max(1, Math.ceil((m2 - 1e-9) / paketinhalt));

  const packages = ceilPackages(sqm);

  const handlePackagesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPackagesInputValue(value);

    // Allow empty input during typing
    if (value === '') return;

    const inputValue = parseInt(value);
    if (!isNaN(inputValue) && inputValue > 0) {
      const newSqm = inputValue * paketinhalt;
      setSqm(newSqm);
      setSqmInputValue(newSqm.toFixed(2));

      if (onQuantityChange) {
        onQuantityChange(inputValue, newSqm);
      }
    }
  };

  const handlePackagesBlur = () => {
    // On blur, ensure we have a valid value
    if (packagesInputValue === '' || parseInt(packagesInputValue) < 1) {
      setPackagesInputValue('1');
      const newSqm = paketinhalt;
      setSqm(newSqm);
      setSqmInputValue(newSqm.toFixed(2));

      if (onQuantityChange) {
        onQuantityChange(1, newSqm);
      }
    }
  };

  const handleSqmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSqmInputValue(value);

    // Allow empty input during typing
    if (value === '') return;

    const inputValue = parseFloat(value);
    if (!isNaN(inputValue) && inputValue > 0) {
      setSqm(inputValue);
      const calculatedPackages = ceilPackages(inputValue);
      setPackagesInputValue(calculatedPackages.toString());

      if (onQuantityChange) {
        onQuantityChange(calculatedPackages, inputValue);
      }
    }
  };

  const handleSqmBlur = () => {
    // On blur, ensure we have a valid value
    if (sqmInputValue === '' || parseFloat(sqmInputValue) < paketinhalt) {
      setSqmInputValue(paketinhalt.toFixed(2));
      setSqm(paketinhalt);
      setPackagesInputValue('1');

      if (onQuantityChange) {
        onQuantityChange(1, paketinhalt);
      }
    } else {
      // Format the value on blur
      setSqmInputValue(parseFloat(sqmInputValue).toFixed(2));
    }
  };

  const incrementSqm = () => {
    const newSqm = sqm + paketinhalt;
    setSqm(newSqm);
    setSqmInputValue(newSqm.toFixed(2));
    const newPackages = ceilPackages(newSqm);
    setPackagesInputValue(newPackages.toString());

    if (onQuantityChange) {
      onQuantityChange(newPackages, newSqm);
    }
  };

  const decrementSqm = () => {
    const newSqm = Math.max(paketinhalt, sqm - paketinhalt);
    setSqm(newSqm);
    setSqmInputValue(newSqm.toFixed(2));
    const newPackages = ceilPackages(newSqm);
    setPackagesInputValue(newPackages.toString());

    if (onQuantityChange) {
      onQuantityChange(newPackages, newSqm);
    }
  };

  const incrementPackages = () => {
    const currentPackages = parseInt(packagesInputValue) || packages;
    const newPackages = currentPackages + 1;
    const newSqm = newPackages * paketinhalt;
    setSqm(newSqm);
    setSqmInputValue(newSqm.toFixed(2));
    setPackagesInputValue(newPackages.toString());

    if (onQuantityChange) {
      onQuantityChange(newPackages, newSqm);
    }
  };

  const decrementPackages = () => {
    const currentPackages = parseInt(packagesInputValue) || packages;
    const newPackages = Math.max(1, currentPackages - 1);
    const newSqm = newPackages * paketinhalt;
    setSqm(newSqm);
    setSqmInputValue(newSqm.toFixed(2));
    setPackagesInputValue(newPackages.toString());

    if (onQuantityChange) {
      onQuantityChange(newPackages, newSqm);
    }
  };

  return (
    <div className="mb-6">

      {/* Counters Grid */}
      <div className={`grid ${showBothFields ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {/* Paket Counter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="absolute -top-1 -left-1 z-10"
            aria-label="Verschnitt-Info anzeigen"
          >
            <div className="w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <svg
                className="w-4 h-4 text-black"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </button>
          <div className="flex items-center justify-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              {packageLabel}
            </label>
          </div>

          {/* Counter Container with Dividers */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden flex items-stretch h-12 w-[90%] mx-auto">
            {/* Minus Button */}
            <button
              type="button"
              onClick={decrementPackages}
              className="w-[16%] flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 font-extrabold text-2xl disabled:cursor-not-allowed border-r-2 border-gray-300"
              disabled={packages <= 1}
            >
              -
            </button>

            {/* Value Display/Input */}
            <input
              type="number"
              value={packagesInputValue}
              onChange={handlePackagesInputChange}
              onBlur={handlePackagesBlur}
              min="1"
              className="w-[68%] text-center bg-white border-0 outline-none text-gray-900 font-semibold text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ MozAppearance: 'textfield' }}
            />

            {/* Plus Button */}
            <button
              type="button"
              onClick={incrementPackages}
              className="w-[16%] flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 font-extrabold text-2xl border-l-2 border-gray-300"
            >
              +
            </button>
          </div>
        </div>

        {/* Einheiten Counter - nur wenn sinnvoll */}
        {showBothFields && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            {unitLabel}
          </label>

          {/* Counter Container with Dividers */}
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden flex items-stretch h-12 w-[90%] mx-auto">
            {/* Minus Button */}
            <button
              type="button"
              onClick={decrementSqm}
              className="w-[16%] flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 font-extrabold text-2xl disabled:cursor-not-allowed border-r-2 border-gray-300"
              disabled={sqm <= paketinhalt}
            >
              -
            </button>

            {/* Value Display/Input */}
            <input
              type="number"
              value={sqmInputValue}
              onChange={handleSqmInputChange}
              onBlur={handleSqmBlur}
              min={paketinhalt}
              step="0.01"
              className="w-[68%] text-center bg-white border-0 outline-none text-gray-900 font-semibold text-lg [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ MozAppearance: 'textfield' }}
            />

            {/* Plus Button */}
            <button
              type="button"
              onClick={incrementSqm}
              className="w-[16%] flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700 font-extrabold text-2xl border-l-2 border-gray-300"
            >
              +
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Verschnitt Info Box */}
      {showInfo && (
        <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 shadow-sm relative">
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800"
            aria-label="Info schließen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h4 className="font-semibold text-gray-900 mb-2">Verschnitt einplanen</h4>
          <p className="mb-3">
            Bei der Verlegung von Bodenbelägen entstehen durch Zuschnitte an Wänden, Türen, Heizkörpern oder Nischen immer Verschnittstücke.
            Damit während der Verlegung genügend Material vorhanden ist, empfehlen wir eine Materialreserve von 5–15 % zur berechneten Raumfläche.
          </p>
          <p className="font-semibold text-gray-900 mb-2">Unsere Empfehlung:</p>
          <ul className="space-y-1 mb-3">
            <li>Normale Räume: ca. +5 % Verschnitt</li>
            <li>Viele Ecken / verwinkelte Räume: ca. +8 % Verschnitt</li>
            <li>Diagonale Verlegung: ca. +10 % Verschnitt</li>
            <li>Fischgrät-Verlegung: ca. +15 % Verschnitt</li>
          </ul>
          <p className="text-gray-600 italic">
            Tipp: Bewahren Sie einige Planken als Reserve für spätere Reparaturen oder den Austausch einzelner Elemente auf.
          </p>
        </div>
      )}
    </div>
  );
}
