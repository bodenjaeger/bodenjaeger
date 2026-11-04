import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consent,
  CONSENT_HEAD_SCRIPT,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  gtag,
} from './track';

const isArguments = (v: unknown): boolean =>
  Object.prototype.toString.call(v) === '[object Arguments]';

// Realm-unabhängiger Vergleich (vm-Kontext hat eigene Object-Prototypen).
const plain = (v: unknown): unknown[] =>
  JSON.parse(JSON.stringify(Array.from(v as ArrayLike<unknown>)));

describe('gtag', () => {
  let dataLayer: unknown[];

  beforeEach(() => {
    dataLayer = [];
    vi.stubGlobal('window', { dataLayer });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pusht ein Arguments-Objekt, kein Array', () => {
    gtag('consent', 'update', { ad_storage: 'granted' });

    expect(dataLayer).toHaveLength(1);
    const entry = dataLayer[0];
    expect(Array.isArray(entry)).toBe(false);
    expect(isArguments(entry)).toBe(true);
    expect(plain(entry)).toEqual(['consent', 'update', { ad_storage: 'granted' }]);
  });

  it('consent.update nutzt gtag (Arguments-Objekt mit Marketing/Statistik-Zuordnung)', () => {
    consent.update({ necessary: true, functional: false, analytics: true, marketing: false });

    const entry = dataLayer[0];
    expect(isArguments(entry)).toBe(true);
    expect(plain(entry)).toEqual([
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }),
    ]);
  });
});

describe('CONSENT_HEAD_SCRIPT', () => {
  function runHeadScript(stored: unknown) {
    const store: Record<string, string> = {};
    if (stored !== undefined) store[CONSENT_STORAGE_KEY] = JSON.stringify(stored);
    const ctx: Record<string, unknown> = {
      localStorage: { getItem: (k: string) => store[k] ?? null },
    };
    ctx.window = ctx;
    runInNewContext(CONSENT_HEAD_SCRIPT, ctx);
    return ctx.dataLayer as unknown[];
  }

  it('ohne gespeicherte Entscheidung: nur consent default (denied)', () => {
    const dl = runHeadScript(undefined);
    expect(dl).toHaveLength(1);
    expect(isArguments(dl[0])).toBe(true);
    expect(plain(dl[0])).toEqual([
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'denied',
        analytics_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
      }),
    ]);
  });

  it('mit gespeicherter Entscheidung: default, danach dasselbe Update wie consent.update', () => {
    const categories = { necessary: true, functional: true, analytics: false, marketing: true } as const;
    const dl = runHeadScript({ categories, timestamp: 1, version: CONSENT_VERSION });

    expect(dl).toHaveLength(2);
    expect(plain(dl[0])[1]).toBe('default');
    expect(isArguments(dl[1])).toBe(true);

    const clientDl: unknown[] = [];
    vi.stubGlobal('window', { dataLayer: clientDl });
    consent.update(categories);
    vi.unstubAllGlobals();

    expect(plain(dl[1])).toEqual(plain(clientDl[0]));
  });

  it('ignoriert veraltete Version und kaputten Eintrag', () => {
    expect(runHeadScript({ categories: { marketing: true }, version: CONSENT_VERSION + 1 })).toHaveLength(1);
    const ctx: Record<string, unknown> = { localStorage: { getItem: () => '{kaputt' } };
    ctx.window = ctx;
    runInNewContext(CONSENT_HEAD_SCRIPT, ctx);
    expect(ctx.dataLayer as unknown[]).toHaveLength(1);
  });
});
