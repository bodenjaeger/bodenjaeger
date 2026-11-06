import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { wooCommerceClient, type StoreApiProduct } from "@/lib/woocommerce";
import HeroSlider from "@/components/startseite/HeroSlider";
import MusterboxLeiste from "@/components/startseite/MusterboxLeiste";
import BodenWahl from "@/components/startseite/BodenWahl";
import AktionsAngebote, { type AngebotsReiter } from "@/components/startseite/AktionsAngebote";
import type { BodenfinderEmpfehlung, BodenfinderSchluessel } from "@/components/startseite/Bodenfinder";
import { buildMetadata } from "@/lib/seo";
import { klickVinylName } from "@/lib/klick-vinyl";
import { angeboteHref } from "@/content/megaMenu";
import {
  PROMO_CATEGORY_SLUG,
  formatPromoEnd,
  getPromoBodenart,
  getPromoEnd,
  isPromoActive,
} from "@/lib/black-weeks";

export const metadata: Metadata = buildMetadata({
  path: '/',
  title: 'Vinyl, Laminat & Parkett online kaufen | Bodenjäger',
  description: 'Klick-Vinyl, Klebe-Vinyl, Laminat und Parkett von COREtec, primeCORE & Co. – mit Set-Angeboten, Fachmarkt in Hückelhoven und persönlicher Beratung.',
});

const VorteilBloecke = dynamic(() => import("@/components/startseite/VorteilBloecke"));
const Bodenfinder = dynamic(() => import("@/components/startseite/Bodenfinder"));
const BeratungTeam = dynamic(() => import("@/components/startseite/BeratungTeam"));
const FachmarktVerlegt = dynamic(() => import("@/components/startseite/FachmarktVerlegt"));
const StartseiteFaq = dynamic(() => import("@/components/startseite/StartseiteFaq"));

const FLOOR_CATEGORIES = ['vinylboden', 'klebe-vinyl', 'rigid-vinyl', 'laminat', 'parkett'];
const KARTEN_JE_REITER = 4;

/* Bodenfinder: Text und Kategorie je Empfehlung; die Produkte werden
   aus den geladenen Angeboten/Bestsellern der passenden Kategorie gewählt. */
const BODENFINDER_BASIS: Record<BodenfinderSchluessel, Omit<BodenfinderEmpfehlung, 'produkte'> & { kategorie: string }> = {
  klick: {
    titel: 'Klick-Vinyl',
    warum: '100 % wasserfest, robust und ohne Vorkenntnisse selbst zu verlegen – auch in Küche, Bad und Flur.',
    href: '/category/rigid-vinyl',
    bild: '/images/Startseite/Bodenkategorie Rigid-Vinyl.webp',
    kategorie: 'rigid-vinyl',
  },
  laminat: {
    titel: 'Laminat',
    warum: 'Preiswert und robust – der günstigste Weg zu viel neuer Fläche in trockenen Wohnräumen.',
    href: '/category/laminat',
    bild: '/images/Startseite/Bodenkategorie Laminat.webp',
    kategorie: 'laminat',
  },
  parkett: {
    titel: 'Parkett',
    warum: 'Echtes Holz: natürlich, warm und langlebig.',
    href: '/category/parkett',
    bild: '/images/Startseite/Bodenkategorie Parkett.webp',
    kategorie: 'parkett',
  },
  klebe: {
    titel: 'Klebe-Vinyl im Sparpaket',
    warum: 'Vollflächig verklebt, flach und leise – ideal für große Flächen. Grundierung, Spachtelmasse, Kleber und Sockelleiste kommen gleich mit.',
    href: '/category/klebe-vinyl',
    bild: '/images/Startseite/Bodenkategorie Klebe-Vinyl.webp',
    kategorie: 'klebe-vinyl',
  },
  prime: {
    titel: 'primeCORE',
    warum: '8 mm stark, 0,7 mm Nutzschicht und integrierte Korkdämmung – angenehm leise. Lebenslange Garantie im Privatbereich.',
    href: '/category/primecore',
    bild: '/images/Startseite/Bodenkategorie primeCORE.webp',
    kategorie: 'primecore',
  },
};

function hatKategorie(product: StoreApiProduct, slug: string) {
  return product.categories?.some((c) => c.slug.toLowerCase() === slug) ?? false;
}

