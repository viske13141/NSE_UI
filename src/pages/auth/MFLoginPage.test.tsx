import NSELoginPage from './NSELoginPage';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MFLoginPage from './MFLoginPage';
import NSEInvestorRegistrationPage from './NSEInvestorRegistrationPage';
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/investwellAuthService', () => ({ fetchInvestwellToken: vi.fn(), storeToken: vi.fn(), storeAggregatorCredentials: vi.fn() }));
vi.mock('@/services/bseAuth', () => ({ loginToBSE: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => { sessionStorage.clear(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function submitLogin() {
  render(<MemoryRouter initialEntries={['/mf-login']}><Routes><Route path="/mf-login" element={<MFLoginPage />} /><Route path="/nse-login" element={<NSELoginPage />} /><Route path="/nse-dashboard" element={<h1>Mutual funds dashboard destination</h1>} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Mutual funds' }));
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'test-member' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in to Mutual funds' }));
}
describe('Mutual funds portal login', () => {
  it('navigates to standalone investor registration when Register is selected', () => {
    render(<MemoryRouter initialEntries={['/nse-login']}><Routes>
      <Route path="/nse-login" element={<NSELoginPage />} />
      <Route path="/investor-registration" element={<h1>Investor registration destination</h1>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText('Need access? Contact your platform administrator.').nextElementSibling).toHaveTextContent('Register');
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('heading', { name: 'Investor registration destination' })).toBeInTheDocument();
  });
  it('keeps the existing authentication guard when registration is opened without a token', () => {
    render(<MemoryRouter initialEntries={['/nse-login']}><Routes>
      <Route path="/nse-login" element={<NSELoginPage />} />
      <Route path="/investor-registration" element={<NSEInvestorRegistrationPage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByRole('heading', { name: 'Sign in to Mutual funds' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
    expect(sessionStorage.getItem('nse_access_token')).toBeNull();
  });
  it('returns to the requested dashboard page after signing in on the dedicated login page', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ status: '200', access_token: 'test-token', token_type: 'Bearer' }) });
    render(<MemoryRouter initialEntries={[{ pathname: '/nse-login', state: { from: '/nse-dashboard/sip-and-other-plans?view=xsips' } }]}><Routes><Route path="/nse-login" element={<NSELoginPage />} /><Route path="/nse-dashboard/sip-and-other-plans" element={<h1>Requested investment plans</h1>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'test-member' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to Mutual funds' }));
    expect(await screen.findByRole('heading', { name: 'Requested investment plans' })).toBeInTheDocument();
  });
  it('posts credentials and redirects only after receiving the documented token response', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ status: '200', message: 'Authentication successful', access_token: 'test-token', token_type: 'Bearer' }) });
    submitLogin();
    expect(await screen.findByRole('heading', { name: 'Mutual funds dashboard destination' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/nse-api/auth/login', expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'test-member', password: 'test-password' }) }));
    expect(sessionStorage.getItem('nse_access_token')).toBe('test-token');
  });
  it('shows the API error and stays on the portal after invalid credentials', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => JSON.stringify({ detail: 'Invalid credentials' }) });
    submitLogin();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByRole('heading', { name: 'Mutual funds dashboard destination' })).not.toBeInTheDocument();
    expect(sessionStorage.getItem('nse_access_token')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign in to Mutual funds' })).toBeEnabled();
  });
});
