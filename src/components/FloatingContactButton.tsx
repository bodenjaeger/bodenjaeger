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

  // Boden-Produktseiten: Buttons ausblenden, solange die Kaufbox ([data-kaufbox]) im Viewport ist –
  // sie würden sonst Preise/Stepper am rechten Rand verdecken. Die Kaufbox gibt es nur im
  // Boden-Layout, Zubehörseiten und alle anderen Seiten bleiben unverändert.
  const [kaufboxSichtbar, setKaufboxSichtbar] = useState(false);
  useEffect(() => {
    setKaufboxSichtbar(false);
    if (!pathname?.startsWith('/products/')) return;

    let intersection: IntersectionObserver | null = null;
    let mutation: MutationObserver | null = null;

    const beobachten = (): boolean => {
      const kaufbox = document.querySelector('[data-kaufbox]');
      if (!kaufbox) return false;
      intersection = new IntersectionObserver(([entry]) => setKaufboxSichtbar(entry.isIntersecting));
      intersection.observe(kaufbox);
      return true;
    };

    // Die Seite kann nach diesem Effekt gestreamt werden – dann auf die Kaufbox warten
    if (!beobachten()) {
      mutation = new MutationObserver(() => {
        if (beobachten()) {
          mutation?.disconnect();
          mutation = null;
        }
      });
      mutation.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      intersection?.disconnect();
      mutation?.disconnect();
    };
  }, [pathname]);

  // Auf allen Fachmarkt-Seiten (Landing + Unterseiten) keine Floating-Buttons.
  if (isFachmarktRoute(pathname)) return null;

  const ausgeblendet = isCartDrawerOpen || kaufboxSichtbar;

  return (
    <>
      {/* Floating Buttons - mehr rechter Abstand auf Mobile (iPhone Safe-Area & abgerundete Ecken)
          z-30: bewusst UNTER dem Header (z-50) und damit unter dem offenen
          Mobile-Menü — vorher lagen die Buttons auf z-[60] darüber.
          `data-floating-actions` wird zusätzlich von globals.css genutzt, um sie
          bei offenem Menü (body.nav-menu-open) auszublenden. */}
      <div
        data-floating-actions
        className={`fixed right-8 bottom-6 md:right-6 md:bottom-6 z-30 flex flex-col gap-3 transition-[opacity,transform] duration-300 ${
          ausgeblendet ? 'opacity-0 translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
        inert={ausgeblendet}
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
