'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { isFachmarktRoute } from '@/lib/landingRoutes';
import ContactDrawer from './ContactDrawer';

export default function FloatingContactButton() {
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { itemCount, openCartDrawer, isCartDrawerOpen } = useCart();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

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
        className={`fixed right-8 bottom-6 md:right-6 md:bottom-6 z-30 flex flex-col gap-3 transition-opacity duration-300 ${
          isCartDrawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Kontakt Button */}
        <button
          onClick={() => setIsContactDrawerOpen(true)}
          className="w-11 h-11 md:w-14 md:h-14 bg-brand rounded-full hover:scale-110 transition-transform shadow-lg flex items-center justify-center"
          aria-label="Kontakt öffnen"
        >
          <Image
            src="/images/Icons/kontakt-weiss.png"
            alt="Kontakt"
            width={28}
            height={28}
            className="w-[22px] h-[22px] md:w-7 md:h-7"
          />
        </button>

        {/* Warenkorb Button */}
        <button
          onClick={openCartDrawer}
          className="relative w-11 h-11 md:w-14 md:h-14 bg-white rounded-full hover:scale-110 transition-transform shadow-lg flex items-center justify-center"
          aria-label="Warenkorb öffnen"
        >
          <Image
            src="/images/Icons/warenkorb-schieferschwarz.png"
            alt="Warenkorb"
            width={28}
            height={28}
            className="w-[22px] h-[22px] md:w-7 md:h-7"
          />
          {mounted && itemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {itemCount}
            </span>
          )}
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
