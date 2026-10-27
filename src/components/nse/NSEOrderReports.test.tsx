import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NSEOrderReports from './NSEOrderReports';
import { nseApi } from '@/services/nseApi';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Mutual funds Orders report UI', () => {
  it('loads final order status using documented filter values and displays actual remarks', async () => {
    const api = vi.spyOn(nseApi, 'orderStatus').mockResolvedValue({ response_status: 'S', report_data: [{ order_id: '123', client_code: 'TEST001', scheme_name: 'Test Fund', transaction_type: 'P', amount: '500', quantity: '0.000', order_status: 'VALID', order_remark: 'ALLOTMENT DONE' }] });
    const rows = vi.fn(); render(<NSEOrderReports onRows={rows} />);
    fireEvent.click(screen.getByRole('button', { name: "Refresh Mutual funds orders" }));
    expect(await screen.findByRole('heading', { name: 'Test Fund' })).toBeInTheDocument();
    expect(screen.getByText('ALLOTMENT DONE')).toBeInTheDocument();
    expect(screen.getByText(/VALID indicates order validity/)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ trans_type: 'ALL', order_type: 'ALL', sub_order_type: 'ALL' }));
    expect(rows).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ status: 'VALID', quantity: '0.000' })]), false);
  });
  it('switches to provisional reports and shows API errors without stale records', async () => {
    const api = vi.spyOn(nseApi, 'provisionalOrders').mockRejectedValue(new Error('Report unavailable'));
    render(<NSEOrderReports onRows={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Report'), { target: { value: 'provisional' } });
    fireEvent.click(screen.getByRole('button', { name: "Refresh Mutual funds orders" }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Report unavailable');
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ date_type: 'REQUEST DATE' }));
  });
});
