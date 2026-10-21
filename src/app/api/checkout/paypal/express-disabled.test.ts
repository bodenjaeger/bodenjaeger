import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Notschalter NICHT gesetzt = PayPal Express aus.
vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_PAYPAL_EXPRESS_ENABLED;
});

vi.mock('@/lib/paypal', () => ({
  capturePayPalExpressOrder: vi.fn(),
  createPayPalExpressOrder: vi.fn(),
}));
vi.mock('@/lib/woocommerce-checkout', () => ({
  createWooCommerceOrder: vi.fn(),
  addOrderNote: vi.fn(),
}));
vi.mock('@/lib/shop-notification', () => ({
  notifyShop: vi.fn(),
}));

import { capturePayPalExpressOrder, createPayPalExpressOrder } from '@/lib/paypal';
import { createWooCommerceOrder } from '@/lib/woocommerce-checkout';
import { POST as expressCreate } from './express-create/route';
import { POST as expressCapture } from './express-capture/route';

const BODY = {
  paypalOrderId: 'PP-ORDER-1',
  line_items: [{ product_id: 1602, quantity: 1, subtotal: '12.00', total: '12.00', name: 'St58', meta_data: [] }],
  shipping_cost: 59.99,
};

function request(url: string) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(BODY),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PayPal Express Notschalter (nicht gesetzt = aus)', () => {
  it('express-create antwortet mit 503 und erstellt keine PayPal-Order', async () => {
    const res = await expressCreate(request('http://localhost/api/checkout/paypal/express-create'));

    expect(res.status).toBe(503);
    expect((await res.json()).success).toBe(false);
    expect(createPayPalExpressOrder).not.toHaveBeenCalled();
  });

  it('express-capture antwortet mit 503 und captured NICHT', async () => {
    const res = await expressCapture(request('http://localhost/api/checkout/paypal/express-capture'));

    expect(res.status).toBe(503);
    expect(capturePayPalExpressOrder).not.toHaveBeenCalled();
    expect(createWooCommerceOrder).not.toHaveBeenCalled();
  });
});
