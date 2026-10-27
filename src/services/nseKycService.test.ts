import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkNSEClientKyc } from './nseKycService';
import { nseApi, NSE_TOKEN_KEY } from './nseApi';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('Mutual funds Client KYC report', () => {
  it('sends documented investor identifiers without placeholder date strings', async () => {
    const api = vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data_total: '0', report_data: [], error_remark: 'No record(s) found.' });
    const result = await checkNSEClientKyc('TEST001', 'ABCDE1234F');
    expect(api).toHaveBeenCalledWith({ pan_no: 'ABCDE1234F' });
    expect(result).toMatchObject({ status: 'not-found', verified: false });
  });
  it('accepts the supplied empty success envelope at transport level without marking KYC verified', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'S', report_data_total: '0', response_data_total: null, report_data: [], error_remark: 'No record(s) found.' }) })));
    expect(await checkNSEClientKyc('TEST001')).toMatchObject({ status: 'not-found', verified: false });
  });
  it('does not infer verification from report success or unknown record fields', async () => {
    vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data_total: '1', report_data: [{ client_code: 'TEST001', unknown: 'SUCCESS' }] });
    expect(await checkNSEClientKyc('TEST001')).toMatchObject({ status: 'unmapped', verified: false });
  });
  it('accepts only identity-matched validated KYC', async () => {
    const row = { client_code: 'TEST001', client_pan: 'ABCPD1234F', kyc_status: 'SUCCESS', status_remark: '07- KYC Validated' };
    vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data: [row] });
    expect(await checkNSEClientKyc('TEST001', 'ABCPD1234F')).toMatchObject({ verified: true, status: 'verified' });
    expect(await checkNSEClientKyc('OTHER', 'ABCPD1234F')).toMatchObject({ verified: false });
    expect(await checkNSEClientKyc('TEST001', 'ABCPD9999F')).toMatchObject({ verified: false });
  });
  it.each([
    ['SUCCESS', 'UNDER_PROCESS'], ['SUCCESS', 'KYC REGISTERED'],
    ['FAILED', '07- KYC Validated'], ['SUCCESS', 'KYC Validated - Incomplete KYC'],
    ['SUCCESS', ''],
  ])('blocks unvalidated or conflicting status %s / %s', async (kyc_status, status_remark) => {
    vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data: [{ client_code: 'TEST001', kyc_status, status_remark }] });
    expect(await checkNSEClientKyc('TEST001')).toMatchObject({ verified: false });
  });
  it('blocks conflicting matching records', async () => {
    vi.spyOn(nseApi, 'clientKyc').mockResolvedValue({ response_status: 'S', report_data: [
      { client_code: 'TEST001', kyc_status: 'SUCCESS', status_remark: '07- KYC Validated' },
      { client_code: 'TEST001', kyc_status: 'FAILED', status_remark: 'ON HOLD' },
    ] });
    expect(await checkNSEClientKyc('TEST001')).toMatchObject({ verified: false });
  });
  it('rejects report failures and malformed data', async () => {
    const api = vi.spyOn(nseApi, 'clientKyc').mockResolvedValueOnce({ response_status: 'F', error_remark: 'Lookup unavailable' }).mockResolvedValueOnce({ response_status: 'S', report_data: null });
    await expect(checkNSEClientKyc('TEST001')).rejects.toThrow('Lookup unavailable');
    await expect(checkNSEClientKyc('TEST001')).rejects.toThrow('invalid KYC report');
    expect(api).toHaveBeenCalledTimes(2);
  });
});
