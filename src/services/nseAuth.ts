import { nseApi, NSE_TOKEN_KEY } from './nseApi';
export type { LoginResponse as NSELoginResponse } from '@/types/nse';

export async function loginToNSE(username: string, password: string): Promise<string> {
  if (!username.trim()) throw new Error('Username is required');
  if (!password.trim()) throw new Error('Password is required');
  // A failed login must never retain a previous account's session.
  clearNSEToken();
  const result = await nseApi.login({ username: username.trim(), password });
  if (result?.status && result.status !== '200') throw new Error(result.message || 'Mutual funds authentication failed');
  if (result?.token_type && result.token_type.toLowerCase() !== 'bearer') throw new Error('Mutual funds returned an unsupported token type');
  if (!result?.access_token) throw new Error(result?.message || 'Mutual funds authentication failed: no access token returned');
  sessionStorage.setItem(NSE_TOKEN_KEY, result.access_token);
  return result.access_token;
}
export function getNSEToken(): string | null {
  const token = sessionStorage.getItem(NSE_TOKEN_KEY);
  return token && !token.startsWith('nse_mock_token_') ? token : null;
}
export function isNSEConnected(): boolean { return getNSEToken() !== null; }
export function clearNSEToken(): void { sessionStorage.removeItem(NSE_TOKEN_KEY); }
