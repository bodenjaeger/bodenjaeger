'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronUp } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { isFachmarktRoute } from '@/lib/landingRoutes';
import ContactDrawer from './ContactDrawer';

export default function FloatingContactButton() {
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const { isCartDrawerOpen } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Kontakt aus der mobilen Kaufleiste der Produktseite
  useEffect(() => {
    const open = () => setIsContactDrawerOpen(true);
    window.addEventListener('kontakt-oeffnen', open);
    return () => window.removeEventListener('kontakt-oeffnen', open);
  }, []);

  // Auf allen Fachmarkt-Seiten (Landing + Unterseiten) keine Floating-Buttons.
  if (isFachmarktRoute(pathname)) return null;

  return (
    <>
      {/* Floating Buttons - mehr rechter Abstand auf Mobile (iPhone Safe-Area & abgerundete Ecken)
          z-30: bewusst UNTER dem Header (z-50) und damit unter dem offenen
          Mobile-Menü — vorher lagen die Buttons auf z-[60] darüber.
          `data-floating-actions` wird zusätzlich von globals.css genutzt, um sie
          bei offenem Menü (body.nav-menu-open) auszublenden. */}
      <div
        data-floating-actions
        className={`fixed right-8 bottom-6 md:right-6 md:bottom-6 z-30 flex flex-col gap-2 transition-opacity duration-300 ${
          isCartDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Nach oben – erst nach etwas Scrollen */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Nach oben"
          tabIndex={showTop ? 0 : -1}
          className={`w-11 h-11 md:w-12 md:h-12 bg-white border border-ash rounded-lg shadow-md flex items-center justify-center text-dark transition-all duration-300 hover:bg-gray-100 ${
            showTop ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-2'
          }`}
        >
          <ChevronUp className="w-6 h-6" aria-hidden="true" />
        </button>

        {/* Kontakt Button */}
        <button
          onClick={() => setIsContactDrawerOpen(true)}
          className="w-11 h-11 md:w-12 md:h-12 bg-brand rounded-lg shadow-md flex items-center justify-center transition-colors hover:bg-[#d11820]"
          aria-label="Kontakt öffnen"
        >
          <Image
            src="/images/Icons/kontakt-weiss.png"
            alt="Kontakt"
            width={28}
            height={28}
            className="w-[22px] h-[22px] md:w-6 md:h-6"
          />
        </button>

      </div>

      {/* Contact Drawer */}
      <ContactDrawer
        isOpen={isContactDrawerOpen}
        onClose={() => setIsContactDrawerOpen(false)}
      />
    </>
  );
}
