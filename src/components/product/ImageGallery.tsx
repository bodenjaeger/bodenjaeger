'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, Play, X } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';

interface ImageGalleryProps {
  product: StoreApiProduct;
  hideDiscount?: boolean;  // Set-Layout: Rabatt steht im Set-Angebot
  videoUrl?: string;
}

export default function ImageGallery({ product, hideDiscount = false, videoUrl }: ImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
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
  const discountPercent = Math.round(product.setangebot_ersparnis_prozent || product.discount_percent || 0);

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
          {!hideDiscount && product.on_sale && discountPercent > 0 && (
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
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-dark shadow-lg hover:bg-pale"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-dark shadow-lg hover:bg-pale"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <button
          onClick={() => setIsZoomed(true)}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg bg-dark/85 text-white hover:bg-dark"
          aria-label="Bild vergrößern"
        >
          <Expand className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnails */}
      {(images.length > 1 || videoUrl) && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
          {images.slice(0, videoUrl ? 4 : 5).map((image, index) => (
            <button
              key={image.id || index}
              onClick={() => selectImage(index)}
              aria-label={`Bild ${index + 1} anzeigen`}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all ${
                currentImageIndex === index ? 'border-brand' : 'border-transparent hover:border-ash'
              } ${!videoUrl && index === 4 ? 'hidden sm:block' : ''}`}
            >
              <Image
                src={image.src}
                alt={image.alt || `${product.name} Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 25vw, 150px"
                quality={60}
              />
            </button>
          ))}
          {videoUrl && (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Verlegevideo ansehen"
              className="flex aspect-[4/3] items-center justify-center rounded-lg bg-ash"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dark text-white">
                <Play className="h-4 w-4 fill-current" />
              </span>
            </a>
          )}
        </div>
      )}

      {isZoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          className="fixed inset-0 z-50 bg-black/90"
          onClick={() => setIsZoomed(false)}
        >
          <Image
            src={currentImage.src}
            alt={currentImage.alt || product.name}
            fill
            sizes="100vw"
            className="object-contain p-4"
          />
          <button
            onClick={() => setIsZoomed(false)}
            autoFocus
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-dark"
            aria-label="Schließen"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
