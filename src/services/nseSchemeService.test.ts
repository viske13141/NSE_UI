import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/nse-schemes.txt?raw';
import { getNSESchemeMaster, getPublicSchemeMaster, parseNSESchemeMaster } from './nseSchemeService';
import { NSE_TOKEN_KEY } from './nseApi';
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('Mutual funds scheme master', () => {
  it('maps the supplied pipe-delimited response and preserves same-name scheme variants', () => {
    const schemes = parseNSESchemeMaster('\uFEFF' + fixture.replace(/\n/g, '\r\n'));
    expect(schemes).toHaveLength(3);
    expect(schemes[0]).toMatchObject({ id: '26343', schemeCode: 'IIIBHRG-GR-L1', plan: 'Regular', category: 'DEBT', minPurchase: 200000, active: true, purchaseAllowed: true, sipAllowed: true, purchaseMultiplier: 1 });
    expect(schemes[1].name).toBe(schemes[0].name);
    expect(schemes[1].schemeCode).not.toBe(schemes[0].schemeCode);
    expect(schemes[1].minPurchase).toBe(1000);
  });
  it('downloads SCH as text using the Mutual funds bearer token', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => fixture }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getNSESchemeMaster()).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/reports/master-download', expect.objectContaining({ method: 'POST', body: JSON.stringify({ file_type: 'SCH' }), headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }));
  });
  it('loads customer schemes through the FastAPI SSO cookie without an NSE bearer token', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/plain; charset=utf-8' },
      text: async () => fixture,
    }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPublicSchemeMaster()).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/customer/schemes', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });
  });
  it('surfaces FastAPI customer catalogue errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: 'Invalid or expired SSO session' }),
    })));
    await expect(getPublicSchemeMaster()).rejects.toThrow('Your Mutual Funds SSO session is missing or expired');
  });
  it('disables unavailable transactions and does not infer Direct from NORMAL', () => {
    const lines = fixture.trim().split('\n');
    const headers = lines[0].split('|'); const values = lines[1].split('|');
    values[headers.indexOf('SCHEME NAME')] = 'Unspecified plan';
    values[headers.indexOf('PURCHASE ALLOWED')] = 'N';
    values[headers.indexOf('SIP ALLOWED')] = 'N';
    values[headers.indexOf('AMC ACTIVE FLAG')] = 'N';
    values[headers.indexOf('NEW PURCHASE MIN AMOUNT')] = '';
    expect(parseNSESchemeMaster([lines[0], values.join('|')].join('\n'))[0]).toMatchObject({ active: false, purchaseAllowed: false, sipAllowed: false, plan: 'NORMAL', minPurchase: null });
  });
  it('rejects malformed files and incomplete rows instead of showing a partial catalog', () => {
    expect(() => parseNSESchemeMaster('<html>Unavailable</html>')).toThrow('missing SCHEME CODE');
    expect(() => parseNSESchemeMaster(fixture.split('\n')[0] + '\n1|BROKEN')).toThrow('incomplete');
    expect(() => parseNSESchemeMaster('')).toThrow('empty');
  });
  it('shows JSON API errors instead of parsing them as fund records', async () => {
    sessionStorage.setItem(NSE_TOKEN_KEY, 'test-token');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ error_remark: 'Master unavailable' }) })));
    await expect(getNSESchemeMaster()).rejects.toThrow('Master unavailable');
  });
});

it('preserves separate same-name variants and their switch eligibility', () => {
  const schemes = parseNSESchemeMaster(fixture);
  expect(schemes[0].name).toBe(schemes[1].name);
  expect(schemes[0].schemeCode).not.toBe(schemes[1].schemeCode);
  expect(schemes[0]).toMatchObject({ minPurchase: 200000, settlementType: 'L1', switchAllowed: false });
  expect(schemes[1]).toMatchObject({ minPurchase: 1000, settlementType: 'T2', switchAllowed: true });
});
