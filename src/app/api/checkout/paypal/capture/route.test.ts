import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/paypal', () => ({
  capturePayPalOrder: vi.fn(),
}));
vi.mock('@/lib/woocommerce-checkout', () => ({
  updateOrderStatus: vi.fn(),
  addOrderNote: vi.fn(),
  getOrderStatus: vi.fn(),
}));

import { capturePayPalOrder } from '@/lib/paypal';
import { updateOrderStatus, addOrderNote, getOrderStatus } from '@/lib/woocommerce-checkout';
import { GET } from './route';

const captureMock = vi.mocked(capturePayPalOrder);
const updateStatusMock = vi.mocked(updateOrderStatus);
const getStatusMock = vi.mocked(getOrderStatus);

const SITE = 'https://shop.test';

function returnUrl() {
  return new NextRequest(`${SITE}/api/checkout/paypal/capture?order=123&token=PP-TOKEN`);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(addOrderNote).mockResolvedValue(undefined as never);
  updateStatusMock.mockResolvedValue(undefined as never);
});

describe('paypal/capture: doppelter Aufruf der Rückkehr-URL', () => {
  it('erster Aufruf captured, zweiter wirft (bereits erfasst) → beide Male Erfolgsseite, kein „failed“', async () => {
    captureMock.mockResolvedValueOnce({ success: true, transactionId: 'TX-1' } as never);
    captureMock.mockRejectedValueOnce(new Error('Proxy error: 422 ORDER_ALREADY_CAPTURED'));
    getStatusMock.mockResolvedValue({ id: 123, status: 'processing' } as never);

    const first = await GET(returnUrl());
    const second = await GET(returnUrl());

    const success = `${SITE}/checkout/success?order=123&paypal=success`;
    expect(first.headers.get('location')).toBe(success);
    expect(second.headers.get('location')).toBe(success);
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it('Capture meldet Misserfolg, Order ist aber schon bezahlt → Erfolgsseite, Status bleibt', async () => {
    captureMock.mockResolvedValue({ success: false } as never);
    getStatusMock.mockResolvedValue({ id: 123, status: 'completed' } as never);

    const res = await GET(returnUrl());

    expect(res.headers.get('location')).toBe(`${SITE}/checkout/success?order=123&paypal=success`);
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it('Capture meldet Misserfolg und Order ist unbezahlt → weiterhin „failed“', async () => {
    captureMock.mockResolvedValue({ success: false } as never);
    getStatusMock.mockResolvedValue({ id: 123, status: 'pending' } as never);

    const res = await GET(returnUrl());

    expect(updateStatusMock).toHaveBeenCalledWith(123, 'failed');
    expect(res.headers.get('location')).toBe(`${SITE}/checkout?error=payment_failed&order=123`);
  });

  it('Proxy wirft und Order ist unbezahlt → wie bisher zurück zum Checkout', async () => {
    captureMock.mockRejectedValue(new Error('network'));
    getStatusMock.mockResolvedValue({ id: 123, status: 'pending' } as never);

    const res = await GET(returnUrl());

    expect(res.headers.get('location')).toBe(`${SITE}/checkout?error=payment_error`);
    expect(updateStatusMock).not.toHaveBeenCalled();
  });
});
