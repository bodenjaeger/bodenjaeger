// WooCommerce Store API Client
// Using the Jaeger API endpoints: /wp-json/jaeger/v1/ (includes jaeger_meta fields)

interface WooCommerceConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface JaegerMeta {
  // Basis-Produktinformationen
  uvp?: number | null;
  show_uvp?: boolean;
  uvp_paketpreis?: number | null;
  paketpreis?: number | null;
  paketpreis_s?: number | null;
  paketinhalt?: number | null;
  einheit?: string | null;
  einheit_short?: string | null;
  verpackungsart?: string | null;
  verpackungsart_short?: string | null;
  verschnitt?: number | null;
  artikelbeschreibung?: string | null;
  text_produktuebersicht?: string | null;
  show_text_produktuebersicht?: boolean;
  lieferzeit?: string | null;
  show_lieferzeit?: boolean;
  // Set-Angebot Felder
  setangebot_titel?: string | null;
  show_setangebot?: boolean;
  setangebot_rabatt?: number | null;
  setangebot_text_color?: string | null;
  setangebot_text_size?: string | null;
  setangebot_button_style?: string | null;
  // Set-Angebot Berechnete Preise (vom Backend)
  setangebot_einzelpreis?: number | null;      // Vergleichspreis (Einzelkauf) pro Einheit
  setangebot_gesamtpreis?: number | null;      // Set-Preis pro Einheit
  setangebot_ersparnis_euro?: number | null;   // Ersparnis in Euro
  setangebot_ersparnis_prozent?: number | null; // Ersparnis in Prozent
  // Standard-Zusatzprodukte (Produkt-IDs) - Backend: _standard_addition_*, API verschachtelt: zusatzprodukte.*
  standard_addition_daemmung?: number | null;
  standard_addition_sockelleisten?: number | null;
  // Optionale Zusatzprodukte (Kommagetrennte Produkt-IDs)
  option_products_daemmung?: string | null;
  option_products_sockelleisten?: string | null;
  // Zubehör-Kategorien (Kommagetrennte Produkt-IDs)
  // Backend: _option_products_*, API: option_products_* (ohne führenden Unterstrich)
  option_products_untergrundvorbereitung?: string | null;
  option_products_werkzeug?: string | null;
  option_products_kleber?: string | null;
  option_products_montagekleber_silikon?: string | null;
  'option_products_montagekleber-silikon'?: string | null;
  option_products_zubehoer_fuer_sockelleisten?: string | null;
  'option_products_zubehoer-fuer-sockelleisten'?: string | null;
  option_products_schienen_profile?: string | null;
  'option_products_schienen-profile'?: string | null;
  option_products_reinigung_pflege?: string | null;
  'option_products_reinigung-pflege'?: string | null;

  // Verrechnung (für Premium-Artikel Berechnung)
  verrechnung?: number | null;

  // Prozent-Badge
  show_discount_badge?: boolean;

  // Aktions-System
  aktion?: string | null;
  show_aktion?: boolean;
  aktion_text_color?: string | null;
  aktion_text_size?: string | null;
  aktion_button_style?: string | null;
  // Angebotspreis-Hinweis
  angebotspreis_hinweis?: string | null;
  show_angebotspreis_hinweis?: boolean;
  angebotspreis_text_color?: string | null;
  angebotspreis_text_size?: string | null;
  angebotspreis_button_style?: string | null;
}

