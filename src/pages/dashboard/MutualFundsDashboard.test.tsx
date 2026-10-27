import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MutualFundsDashboard from './MutualFundsDashboard';
import { getPublicSchemeMaster, parseNSESchemeMaster } from '@/services/nseSchemeService';
import {
  getNseCustomerRegistrationStatus,
  getNseSsoMe,
  logoutNseSsoSession,
  NseCustomerSsoError,
} from '@/services/nseCustomerSso';
import fixture from '@/services/fixtures/nse-schemes.txt?raw';

vi.mock('@/services/nseSchemeService', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/nseSchemeService')>(),
  getPublicSchemeMaster: vi.fn(),
}));

vi.mock('@/services/nseCustomerSso', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/nseCustomerSso')>(),
  getNseCustomerRegistrationStatus: vi.fn(),
  getNseSsoMe: vi.fn(),
  logoutNseSsoSession: vi.fn(),
}));

const base = parseNSESchemeMaster(fixture)[0];

const registration = (
  registration_status: 'registered' | 'pending' | 'failed' | 'unlinked' | 'linking_required' | 'unknown',
  client_codes: string[] = [],
) => ({ registration_status, client_codes, attempt_status: null });

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/mutual-funds']}>
      <MutualFundsDashboard />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(getPublicSchemeMaster).mockReset().mockResolvedValue([base]);
  vi.mocked(getNseSsoMe).mockReset().mockResolvedValue({
    authenticated: true,
    linking_required: true,
    lendrix_uuid: '01234567-89ab-cdef-0123-456789abcdef',
    investor_linked: false,
    client_codes: [],
  });
  vi.mocked(getNseCustomerRegistrationStatus).mockReset().mockResolvedValue(registration('unlinked'));
  vi.mocked(logoutNseSsoSession).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('customer Mutual Funds dashboard', () => {
  it('loads live customer schemes through SSO without a separate NSE login', async () => {
    renderDashboard();

    expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
    expect(screen.queryByText('Sign in to Mutual funds')).not.toBeInTheDocument();
    expect(getNseSsoMe).toHaveBeenCalledTimes(1);
    expect(getPublicSchemeMaster).toHaveBeenCalledTimes(1);
    expect(getNseCustomerRegistrationStatus).toHaveBeenCalledTimes(1);
  });

  it('preserves search, filtering, and pagination for the live parsed schemes', async () => {
    vi.mocked(getPublicSchemeMaster).mockResolvedValue([
      { ...base, id: '1', name: 'Alpha Fund', schemeCode: 'AF001' },
      { ...base, id: '2', name: 'Beta Fund', schemeCode: 'BF001' },
    ]);
    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Alpha Fund' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search mutual funds'), { target: { value: 'Beta' } });
    expect(screen.queryByRole('heading', { name: 'Alpha Fund' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta Fund' })).toBeInTheDocument();
  });

  it('shows the existing registration popup for a customer without a verified mapping', async () => {
    vi.mocked(getPublicSchemeMaster).mockResolvedValue([
      { ...base, active: true, purchaseAllowed: true },
    ]);
    renderDashboard();

    expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Invest once in ${base.name}` }));
    expect(screen.getByRole('dialog', { name: 'Complete Your Investor Registration' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Customer NSE registration is not available');
    expect(screen.getByRole('alert')).toHaveTextContent(base.name);
    expect(screen.queryByText('Sign in to Mutual funds')).not.toBeInTheDocument();
  });

  it.each([
    ['pending', 'Start SIP', 'pending'],
    ['failed', 'Invest Once', 'not approved'],
    ['unknown', 'Start XSIP', 'could not be verified'],
    ['linking_required', 'Switch Fund', 'requires verified linking'],
  ] as const)(
    'does not submit an investment for registration status %s',
    async (status, actionLabel, expectedMessage) => {
      vi.mocked(getNseCustomerRegistrationStatus).mockResolvedValue(registration(status));
      vi.mocked(getPublicSchemeMaster).mockResolvedValue([
        { ...base, active: true, purchaseAllowed: true, sipAllowed: true, switchAllowed: true },
      ]);
      renderDashboard();

      expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
      const buttonName = actionLabel === 'Invest Once'
        ? `Invest once in ${base.name}`
        : actionLabel === 'Start SIP'
          ? `Start SIP in ${base.name}`
          : actionLabel === 'Start XSIP'
            ? `Start XSIP in ${base.name}`
            : `Switch fund for ${base.name}`;
      fireEvent.click(screen.getByRole('button', { name: buttonName }));
      expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
      expect(screen.queryByRole('dialog', { name: 'Investment flow' })).not.toBeInTheDocument();
    },
  );

  it('does not send an order for a registered customer when authorized customer APIs are absent', async () => {
    vi.mocked(getNseCustomerRegistrationStatus).mockResolvedValue(
      registration('registered', ['VERIFIED-CLIENT']),
    );
    vi.mocked(getPublicSchemeMaster).mockResolvedValue([
      { ...base, active: true, purchaseAllowed: true },
    ]);
    renderDashboard();

    expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Invest once in ${base.name}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No order was submitted');
    expect(screen.getByRole('alert')).toHaveTextContent('/api/v1/customer/order/entry');
    expect(screen.queryByRole('dialog', { name: 'Investment flow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Switch flow' })).not.toBeInTheDocument();
  });

  it('keeps scheme browsing available when registration status cannot be fetched', async () => {
    vi.mocked(getNseCustomerRegistrationStatus).mockRejectedValue(new Error('Status unavailable'));
    renderDashboard();

    expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('You can still browse schemes');
    fireEvent.click(screen.getByRole('button', { name: `Invest once in ${base.name}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be verified');
  });

  it('shows a retry path through Lendrix when the SSO session is expired', async () => {
    vi.mocked(getNseSsoMe).mockRejectedValue(
      new NseCustomerSsoError('Your Mutual Funds SSO session is missing or expired', 401),
    );
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Your Mutual Funds SSO session is missing or expired');
    expect(screen.getByRole('link', { name: 'Return to your signed-in Lendrix account and open Mutual Funds again.' }))
      .toHaveAttribute('href', 'https://lendrixventech.com/dashboard');
    expect(getPublicSchemeMaster).not.toHaveBeenCalled();
  });
});
