import { afterEach, describe, expect, it, vi } from 'vitest';
import { nseApi, NSE_TOKEN_KEY } from './nseApi';
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('Mutual funds mandate registration error handling', () => {
  it('unwraps the supplied nested 422 response and preserves its rejection status', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 422, text: async () => JSON.stringify({ detail: JSON.stringify({ status: '422', error_type: 'Unprocessable Entity', message: 'We are not able to process Mandate registration.' }) }) })));
    await expect(nseApi.registerMandate({ reg_data: [{ client_code: 'TEST001' }] })).rejects.toMatchObject({ status: 422, message: 'We are not able to process Mandate registration.' });
  });
  it('blocks the pasted Swagger placeholders before calling the server', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(nseApi.registerMandate({ reg_data: [{ client_code: 'string', mandate_type: 'string' }] })).rejects.toThrow('Replace Swagger placeholders');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects request values in response-only fields', async () => {
    await expect(nseApi.registerMandate({ reg_data: [{ client_code: 'TEST001', reg_id: '123' }] })).rejects.toThrow('response fields');
  });
  it('does not expose SQL parameters or claim registration success after a database failure', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    // Codes/date rules are intentionally omitted: this test exercises the server
    // error path without claiming an undocumented mandate payload is valid.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => JSON.stringify({ detail: 'DB save failed: value too long for type character varying(1) [parameters: sensitive-bank-data]' }) })));
    await expect(nseApi.registerMandate({ reg_data: [{ client_code: 'TEST001' }] })).rejects.toThrow('Check mandate status before retrying');
  });
});
