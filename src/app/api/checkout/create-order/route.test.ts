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
import { createStripeCheckoutSession } from '@/lib/stripe';
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

describe('create-order: Stripe-Positionen', () => {
  const stripeMock = vi.mocked(createStripeCheckoutSession);
  const WOO_ORDER = {
    id: 900,
    order_key: 'k',
    total: '159.99',
    shipping_total: '50.41',
    shipping_tax: '9.58',
    line_items: [
      { id: 1, name: 'Laminat Eiche', product_id: 1, quantity: 3, total: '84.03', total_tax: '15.97' },
    ],
  };
  const stripeBody = {
    ...body(false),
    line_items: [{ product_id: 1, quantity: 3, subtotal: '100.00', total: '100.00', name: 'Laminat Eiche' }],
    line_item_displays: [{ product_id: 1, amount: 6.66, unit: 'm²' }],
    payment_method: 'stripe',
  };

  beforeEach(() => {
    stripeMock.mockResolvedValue({ sessionId: 'cs_test', url: 'https://example.test/pay' });
  });

  it('Menge 1, exakter Betrag aus WooCommerce, Versand getrennt', async () => {
    createOrderMock.mockResolvedValue(WOO_ORDER as never);

    await POST(request(stripeBody));

    const params = stripeMock.mock.calls[0][0];
    expect(params.lineItems).toEqual([
      { name: '1 × Laminat Eiche, 3 Pakete (6,66 m²) – 100,00 €', quantity: 1, price: 10000 },
    ]);
    expect(params.shippingCost).toBe(5999);
  });

  it('Anzeige-Daten gehen nicht an WooCommerce', async () => {
    createOrderMock.mockResolvedValue(WOO_ORDER as never);

    await POST(request(stripeBody));

    expect(JSON.stringify(createOrderMock.mock.calls[0][0])).not.toContain('line_item_displays');
    expect(JSON.stringify(createOrderMock.mock.calls[0][0])).not.toContain('6.66');
  });

  it('Ausgleich: Differenz von 1 Cent landet an der Position, kein Rückfall', async () => {
    createOrderMock.mockResolvedValue({ ...WOO_ORDER, total: '160.00' } as never);

    await POST(request(stripeBody));

    const params = stripeMock.mock.calls[0][0];
    expect(params.lineItems).toEqual([
      { name: '1 × Laminat Eiche, 3 Pakete (6,66 m²) – 100,01 €', quantity: 1, price: 10001 },
    ]);
    expect(params.shippingCost).toBe(5999);
    expect(vi.mocked(console.warn)).not.toHaveBeenCalled();
  });

  it('Rückfall: eine Position über order.total, kein Versand extra, Log mit allen Werten', async () => {
    createOrderMock.mockResolvedValue({ ...WOO_ORDER, total: '160.05' } as never);

    await POST(request(stripeBody));

    const params = stripeMock.mock.calls[0][0];
    expect(params.lineItems).toEqual([
      { name: 'Bodenjäger Bestellung #900', quantity: 1, price: 16005 },
    ]);
    expect(params.shippingCost).toBeUndefined();
    expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
      '[stripe-line-items] Rückfall auf eine Position: Bestellung 900, Summe Positionen 159.99, order.total 160.05, Differenz -0.06'
    );
  });
});
