import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// paypal.ts liest die Proxy-Konfiguration beim Laden des Moduls.
vi.hoisted(() => {
  process.env.PAYMENT_PROXY_URL = 'https://proxy.test/wp-json/bodenjaeger/v1';
  process.env.PAYMENT_PROXY_KEY = 'test-key';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.test';
});

import { capturePayPalExpressOrder } from '@/lib/paypal';
import { fetchWithTimeout, FetchTimeoutError } from '@/lib/fetch-with-timeout';

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('capturePayPalExpressOrder: Ausgang', () => {
  it('Erfolg → captured mit Käuferdaten', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        transactionId: 'CAP-1',
        payerEmail: 'kunde@example.com',
        amount: { value: '71.99', currency_code: 'EUR' },
      })
    );

    const result = await capturePayPalExpressOrder('PP-1', 1000);

    expect(result.outcome).toBe('captured');
    if (result.outcome === 'captured') {
      expect(result.data.transactionId).toBe('CAP-1');
      expect(result.data.amount?.value).toBe('71.99');
    }
    expect(fetchMock.mock.calls[0][0]).toBe('https://proxy.test/wp-json/bodenjaeger/v1/paypal/express-capture');
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it('Proxy hängt → nach Timeout unknown (der Live-Fall vom 21.10.2026)', async () => {
    // fetch, das nie antwortet, aber auf Abort reagiert
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );

    const result = await capturePayPalExpressOrder('PP-1', 20);

    expect(result).toEqual({ outcome: 'unknown', reason: expect.stringContaining('Timeout nach 20 ms') });
  });

  it('Netzwerkfehler → unknown', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    expect((await capturePayPalExpressOrder('PP-1', 1000)).outcome).toBe('unknown');
  });

  it('502 vom Proxy → unknown', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
    expect(await capturePayPalExpressOrder('PP-1', 1000)).toEqual({
      outcome: 'unknown',
      reason: 'Proxy antwortete mit HTTP 502',
    });
  });

  it('200 ohne JSON → unknown', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Wartungsmodus</html>', { status: 200 }));
    expect((await capturePayPalExpressOrder('PP-1', 1000)).outcome).toBe('unknown');
  });

  it('422 mit INSTRUMENT_DECLINED → declined', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, { error: 'UNPROCESSABLE_ENTITY: INSTRUMENT_DECLINED' })
    );
    expect(await capturePayPalExpressOrder('PP-1', 1000)).toEqual({
      outcome: 'declined',
      reason: 'INSTRUMENT_DECLINED',
    });
  });

  it('422 mit ORDER_ALREADY_CAPTURED → unknown (es KANN bezahlt sein)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { error: 'ORDER_ALREADY_CAPTURED' }));
    expect((await capturePayPalExpressOrder('PP-1', 1000)).outcome).toBe('unknown');
  });

  it('success:false mit Status DECLINED → declined', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: false, status: 'DECLINED' }));
    expect((await capturePayPalExpressOrder('PP-1', 1000)).outcome).toBe('declined');
  });

  it('success:false mit Status PENDING → unknown', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: false, status: 'PENDING' }));
    expect((await capturePayPalExpressOrder('PP-1', 1000)).outcome).toBe('unknown');
  });
});

describe('fetchWithTimeout', () => {
  it('wirft FetchTimeoutError, wenn die Antwort ausbleibt', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );

    await expect(fetchWithTimeout('https://x.test', {}, 10)).rejects.toBeInstanceOf(FetchTimeoutError);
  });

  it('reicht andere Fehler unverändert durch', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(fetchWithTimeout('https://x.test', {}, 1000)).rejects.toThrow('fetch failed');
  });
});
