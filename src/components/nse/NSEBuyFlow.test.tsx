import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEBuyFlow from './NSEBuyFlow';
import { nseApi } from '@/services/nseApi';
vi.mock('./NSEInvestorSelector', () => import('@/test/mockNSEInvestorSelector'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const fund = { name: 'Test Fund', amc: 'Test AMC', plan: 'Direct', schemeCode: 'Mutual funds-SCHEME', minPurchase: 500 };
function review(record = vi.fn()) {
  render(<NSEBuyFlow fund={fund} onClose={vi.fn()} onRecord={record} onTrack={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Investment amount (₹)'), { target: { value: '2000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to investor' }));
  fireEvent.change(screen.getByLabelText('Transaction mode'), { target: { value: 'P' } });
    fireEvent.change(screen.getByLabelText('Folio number (required)'), { target: { value: 'TESTFOLIO' } });
    fireEvent.change(screen.getByLabelText('EUIN'), { target: { value: 'E654321' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review buy order' }));
  expect(screen.getByRole('button', { name: 'Place buy order' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
}
describe('Mutual funds live Buy UI', () => {
  it('enables payment after accepted order entry and tracks initiation without creating holdings', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '432160000001', trxn_status: 'TRXN SUCCESS' }] });
    const payment = vi.spyOn(nseApi, 'purchasePayment').mockResolvedValue({ status: 'success', short_url: 'https://nseinvest.com/mf/test' });
    const record = vi.fn(); review(record);
    fireEvent.click(screen.getByRole('button', { name: 'Place buy order' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    expect(payment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Start payment' }));
    expect(await screen.findByRole('link', { name: 'Open secure payment page' })).toBeInTheDocument();
    expect(record).toHaveBeenLastCalledWith(expect.objectContaining({ paymentState: 'initiated', status: 'pending', orderAccepted: true }));
  });
  it('shows the exchange rejection and blocks payment', async () => {
    vi.spyOn(nseApi, 'placeOrder').mockResolvedValue({ transaction_details: [{ trxn_order_id: '0', trxn_status: 'TRXN FAILED', trxn_remark: 'Scheme disabled' }] });
    const record = vi.fn(); review(record);
    fireEvent.click(screen.getByRole('button', { name: 'Place buy order' }));
    expect(await screen.findByRole('heading', { name: 'Order rejected' })).toBeInTheDocument();
    expect(screen.getByText('Scheme disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to payment/ })).toBeDisabled();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ live: true, status: 'rejected', exchangeOrderId: undefined }));
  });
  it('prevents duplicate submission and records a network outcome as unknown without retrying', async () => {
    let reject: (reason: Error) => void = () => {};
    const api = vi.spyOn(nseApi, 'placeOrder').mockImplementation(() => new Promise((_, rejectPromise) => { reject = rejectPromise; }));
    const record = vi.fn(); review(record);
    fireEvent.click(screen.getByRole('button', { name: 'Place buy order' }));
    expect(screen.getByRole('button', { name: 'Submitting order…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Submitting order…' }));
    reject(new Error('Network timeout'));
    expect(await screen.findByRole('heading', { name: 'Order confirmation unknown' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ live: true, status: 'pending', rawStatus: 'Confirmation unknown' }));
  });
});
