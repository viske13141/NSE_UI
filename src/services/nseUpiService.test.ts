import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNSEUpiStatus } from './nseUpiService';
import { nseApi, NSE_TOKEN_KEY } from './nseApi';
const base = { payment_mode: 'UPI', client_code: 'TEST001', nse_upi_ref_no: '123', order_amount: '2000', upi_tran_ref_id: 'TXN1', cust_ref_no: '123456789012' };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('Mutual funds UPI status tracking', () => {
  it.each([['SUCCESS', 'paid'], ['FAILED', 'failed'], ['PENDING', 'pending'], ['EXPIRED', 'expired'], ['REJECTED', 'rejected']] as const)('maps %s only after matching the reference, investor and amount', async (status, state) => {
    const api = vi.spyOn(nseApi, 'upiStatus').mockResolvedValue({ ...base, status });
    expect(await getNSEUpiStatus('TEST001', '123', 2000)).toMatchObject({ state, rawStatus: status, reference: '123', transactionId: 'TXN1' });
    expect(api).toHaveBeenCalledWith({ nse_upi_ref_no: '123', client_code: 'TEST001' });
  });
  it('blocks nonnumeric and oversized references before making a request', async () => {
    const api = vi.spyOn(nseApi, 'upiStatus');
    await expect(getNSEUpiStatus('TEST001', 'string', 2000)).rejects.toThrow('numeric UPI payment reference');
    await expect(getNSEUpiStatus('TEST001', '12345678901', 2000)).rejects.toThrow('10 digits');
    expect(api).not.toHaveBeenCalled();
  });
  it('does not mistake the supplied Fail validation response for payment failure or success', async () => {
    vi.spyOn(nseApi, 'upiStatus').mockResolvedValue({ status: 'Fail', remark: 'numeric values are allowed for nse_upi_ref_no' });
    await expect(getNSEUpiStatus('TEST001', '123', 2000)).rejects.toThrow('numeric values');
  });
  it('keeps failed payment statuses readable through the transport', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ ...base, status: 'FAILED', remark: 'Payment failed' }) })));
    expect(await getNSEUpiStatus('TEST001', '123', 2000)).toMatchObject({ state: 'failed' });
  });
  it('rejects another client, another reference and mismatched amounts', async () => {
    vi.spyOn(nseApi, 'upiStatus').mockResolvedValueOnce({ ...base, status: 'SUCCESS', client_code: 'OTHER' }).mockResolvedValueOnce({ ...base, status: 'SUCCESS', nse_upi_ref_no: '999' }).mockResolvedValueOnce({ ...base, status: 'SUCCESS', order_amount: '1' });
    await expect(getNSEUpiStatus('TEST001', '123', 2000)).rejects.toThrow('does not match');
    await expect(getNSEUpiStatus('TEST001', '123', 2000)).rejects.toThrow('does not match');
    await expect(getNSEUpiStatus('TEST001', '123', 2000)).rejects.toThrow('amount does not match');
  });
});