interface StoreApiProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  description: string;
  short_description: string;
  sku: string;
  // ✅ Jäger API returns prices as numbers, not strings
  price: number;
  regular_price: number;
  sale_price: number | null;
  price_html: string;
  jaeger_fields?: JaegerMeta; // Jaeger API uses jaeger_fields
  prices?: {
    price: string;
    regular_price: string;
    sale_price: string;
    price_range?: null;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  related_ids: number[];
  has_options: boolean;
  is_purchasable?: boolean;
  is_in_stock?: boolean;
  is_on_backorder?: boolean;
  low_stock_remaining?: number | null;
  stock_availability?: {
    text: string;
    class: string;
  };
  add_to_cart?: {
    text: string;
    description: string;
    url: string;
    single_text: string;
    minimum: number;
    maximum: number;
    multiple_of: number;
  };
  extensions: Record<string, unknown>;
  jaeger_meta?: JaegerMeta;

  // ========================================
  // ROOT-LEVEL FELDER (41 Felder) - backend/ROOT_LEVEL_FIELDS.md
  // ========================================

  // Paketinformationen (9)
  paketpreis?: number | null;
  paketpreis_s?: number | null;
  paketinhalt?: number | null;
  einheit?: string | null;
  einheit_short?: string;
  verpackungsart?: string | null;
  verpackungsart_short?: string | null;
  verschnitt?: number;
  verrechnung?: number;

  // UVP System (3)
  show_uvp?: boolean;
  uvp?: number | null;
  uvp_paketpreis?: number | null;

  // Produktbeschreibung (3)
  show_text_produktuebersicht?: boolean;
  text_produktuebersicht?: string | null;
  artikelbeschreibung?: string | null;

  // Set-Angebot Konfiguration (6)
  show_setangebot?: boolean;
  setangebot_titel?: string;
  setangebot_text_color?: string | null;
  setangebot_text_size?: string | null;
  setangebot_button_style?: string | null;
  setangebot_rabatt?: number;

  // Set-Angebot Berechnete Werte (4)
  setangebot_einzelpreis?: number | null;
  setangebot_gesamtpreis?: number | null;
  setangebot_ersparnis_euro?: number | null;
  setangebot_ersparnis_prozent?: number | null;

  // Zusatzprodukte (4)
  daemmung_id?: number | null;
  sockelleisten_id?: number | null;
  daemmung_option_ids?: number[];
  sockelleisten_option_ids?: number[];

  // Prozent-Badge
  show_discount_badge?: boolean;

  // Aktionen & Badges (10)
  show_aktion?: boolean;
  aktion?: string | null;
  aktion_text_color?: string | null;
  aktion_text_size?: string | null;
  aktion_button_style?: string | null;
  show_angebotspreis_hinweis?: boolean;
  angebotspreis_hinweis?: string | null;
  angebotspreis_text_color?: string | null;
  angebotspreis_text_size?: string | null;
  angebotspreis_button_style?: string | null;

  // Lieferzeit (2)
  show_lieferzeit?: boolean;
  lieferzeit?: string | null;

  // Testing (1)
  testdummy?: string | null;

  // Zubehör-Kategorien (7 Felder) - für Zubehör-Slider
  option_products_untergrundvorbereitung?: string | null;
  option_products_werkzeug?: string | null;
  option_products_kleber?: string | null;
  option_products_montagekleber_silikon?: string | null;
  option_products_zubehoer_fuer_sockelleisten?: string | null;
  option_products_schienen_profile?: string | null;
  option_products_reinigung_pflege?: string | null;

  // WooCommerce calculated fields
  discount_percent?: number;
  has_setangebot?: boolean;
}

interface StoreApiProductsResponse {
  data: StoreApiProduct[];
  total: number;
  total_pages: number;
}

interface StoreApiError {
  code: string;
  message: string;
  data?: unknown;
}

interface StoreApiCategory {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  description?: string;
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  } | null;
  menu_order?: number;
  count?: number;
}

class WooCommerceClient {
  private config: WooCommerceConfig | null = null;
  private baseApiUrl: string | null = null;
  private restApiUrl: string | null = null;

  private initializeConfig() {
    if (this.config) return; // Already initialized

    if (!process.env.NEXT_PUBLIC_WORDPRESS_URL) {
      throw new Error('NEXT_PUBLIC_WORDPRESS_URL environment variable is required');
    }
    if (!process.env.WC_CONSUMER_KEY) {
      throw new Error('WC_CONSUMER_KEY environment variable is required');
    }
    if (!process.env.WC_CONSUMER_SECRET) {
      throw new Error('WC_CONSUMER_SECRET environment variable is required');
    }

    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_WORDPRESS_URL,
      consumerKey: process.env.WC_CONSUMER_KEY,
      consumerSecret: process.env.WC_CONSUMER_SECRET,
    };

    // ✅ Use Jäger Custom API - only this has jaeger_meta fields!
    // Store API (/wc/store/v1) doesn't return custom fields
    this.baseApiUrl = `${this.config.baseUrl.replace(/\/$/, '')}/wp-json`;
    this.restApiUrl = `${this.config.baseUrl.replace(/\/$/, '')}/wp-json/wc/v3`;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.initializeConfig();

    if (!this.baseApiUrl || !this.config) {
      throw new Error('WooCommerce client not properly initialized');
    }

    const url = `${this.baseApiUrl}${endpoint}`;

