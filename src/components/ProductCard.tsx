'use client';

import { useState } from 'react';
import { StoreApiProduct } from '@/lib/woocommerce';
import { useWishlist } from '@/contexts/WishlistContext';
import { isMusterProduct } from '@/lib/sampleUtils';
import { KLEBEVINYL_SPARPAKET } from '@/content/klebevinyl-sparpaket';
import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  product: StoreApiProduct;
  showDescription?: boolean; // Show product description for floor categories
}

export default function ProductCard({ product, showDescription = false }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toggleWishlist, isInWishlist } = useWishlist();

  const wishlisted = isInWishlist(product.id);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  // ✅ USE ROOT-LEVEL FIELDS (wie in backend/ROOT_LEVEL_FIELDS.md dokumentiert)
  const price = product.price || 0;
  const regularPrice = product.regular_price || 0;
  const einheitShort = product.einheit_short || 'm²';

  const showUnit = einheitShort !== '-' && einheitShort.trim() !== '';
  const paketinhalt = product.paketinhalt || 1;
  const verpackungsart = product.verpackungsart_short || 'Pak.';

  // Muster sind immer kostenlos — Backend-Preis (Platzhalter) überschreiben.
  const isMuster = isMusterProduct(product);

  // Get main price from product data
  const getMainPrice = () => {
    if (isMuster) return 'Kostenlos';
    return `${price.toFixed(2).replace('.', ',')} ${showUnit ? `€/${einheitShort}` : '€'}`;
  };

  // Get strike price if there's a discount
  // Bei Set-Produkten: setangebot_einzelpreis (Vergleichspreis inkl. Zusatzprodukte)
  const getStrikePrice = () => {
    if (isMuster) return null;
    const isSetProduct = product.show_setangebot && product.setangebot_einzelpreis;
    const stattPrice = isSetProduct
      ? (product.setangebot_einzelpreis || 0)
      : regularPrice;
    if (stattPrice <= price) return null;
    return `${stattPrice.toFixed(2).replace('.', ',')} ${showUnit ? `€/${einheitShort}` : '€'}`;
  };

  // Get package price if paketinhalt > 1 and unit is shown
  const getPackagePrice = () => {
    if (isMuster) return null;
    if (!showUnit || paketinhalt <= 1) return null;
    const paketpreis = price * paketinhalt;
    return `${paketpreis.toFixed(2).replace('.', ',')} €/${verpackungsart}`;
  };

  // Navigation functions
  const goToPrevious = () => {
    setCurrentImageIndex(prev =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex(prev =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  // Parse product description into bullet points (for floor categories only)
  const getDescriptionPoints = () => {
    if (!showDescription) return [];

    const description = product.short_description || product.description || '';
    if (!description) return [];

    // Remove HTML tags and split by common list separators
    const cleanText = description
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n')
      .replace(/<\/li>/gi, '')
      .replace(/<ul[^>]*>|<\/ul>/gi, '')
      .replace(/<ol[^>]*>|<\/ol>/gi, '')
      .replace(/<p[^>]*>|<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // Split by newlines and filter out empty lines
    const points = cleanText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.length < 200); // Ignore very long lines

    return points.slice(0, 6); // Max 6 points
  };

  const descriptionPoints = getDescriptionPoints();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Section with Slider */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {/* Main Image */}
        {images.length > 0 ? (
          <Image
            src={images[currentImageIndex]?.src}
            alt={images[currentImageIndex]?.alt || product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
            loading="lazy"
            quality={80}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">Kein Bild</span>
          </div>
        )}

        {/* Sale Badge (Top Left) */}
        {product.on_sale && (() => {
          const percent = product.setangebot_ersparnis_prozent || product.discount_percent || 0;
          return percent > 0 ? (
            <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded text-sm font-bold">
              -{Math.round(percent)}%
            </div>
          ) : null;
        })()}

        {/* Action Badge (Top Right) */}
        {product.show_aktion && product.aktion && (
          <div className="absolute top-3 right-3 bg-gray-900 text-white px-3 py-1 rounded text-sm font-medium">
            {product.aktion}
          </div>
        )}

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Indicators */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Action Buttons (Bottom of Image) */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-center space-x-2">
          <button
            onClick={handleToggleWishlist}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              wishlisted
                ? 'bg-brand text-white hover:bg-red-700'
                : 'bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800'
            }`}
          >
            {wishlisted ? '❤️ Gemerkt' : '💖 Merkliste'}
          </button>
          <button className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-3 py-1 rounded text-xs font-medium transition-colors">
            🎨 Muster
          </button>
        </div>

        {/* Test Buttons on Border */}
        <div className="absolute -bottom-[5px] left-0 right-0 flex justify-between px-4 z-10">
          <button
            className="text-white text-xs font-medium flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-bg-darkest)',
              height: '10px',
              padding: '2%'
            }}
          >
            testen 1
          </button>
          <button
            className="text-white text-xs font-medium flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-bg-darkest)',
              height: '10px',
              padding: '2%'
            }}
          >
            testen 2
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Product Name */}
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-brand transition-colors line-clamp-2 mb-3">
            {product.name}
          </h3>
        </Link>

        {/* Product Description List (for floor categories only) */}
        {showDescription && descriptionPoints.length > 0 && (
          <div className="mb-4">
            <ul className="space-y-1">
              {descriptionPoints.map((point, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600">
                  <Image
                    src="/images/Icons/haken-schieferschwarz.png"
                    alt="Checkmark"
                    width={16}
                    height={16}
                    className="mr-2 flex-shrink-0 mt-0.5"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Set-Angebot Section */}
        {product.show_setangebot && (
          <div className="border-t pt-4">
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {product.categories?.some(c => c.slug === KLEBEVINYL_SPARPAKET.kategorie)
                  ? 'Sparpaket'
                  : product.setangebot_titel || 'Set-Angebot'}
              </h4>
              <p className="text-xs text-gray-600">
                {/* Dynamischer Text basierend auf vorhandenen Zusatzprodukten */}
                {product.daemmung_id && product.sockelleisten_id
                  ? 'Inkl. Sockelleiste und Dämmung'
                  : product.sockelleisten_id
                  ? 'Inkl. Sockelleiste'
                  : product.daemmung_id
                  ? 'Inkl. Dämmung'
                  : 'Set-Angebot'}
              </p>
            </div>

            {/* Pricing */}
            <div className="space-y-1">
              {/* Strike Price */}
              {getStrikePrice() && (
                <div className="text-sm text-gray-500 line-through">
                  {getStrikePrice()}
                </div>
              )}

              {/* Main Price */}
              <div className="text-xl font-bold text-red-600">
                {getMainPrice()}
              </div>

              {/* Price Hint */}
              {product.show_angebotspreis_hinweis && product.angebotspreis_hinweis && (
                <div className="text-xs text-gray-500">
                  {product.angebotspreis_hinweis}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regular Pricing (if no Set-Angebot) */}
        {!product.show_setangebot && (
          <div className="border-t pt-4">
            <div className="space-y-1">
              {/* Strike Price */}
              {getStrikePrice() && (
                <div className="text-sm text-gray-500 line-through">
                  {getStrikePrice()}
                </div>
              )}

              {/* Main Price */}
              <div className="text-xl font-bold text-gray-900">
                {getMainPrice()}
              </div>

              {/* Package Price */}
              {getPackagePrice() && (
                <div className="text-sm text-gray-600">
                  {getPackagePrice()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Product Overview Text */}
        {product.show_text_produktuebersicht && product.text_produktuebersicht && (
          <div className="mt-3 text-sm text-gray-600">
            {product.text_produktuebersicht}
          </div>
        )}

        {/* Delivery Time */}
        {product.show_lieferzeit && product.lieferzeit && (
          <div className="mt-2 text-xs text-green-600">
            🚚 {product.lieferzeit}
          </div>
        )}
      </div>
    </div>
  );
}