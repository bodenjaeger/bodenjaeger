import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Notschalter für diese Tests einschalten — muss vor dem Import der Route
// gesetzt sein, weil der Schalter beim Laden des Moduls ausgewertet wird.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PAYPAL_EXPRESS_ENABLED = 'true';
});

vi.mock('@/lib/paypal', () => ({
  capturePayPalExpressOrder: vi.fn(),
}));
vi.mock('@/lib/woocommerce-checkout', () => ({
  createWooCommerceOrder: vi.fn(),
  addOrderNote: vi.fn(),
}));
vi.mock('@/lib/shop-notification', () => ({
  notifyShop: vi.fn(),
}));

import { capturePayPalExpressOrder } from '@/lib/paypal';
import { createWooCommerceOrder, addOrderNote } from '@/lib/woocommerce-checkout';
import { notifyShop } from '@/lib/shop-notification';
import { FetchTimeoutError } from '@/lib/fetch-with-timeout';
import { POST } from './route';

const captureMock = vi.mocked(capturePayPalExpressOrder);
const createOrderMock = vi.mocked(createWooCommerceOrder);
const addNoteMock = vi.mocked(addOrderNote);
const notifyMock = vi.mocked(notifyShop);

const LINE_ITEMS = [
  {
    product_id: 1, quantity: 7, subtotal: '333.95', total: '333.95', name: 'Laminat Eiche',
    meta_data: [{ key: '_actual_m2', value: '15.54' }, { key: '_set_item_type', value: 'floor' }],
  },
  { product_id: 3, quantity: 2, subtotal: '0.00', total: '0.00', name: 'Dämmung Standard', meta_data: [] },
];
// 333.95 + 59.99 Versand
const PAID = '393.94';

function capture(overrides: Record<string, unknown> = {}) {
  return {
    outcome: 'captured',
    data: {
      success: true,
      transactionId: 'CAPTURE-123',
      paypalOrderId: 'PP-ORDER-1',
      payerEmail: 'kunde@example.com',
      payerGivenName: 'Erika',
      payerSurname: 'Muster',
      payerPhone: '0123',
      shippingName: 'Erika Muster',
      shippingAddress: {
        address_line_1: 'Hauptstr. 1',
        admin_area_1: '',
        address_line_2: '',
        admin_area_2: 'Hückelhoven',
        postal_code: '41836',
        country_code: 'DE',
      },
      amount: { value: PAID, currency_code: 'EUR' },
      ...overrides,
    },
  } as Awaited<ReturnType<typeof capturePayPalExpressOrder>>;
}

/** Die PAYPAL_EXPRESS_ORDER_MISSING-Logzeile als Objekt. */
function missingLog(): Record<string, unknown> | undefined {
  const call = vi
    .mocked(console.error)
    .mock.calls.find((c) => c[0] === 'PAYPAL_EXPRESS_ORDER_MISSING');
  return call ? JSON.parse(String(call[1])) : undefined;
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/checkout/paypal/express-capture', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const VALID_BODY = {
  paypalOrderId: 'PP-ORDER-1',
  line_items: LINE_ITEMS,
  shipping_cost: 59.99,
  customer_note: 'Lieferwunsch: vormittags',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  addNoteMock.mockResolvedValue(undefined as never);
  notifyMock.mockResolvedValue(true);
});

describe('express-capture: Fehlerpfad nach erfolgreichem Capture', () => {
  it('WooCommerce wirft → Log, Mail an den Shop, Kunde bekommt Bestätigung mit Transaktions-ID', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockRejectedValue(new Error('Order creation failed: 400 Bad Request'));

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    // Kunde: keine Fehlerseite, sondern Bestätigung
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, orderPending: true, transactionId: 'CAPTURE-123' });
    expect(json.redirectUrl).toBe('/checkout/success?paypal=pending&tx=CAPTURE-123');

    // Log mit allen Daten zum manuellen Anlegen
    expect(missingLog()).toMatchObject({
      paypalOrderId: 'PP-ORDER-1',
      captureId: 'CAPTURE-123',
      amount: `${PAID} EUR`,
      customer: { name: 'Erika Muster', email: 'kunde@example.com' },
      lineItems: LINE_ITEMS,
    });

    // Mail an den Shop
    expect(notifyMock).toHaveBeenCalledTimes(1);
    const mail = notifyMock.mock.calls[0][0];
    expect(mail.subject).toBe('PayPal bezahlt, Bestellung fehlt – manuell anlegen');
    expect(mail.message).toContain('PP-ORDER-1');
    expect(mail.message).toContain('CAPTURE-123');
    expect(mail.message).toContain(PAID);
    expect(mail.message).toContain('kunde@example.com');
    expect(mail.message).toContain('7 × Laminat Eiche');
    expect(mail.replyTo?.email).toBe('kunde@example.com');
  });

  it('Mail scheitert → trotzdem Log und Bestätigung für den Kunden', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockRejectedValue(new Error('boom'));
    notifyMock.mockResolvedValue(false);

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(json).toMatchObject({ success: true, orderPending: true });
    expect(
      vi.mocked(console.error).mock.calls.some((c) => String(c[0]).includes('Benachrichtigungs-Mail'))
    ).toBe(true);
  });

  it('PayPal liefert keine Adresse → ebenfalls Fehlerpfad statt 502', async () => {
    captureMock.mockResolvedValue(capture({ shippingAddress: undefined }));

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(json).toMatchObject({ success: true, orderPending: true });
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });
});