    // Add basic auth for WooCommerce API
    const auth = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData: StoreApiError = await response.json().catch(() => ({
          code: 'unknown_error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));

        throw new Error(`WooCommerce API Error: ${errorData.message} (Code: ${errorData.code})`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  }

  /**
   * Make a request to the WooCommerce REST API (not Jaeger API)
   * Used for endpoints that don't exist in Jaeger API (like categories)
   */
  private async makeRestRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.initializeConfig();

    if (!this.restApiUrl || !this.config) {
      throw new Error('WooCommerce client not properly initialized');
    }

    const url = `${this.restApiUrl}${endpoint}`;

    // Add basic auth for WooCommerce API
    const auth = btoa(`${this.config.consumerKey}:${this.config.consumerSecret}`);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData: StoreApiError = await response.json().catch(() => ({
          code: 'unknown_error',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));

        throw new Error(`WooCommerce API Error: ${errorData.message} (Code: ${errorData.code})`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${String(error)}`);
    }
  }

  /**
   * Get all products from WooCommerce Store API
   */
  async getProducts(params: {
    per_page?: number;
    page?: number;
    search?: string;
    category?: string;
    tag?: string;
    featured?: boolean;
    on_sale?: boolean;
    min_price?: string;
    max_price?: string;
    include?: string; // Comma-separated list of product IDs
    orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'price' | 'popularity' | 'rating' | 'menu_order';
    order?: 'asc' | 'desc';
  } = {}): Promise<StoreApiProduct[]> {
    const searchParams = new URLSearchParams();

    // Add parameters to the request
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    // ✅ Use Jäger API for ALL product requests (has custom fields!)
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/jaeger/v1/products?${queryString}` : '/jaeger/v1/products';

    try {
      const response = await this.makeRequest<{ products: StoreApiProduct[]; pagination?: unknown } | StoreApiProduct[]>(endpoint);

      // Jaeger API returns { products: [...], pagination: {...} }
      // Extract just the products array
      if (Array.isArray(response)) {
        // Response is already an array
        return response;
      } else {
        // Response is an object with products property
        return response.products || [];
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Eine Seite einer Produktliste inkl. Paginierungsdaten (für die
   * serverseitig gerenderten Kategorieseiten). Ergebnis wird 5 Minuten im
   * Next-Data-Cache gehalten, damit Crawler-Hits nicht jedes Mal das Backend treffen.
   */
  async getProductsPage(params: {
    category: string;
    page: number;
    per_page: number;
    orderby: string;
    order: string;
  }): Promise<{ products: StoreApiProduct[]; total: number; totalPages: number }> {
    const searchParams = new URLSearchParams({
      per_page: String(params.per_page),
      page: String(params.page),
      category: params.category,
      orderby: params.orderby,
      order: params.order,
    });

    const response = await this.makeRequest<{
      products?: StoreApiProduct[];
      pagination?: { total?: number; total_pages?: number };
    }>(`/jaeger/v1/products?${searchParams.toString()}`, { next: { revalidate: 300 } });

    return {
      products: response.products || [],
      total: response.pagination?.total ?? 0,
      totalPages: response.pagination?.total_pages ?? 1,
    };
  }

  /**
   * Get a single product by slug from WooCommerce Store API
   * With Redis/KV caching for improved performance
   */
  async getProduct(slug: string): Promise<StoreApiProduct | null> {
    if (!slug) {
      throw new Error('Product slug is required');
    }

    try {
      // Try cache first (if available)
      if (typeof window === 'undefined') { // Server-side only
        try {
          const { getCachedProduct } = await import('./cache');
          const cached = await getCachedProduct(slug);
          if (cached) {
            return cached;
          }
        } catch {
          // Cache not available (e.g., no KV configured) - continue without cache
          console.log('Cache not available, fetching from API');
        }
      }

      // ✅ Search by slug - Jäger API already returns FULL product data with jaeger_meta!
      // Die API matcht den Produkt-NAMEN, nicht den Slug. Bei Multi-Token-Slugs
      // mit Umlaut/ß-Mismatches (Slug `weiss` ↔ Name `Weiß`) liefert die AND-
      // Suche über alle Tokens 0 Treffer. Wir suchen daher nur mit dem längsten
      // Token (meist distinktiv genug, selten ein Umlaut-Wort) und filtern
      // danach via exactMatch auf den vollen Slug.
      const slugTokens = slug.split('-').filter(Boolean);
      const searchTerm = slugTokens.length > 1
        ? slugTokens.reduce((a, b) => (a.length >= b.length ? a : b))
        : slug;
      const searchResults = await this.getProducts({
        search: searchTerm,
        per_page: 100,
      });
      const exactMatch = searchResults.find(p => p.slug === slug);

      if (exactMatch) {
        // ✅ The search result already has ALL fields including jaeger_meta!
        // No need to call getProductById() again

        // Cache the result (server-side only)
        if (typeof window === 'undefined') {
          try {
            const { setCachedProduct } = await import('./cache');
            await setCachedProduct(slug, exactMatch);
          } catch {
            // Cache write failed - not critical
          }
        }
        return exactMatch;
      }

      // Second try: Load more products if not found
      let page = 1;
      const maxPages = 10; // Limit to prevent infinite loops

      while (page <= maxPages) {
        const products = await this.getProducts({ per_page: 100, page });

        if (products.length === 0) {
          break; // No more products
        }

        const found = products.find(p => p.slug === slug);
        if (found) {
          // Cache the result
          if (typeof window === 'undefined') {
            try {
              const { setCachedProduct } = await import('./cache');
              await setCachedProduct(slug, found);
            } catch {
              // Cache write failed - not critical
            }
          }
          return found;
        }

        page++;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching product with slug "${slug}":`, error);
      return null;
    }
  }

  /**
   * Get multiple products by IDs in batches
   * Uses Store API include parameter to load multiple products efficiently
   * With Redis/KV caching for improved performance
   */
  async getProductsByIds(ids: number[]): Promise<Map<number, StoreApiProduct>> {
    const productsMap = new Map<number, StoreApiProduct>();

    if (ids.length === 0) {
      return productsMap;
    }

    // Remove duplicates
    const uniqueIds = Array.from(new Set(ids));

    console.log(`📦 Loading ${uniqueIds.length} products by ID...`);

    try {
      // Try cache first (server-side only)
      if (typeof window === 'undefined') {
        try {
          const { getCachedProductsBatch } = await import('./cache');
          const cached = await getCachedProductsBatch(uniqueIds);

          if (cached) {
            return cached;
          }
        } catch {
          // Cache not available - continue without cache
          console.log('Cache not available, fetching from API');
        }
      }

      // Load all products at once using the include parameter
      // Store API supports up to 100 products per request
      const batchSize = 100;
      const batches: number[][] = [];

      for (let i = 0; i < uniqueIds.length; i += batchSize) {
        batches.push(uniqueIds.slice(i, i + batchSize));
      }

      // Load all batches in parallel
      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          const includeParam = batch.join(',');
          const products = await this.getProducts({
            per_page: batchSize,
            include: includeParam
          });
          return products;
        })
      );

      // Flatten results and create map
      batchResults.flat().forEach(product => {
        productsMap.set(product.id, product);
      });

      console.log(`✅ Successfully loaded ${productsMap.size} products`);

      // Cache the result (server-side only)
      if (typeof window === 'undefined' && productsMap.size > 0) {
        try {
          const { setCachedProductsBatch } = await import('./cache');
          await setCachedProductsBatch(productsMap);
        } catch {
          // Cache write failed - not critical
        }
      }

      return productsMap;
    } catch (error) {
      console.error('❌ Error loading products by IDs:', error);
      // Return partial results if any
      return productsMap;
    }
  }

  /**
   * Get a single product by ID using Jäger API
   * ✅ ONLY Jäger API has jaeger_meta with all custom fields!
   */
  async getProductById(id: number): Promise<StoreApiProduct | null> {
    if (!id || id <= 0) {
      throw new Error('Valid product ID is required');
    }

    try {
      // ✅ Use Jäger API with include parameter
      // /jaeger/v1/products?include=123 returns single product with ALL custom fields
      const response = await this.makeRequest<{ products: StoreApiProduct[], pagination?: unknown }>(`/jaeger/v1/products?include=${id}`);

      // Jäger API returns { products: [...], pagination: {...} }
      const products = response.products || [];

      if (products && products.length > 0) {
        return products[0];
      }

      return null;
    } catch (error) {
      console.error(`Error fetching product with ID "${id}":`, error);
      return null;
    }
  }

  /**
   * Get product categories
   */
  async getCategories(params: {
    per_page?: number;
    page?: number;
    search?: string;
    parent?: number;
    orderby?: 'id' | 'include' | 'name' | 'slug' | 'term_group' | 'description' | 'count';
    order?: 'asc' | 'desc';
    hide_empty?: boolean;
  } = {}): Promise<StoreApiCategory[]> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    // ✅ Use WooCommerce Store API for categories
    const endpoint = `/wc/store/v1/products/categories${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    try {
      return await this.makeRequest<StoreApiCategory[]>(endpoint);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get a single category by slug
   */
  async getCategoryBySlug(slug: string): Promise<StoreApiCategory | null> {
    if (!slug) {
      throw new Error('Category slug is required');
    }

    try {
      const categories = await this.getCategories({ search: slug, per_page: 100 });
      const exactMatch = categories.find(cat => cat.slug === slug);
      return exactMatch || null;
    } catch (error) {
      console.error(`Error fetching category with slug "${slug}":`, error);
      return null;
    }
  }
}

// Export singleton instance
export const wooCommerceClient = new WooCommerceClient();

// Export types for use in other files
export type { StoreApiProduct, StoreApiProductsResponse, StoreApiError, StoreApiCategory, JaegerMeta };