import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import NSESsoCallbackPage from './NSESsoCallbackPage';

const sso = vi.hoisted(() => ({
  clearNseSsoMemory: vi.fn(),
  consumeNseSsoState: vi.fn(),
  exchangeNseSsoCode: vi.fn(),
  getLendrixRetryUrl: vi.fn(() => 'https://lendrixventech.com/dashboard'),
  getNseSsoMe: vi.fn(),
}));

vi.mock('@/services/nseCustomerSso', () => sso);

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function renderCallback() {
  return render(
    <MemoryRouter initialEntries={['/sso/callback#code=' + 'a'.repeat(43) + '&state=state-123']}>
      <Routes>
        <Route path="/sso/callback" element={<NSESsoCallbackPage />} />
        <Route path="/mutual-funds" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NSE SSO callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sso.consumeNseSsoState.mockReturnValue(true);
    sso.exchangeNseSsoCode.mockResolvedValue(undefined);
    sso.getNseSsoMe.mockResolvedValue({ authenticated: true });
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
  });

  it('removes the authorization code from the browser URL, verifies the session, and opens schemes', async () => {
    window.history.replaceState({}, '', `/sso/callback#code=${'a'.repeat(43)}&state=state-123`);
    renderCallback();

    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
    await waitFor(() => expect(screen.getByLabelText('Current path')).toHaveTextContent('/mutual-funds'));
    expect(sso.consumeNseSsoState).toHaveBeenCalledWith('state-123');
    expect(sso.exchangeNseSsoCode).toHaveBeenCalledWith('a'.repeat(43));
    expect(sso.getNseSsoMe).toHaveBeenCalledTimes(1);
  });

  it('shows a clear Lendrix retry path for an expired or redeemed code', async () => {
    sso.exchangeNseSsoCode.mockRejectedValueOnce(
      new Error('This Mutual Funds sign-in link has expired or was already used. Return to Lendrix.'),
    );
    window.history.replaceState({}, '', `/sso/callback#code=${'a'.repeat(43)}&state=state-123`);
    renderCallback();

    expect(await screen.findByRole('alert')).toHaveTextContent('expired or was already used');
    expect(screen.getByRole('link', { name: 'Return to Lendrix to retry' })).toHaveAttribute(
      'href',
      'https://lendrixventech.com/dashboard',
    );
    expect(sso.getNseSsoMe).not.toHaveBeenCalled();
  });

  it('does not exchange a code when the initiating handoff state cannot be verified', async () => {
    sso.consumeNseSsoState.mockReturnValueOnce(false);
    window.history.replaceState({}, '', `/sso/callback#code=${'a'.repeat(43)}&state=bad-state`);
    renderCallback();

    expect(await screen.findByRole('alert')).toHaveTextContent('handoff could not be verified');
    expect(sso.exchangeNseSsoCode).not.toHaveBeenCalled();
  });
});