function bodenfinderEmpfehlungen(pool: StoreApiProduct[]): Record<BodenfinderSchluessel, BodenfinderEmpfehlung> {
  const ergebnis = {} as Record<BodenfinderSchluessel, BodenfinderEmpfehlung>;
  for (const [schluessel, basis] of Object.entries(BODENFINDER_BASIS) as Array<[BodenfinderSchluessel, (typeof BODENFINDER_BASIS)[BodenfinderSchluessel]]>) {
    const { kategorie, ...rest } = basis;
    ergebnis[schluessel] = {
      ...rest,
      produkte: pool
        .filter((p) => hatKategorie(p, kategorie) && (p.price || 0) > 0)
        .slice(0, 2)
        .map((p) => ({
          name: klickVinylName(p.name),
          slug: p.slug,
          price: p.price || 0,
          paketinhalt: p.paketinhalt || null,
          einheit: p.einheit_short || 'm²',
        })),
    };
  }
  return ergebnis;
}

export default async function Home() {
  const promoActive = isPromoActive();

  let angebote: StoreApiProduct[] = [];
  let bestseller: StoreApiProduct[] = [];

  try {
    const [angeboteRoh, bestsellerRoh] = await Promise.all([
      promoActive
        ? wooCommerceClient
            .getProductsPage({ category: PROMO_CATEGORY_SLUG, page: 1, per_page: 100, orderby: 'popularity', order: 'desc' })
            .then((r) => r.products)
        : wooCommerceClient.getProducts({ per_page: 24, category: 'sale', orderby: 'popularity', order: 'desc' }),
      wooCommerceClient.getProducts({ per_page: 24, category: 'bestseller', orderby: 'popularity', order: 'desc' }),
    ]);
    angebote = angeboteRoh.filter((p) => p.categories?.some((c) => FLOOR_CATEGORIES.includes(c.slug)));
    bestseller = bestsellerRoh;
  } catch (error) {
    console.error('❌ Startseite: Produkte konnten nicht geladen werden:', error);
  }

  const gruppen: Record<AngebotsReiter, StoreApiProduct[]> = { vinyl: [], laminat: [], parkett: [] };
  for (const product of angebote) {
    const art = getPromoBodenart(product);
    if (art && gruppen[art].length < KARTEN_JE_REITER) gruppen[art].push(product);
  }

  /* Zubehör für den Streichpreis auf den Karten (wie auf der Aktionsseite) */
  const angezeigt = [...gruppen.vinyl, ...gruppen.laminat, ...gruppen.parkett];
  const zubehoerIds = angezeigt.flatMap((p) => [p.daemmung_id, p.sockelleisten_id]).filter((id): id is number => typeof id === 'number' && id > 0);
  const zubehoer: Record<number, StoreApiProduct> = {};
  try {
    const map = await wooCommerceClient.getProductsByIds(zubehoerIds);
    map.forEach((product, id) => {
      zubehoer[id] = product;
    });
  } catch (error) {
    console.error('❌ Startseite: Zubehör konnte nicht geladen werden:', error);
  }

  const pool = [...angebote, ...bestseller.filter((b) => !angebote.some((a) => a.id === b.id))];
  const promoEnde = promoActive ? getPromoEnd()?.toISOString() ?? null : null;
  const promoEndeLabel = promoActive ? formatPromoEnd() : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-pale">
      {/* H1 nur für Suchmaschinen/Screenreader — der Hero-Slider trägt keinen Text-Titel */}
      <h1 className="sr-only">Bodenbeläge online kaufen: Vinyl, Laminat &amp; Parkett</h1>

      <HeroSlider showPromo={promoActive} />
      <MusterboxLeiste />
      <BodenWahl promoActive={promoActive} />
      <AktionsAngebote
        gruppen={gruppen}
        zubehoer={zubehoer}
        promoActive={promoActive}
        promoEnde={promoEnde}
        promoEndeLabel={promoEndeLabel}
        alleHref={angeboteHref(promoActive)}
        alleLabel={promoActive ? `Alle ${angebote.length} Black-Weeks-Angebote` : 'Alle Angebote'}
      />
      <VorteilBloecke />
      <Bodenfinder empfehlungen={bodenfinderEmpfehlungen(pool)} />
      <BeratungTeam />
      <FachmarktVerlegt />
      <StartseiteFaq promoEndeLabel={promoEndeLabel} />
    </div>
  );
}
