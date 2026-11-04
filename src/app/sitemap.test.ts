import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPosts = vi.fn();

vi.mock('@/lib/wordpress', () => ({
  wordPressClient: { getPosts: (...args: unknown[]) => getPosts(...args) },
}));

vi.mock('@/lib/woocommerce', () => ({
  wooCommerceClient: {
    getCategories: vi.fn(async () => [{ id: 1, name: 'Laminat', slug: 'laminat' }]),
    getAllProducts: vi.fn(async () => [
      { slug: 'laminat-oelschiefer' },
      { slug: 'muster-laminat-oelschiefer' },
    ]),
  },
}));

import sitemap from './sitemap';

describe('sitemap', () => {
  beforeEach(() => {
    getPosts.mockReset();
  });

  it('liefert die Sitemap auch, wenn WordPress nicht erreichbar ist (ohne Blog)', async () => {
    getPosts.mockRejectedValue(new Error('WordPress down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const urls = (await sitemap()).map((e) => e.url);

    expect(urls).toContain('https://www.bodenjaeger.de/');
    expect(urls).toContain('https://www.bodenjaeger.de/category/laminat');
    expect(urls).toContain('https://www.bodenjaeger.de/products/laminat-oelschiefer');
    expect(urls.some((u) => u.includes('/blog'))).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('[sitemap] Failed to fetch blog posts:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('nimmt /blog und Beiträge nur auf, wenn es Beiträge gibt', async () => {
    getPosts.mockResolvedValue({ posts: [], total: 0, totalPages: 0 });
    expect((await sitemap()).some((e) => e.url.includes('/blog'))).toBe(false);

    getPosts.mockResolvedValue({
      posts: [{ slug: 'vinyl-verlegen', date: '2026-10-01T10:00:00', modified: '2026-10-02T10:00:00' }],
      total: 1,
      totalPages: 1,
    });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain('https://www.bodenjaeger.de/blog');
    expect(urls).toContain('https://www.bodenjaeger.de/blog/vinyl-verlegen');
  });

  it('enthält weder /login noch Muster-Produkte noch ?page-URLs', async () => {
    getPosts.mockResolvedValue({ posts: [], total: 0, totalPages: 0 });
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/login'))).toBe(false);
    expect(urls.some((u) => u.includes('/products/muster-'))).toBe(false);
    expect(urls.some((u) => u.includes('?page='))).toBe(false);
  });
});
