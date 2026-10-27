const NSE_API_PREFIX = (
  (import.meta.env.VITE_NSE_API_BASE_URL as string) || '/nse-api'
).replace(/\/+$/, '');

export const NSE_SSO_STATE_COOKIE_NAME = 'lendrix_nse_sso_state';
const NSE_SSO_STATE_COOKIE_DOMAIN = 'lendrixventech.com';
const VALID_REGISTRATION_STATUSES: ReadonlySet<string> = new Set([
  'registered',
  'pending',
  'failed',
  'unlinked',
  'linking_required',
  'unknown',
]);

export type CustomerRegistrationStatus =
  | 'registered'
  | 'pending'
  | 'failed'
  | 'unlinked'
  | 'linking_required'
  | 'unknown';

export interface NseSsoSession {
  authenticated: true;
  linking_required: boolean;
  lendrix_uuid: string;
  investor_linked: boolean;
  client_codes: string[];
}

export interface NseCustomerRegistration {
  registration_status: CustomerRegistrationStatus;
  client_codes: string[];
  attempt_status: string | null;
}

export class NseCustomerSsoError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'NseCustomerSsoError';
  }
}

let csrfToken: string | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isRegistrationStatus = (value: unknown): value is CustomerRegistrationStatus =>
  typeof value === 'string' && VALID_REGISTRATION_STATUSES.has(value);

const messageForStatus = (status: number, endpoint: string): string => {
  if (status === 400 && endpoint.endsWith('/exchange')) {
    return 'This Mutual Funds sign-in link has expired or was already used. Return to your signed-in Lendrix account and choose Mutual Funds to request a new link.';
  }
  if (status === 401) {
    return 'Your Mutual Funds SSO session is missing or expired. Return to your signed-in Lendrix account and choose Mutual Funds to retry.';
  }
  if (status === 403) {
    return 'Mutual Funds access was denied. Return to your signed-in Lendrix account and retry, or contact support if the problem continues.';
  }
  if (status === 429) return 'Too many Mutual Funds requests. Please wait a moment and retry.';
  if (status === 502 || status === 503 || status === 504) {
    return 'The Mutual Funds service is temporarily unavailable. Please try again later.';
  }
  return `Mutual Funds request failed (HTTP ${status}).`;
};

const requestJson = async (
  path: string,
  init: RequestInit,
): Promise<unknown> => {
  const endpoint = `${NSE_API_PREFIX}${path}`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });
  } catch {
    throw new NseCustomerSsoError('Unable to reach the Mutual Funds service. Check your connection and retry.');
  }

  const text = await response.text();
  if (!response.ok) {
    throw new NseCustomerSsoError(messageForStatus(response.status, endpoint), response.status);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new NseCustomerSsoError('The Mutual Funds service returned an invalid response.', response.status);
  }
};

export async function exchangeNseSsoCode(code: string): Promise<void> {
  csrfToken = null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) {
    throw new NseCustomerSsoError('The Mutual Funds sign-in link is invalid. Return to Lendrix and try again.', 400);
  }

  const payload = await requestJson('/auth/sso/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (
    !isRecord(payload) ||
    payload.authenticated !== true ||
    typeof payload.linking_required !== 'boolean' ||
    typeof payload.investor_linked !== 'boolean' ||
    payload.token_type !== 'cookie' ||
    typeof payload.csrf_token !== 'string' ||
    !payload.csrf_token ||
    !isStringArray(payload.client_codes)
  ) {
    throw new NseCustomerSsoError('The Mutual Funds service returned an invalid sign-in response.');
  }

  csrfToken = payload.csrf_token;
}

export async function getNseSsoMe(): Promise<NseSsoSession> {
  const payload = await requestJson('/auth/sso/me', { method: 'GET' });
  if (
    !isRecord(payload) ||
    payload.authenticated !== true ||
    typeof payload.lendrix_uuid !== 'string' ||
    typeof payload.linking_required !== 'boolean' ||
    typeof payload.investor_linked !== 'boolean' ||
    typeof payload.csrf_token !== 'string' ||
    !payload.csrf_token ||
    !isStringArray(payload.client_codes)
  ) {
    csrfToken = null;
    throw new NseCustomerSsoError('The Mutual Funds service returned an invalid session response.');
  }

  csrfToken = payload.csrf_token;
  return {
    authenticated: true,
    linking_required: payload.linking_required,
    lendrix_uuid: payload.lendrix_uuid,
    investor_linked: payload.investor_linked,
    client_codes: payload.client_codes,
  };
}

export async function getNseCustomerRegistrationStatus(): Promise<NseCustomerRegistration> {
  const payload = await requestJson('/customer/registration/status', { method: 'GET' });
  const attemptStatus = isRecord(payload) ? payload.attempt_status : undefined;
  const normalizedAttemptStatus =
    typeof attemptStatus === 'string' ? attemptStatus : attemptStatus === null ? null : undefined;
  if (
    !isRecord(payload) ||
    payload.authenticated !== true ||
    !isRegistrationStatus(payload.registration_status) ||
    !isStringArray(payload.client_codes) ||
    (payload.registration_status === 'registered' && payload.client_codes.length === 0) ||
    (payload.registration_status !== 'registered' && payload.client_codes.length > 0) ||
    normalizedAttemptStatus === undefined
  ) {
    throw new NseCustomerSsoError('The Mutual Funds service returned an invalid registration status response.');
  }

  return {
    registration_status: payload.registration_status,
    client_codes: payload.client_codes,
    attempt_status: normalizedAttemptStatus,
  };
}

export async function getNseCustomerSchemeMasterText(): Promise<string> {
  const endpoint = `${NSE_API_PREFIX}/customer/schemes`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });
  } catch {
    throw new NseCustomerSsoError('Unable to reach the scheme catalogue service. Check your connection and SSO session.');
  }

  const text = await response.text();
  if (!response.ok) {
    throw new NseCustomerSsoError(
      messageForStatus(response.status, endpoint),
      response.status,
    );
  }
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('text/plain')) {
    throw new NseCustomerSsoError('The Mutual Funds service returned an unsupported scheme catalogue response.');
  }
  return text;
}

export async function logoutNseSsoSession(): Promise<void> {
  if (!csrfToken) await getNseSsoMe();

  const token = csrfToken;
  if (!token) throw new NseCustomerSsoError('Unable to verify your Mutual Funds session. Please retry logout.');

  const payload = await requestJson('/auth/sso/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': token },
  });
  if (!isRecord(payload) || payload.message !== 'Logged out') {
    throw new NseCustomerSsoError('The Mutual Funds service did not confirm logout.');
  }

  csrfToken = null;
}

export function clearNseSsoMemory(): void {
  csrfToken = null;
}

export function consumeNseSsoState(suppliedState: string | null): boolean {
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${NSE_SSO_STATE_COOKIE_NAME}=`));
  const expectedState = cookie?.slice(NSE_SSO_STATE_COOKIE_NAME.length + 1) ?? null;

  document.cookie = `${NSE_SSO_STATE_COOKIE_NAME}=; Domain=.${NSE_SSO_STATE_COOKIE_DOMAIN}; Path=/; Max-Age=0; Secure; SameSite=Strict`;

  if (!suppliedState) return !import.meta.env.PROD;
  if (!expectedState) return !import.meta.env.PROD;
  return /^[a-f0-9]{64}$/.test(suppliedState) && suppliedState === expectedState;
}

export const getLendrixRetryUrl = (): string =>
  import.meta.env.VITE_LENDRIX_FRONTEND_URL ?? 'https://lendrixventech.com/dashboard';
