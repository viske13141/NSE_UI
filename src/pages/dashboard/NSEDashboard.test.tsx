import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import NSEDashboard from './NSEDashboard';
import { getNSESchemeMaster, parseNSESchemeMaster } from '@/services/nseSchemeService';
import fixture from '@/services/fixtures/nse-schemes.txt?raw';
import { nseApi } from '@/services/nseApi';
vi.mock('@/services/nseAuth', () => ({ isNSEConnected: () => true, clearNSEToken: vi.fn() }));
vi.mock('@/services/nseSchemeService', async importOriginal => ({ ...await importOriginal<typeof import('@/services/nseSchemeService')>(), getNSESchemeMaster: vi.fn() }));
const base = parseNSESchemeMaster(fixture)[0];
function RouteProbe() {
  const location = useLocation(); const navigate = useNavigate();
  return <><output aria-label="Current dashboard URL">{location.pathname}</output><button onClick={() => navigate(-1)}>Browser back</button></>;
}
it('opens a section from its URL and follows browser history', () => {
  render(<MemoryRouter initialEntries={['/nse-dashboard/bank-auto-debit']}><RouteProbe /><NSEDashboard /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Bank auto-debit', level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reports', exact: true }));
  expect(screen.getByLabelText('Current dashboard URL')).toHaveTextContent('/nse-dashboard/reports');
  fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByRole('heading', { name: 'Bank auto-debit', level: 1 })).toBeInTheDocument();
  expect(screen.getByLabelText('Current dashboard URL')).toHaveTextContent('/nse-dashboard/bank-auto-debit');
});
beforeEach(() => { vi.mocked(getNSESchemeMaster).mockReset().mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const show = () => { const result = render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' })); fireEvent.click(screen.getByRole('button', { name: 'Explore funds' })); return result; };
describe('Mutual funds document navigation', () => {
  it('opens Client Bank Upload directly and supports both bank actions', () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([]);
    render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Bank & tax' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('button', { name: 'Update bank details' }));
    expect(screen.getByRole('dialog', { name: 'Manage Mutual funds bank accounts' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bank action')).toHaveValue('ADD');
    fireEvent.change(screen.getByLabelText('Bank action'), { target: { value: 'DEL' } });
    expect(screen.getByRole('button', { name: 'Review bank deletion' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Bank & tax' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('button', { name: 'Update bank details' }));
    expect(screen.getByRole('dialog', { name: 'Manage Mutual funds bank accounts' })).toBeInTheDocument();
  });
  it('opens client management and keeps unsupported admin actions disabled', () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([]);
    render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
    expect(screen.getByRole('heading', { name: 'Investor details' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Admin' }));
    expect(screen.getByRole('button', { name: /^User Master$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rights Management' })).toBeDisabled();
  });
  it('routes investor registration outside the dashboard and keeps FATCA in its existing dialog', () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([]);
    render(<MemoryRouter><RouteProbe /><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Bank & tax' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('button', { name: 'Tax declaration (FATCA)' }));
    expect(screen.getByRole('dialog', { name: 'FATCA registration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review FATCA submission' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Entity / HUF / UBO declaration' }));
    expect(screen.getByRole('heading', { name: /Submit common FATCA/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Signed image' }));
    expect(screen.getByLabelText('Signed FATCA image')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Account & KYC' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('button', { name: 'Register investor' }));
    expect(screen.getByLabelText('Current dashboard URL')).toHaveTextContent('/investor-registration');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '2. Bank details' })).not.toBeInTheDocument();
  });
  it('routes the dashboard header registration action to the standalone page', () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([]);
    render(<MemoryRouter><RouteProbe /><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Register Mutual funds investor' }));
    expect(screen.getByLabelText('Current dashboard URL')).toHaveTextContent('/investor-registration');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('groups reports and opens plan reports in the matching product', () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([]);
    render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Units & payouts' }), { button: 0, ctrlKey: false });
    expect(screen.getByRole('button', { name: 'Units allotted to your investments' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Investment plans' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'SIP & other plans' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mandate investing (XSIP)' }));
    expect(screen.getByRole('button', { name: 'Mandate investing (XSIP)' })).toHaveAttribute('aria-pressed', 'true');
  });
});
describe('Mutual funds live catalog display', () => {
  it('paginates large catalogs and searches scheme codes across all pages', async () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ ...base, id: String(i), schemeCode: `SCHEME-${i}`, name: `NSE Fund ${i}` })));
    show();
    await screen.findByRole('heading', { name: 'NSE Fund 0' });
    expect(screen.getAllByRole('button', { name: /^Buy NSE Fund/ })).toHaveLength(24);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'NSE Fund 25' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search mutual funds'), { target: { value: 'SCHEME-0' } });
    expect(screen.getByRole('heading', { name: 'NSE Fund 0' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'NSE Fund 25' })).not.toBeInTheDocument();
  });
  it('honors availability flags and filters plans', async () => {
    vi.mocked(getNSESchemeMaster).mockResolvedValue([{ ...base, name: 'Inactive fund', active: false }, { ...base, id: 'direct', name: 'Direct fund', plan: 'Direct' }]);
    show();
    expect(await screen.findByRole('button', { name: 'Buy Inactive fund' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start SIP in Inactive fund' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Fund plan'), { target: { value: 'Direct' } });
    expect(screen.queryByRole('heading', { name: 'Inactive fund' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Direct fund' })).toBeInTheDocument();
  });
  it('shows load errors with retry and never falls back to sample funds', async () => {
    vi.mocked(getNSESchemeMaster).mockRejectedValueOnce(new Error('Mutual funds unavailable')).mockResolvedValueOnce([base]);
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mutual funds unavailable');
    expect(screen.queryByRole('button', { name: /^Buy / })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading funds' }));
    expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
  });
});

it('distinguishes same-name variants and honors switch and XSIP availability', async () => {
  const variants = parseNSESchemeMaster(fixture).slice(0, 2);
  vi.mocked(getNSESchemeMaster).mockResolvedValue(variants);
  show();
  await screen.findAllByRole('heading', { name: base.name });
  expect(screen.getByText(`Scheme code: ${variants[0].schemeCode} | Settlement: ${variants[0].settlementType}`)).toBeInTheDocument();
  expect(screen.getByText(`Scheme code: ${variants[1].schemeCode} | Settlement: ${variants[1].settlementType}`)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Switch unavailable' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Switch fund' })).toBeEnabled();
  vi.mocked(getNSESchemeMaster).mockResolvedValue([{ ...base, active: true, sipAllowed: false }]);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh funds' }));
  const xsip = await screen.findByRole('button', { name: `Start XSIP in ${base.name}` });
  expect(xsip).toBeDisabled();
  expect(xsip).toHaveTextContent('XSIP unavailable');
});

it('shows transaction records in Transactions and keeps the fund catalog separate', async () => {
  vi.mocked(getNSESchemeMaster).mockResolvedValue([base]);
  sessionStorage.setItem('nse_access_token', 'test-token');
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ response_status: 'S', report_data: [{ product_id: '123', scheme_name_from: 'Existing investment', order_status: 'VALID', order_remark: 'PAYMENT CONFIRMATION PENDING', amount_units: '1000.00(A)' }] }) });
  vi.stubGlobal('fetch', fetcher);
  render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
  fireEvent.click(screen.getByRole('button', { name: 'Transactions' }));
  expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Load transaction details' })).toBeVisible();
  expect(screen.queryByLabelText('Search mutual funds')).not.toBeInTheDocument();
  expect(getNSESchemeMaster).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Transaction client code'), { target: { value: 'TEST001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load transaction details' }));
  expect(await screen.findByRole('heading', { name: 'Existing investment' })).toBeInTheDocument();
  expect(screen.getByText('PAYMENT CONFIRMATION PENDING')).toBeInTheDocument();
  expect(fetcher).toHaveBeenCalledWith('/nse-api/reports/transaction-detail', expect.objectContaining({ method: 'POST', body: expect.stringContaining('TEST001') }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore funds' }));
  expect(await screen.findByRole('heading', { name: base.name })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Load transaction details' })).not.toBeInTheDocument();
  expect(getNSESchemeMaster).toHaveBeenCalledTimes(1);
  sessionStorage.clear();
});

it('opens a standalone KYC check from the onboarding guide without investor bank selection', () => {
 render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Investor details' }));
 fireEvent.click(screen.getAllByRole('button', { name: 'Check KYC status' })[0]);
 expect(screen.getByRole('dialog', { name: 'Check investor KYC' })).toBeInTheDocument();
 expect(screen.getByLabelText('Client code')).toBeInTheDocument();
 expect(screen.queryByLabelText('Bank account')).not.toBeInTheDocument();
});

it('opens client management by default without a workflow home page', () => {
  render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Investor details', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Workflow home' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'One clear path for every investment' })).not.toBeInTheDocument();
});
