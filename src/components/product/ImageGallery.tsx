'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';

interface ImageGalleryProps {
  product: StoreApiProduct;
  rabattProzent?: number;  // Klebe-Vinyl Sparpaket: höherer Wert aus Backend und Berechnung
}

export default function ImageGallery({ product, rabattProzent }: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images || [];

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">Kein Bild verfügbar</span>
      </div>
    );
  }

  const currentImage = images[currentImageIndex];

  // ✅ USE BACKEND-CALCULATED DISCOUNT
  // on_sale als Trigger, Prozent aus setangebot_ersparnis_prozent oder discount_percent
  const discountPercent = Math.round(rabattProzent ?? (product.setangebot_ersparnis_prozent || product.discount_percent || 0));

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Main Image */}
      <div className="relative aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden group">
        <Image
          src={currentImage.src}
          alt={currentImage.alt || product.name}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 55vw"
          quality={90}
        />

        {/* Badges (top left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {/* Discount Badge — erscheint wenn on_sale aktiv ist */}
          {product.on_sale && discountPercent > 0 && (
            <div className="text-white rounded font-bold shadow-md w-fit" style={{ fontSize: '12px', padding: '3% 10%', whiteSpace: 'nowrap', backgroundColor: '#ed1b24' }}>
              -{discountPercent}%
            </div>
          )}

          {/* Aktion Badge — Root-Level-Felder + Backend-Stil (Jäger-Farben) */}
          {product.show_aktion && product.aktion && (
            <div
              className="rounded font-bold shadow-md w-fit"
              style={{
                fontSize: '12px',
                padding: '3% 10%',
                whiteSpace: 'nowrap' as const,
                backgroundColor: {
                  'aktion-bg-black': '#2e2d32',
                  'aktion-bg-red': '#ed1b24',
                  'aktion-bg-blue': '#5095cb',
                  'aktion-bg-navy': '#1e40af',
                  'aktion-bg-green': '#28a745',
                  'aktion-bg-yellow': '#fff201',
                  'aktion-bg-gray': '#4c4c4c',
                }[product.aktion_button_style || ''] || '#2e2d32',
                color: product.aktion_text_color
                  ? {
                      'aktion-text-red': '#ed1b24',
                      'aktion-text-blue': '#5095cb',
                      'aktion-text-green': '#28a745',
                      'aktion-text-yellow': '#fff201',
                      'aktion-text-white': '#FFFFFF',
                      'aktion-text-black': '#2e2d32',
                    }[product.aktion_text_color] || '#FFFFFF'
                  : product.aktion_button_style === 'aktion-bg-yellow' ? '#2e2d32' : '#FFFFFF',
              }}
            >
              {product.aktion}
            </div>
          )}

          {/* Angebotspreis Hinweis Badge — Root-Level-Felder + Backend-Stil (Jäger-Farben) */}
          {product.show_angebotspreis_hinweis && product.angebotspreis_hinweis && (
            <div
              className="rounded font-bold shadow-md w-fit"
              style={{
                fontSize: '12px',
                padding: '3% 10%',
                whiteSpace: 'nowrap' as const,
                backgroundColor: {
                  'aktion-bg-black': '#2e2d32',
                  'aktion-bg-red': '#ed1b24',
                  'aktion-bg-blue': '#5095cb',
                  'aktion-bg-navy': '#1e40af',
                  'aktion-bg-green': '#28a745',
                  'aktion-bg-yellow': '#fff201',
                  'aktion-bg-gray': '#4c4c4c',
                }[product.angebotspreis_button_style || ''] || '#2e2d32',
                color: product.angebotspreis_text_color
                  ? {
                      'aktion-text-red': '#ed1b24',
                      'aktion-text-blue': '#5095cb',
                      'aktion-text-green': '#28a745',
                      'aktion-text-yellow': '#fff201',
                      'aktion-text-white': '#FFFFFF',
                      'aktion-text-black': '#2e2d32',
                    }[product.angebotspreis_text_color] || '#FFFFFF'
                  : product.angebotspreis_button_style === 'aktion-bg-yellow' ? '#2e2d32' : '#FFFFFF',
              }}
            >
              {product.angebotspreis_hinweis}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-900 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          {images.slice(0, 3).map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => selectImage(index)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                currentImageIndex === index
                  ? 'border-dark ring-2 ring-dark ring-offset-2'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt || `${product.name} Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 150px"
                quality={60}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
