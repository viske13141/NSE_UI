import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEMasterPreview from './NSEMasterPreview';
import { nseApi } from '@/services/nseApi';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mutual funds selected master preview', () => {
  it('uses the fund name for underscored Mutual funds headers and keeps technical fields in details', async () => {
    vi.spyOn(nseApi, 'downloadMaster').mockResolvedValue('SCHEME CODE|SCHEME_NAME|AMC NAME|SIP FREQUENCY|SIP DATES\nTEST|Balanced Hybrid Fund|Example AMC|MONTHLY|1,2,3,4,5');
    render(<NSEMasterPreview fileType="SIP" />);
    expect(await screen.findByRole('heading', { name: 'Balanced Hybrid Fund' })).toBeInTheDocument();
    const dates = screen.getByText('1,2,3,4,5');
    expect(dates.closest('details')).not.toHaveAttribute('open');
    expect(screen.getAllByText('Example AMC').length).toBeGreaterThan(0);
  });
  it.each([
    ['SIP', 'Start SIP', 'SIP details'],
    ['STP', 'Start Transfer', 'Start systematic transfer'],
    ['SWP', 'Start Withdrawal', 'Start systematic withdrawal'],
  ] as const)('opens the correct plan form from a %s card', async (type, action, title) => {
    vi.spyOn(nseApi, 'downloadMaster').mockResolvedValue('SCHEME CODE|SCHEME NAME|AMC CODE\nSOURCE|Source Fund|AMC1\nDEST|Destination Fund|AMC1');
    render(<NSEMasterPreview fileType={type} />);
    fireEvent.click((await screen.findAllByRole('button', { name: action }))[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
  it.each(['NAV', 'SET'] as const)('keeps %s informational without registration buttons', async type => {
    vi.spyOn(nseApi, 'downloadMaster').mockResolvedValue('CODE|VALUE\nREF|100');
    render(<NSEMasterPreview fileType={type} />);
    await screen.findByRole('heading', { name: 'REF' });
    expect(screen.queryByRole('button', { name: /^Start / })).not.toBeInTheDocument();
  });
  it('fetches SIP, displays returned cards and supports search', async () => {
    const download = vi.spyOn(nseApi, 'downloadMaster').mockResolvedValue('SCHEME CODE|MINIMUM SIP\nSIP-A|500\nSIP-B|1000');
    render(<NSEMasterPreview fileType="SIP" />);
    expect(await screen.findByRole('heading', { name: 'SIP-A' })).toBeInTheDocument();
    expect(download).toHaveBeenCalledWith({ file_type: 'SIP' });
    fireEvent.change(screen.getByLabelText('Search SIP master'), { target: { value: 'SIP-B' } });
    expect(screen.queryByRole('heading', { name: 'SIP-A' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SIP-B' })).toBeInTheDocument();
  });
  it('shows an API failure and retries the same selected file type', async () => {
    vi.spyOn(nseApi, 'downloadMaster').mockRejectedValueOnce(new Error('SIP file unavailable')).mockResolvedValueOnce('CODE|AMOUNT\nTEST|500');
    render(<NSEMasterPreview fileType="SIP" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('SIP file unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry SIP' }));
    expect(await screen.findByRole('heading', { name: 'TEST' })).toBeInTheDocument();
  });
  it('does not show a stale response after changing file types', async () => {
    let resolveSip: (value: string) => void = () => {};
    vi.spyOn(nseApi, 'downloadMaster').mockImplementation(({ file_type }) => file_type === 'SIP' ? new Promise(resolve => { resolveSip = resolve; }) : Promise.resolve('NAV CODE|VALUE\nNAV-A|100'));
    const view = render(<NSEMasterPreview fileType="SIP" />);
    view.rerender(<NSEMasterPreview fileType="NAV" />);
    expect(await screen.findByRole('heading', { name: 'NAV-A' })).toBeInTheDocument();
    resolveSip('SIP CODE|VALUE\nSIP-A|500');
    expect(screen.queryByRole('heading', { name: 'SIP-A' })).not.toBeInTheDocument();
  });
});

