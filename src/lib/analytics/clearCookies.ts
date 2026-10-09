import type { ConsentCategories } from './types';

// Cookies, die Tracking-Tags auf unserer Domain setzen — pro Consent-Kategorie.
// Präfixe decken Varianten wie `_ga_YDNQ71B2K0` oder `_gcl_aw` ab.
const ANALYTICS_COOKIES = ['_ga', '_gid', '_gat'];
const MARKETING_COOKIES = ['_gcl_', '_fbp', '_fbc', '_ttp', '_tt_enable_cookie', 'ttcsid'];

const matches = (name: string, prefixes: string[]): boolean =>
  prefixes.some((p) => name === p || name.startsWith(p));

/** Alle Domains, unter denen ein Cookie für den aktuellen Host liegen kann. */
function candidateDomains(): (string | null)[] {
  const parts = window.location.hostname.split('.');
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) {
    const d = parts.slice(i).join('.');
    domains.push(d, `.${d}`);
  }
  return domains;
}

function deleteCookie(name: string): void {
  for (const domain of candidateDomains()) {
    document.cookie =
      `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
      (domain ? `; domain=${domain}` : '');
  }
}

/**
 * Löscht die Tracking-Cookies aller abgelehnten Kategorien. Drittanbieter-
 * Cookies (z. B. `test_cookie` auf doubleclick.net) sind von hier aus nicht
 * erreichbar.
 */
export function clearDeniedCookies(c: ConsentCategories): void {
  if (typeof document === 'undefined') return;
  const prefixes = [
    ...(c.analytics ? [] : ANALYTICS_COOKIES),
    ...(c.marketing ? [] : MARKETING_COOKIES),
  ];
  if (prefixes.length === 0) return;

  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim();
    if (name && matches(name, prefixes)) deleteCookie(name);
  }
}
