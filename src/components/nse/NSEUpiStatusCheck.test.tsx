import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEUpiStatusCheck from './NSEUpiStatusCheck';
import { nseApi } from '@/services/nseApi';
import type { NSEDemoOrder } from './NSEInvestmentFlow';
const order: NSEDemoOrder = { id: 'LOCAL', live: true, orderAccepted: true, exchangeOrderId: '432160000001', clientCode: 'TEST001', amount: 2000, fund: 'Test Fund', investor: 'Test Investor', bank: 'Test Bank •••• 1234', mode: 'buy', status: 'pending', day: 0, installments: 1, paymentMode: 'upi', paymentState: 'initiated' };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('UPI status UI', () => {
  it('rejects an authorization URL token without sending a status request', async () => {
    const api = vi.spyOn(nseApi, 'upiStatus');
    const update = vi.fn(); render(<NSEUpiStatusCheck order={order} onUpdate={update} />);
    fireEvent.change(screen.getByLabelText('UPI payment reference'), { target: { value: '5E5760048E28740BE0635C28A8C0DBE8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check UPI status' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('authorization-link token');
    expect(api).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
  it('shows the supplied HTTP 200 Fail response as an unconfirmed lookup and allows retry', async () => {
    vi.spyOn(nseApi, 'upiStatus').mockResolvedValue({ payment_mode: null, client_code: null, status: 'Fail', remark: 'nse_upi_ref_no value is not valid.', nse_upi_ref_no: null });
    const update = vi.fn(); render(<NSEUpiStatusCheck order={order} onUpdate={update} />);
    fireEvent.change(screen.getByLabelText('UPI payment reference'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check UPI status' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('nse_upi_ref_no value is not valid. Payment status is unconfirmed');
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Check UPI status' })).toBeEnabled();
  });
  it('shows confirmed payment without marking unit allotment complete', async () => {
    const api = vi.spyOn(nseApi, 'upiStatus').mockResolvedValue({ status: 'SUCCESS', payment_mode: 'UPI', client_code: 'TEST001', nse_upi_ref_no: '123', order_amount: 2000, remark: 'Transaction success', upi_tran_ref_id: 'TXN1', cust_ref_no: '123456789012' });
    const update = vi.fn(); render(<NSEUpiStatusCheck order={order} onUpdate={update} />);
    expect(screen.getByRole('button', { name: 'Check UPI status' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('UPI payment reference'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check UPI status' }));
    expect(await screen.findByRole('status')).toHaveTextContent('UPI payment completed');
    expect(screen.getByRole('status')).toHaveTextContent('Unit allotment is still awaiting confirmation');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', paymentState: 'paid', nseUpiRef: '123', upiTransactionId: 'TXN1' }));
    expect(api).toHaveBeenCalledWith({ client_code: 'TEST001', nse_upi_ref_no: '123' });
  });
  it('leaves the order unchanged on a lookup error and allows rechecking', async () => {
    vi.spyOn(nseApi, 'upiStatus').mockRejectedValue(new Error('Reference not found'));
    const update = vi.fn(); render(<NSEUpiStatusCheck order={order} onUpdate={update} />);
    fireEvent.change(screen.getByLabelText('UPI payment reference'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check UPI status' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reference not found');
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Check UPI status' })).toBeEnabled();
  });
});
