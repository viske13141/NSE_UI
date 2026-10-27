import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEPaymentForm from './NSEPaymentForm';
import { nseApi } from '@/services/nseApi';
import type { NSEDemoOrder } from './NSEInvestmentFlow';
const order: NSEDemoOrder = { id: 'LOCALREF', exchangeOrderId: '432160000001', clientCode: 'TEST001', live: true, orderAccepted: true, fund: 'Test Fund', mode: 'buy', amount: 2000, day: 0, installments: 1, investor: 'Test Investor', bank: 'Test Bank •••• 2222', status: 'pending' };
const investor = { name: 'Test Investor', clientCode: 'TEST001', kycType: 'KRA COMPLIANT', kycVerified: true, bank: { id: 'BANK1', label: order.bank, status: 'ACTIVE', active: true, isDefault: true, accountNo: '000011112222', ifsc: 'TEST0001234' } };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mutual funds payment UI', () => {
  it('requires consent and opens the returned link while keeping payment pending', async () => {
    const api = vi.spyOn(nseApi, 'purchasePayment').mockResolvedValue({ status: 'success', short_url: 'https://nseinvest.com/mf/test' });
    const update = vi.fn(); render(<NSEPaymentForm order={order} investor={investor} onUpdate={update} />);
    expect(screen.getByRole('button', { name: 'Start payment' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'upi' } });
    fireEvent.change(screen.getByLabelText('UPI ID'), { target: { value: 'test@upi' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Start payment' }));
    expect(await screen.findByRole('link', { name: 'Open secure payment page' })).toHaveAttribute('href', 'https://nseinvest.com/mf/test');
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ payment_mode: 'UPI', client_code: 'TEST001', order_ids: '432160000001', vpa: 'test@upi' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', paymentState: 'initiated' }));
  });
  it('blocks payment for rejected orders', () => {
    render(<NSEPaymentForm order={{ ...order, status: 'rejected' }} investor={investor} onUpdate={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('accepted order');
    expect(screen.queryByRole('button', { name: 'Start payment' })).not.toBeInTheDocument();
  });
  it('does not retry an unconfirmed payment after a network error', async () => {
    const api = vi.spyOn(nseApi, 'purchasePayment').mockRejectedValue(new Error('Network timeout'));
    render(<NSEPaymentForm order={order} investor={investor} onUpdate={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Start payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network timeout');
    expect(screen.getByRole('button', { name: 'Payment request submitted' })).toBeDisabled();
    expect(api).toHaveBeenCalledTimes(1);
  });
});
