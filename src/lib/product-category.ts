/** Fachliche Kategorie eines Bodens; Sammelkategorien wie „Bestseller“ zählen nicht. */
const FACHKATEGORIEN = ['klebe-vinyl', 'rigid-vinyl', 'vinylboden', 'laminat', 'parkett'];
const SAMMELKATEGORIEN = ['bestseller', 'sale', 'aktion', 'angebote'];

export function getPrimaryCategory<T extends { slug: string }>(categories: T[] | null | undefined): T | undefined {
  if (!categories?.length) return undefined;
  for (const slug of FACHKATEGORIEN) {
    const treffer = categories.find((c) => c.slug.toLowerCase() === slug);
    if (treffer) return treffer;
  }
  return categories.find((c) => !SAMMELKATEGORIEN.includes(c.slug.toLowerCase())) ?? categories[0];
}
