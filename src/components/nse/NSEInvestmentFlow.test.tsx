vi.mock('./NSEInvestorSelector', () => import('@/test/mockNSEInvestorSelector'));
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEInvestmentFlow from './NSEInvestmentFlow';
import NSEDashboard from '@/pages/dashboard/NSEDashboard';
import { MemoryRouter } from 'react-router-dom';
import { nseApi } from '@/services/nseApi';

vi.mock('@/services/nseAuth', () => ({ isNSEConnected: () => true, clearNSEToken: vi.fn() }));
vi.mock('@/services/nseSchemeService', () => ({ getNSESchemeMaster: vi.fn(async () => [{
  id: '1', schemeCode: 'TEST-GR', name: 'Test NSE Fund', amc: 'Test AMC', amcCode: 'TEST_MF', isin: 'TESTISIN',
  category: 'EQUITY', subcategory: 'T2', settlementType: 'T2', plan: 'Direct', active: true,
  purchaseAllowed: true, sipAllowed: true, purchaseMode: 'DP', minPurchase: 500, purchaseMultiplier: 1,
}]) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fund = { name: 'Sample Flexi Cap Fund', amc: 'Sample AMC', plan: 'Direct' };
function enterAmount() {
  fireEvent.change(screen.getByLabelText('Investment amount (₹)'), { target: { value: '500' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
}
function acceptReview() {
  fireEvent.click(screen.getByRole('button', { name: 'Review investment' }));
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('Mutual funds demo investment flow', () => {
  it('blocks inactive banks and missing client codes, requires consent and tracks pending payment without duplicate orders', () => {
    const onRecord = vi.fn();
    render(<NSEInvestmentFlow fund={fund} mode="buy" onRecord={onRecord} onClose={vi.fn()} onTrack={vi.fn()} />);
    enterAmount();
    fireEvent.change(screen.getByLabelText('Investor'), { target: { value: 'demo-kyc' } });
    expect(screen.getByRole('button', { name: 'Review investment' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Investor'), { target: { value: 'demo-registration' } });
    expect(screen.getByRole('button', { name: 'Review investment' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Investor'), { target: { value: 'demo-ready' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review investment' }));
    expect(screen.getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate pending' }));
    expect(onRecord.mock.calls[0][0].status).toBe('pending');
    fireEvent.click(screen.getByRole('button', { name: 'Choose demo status update' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate successful payment' }));
    expect(onRecord.mock.calls[1][0].id).toBe(onRecord.mock.calls[0][0].id);
    expect(screen.getByText(/demo order is awaiting unit allotment/i)).toBeInTheDocument();
  });

  it('supports switching to SIP, retrying failed authorization and tracking the correct transaction type', () => {
    const onRecord = vi.fn(); const onTrack = vi.fn();
    render(<NSEInvestmentFlow fund={fund} mode="buy" onRecord={onRecord} onClose={vi.fn()} onTrack={onTrack} />);
    fireEvent.change(screen.getByLabelText('Investment type'), { target: { value: 'sip' } });
    fireEvent.change(screen.getByLabelText('Monthly amount (₹)'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Installment day'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Installments'), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
    acceptReview();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to mandate authorization' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate failure' }));
    expect(onRecord.mock.calls[0][0].status).toBe('rejected');
    fireEvent.click(screen.getByRole('button', { name: 'Retry demo authorization' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simulate mandate authorized' }));
    expect(onRecord.mock.calls[1][0]).toMatchObject({ mode: 'sip', amount: 500, day: 15, installments: 24, status: 'successful' });
    expect(onRecord.mock.calls[1][0].id).toBe(onRecord.mock.calls[0][0].id);
    fireEvent.click(screen.getByRole('button', { name: 'View SIPs' }));
    expect(onTrack).toHaveBeenCalledWith('sip');
  });

  it('shows a received live order in Orders without creating investments', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '123456', trxn_status: 'RECEIVED' }] });
    render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Explore funds' }));
    fireEvent.click((await screen.findAllByRole('button', { name: /^Buy / }))[0]);
    enterAmount();
    fireEvent.change(screen.getByLabelText('Transaction mode'), { target: { value: 'P' } });
    fireEvent.change(screen.getByLabelText('Folio number (required)'), { target: { value: 'TESTFOLIO' } });
    fireEvent.change(screen.getByLabelText('EUIN'), { target: { value: 'E654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review buy order' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Place buy order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'View orders' }));
    expect(screen.getByRole('cell', { name: '123456' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reports' }));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Units & payouts' }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('button', { name: 'Units allotted to your investments' }));
    expect(screen.getByText("No Mutual funds investments to display")).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: '123456' })).not.toBeInTheDocument();
  });
  it('tracks live SIP registration using a client-approved mandate', async () => {
    vi.spyOn(nseApi, 'mandateStatus').mockResolvedValue({ response_status: 'S', report_data: [{ clientCode: 'TESTCL001', mandateId: '123456', status: 'APPROVED', amount: '5000', bankName: 'Test bank' }] });
    vi.spyOn(nseApi, 'registerSip').mockResolvedValue({ reg_data: [{ reg_id: '202610150000001', reg_status: 'REG_SUCCESS' }] });
    render(<MemoryRouter><NSEDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Explore funds' }));
    fireEvent.click((await screen.findAllByRole('button', { name: /^Start SIP in / }))[0]);
    fireEvent.change(screen.getByLabelText('Installment amount (₹)'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
    fireEvent.change(screen.getByLabelText('EUIN declaration'), { target: { value: 'N' } });
    await screen.findByRole('option', { name: /Test bank/ });
    fireEvent.change(screen.getByLabelText('Approved SIP mandate'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review SIP' }));
    await screen.findByRole('heading', { name: 'Review SIP registration' });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the schedule/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Register SIP' }));
    fireEvent.click(await screen.findByRole('button', { name: 'View SIPs' }));
    expect(screen.getByRole('cell', { name: /REG_SUCCESS/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bank auto-debit' }));
    fireEvent.change(screen.getByLabelText('Client codes'), { target: { value: 'TESTCL001' } });
    fireEvent.click(screen.getByRole('button', { name: "Load Mutual funds mandates" }));
    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText('No mandates registered in this session')).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Demo authorized' })).not.toBeInTheDocument();
  });
});
