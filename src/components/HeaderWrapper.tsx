'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import type { BlackWeeksBannerProps } from './black-weeks/BlackWeeksBanner';
import { isFachmarktRoute } from '@/lib/landingRoutes';

export default function HeaderWrapper({ promoBanner = null }: { promoBanner?: BlackWeeksBannerProps | null }) {
  const pathname = usePathname();
  // Shop und Fachmarkt teilen sich einen Kopf. Im Fachmarkt-Bereich
  // (Landingpage + alle Unterseiten) zeigt Zeile 3 das Fachmarkt-Menü.
  return <Header promoBanner={promoBanner} bereich={isFachmarktRoute(pathname) ? 'fachmarkt' : 'shop'} />;
}
