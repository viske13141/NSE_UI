import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NSEInvestorSelector from './NSEInvestorSelector';
import NSEInvestmentFlow from './NSEInvestmentFlow';
import { nseApi } from '@/services/nseApi';
import { checkNSEClientKyc } from '@/services/nseKycService';
vi.mock('@/services/nseKycService', () => ({ checkNSEClientKyc: vi.fn() }));
beforeEach(() => { vi.mocked(checkNSEClientKyc).mockReset(); vi.mocked(checkNSEClientKyc).mockResolvedValue({ status: 'verified', verified: true, message: 'KYC verified' }); });
const client = {
  client_code: 'TEST001', primary_holder_first_name: 'Test', primary_holder_middle_name: ' ', primary_holder_last_name: 'Investor', primary_holder_kyc_type: 'KRA COMPLIANT',
  account_no_1: '000011112222', bank_name_1: 'Test Bank', bank_1_status: 'ACTIVE', default_bank_flag_1: 'NO',
  account_no_2: 'XXXXXXXX3333', bank_name_2: 'Pending Bank', bank_2_status: 'PENDING', default_bank_flag_2: 'YES',
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mutual funds client master investor selection', () => {
  it('selects a registered bank for mandate setup without falsely marking KYC verified', async () => {
    vi.spyOn(nseApi, 'clientMaster').mockResolvedValue({ response_status: 'S', report_data_total: '1', report_data: [client] });
    const change = vi.fn(); render(<NSEInvestorSelector requireKyc={false} onChange={change} />);
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    await waitFor(() => expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ clientCode: 'TEST001', kycVerified: false, bank: expect.objectContaining({ active: true }) })));
    expect(checkNSEClientKyc).not.toHaveBeenCalled();
  });
  it('blocks investment review for no KYC record and rechecks before allowing progression', async () => {
    vi.spyOn(nseApi, 'clientMaster').mockResolvedValue({ response_status: 'S', report_data_total: '1', report_data: [client] });
    vi.mocked(checkNSEClientKyc).mockResolvedValueOnce({ status: 'not-found', verified: false, message: 'KYC record not found.' }).mockResolvedValueOnce({ status: 'verified', verified: true, message: 'KYC verified' });
    render(<NSEInvestmentFlow fund={{ name: 'Test Fund', amc: 'Test AMC', plan: 'Direct' }} mode="buy" onClose={vi.fn()} onRecord={vi.fn()} onTrack={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Investment amount (₹)'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    expect(await screen.findByText('KYC record not found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review investment' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Recheck KYC' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Review investment' })).toBeEnabled());
  });
  it('loads actual client fields, masks accounts and skips a pending default bank', async () => {
    const api = vi.spyOn(nseApi, 'clientMaster').mockResolvedValue({ response_status: 'S', report_data_total: '1', report_data: [client] });
    const change = vi.fn(); render(<NSEInvestorSelector onChange={change} />);
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    expect(await screen.findByRole('option', { name: 'Test Investor · TEST001' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith({ client_code: 'TEST001' });
    expect(screen.getByRole('option', { name: /Pending Bank/ })).toBeDisabled();
    expect(screen.getByText(/recorded KYC method, not the current verified status/)).toBeInTheDocument();
    expect(screen.queryByText(/000011112222/)).not.toBeInTheDocument();
    await waitFor(() => expect(change).toHaveBeenLastCalledWith(expect.objectContaining({ clientCode: 'TEST001', name: 'Test Investor', kycVerified: true, bank: expect.objectContaining({ label: 'Test Bank •••• 2222', active: true }) })));
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'OTHER' } });
    expect(change).toHaveBeenLastCalledWith(null);
  });
  it('does not invent an investor or select a pending bank', async () => {
    vi.spyOn(nseApi, 'clientMaster').mockResolvedValue({ response_status: 'S', report_data_total: '1', report_data: [{ ...client, bank_1_status: 'PENDING' }] });
    const change = vi.fn(); render(<NSEInvestorSelector onChange={change} />);
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No active bank account');
    expect(change).toHaveBeenLastCalledWith(null);
  });
  it('reports unsuccessful report status and allows another search', async () => {
    const api = vi.spyOn(nseApi, 'clientMaster').mockResolvedValueOnce({ response_status: 'F', report_data_total: '0', error_remark: 'Lookup failed' }).mockResolvedValueOnce({ response_status: 'S', report_data_total: '0', report_data: [] });
    render(<NSEInvestorSelector onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Client code'), { target: { value: 'TEST001' } });
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lookup failed');
    fireEvent.click(screen.getByRole('button', { name: "Find Mutual funds investors" }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No Mutual funds investors match'));
    expect(api).toHaveBeenCalledTimes(2);
  });
});
