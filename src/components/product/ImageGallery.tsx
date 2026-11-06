'use client';

import SchliessenButton from '@/components/shared/SchliessenButton';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, Play } from 'lucide-react';
import type { StoreApiProduct } from '@/lib/woocommerce';
import { lockPageScroll } from '@/lib/scroll-lock';

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

  const thumbsRef = useRef<HTMLDivElement>(null);
  const [canScrollThumbs, setCanScrollThumbs] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const lastWheelAt = useRef(0);

  // Großansicht: Pfeiltasten und Esc, Seite dahinter nicht scrollen
  useEffect(() => {
    if (!isZoomed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsZoomed(false);
      if (event.key === 'ArrowLeft') setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
      if (event.key === 'ArrowRight') setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    };
    const unlock = lockPageScroll();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlock();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isZoomed, images.length]);

  // Weitere Vorschaubilder erkennbar machen und das aktive Bild im Streifen sichtbar halten
  const updateThumbArrow = () => {
    const strip = thumbsRef.current;
    if (strip) setCanScrollThumbs(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4);
  };

  useEffect(() => {
    updateThumbArrow();
    window.addEventListener('resize', updateThumbArrow);
    return () => window.removeEventListener('resize', updateThumbArrow);
  }, [images.length, videoUrl]);

  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[currentImageIndex] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    if (thumb.offsetLeft < strip.scrollLeft || thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: thumb.offsetLeft, behavior: 'smooth' });
    }
  }, [currentImageIndex]);

  // Nur seitliches Wischen am Trackpad wechselt das Bild, senkrechtes Scrollen bewirkt nichts
  const handleWheel = (event: React.WheelEvent) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const delta = event.deltaX;
    const now = Date.now();
    if (Math.abs(delta) < 20 || now - lastWheelAt.current < 400) return;
    lastWheelAt.current = now;
    if (delta > 0) goToNext();
    else goToPrevious();
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 50) return;
    if (distance < 0) goToNext();
    else goToPrevious();
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
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash"
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash"
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <button
          onClick={() => setIsZoomed(true)}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash"
          aria-label="Bild vergrößern"
        >
          <Expand className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnails: Streifen zum Wischen, Pfeil zeigt weitere Bilder an */}
      {(images.length > 1 || videoUrl) && (
        <div className="relative">
          <div
            ref={thumbsRef}
            onScroll={updateThumbArrow}
            className="relative flex snap-x gap-2 overflow-x-auto [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
          >
            {images.map((image, index) => (
              <button
                key={image.id || index}
                onClick={() => selectImage(index)}
                aria-label={`Bild ${index + 1} von ${images.length} anzeigen`}
                className={`relative aspect-[4/3] w-[calc((100%-1.5rem)/4)] flex-shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-all sm:w-[calc((100%-3rem)/5)] ${
                  currentImageIndex === index ? 'border-brand' : 'border-transparent hover:border-ash'
                }`}
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
                className="flex aspect-[4/3] w-[calc((100%-1.5rem)/4)] flex-shrink-0 snap-start items-center justify-center rounded-lg bg-ash sm:w-[calc((100%-3rem)/5)]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dark text-white">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </a>
            )}
          </div>
          {canScrollThumbs && (
            <button
              type="button"
              onClick={() => thumbsRef.current?.scrollBy({ left: thumbsRef.current.clientWidth / 2, behavior: 'smooth' })}
              aria-label="Weitere Bilder anzeigen"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* Über allen Ebenen der Seite, auch den mitlaufenden Spalten */}
      {isZoomed && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          className="fixed inset-0 z-[100] touch-none overscroll-none bg-black/90"
          onClick={() => setIsZoomed(false)}
          onWheel={images.length > 1 ? handleWheel : undefined}
          onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
          onTouchEnd={images.length > 1 ? handleTouchEnd : undefined}
        >
          <Image
            src={currentImage.src}
            alt={currentImage.alt || product.name}
            fill
            sizes="100vw"
            className="object-contain sm:px-20 sm:py-4"
          />
          <SchliessenButton onClick={() => setIsZoomed(false)} autoFocus className="absolute right-4 top-4" />
          {images.length > 1 && (
            <>
              <button
                onClick={(event) => { event.stopPropagation(); goToPrevious(); }}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash sm:left-5"
                aria-label="Vorheriges Bild"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(event) => { event.stopPropagation(); goToNext(); }}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-ash bg-white text-dark transition-colors hover:bg-gray-100 active:bg-ash sm:right-5"
                aria-label="Nächstes Bild"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {currentImageIndex + 1} / {images.length}
              </p>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
