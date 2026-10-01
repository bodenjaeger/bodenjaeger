import { notFound, permanentRedirect, redirect } from "next/navigation";
import { wooCommerceClient, type StoreApiProduct } from "@/lib/woocommerce";
import ProductPageContent from "@/components/product/ProductPageContent";
import { JsonLd } from "@/components/JsonLd";
import { buildProductSchema, buildBreadcrumbSchema, stripHtml } from "@/lib/schema";
import { SITE_URL, productUrl, categoryUrl } from "@/lib/site";
import { KLEBEVINYL_SPARPAKET, SPARPAKET_PRODUKT_IDS } from "@/content/klebevinyl-sparpaket";

// Slug-Präfix → Kategorie-Slug.
// Reihenfolge wichtig: längere/spezifischere Präfixe zuerst,
// damit z.B. `klebe-vinyl-` vor `vinyl-` matcht.
const CATEGORY_PREFIXES: ReadonlyArray<{ prefix: string; category: string }> = [
  { prefix: 'klebe-vinyl-', category: 'klebe-vinyl' },
  { prefix: 'rigid-vinyl-', category: 'rigid-vinyl' },
  { prefix: 'parkett-', category: 'parkett' },
  { prefix: 'laminat-', category: 'laminat' },
  { prefix: 'vinyl-', category: 'vinylboden' },
];

