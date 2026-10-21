import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock('@/lib/woocommerce-checkout', () => ({
  createWooCommerceOrder: vi.fn(),
  addOrderNote: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({
  createStripeCheckoutSession: vi.fn(),
  euroToCents: (n: number) => Math.round(n * 100),
}));
vi.mock('@/lib/paypal', () => ({ createPayPalOrder: vi.fn() }));
vi.mock('@/lib/auth', () => ({ wpValidateToken: vi.fn(), wpGetCurrentUser: vi.fn() }));
vi.mock('@/lib/coupon', () => ({ validateAndCalculateCoupon: vi.fn() }));

import { createWooCommerceOrder, updateOrderStatus } from '@/lib/woocommerce-checkout';
import { POST } from './route';

const createOrderMock = vi.mocked(createWooCommerceOrder);

const ADDRESS = {
  first_name: 'Erika', last_name: 'Muster', address_1: 'Hauptstr. 1',
  city: 'Hückelhoven', postcode: '41836', country: 'DE',
};

function body(withAktion: boolean) {
  return {
    billing: { ...ADDRESS, email: 'kunde@example.com', phone: '0123' },
    shipping: ADDRESS,
    line_items: [
      {
        product_id: 1, quantity: 7, subtotal: '310.64', name: 'Laminat Eiche',
        total: withAktion ? '266.26' : '310.64',
        meta_data: withAktion
          ? [
              { key: '_aktion', value: 'jedes-7-paket-gratis' },
              { key: '_aktion_gratis_pakete', value: '1' },
              { key: '_aktion_rabatt', value: '44.38' },
            ]
          : [],
      },
    ],
    payment_method: 'bacs',
    shipping_method: 'delivery',
    shipping_cost: 59.99,
  };
}

function request(b: unknown) {
  return new NextRequest('http://localhost/api/checkout/create-order', {
    method: 'POST',
    body: JSON.stringify(b),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_AKTION_FORCE', '');
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
  vi.stubEnv('VERCEL_ENV', '');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  createOrderMock.mockResolvedValue({ id: 900, order_key: 'k', total: '369.65' } as never);
  vi.mocked(updateOrderStatus).mockResolvedValue(undefined as never);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('create-order: Paket-Aktion serverseitig', () => {
  it('nach Aktionsende: Bestellung mit Aktionsrabatt wird abgelehnt, keine WC-Bestellung', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-22T10:00:00+02:00'));

    const res = await POST(request(body(true)));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error).toContain('ist beendet');
    expect(json.error).toContain('Seite neu');
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('nach Aktionsende: Bestellung ohne Aktionsrabatt läuft normal durch', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-22T10:00:00+02:00'));

    const res = await POST(request(body(false)));

    expect(res.status).toBe(200);
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('während der Aktion: Bestellung mit Aktionsrabatt läuft durch', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T12:00:00+02:00'));

    const res = await POST(request(body(true)));

    expect(res.status).toBe(200);
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });
});
