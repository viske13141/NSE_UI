import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNSEPayment, initiateNSEPayment, type NSEPaymentInput } from './nsePaymentService';
import { nseApi, NSE_TOKEN_KEY } from './nseApi';
const base: NSEPaymentInput = { mode: 'netbanking', clientCode: 'TEST001', orderId: '432160000001', orderAccepted: true, accountNo: '000011112222', ifsc: 'TEST0001234' };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); sessionStorage.clear(); });
describe('Mutual funds purchase payment', () => {
  it.each(['netbanking', 'upi', 'mandate', 'cheque', 'neft'] as const)('builds documented %s requests with only applicable fields', mode => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    const payload = buildNSEPayment({ ...base, mode, vpa: 'test@upi', mandateId: '1234567890123', chequeNo: '123456', chequeDate: '2026-10-15', utr: 'TEST-UTR' });
    expect(payload).toMatchObject({ payment_mode: ({ netbanking: 'NETBANKING', upi: 'UPI', mandate: 'MANDATE', cheque: 'CHEQUE', neft: 'RTGS/NEFT' })[mode], client_code: 'TEST001', order_ids: '432160000001' });
    if (mode === 'mandate') { expect(payload.mandate_id).toBe('1234567890123'); expect(payload.bank_account_no).toBeUndefined(); }
    if (mode === 'cheque') expect(payload.cheque_date).toBe('15/10/2026');
    if (mode === 'neft') expect(payload.neft_rtgs_utr_no).toBe('TEST-UTR');
    if (mode === 'upi') expect(payload.vpa).toBe('test@upi');
  });
  it('blocks rejected orders, invalid payment fields and out-of-range cheque dates', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T10:00:00Z'));
    expect(() => buildNSEPayment({ ...base, orderAccepted: false })).toThrow('accepted Mutual funds order');
    expect(() => buildNSEPayment({ ...base, accountNo: 'XXXX2222' })).toThrow('unmasked');
    expect(() => buildNSEPayment({ ...base, mode: 'upi', vpa: 'invalid' })).toThrow('UPI ID');
    expect(() => buildNSEPayment({ ...base, mode: 'mandate' })).toThrow('mandate ID');
    expect(() => buildNSEPayment({ ...base, mode: 'cheque', chequeNo: '123', chequeDate: '2026-06-01' })).toThrow('90 days');
  });
  it('handles the supplied HTTP 200 Fail response as failure', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ status: 'Fail', remark: 'payment_mode value is not valid.' }) })));
    await expect(initiateNSEPayment(base)).rejects.toThrow('payment_mode value is not valid.');
  });
  it('returns a secure payment link without claiming payment capture', async () => {
    vi.spyOn(nseApi, 'purchasePayment').mockResolvedValue({ status: 'success', client_code: 'TEST001', order_ids: '432160000001', short_url: 'https://nseinvest.com/mf/test', basket_id: '432160000001', remark: 'successfully done' });
    expect(await initiateNSEPayment(base)).toEqual({ paymentUrl: 'https://nseinvest.com/mf/test', basketId: '432160000001', message: 'successfully done' });
  });
  it('rejects unsafe payment links and mismatched order responses', async () => {
    vi.spyOn(nseApi, 'purchasePayment').mockResolvedValueOnce({ status: 'success', short_url: 'javascript:alert(1)' }).mockResolvedValueOnce({ status: 'success', order_ids: '999' });
    await expect(initiateNSEPayment(base)).rejects.toThrow('unsafe payment link');
    await expect(initiateNSEPayment(base)).rejects.toThrow('does not match');
  });
});