// Wenn weder das Produkt noch ein umbenannter Slug existiert:
// versuche den Slug mindestens auf die richtige Kategorie zu schicken.
// Beispiel: `parkett-liam-xl` → `/category/parkett`.
function findCategoryFromSlug(slug: string): string | null {
  // Optionalen muster-Präfix abschneiden (`muster-parkett-foo` → `parkett-foo`).
  const normalized = slug.startsWith('muster-')
    ? slug.slice('muster-'.length)
    : slug;
  for (const { prefix, category } of CATEGORY_PREFIXES) {
    if (normalized.startsWith(prefix)) return category;
  }
  return null;
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Enable ISR - revalidate every 30 seconds
// Products can change frequently in backend, so shorter cache is needed
export const revalidate = 30;

// Smart-Fallback bei Slug-Renames aus der Migration:
// Wenn ein Produkt unter dem angefragten Slug nicht existiert, sucht das Backend
// nach Produkten mit ähnlichem Slug. Bei genau einem klaren Treffer wird der Slug
// für einen 301-Redirect zurückgegeben.
async function findRenamedSlug(requestedSlug: string): Promise<string | null> {
  try {
    const tokens = requestedSlug.split('-').filter(Boolean);
    if (tokens.length < 2) return null; // Single-Token-Slugs zu mehrdeutig

    const wantsMuster = requestedSlug.startsWith('muster-');

    // Die Jäger-API-Suche matcht den Produkt-NAMEN, nicht den Slug.
    // Bei mehreren Tokens schlägt das fehl, wenn ein Slug-Token einen
    // Umlaut oder ß im Namen entspricht (Slug `weiss` ↔ Name `Weiß`).
    // Wir suchen deshalb nur mit dem längsten Token (meist distinktiv,
    // selten ein Umlaut-Wort) und filtern danach gegen den Slug.
    const longestToken = tokens.reduce((a, b) => (a.length >= b.length ? a : b));
    const candidates = await wooCommerceClient.getProducts({
      search: longestToken,
      per_page: 50,
    });

    // Match-Kriterien: gleiche muster-prefix-status + ALLE Tokens im Kandidaten-Slug.
    const matches = candidates.filter((p) => {
      if (!p.slug || p.slug === requestedSlug) return false;
      const isMuster = p.slug.startsWith('muster-');
      if (wantsMuster !== isMuster) return false;
      return tokens.every((tok) => p.slug.includes(tok));
    });

    if (matches.length === 1) {
      console.log(`🔁 Slug-rename detected: ${requestedSlug} → ${matches[0].slug}`);
      return matches[0].slug;
    }

    if (matches.length > 1) {
      // Bei Mehrdeutigkeit: wenn der angefragte Slug exakt das Suffix eines
      // Kandidaten ist (z.B. `sichtestrich-hell` ist Suffix von
      // `laminat-sichtestrich-hell`), nimm diesen Kandidaten — das ist der
      // typische Migrations-Fall (Kategorie-Präfix wurde nachträglich angefügt).
      const suffixMatches = matches.filter((p) =>
        p.slug.endsWith(`-${requestedSlug}`)
      );
      if (suffixMatches.length === 1) {
        console.log(`🔁 Slug-rename via suffix-match: ${requestedSlug} → ${suffixMatches[0].slug}`);
        return suffixMatches[0].slug;
      }
      console.log(`⚠️  Slug-rename ambiguous (${matches.length} matches) for ${requestedSlug}, falling back to 404`);
    }
    return null;
  } catch (err) {
    console.error('Error in slug-rename fallback:', err);
    return null;
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product: StoreApiProduct | null = null;
  let daemmungProduct: StoreApiProduct | null = null;
  let sockelleisteProduct: StoreApiProduct | null = null;
  let daemmungOptions: StoreApiProduct[] = [];
  let sockelleisteOptions: StoreApiProduct[] = [];
  let sparpaketProducts: StoreApiProduct[] = [];

  try {
    product = await wooCommerceClient.getProduct(slug);
  } catch (error) {
    console.error('Error fetching product:', error);
  }

  // Wenn das Produkt nicht da ist: nach umbenanntem Slug suchen, sonst Kategorie-Fallback, sonst 404.
  // permanentRedirect/redirect/notFound MÜSSEN außerhalb von try/catch stehen,
  // da sie via thrown Error funktionieren.
  if (!product) {
    const renamedSlug = await findRenamedSlug(slug);
    if (renamedSlug) {
      permanentRedirect(`/products/${renamedSlug}`);
    }

    // Migrations-Lücke (Hauptprodukt fehlt im Backend): User wenigstens
    // in die richtige Kategorie schicken statt auf 404. 307 (temporär),
    // damit Backend-Fix später wieder den exakten Match liefern kann.
    const categorySlug = findCategoryFromSlug(slug);
    if (categorySlug) {
      console.log(`🔁 Category fallback: ${slug} → /category/${categorySlug}`);
      redirect(`/category/${categorySlug}`);
    }

    notFound();
  }

  try {

    console.log('🔍 Set-Angebot Ersparnis-Felder vom Backend (ROOT-LEVEL):');
    console.log('  - setangebot_einzelpreis:', product.setangebot_einzelpreis);
    console.log('  - setangebot_gesamtpreis:', product.setangebot_gesamtpreis);
    console.log('  - setangebot_ersparnis_euro:', product.setangebot_ersparnis_euro);
    console.log('  - setangebot_ersparnis_prozent:', product.setangebot_ersparnis_prozent);

    // Load WooCommerce description (contains Eigenschaften table) via REST API
    try {
      const wcUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
      const ck = process.env.WC_CONSUMER_KEY;
      const cs = process.env.WC_CONSUMER_SECRET;
      const wcRes = await fetch(
        `${wcUrl}/wp-json/wc/v3/products/${product.id}?consumer_key=${ck}&consumer_secret=${cs}`,
        { next: { revalidate: 300 } }
      );
      if (wcRes.ok) {
        const wcProduct = await wcRes.json();
        if (wcProduct.description) {
          product.description = wcProduct.description;
        }
      }
    } catch (e) {
      console.error('Error loading WC description:', e);
    }

    // ✅ USE ROOT-LEVEL FIELDS - Parse all product IDs we need to load
    const daemmungId = product.daemmung_id;
    const sockelleisteId = product.sockelleisten_id;

    // IDs are already arrays on root level
    const daemmungOptionIds = product.daemmung_option_ids || [];
    const sockelleisteOptionIds = product.sockelleisten_option_ids || [];

    console.log('Dämmung ID:', daemmungId);
    console.log('Sockelleiste ID:', sockelleisteId);
    console.log('Dämmung option IDs:', daemmungOptionIds);
    console.log('Sockelleiste option IDs:', sockelleisteOptionIds);

    // Klebe-Vinyl: Sparpaket-Bestandteile mitladen
    const sparpaketIds = product.categories?.some(c => c.slug === KLEBEVINYL_SPARPAKET.kategorie)
      ? SPARPAKET_PRODUKT_IDS
      : [];

    // Check if we need to load additional products
    const needsProducts = daemmungId || sockelleisteId || daemmungOptionIds.length > 0 || sockelleisteOptionIds.length > 0 || sparpaketIds.length > 0;

    if (needsProducts) {
      try {
        const startTime = Date.now();
        console.log('⚡ Loading addition and option products in batch...');

        // Collect all product IDs to load
        const productIdsToLoad = [
          ...(daemmungId ? [daemmungId] : []),
          ...(sockelleisteId ? [sockelleisteId] : []),
          ...daemmungOptionIds,
          ...sockelleisteOptionIds,
          ...sparpaketIds,
        ];

        // Load all products in one batch request (much more efficient!)
        const productsById = await wooCommerceClient.getProductsByIds(productIdsToLoad);

        const loadTime = Date.now() - startTime;
        console.log(`✅ Loaded ${productsById.size} products in ${loadTime}ms`);

        // Assign standard products
        if (daemmungId) {
          daemmungProduct = productsById.get(daemmungId) || null;
          console.log('Dämmung product:', daemmungProduct ? `${daemmungProduct.name} (ID: ${daemmungProduct.id})` : 'Not found');
        }

        if (sockelleisteId) {
          sockelleisteProduct = productsById.get(sockelleisteId) || null;
          console.log('Sockelleiste product:', sockelleisteProduct ? `${sockelleisteProduct.name} (ID: ${sockelleisteProduct.id})` : 'Not found');
        }

        // Assign option products
        if (daemmungOptionIds.length > 0) {
          daemmungOptions = daemmungOptionIds
            .map(id => productsById.get(id))
            .filter((p): p is StoreApiProduct => p !== undefined);
          console.log(`Loaded ${daemmungOptions.length} Dämmung options`);
        }

        // IMPORTANT: If standard product exists, ensure it's in the options list
        // This ensures that even if there are no other options, the standard product is selectable
        if (daemmungProduct) {
          const standardDaemmungId = daemmungProduct.id;
          if (!daemmungOptions.find(opt => opt.id === standardDaemmungId)) {
            daemmungOptions = [daemmungProduct, ...daemmungOptions];
            console.log('Added standard Dämmung to options list');
          }
        }

        if (sockelleisteOptionIds.length > 0) {
          sockelleisteOptions = sockelleisteOptionIds
            .map(id => productsById.get(id))
            .filter((p): p is StoreApiProduct => p !== undefined);
          console.log(`Loaded ${sockelleisteOptions.length} Sockelleiste options`);
        }

        // IMPORTANT: If standard product exists, ensure it's in the options list
        // This ensures that even if there are no other options, the standard product is selectable
        if (sockelleisteProduct) {
          const standardSockelleisteId = sockelleisteProduct.id;
          if (!sockelleisteOptions.find(opt => opt.id === standardSockelleisteId)) {
            sockelleisteOptions = [sockelleisteProduct, ...sockelleisteOptions];
            console.log('Added standard Sockelleiste to options list');
          }
        }

        sparpaketProducts = sparpaketIds
          .map(id => productsById.get(id))
          .filter((p): p is StoreApiProduct => p !== undefined);
      } catch (error) {
        console.error('❌ Error loading addition products:', error);
        // Continue without additional products rather than failing completely
      }
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }

  const breadcrumbItems = [
    { name: 'Startseite', url: SITE_URL },
    ...(product.categories?.[0]
      ? [{ name: product.categories[0].name, url: categoryUrl(product.categories[0].slug) }]
      : []),
    { name: product.name, url: productUrl(product.slug) },
  ];

  return (
    <>
      <JsonLd data={buildProductSchema(product)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbItems)} />
      <ProductPageContent
        product={product}
        daemmungProduct={daemmungProduct}
        sockelleisteProduct={sockelleisteProduct}
        daemmungOptions={daemmungOptions}
        sockelleisteOptions={sockelleisteOptions}
        sparpaketProducts={sparpaketProducts}
      />
    </>
  );
}

// Generate static params for most popular products (optional)
export async function generateStaticParams() {
  try {
    const products = await wooCommerceClient.getProducts({
      per_page: 10, // Top 10 most popular products
      orderby: 'popularity'
    });

    return products.map((product) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Dynamic metadata generation
export async function generateMetadata({ params }: ProductPageProps) {
  try {
    const { slug } = await params;
    const product = await wooCommerceClient.getProduct(slug);

    if (!product) {
      return {
        title: 'Produkt nicht gefunden'
      };
    }

    const description = stripHtml(
      product.short_description || product.description?.substring(0, 160) || ''
    ) || `${product.name} bei Bodenjäger kaufen`;
    const canonicalUrl = productUrl(product.slug);

    return {
      title: `${product.name} | Bodenjäger`,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: product.name,
        description,
        images: product.images?.[0]?.src ? [product.images[0].src] : [],
        type: 'website',
        url: canonicalUrl,
      },
    };
  } catch {
    return {
      title: 'Bodenjäger - Hochwertige Bodenbeläge'
    };
  }
}