import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearNseSsoMemory,
  exchangeNseSsoCode,
  getNseCustomerRegistrationStatus,
  getNseCustomerSchemeMasterText,
  getNseSsoMe,
  logoutNseSsoSession,
} from './nseCustomerSso';

const code = 'a'.repeat(43);
const csrfToken = 'session-bound-csrf-token';

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const exchangeResponse = () => jsonResponse(200, {
  authenticated: true,
  linking_required: false,
  csrf_token: csrfToken,
  token_type: 'cookie',
  message: 'SSO session established',
  investor_linked: true,
  client_codes: ['CLIENT-1'],
});

const meResponse = () => jsonResponse(200, {
  authenticated: true,
  linking_required: false,
  csrf_token: csrfToken,
  lendrix_uuid: '01234567-89ab-cdef-0123-456789abcdef',
  investor_linked: true,
  client_codes: ['CLIENT-1'],
});

describe('customer NSE SSO API', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearNseSsoMemory();
    localStorage.clear();
    sessionStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    clearNseSsoMemory();
  });

  it('exchanges the one-time code with credentials and verifies the cookie session', async () => {
    fetchMock
      .mockResolvedValueOnce(exchangeResponse())
      .mockResolvedValueOnce(meResponse());

    await exchangeNseSsoCode(code);
    await expect(getNseSsoMe()).resolves.toMatchObject({
      authenticated: true,
      lendrix_uuid: '01234567-89ab-cdef-0123-456789abcdef',
      client_codes: ['CLIENT-1'],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/nse-api/auth/sso/exchange', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ code }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/nse-api/auth/sso/me', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('gives expired or already-redeemed codes a retry path through Lendrix', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, {
      detail: 'Invalid or expired authorization code',
    }));

    await expect(exchangeNseSsoCode(code)).rejects.toThrow(
      'expired or was already used. Return to your signed-in Lendrix account',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses an existing customer session without a bearer token', async () => {
    fetchMock.mockResolvedValueOnce(meResponse());

    await expect(getNseSsoMe()).resolves.toMatchObject({
      authenticated: true,
      investor_linked: true,
    });
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/auth/sso/me', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    }));
  });

  it('reports an expired customer session with the Lendrix retry path', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { detail: 'No SSO session' }));

    await expect(getNseSsoMe()).rejects.toThrow(
      'Your Mutual Funds SSO session is missing or expired',
    );
  });

  it('loads the registration status from the authenticated customer endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {
      authenticated: true,
      registration_status: 'registered',
      client_codes: ['VERIFIED-CLIENT'],
      attempt_status: null,
    }));

    await expect(getNseCustomerRegistrationStatus()).resolves.toMatchObject({
      registration_status: 'registered',
      client_codes: ['VERIFIED-CLIENT'],
    });
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/customer/registration/status', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }));
  });

  it('fetches the scheme master as raw text without a client code or bearer token', async () => {
    fetchMock.mockResolvedValueOnce(new Response('SCHEME CODE|SCHEME NAME', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    }));

    await expect(getNseCustomerSchemeMasterText()).resolves.toBe('SCHEME CODE|SCHEME NAME');
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/customer/schemes', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });
  });

  it('sends the in-memory CSRF token for logout and does not store the cookie value', async () => {
    fetchMock
      .mockResolvedValueOnce(meResponse())
      .mockResolvedValueOnce(jsonResponse(200, { message: 'Logged out' }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: 'No SSO session' }));
    await getNseSsoMe();
    await logoutNseSsoSession();

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/nse-api/auth/sso/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-Token': csrfToken }),
    }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    await expect(getNseSsoMe()).rejects.toThrow('Your Mutual Funds SSO session is missing or expired');
  });
});
