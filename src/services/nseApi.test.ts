import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loginToNSE, getNSEToken } from './nseAuth';
import { nseApi, nseRequest, NSE_TOKEN_KEY, NSE_MASTER_FILE_TYPES } from './nseApi';
const fetchMock = vi.fn();
function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });
}
beforeEach(() => { sessionStorage.clear(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('Mutual funds documented API integration', () => {
  it('uses flat login fields, reads the top-level token and authenticates reports', async () => {
    reply({ status: '200', message: 'Authentication successful', access_token: 'test-token', token_type: 'Bearer' });
    await loginToNSE(' member ', 'password');
    expect(fetchMock.mock.calls[0][0]).toBe('/nse-api/auth/login');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ username: 'member', password: 'password' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe('application/json');
    reply({ response_status: 'SUCCESS', report_data_total: '0', report_data: [] });
    await nseApi.clientMaster({ client_code: 'CLIENT1' });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer test-token');
    expect(getNSEToken()).toBe('test-token');
  });
  it('does not preserve an old token after failed authentication', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'old-token');
    reply({ detail: 'Invalid credentials' }, 401);
    await expect(loginToNSE('member', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(getNSEToken()).toBeNull();
  });
  it('rejects an application-level login failure even when HTTP status is 200', async () => {
    reply({ status: '401', message: 'Invalid credentials', access_token: 'invalid-token', token_type: 'Bearer' });
    await expect(loginToNSE('member', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(getNSEToken()).toBeNull();
  });
  it('rejects old demo tokens without making a live request', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'nse_mock_token_123');
    await expect(nseApi.clientMaster({})).rejects.toThrow('Demo tokens');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sends documented transaction envelopes and preserves exchange status fields', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    const details = { scheme_code: 'SCHEME', client_code: 'CLIENT', order_amount: '500' };
    reply({ transaction_details: [{ ...details, trxn_status: 'REJECTED', trxn_remark: 'Invalid scheme' }] });
    const order = await nseApi.placeOrder({ transaction_details: [details] });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ transaction_details: [details] });
    expect(order.transaction_details[0].trxn_status).toBe('REJECTED');
    reply({ reg_data: [{ reg_status: 'PENDING' }] });
    await nseApi.registerSip({ reg_data: [{ sch_code: 'SCHEME', client_code: 'CLIENT', installment_amount: '500' }] });
    expect(fetchMock.mock.calls[1][0]).toBe('/nse-api/sip/register');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).reg_data[0].installment_amount).toBe('500');
  });
  it('reports validation errors and clears an expired bearer session', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    reply({ detail: [{ loc: ['body', 'file_type'], msg: 'Field required' }] }, 422);
    await expect(nseApi.downloadMaster({ file_type: 'SCH' })).rejects.toThrow('file_type: Field required');
    reply({ detail: 'Session expired' }, 401);
    await expect(nseApi.clientMaster({})).rejects.toThrow('Session expired');
    expect(getNSEToken()).toBeNull();
  });
  it('treats report errors as failures without retrying financial requests', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    reply({ error_remark: 'Report unavailable' });
    await expect(nseApi.clientMaster({})).rejects.toThrow('Report unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(Object.keys(NSE_MASTER_FILE_TYPES))('requests the documented %s master as text', async fileType => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'HEADER|VALUE\nROW|1' });
    await expect(nseApi.downloadMaster({ file_type: fileType as keyof typeof NSE_MASTER_FILE_TYPES })).resolves.toBe('HEADER|VALUE\nROW|1');
    expect(fetchMock.mock.calls[0][0]).toBe('/nse-api/reports/master-download');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ file_type: fileType });
  });
});

describe('unreadable FATCA responses', () => {
  it('reports gateway HTML without exposing response contents or claiming submission success', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: async () => '<html>private upstream details</html>' });
    const failure = await nseRequest('/fatca/upload', {}).catch(error => error);
    expect(failure.message).toContain('gateway is unavailable');
    expect(failure.message).toContain('HTML instead of JSON (HTTP 502)');
    expect(failure.message).toContain('FATCA submission is not confirmed');
    expect(failure.message).not.toContain('private upstream details');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('clears expired authentication even when the error response is HTML', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, text: async () => '<html>Login</html>' });
    await expect(nseRequest('/fatca/common-upload', {})).rejects.toThrow('log in again');
    expect(sessionStorage.getItem(NSE_TOKEN_KEY)).toBeNull();
  });
  it('rejects empty successful responses and accepts JSON with a byte order mark', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });
    await expect(nseRequest('/fatca/upload', {})).rejects.toThrow('empty response');
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '\uFEFF{"reg_details":[]}' });
    await expect(nseRequest('/fatca/upload', {})).resolves.toEqual({ reg_details: [] });
  });
});
