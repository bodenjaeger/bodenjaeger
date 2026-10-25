'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import type { BlackWeeksBannerProps } from './black-weeks/BlackWeeksBanner';
import { isFachmarktRoute } from '@/lib/landingRoutes';

export default function HeaderWrapper({ promoBanner = null }: { promoBanner?: BlackWeeksBannerProps | null }) {
  const pathname = usePathname();
  // Im gesamten Fachmarkt-Bereich (Landingpage + alle Unterseiten) übernimmt
  // die reduzierte Fachmarkt-Navigation; die Shop-Navigation wird ausgeblendet.
  if (isFachmarktRoute(pathname)) return null;
  return <Header promoBanner={promoBanner} />;
}
