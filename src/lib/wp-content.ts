/**
 * Macht aus <h1> im WordPress-Inhalt ein <h2 class="wp-h1">.
 *
 * Die Seiten-H1 setzt immer die Komponente; H1 aus dem WP-Editor ergäben
 * mehrere H1 pro Seite (SEO). Die Klasse `wp-h1` trägt die bisherige
 * H1-Optik, damit sich das Aussehen nicht ändert.
 */
export function demoteWpH1(html: string): string {
  return html
    .replace(/<h1\b([^>]*)>/gi, (_match, attrs: string) =>
      /\bclass\s*=\s*"/i.test(attrs)
        ? `<h2${attrs.replace(/\bclass\s*=\s*"/i, 'class="wp-h1 ')}>`
        : `<h2 class="wp-h1"${attrs}>`
    )
    .replace(/<\/h1>/gi, '</h2>');
}