describe('express-capture: Normalfall', () => {
  it('legt die Order mit ganzzahligen Mengen und Netto-Beträgen an', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockResolvedValue({ id: 500, order_key: 'wc_key', total: PAID } as never);

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(json).toEqual({
      success: true,
      wcOrderId: 500,
      wcOrderKey: 'wc_key',
      redirectUrl: '/checkout/success?order=500&paypal=success',
    });
    const order = createOrderMock.mock.calls[0][0];
    expect(order.line_items.map((i) => i.quantity)).toEqual([7, 2]);
    expect(order.line_items[0]).toMatchObject({ subtotal: '280.63', total: '280.63' });
    expect(order.line_items[0].meta_data).toContainEqual({ key: '_actual_m2', value: '15.54' });
    expect(order.shipping_lines).toEqual([
      { method_id: 'flat_rate', method_title: 'Standardversand', total: '50.41' },
    ]);
    expect(order.fee_lines).toBeUndefined();
    expect(notifyMock).not.toHaveBeenCalled();
    // nur die normale Zahlungs-Notiz, keine Abweichungs-Notiz
    expect(addNoteMock).toHaveBeenCalledTimes(1);
  });

  it('Abweichung ≥ 0,01 € → Bestellnotiz, aber keine Mail', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockResolvedValue({ id: 501, order_key: 'k', total: '393.96' } as never);

    await POST(request(VALID_BODY));

    expect(addNoteMock).toHaveBeenCalledTimes(2);
    expect(addNoteMock.mock.calls[1][1]).toContain('Differenz 0,02 €');
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('Abweichung ≥ 1,00 € → Bestellnotiz und Mail', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockResolvedValue({ id: 502, order_key: 'k', total: '395.44' } as never);

    await POST(request(VALID_BODY));

    expect(addNoteMock.mock.calls[1][1]).toContain('Differenz 1,50 €');
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0].message).toContain('#502');
  });
});

describe('express-capture: vor dem Capture', () => {
  it('Kommazahl als Menge → 400, PayPal wird gar nicht erst gecaptured', async () => {
    const res = await POST(
      request({ ...VALID_BODY, line_items: [{ ...LINE_ITEMS[0], quantity: 15.54 }] })
    );

    expect(res.status).toBe(400);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('PayPal lehnt eindeutig ab (INSTRUMENT_DECLINED) → Fehler an den Kunden, keine Order, keine Mail', async () => {
    captureMock.mockResolvedValue({ outcome: 'declined', reason: 'INSTRUMENT_DECLINED' });

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.success).toBe(false);
    expect(json.error).toContain('nichts abgebucht');
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe('express-capture: unklarer Capture-Ausgang und Timeouts', () => {
  it('Capture-Timeout → wie bezahlt: Bestätigungsseite mit PayPal-Order-ID, Log, Mail, keine WC-Anlage', async () => {
    captureMock.mockResolvedValue({ outcome: 'unknown', reason: 'Timeout nach 15000 ms' });

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, orderPending: true, transactionId: 'PP-ORDER-1' });
    expect(json.redirectUrl).toBe('/checkout/success?paypal=pending&tx=PP-ORDER-1');
    expect(createOrderMock).not.toHaveBeenCalled();

    expect(missingLog()).toMatchObject({
      captureUnclear: true,
      paypalOrderId: 'PP-ORDER-1',
      lineItems: LINE_ITEMS,
      itemsTotal: 333.95,
      shippingCost: 59.99,
    });
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0].message).toContain('UNKLAR');
    expect(notifyMock.mock.calls[0][0].message).toContain('PP-ORDER-1');
  });

  it('Capture-Timeout und auch WordPress-Mail scheitert → trotzdem Bestätigung und vollständiges Log', async () => {
    captureMock.mockResolvedValue({ outcome: 'unknown', reason: 'Proxy antwortete mit HTTP 502' });
    notifyMock.mockResolvedValue(false);

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(json).toMatchObject({ success: true, orderPending: true });
    expect(missingLog()).toMatchObject({ captureUnclear: true, paypalOrderId: 'PP-ORDER-1' });
  });

  it('WooCommerce-Timeout → Fehlerpfad mit Hinweis, dass die Bestellung doch existieren kann', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockRejectedValue(new FetchTimeoutError('https://wp/orders', 15000));

    const res = await POST(request(VALID_BODY));
    const json = await res.json();

    expect(json.redirectUrl).toBe('/checkout/success?paypal=pending&tx=CAPTURE-123');
    expect(missingLog()).toMatchObject({ orderMayExist: true, captureUnclear: false });
    expect(notifyMock.mock.calls[0][0].message).toContain('ZUERST in WooCommerce');
  });

  it('gibt jedem externen Aufruf ein eigenes Timeout mit', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockResolvedValue({ id: 503, order_key: 'k', total: PAID } as never);

    await POST(request(VALID_BODY));

    expect(captureMock).toHaveBeenCalledWith('PP-ORDER-1', 15_000);
    expect(createOrderMock.mock.calls[0][1]).toEqual({ timeoutMs: 15_000 });
    expect(addNoteMock.mock.calls[0][3]).toEqual({ timeoutMs: 5_000 });
  });

  it('schreibt vor und nach jedem externen Aufruf eine Log-Zeile', async () => {
    captureMock.mockResolvedValue(capture());
    createOrderMock.mockResolvedValue({ id: 504, order_key: 'k', total: PAID } as never);

    await POST(request(VALID_BODY));

    const lines = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
    for (const name of ['capture', 'wc-create', 'wc-note']) {
      expect(lines.some((l) => l.startsWith(`[express-capture] ${name} start`))).toBe(true);
      expect(lines.some((l) => l.startsWith(`[express-capture] ${name} ok ms=`))).toBe(true);
    }
  });
});
